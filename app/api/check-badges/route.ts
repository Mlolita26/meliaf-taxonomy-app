import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId } = await request.json();
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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
    // Agreements count acts as "reviews done" since assignment system was removed
    supabase.from('points_transactions').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('source_type', 'term_approved'),
    supabase.from('suggestions').select('*', { count: 'exact', head: true })
      .eq('author_id', userId).neq('status', 'draft'),
    supabase.from('suggestions').select('*', { count: 'exact', head: true })
      .eq('author_id', userId).eq('status', 'accepted'),
    supabase.from('suggestions').select('*', { count: 'exact', head: true })
      .eq('author_id', userId).eq('status', 'accepted').eq('is_major_change', true),
    supabase.from('suggestions').select('*', { count: 'exact', head: true })
      .eq('author_id', userId).eq('status', 'accepted').eq('suggestion_type', 'new_term'),
    supabase.from('profiles').select('current_streak').eq('id', userId).single(),
    supabase.from('user_badges').select('badge_id').eq('user_id', userId),
    supabase.from('badge_definitions').select('*').eq('is_hidden', false),
  ]);

  const earnedIds = new Set((alreadyEarned ?? []).map((b: any) => b.badge_id));
  const stats = {
    review_count:         agreementsCount ?? 0,
    suggestion_count:     suggestionsSubmitted ?? 0,
    accepted_count:       suggestionsAccepted ?? 0,
    major_accepted_count: majorAccepted ?? 0,
    new_term_accepted:    newTermsAccepted ?? 0,
    streak:               profile?.current_streak ?? 0,
  };

  const toUnlock: { user_id: string; badge_id: string }[] = [];
  const pointsToAward: number[] = [];

  for (const badge of (badges ?? []) as any[]) {
    if (earnedIds.has(badge.id)) continue;
    const req = badge.requirement as { type: string; threshold?: number };
    let unlocked = false;
    switch (req.type) {
      case 'review_count':         unlocked = stats.review_count >= (req.threshold ?? 0);         break;
      case 'suggestion_count':     unlocked = stats.suggestion_count >= (req.threshold ?? 0);     break;
      case 'accepted_count':       unlocked = stats.accepted_count >= (req.threshold ?? 0);       break;
      case 'major_accepted_count': unlocked = stats.major_accepted_count >= (req.threshold ?? 0); break;
      case 'new_term_accepted':    unlocked = stats.new_term_accepted >= (req.threshold ?? 0);    break;
      case 'streak':               unlocked = stats.streak >= (req.threshold ?? 0);               break;
    }
    if (unlocked) {
      toUnlock.push({ user_id: userId, badge_id: badge.id });
      if ((badge.points_value ?? 0) > 0) pointsToAward.push(badge.points_value);
    }
  }

  if (toUnlock.length === 0) {
    return NextResponse.json({ unlocked: 0 });
  }

  await supabase.from('user_badges').insert(toUnlock);

  if (pointsToAward.length > 0) {
    const total = pointsToAward.reduce((a, b) => a + b, 0);
    await supabase.from('points_transactions').insert({
      user_id:     userId,
      points:      total,
      reason:      `Badge${toUnlock.length > 1 ? 's' : ''} earned`,
      source_type: 'badge',
    });
  }

  const badgeNames = (badges ?? [])
    .filter((b: any) => toUnlock.some((u: any) => u.badge_id === b.id))
    .map((b: any) => b.name);

  await supabase.from('notifications').insert({
    user_id: userId,
    title:   `🎖️ Badge${toUnlock.length > 1 ? 's' : ''} unlocked!`,
    body:    badgeNames.join(', '),
    type:    'badge',
  });

  return NextResponse.json({ unlocked: toUnlock.length, badges: badgeNames });
}
