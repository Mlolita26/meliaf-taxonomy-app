import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId } = await request.json();
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  // Use the session-based server client — no SUPABASE_SERVICE_ROLE_KEY needed
  const supabase = createClient();

  // Verify the caller is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  // Always check badges for the authenticated user (prevents spoofing via userId param)
  const uid = user.id;

  const [
    { count: agreementsCount },
    { count: suggestionsSubmitted },
    { count: suggestionsAccepted },
    { count: majorAccepted },
    { count: newTermsAccepted },
    { data: profile },
    { data: alreadyEarned },
    { data: badges },
  ] = await Promise.all([
    supabase.from('points_transactions').select('*', { count: 'exact', head: true })
      .eq('user_id', uid).eq('source_type', 'term_approved'),
    supabase.from('suggestions').select('*', { count: 'exact', head: true })
      .eq('author_id', uid).neq('status', 'draft'),
    supabase.from('suggestions').select('*', { count: 'exact', head: true })
      .eq('author_id', uid).eq('status', 'accepted'),
    supabase.from('suggestions').select('*', { count: 'exact', head: true })
      .eq('author_id', uid).eq('status', 'accepted').eq('is_major_change', true),
    supabase.from('suggestions').select('*', { count: 'exact', head: true })
      .eq('author_id', uid).eq('status', 'accepted').eq('suggestion_type', 'new_term'),
    supabase.from('profiles').select('current_streak, total_points').eq('id', uid).single(),
    supabase.from('user_badges').select('badge_id').eq('user_id', uid),
    supabase.from('badge_definitions').select('*').eq('is_hidden', false),
  ]);

  // Compute leaderboard rank
  const { count: usersAhead } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gt('total_points', profile?.total_points ?? 0);
  const rank = (usersAhead ?? 0) + 1;

  const earnedIds = new Set((alreadyEarned ?? []).map((b: any) => b.badge_id));

  const stats = {
    review_count:         agreementsCount ?? 0,
    suggestion_count:     suggestionsSubmitted ?? 0,
    accepted_count:       suggestionsAccepted ?? 0,
    major_accepted_count: majorAccepted ?? 0,
    new_term_accepted:    newTermsAccepted ?? 0,
    streak:               profile?.current_streak ?? 0,
    rank,
  };

  const toUnlock: { user_id: string; badge_id: string }[] = [];
  const pointsToAward: number[] = [];

  for (const badge of (badges ?? []) as any[]) {
    if (earnedIds.has(badge.id)) continue;
    const req = badge.requirement as { type: string; threshold?: number };
    let unlocked = false;
    switch (req.type) {
      case 'review_count':         unlocked = stats.review_count         >= (req.threshold ?? 0); break;
      case 'suggestion_count':     unlocked = stats.suggestion_count     >= (req.threshold ?? 0); break;
      case 'accepted_count':       unlocked = stats.accepted_count       >= (req.threshold ?? 0); break;
      case 'major_accepted_count': unlocked = stats.major_accepted_count >= (req.threshold ?? 0); break;
      case 'new_term_accepted':    unlocked = stats.new_term_accepted    >= (req.threshold ?? 0); break;
      case 'streak':               unlocked = stats.streak               >= (req.threshold ?? 0); break;
      case 'rank':                 unlocked = stats.rank                 <= (req.threshold ?? 1); break;
    }
    if (unlocked) {
      toUnlock.push({ user_id: uid, badge_id: badge.id });
      if ((badge.points_value ?? 0) > 0) pointsToAward.push(badge.points_value);
    }
  }

  if (toUnlock.length === 0) {
    return NextResponse.json({ unlocked: 0, stats });
  }

  await supabase.from('user_badges').insert(toUnlock);

  if (pointsToAward.length > 0) {
    const total = pointsToAward.reduce((a, b) => a + b, 0);
    await supabase.from('points_transactions').insert({
      user_id:     uid,
      points:      total,
      reason:      `Badge${toUnlock.length > 1 ? 's' : ''} earned`,
      source_type: 'badge',
    });
  }

  const badgeNames = (badges ?? [])
    .filter((b: any) => toUnlock.some((u: any) => u.badge_id === b.id))
    .map((b: any) => b.name);

  await supabase.from('notifications').insert({
    user_id: uid,
    title:   `🎖️ Badge${toUnlock.length > 1 ? 's' : ''} unlocked!`,
    body:    badgeNames.join(', '),
    type:    'badge',
  });

  return NextResponse.json({ unlocked: toUnlock.length, badges: badgeNames, stats });
}
