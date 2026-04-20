/**
 * Edge Function: check-badges
 * Called after points are awarded to check if any badges should be unlocked.
 *
 * Trigger: POST /functions/v1/check-badges
 * Body: { user_id: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BadgeRequirement {
  type: string;
  threshold?: number;
  start?: number;
  end?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { user_id } = await req.json();
  if (!user_id) return new Response('Missing user_id', { status: 400 });

  // Fetch user stats
  const [
    { data: profile },
    { count: reviewsDone },
    { count: suggestionsSubmitted },
    { count: suggestionsAccepted },
    { count: majorAccepted },
    { count: newTermsAccepted },
    { data: alreadyEarned },
    { data: badges },
  ] = await Promise.all([
    supabase.from('profiles').select('current_streak, total_points').eq('id', user_id).single(),
    supabase.from('review_assignments').select('*', { count: 'exact', head: true }).eq('reviewer_id', user_id).eq('status', 'completed'),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('author_id', user_id).neq('status', 'draft'),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('author_id', user_id).eq('status', 'accepted'),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('author_id', user_id).eq('status', 'accepted').eq('is_major_change', true),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('author_id', user_id).eq('status', 'accepted').eq('suggestion_type', 'new_term'),
    supabase.from('user_badges').select('badge_id').eq('user_id', user_id),
    supabase.from('badge_definitions').select('*').eq('is_hidden', false),
  ]);

  const earnedIds = new Set((alreadyEarned ?? []).map((b: any) => b.badge_id));
  const streak    = profile?.current_streak ?? 0;
  const hour      = new Date().getUTCHours();

  const stats = {
    review_count:         reviewsDone ?? 0,
    suggestion_count:     suggestionsSubmitted ?? 0,
    accepted_count:       suggestionsAccepted ?? 0,
    major_accepted_count: majorAccepted ?? 0,
    new_term_accepted:    newTermsAccepted ?? 0,
    streak,
    hour,
  };

  const toUnlock: { user_id: string; badge_id: string }[] = [];
  const pointsToAward: number[] = [];

  for (const badge of (badges ?? []) as any[]) {
    if (earnedIds.has(badge.id)) continue;

    const req = badge.requirement as BadgeRequirement;
    let unlocked = false;

    switch (req.type) {
      case 'review_count':
        unlocked = (stats.review_count ?? 0) >= (req.threshold ?? 0);
        break;
      case 'suggestion_count':
        unlocked = (stats.suggestion_count ?? 0) >= (req.threshold ?? 0);
        break;
      case 'accepted_count':
        unlocked = (stats.accepted_count ?? 0) >= (req.threshold ?? 0);
        break;
      case 'major_accepted_count':
        unlocked = (stats.major_accepted_count ?? 0) >= (req.threshold ?? 0);
        break;
      case 'new_term_accepted':
        unlocked = (stats.new_term_accepted ?? 0) >= (req.threshold ?? 0);
        break;
      case 'streak':
        unlocked = streak >= (req.threshold ?? 0);
        break;
      case 'time_of_day': {
        const h = stats.hour;
        const start = req.start ?? 23;
        const end   = req.end ?? 4;
        unlocked = start > end ? (h >= start || h <= end) : (h >= start && h <= end);
        break;
      }
      case 'all_assigned': {
        const { count: total } = await supabase.from('review_assignments').select('*', { count: 'exact', head: true }).eq('reviewer_id', user_id);
        const { count: done }  = await supabase.from('review_assignments').select('*', { count: 'exact', head: true }).eq('reviewer_id', user_id).eq('status', 'completed');
        unlocked = (total ?? 0) > 0 && total === done;
        break;
      }
    }

    if (unlocked) {
      toUnlock.push({ user_id, badge_id: badge.id });
      if (badge.points_value > 0) pointsToAward.push(badge.points_value);
    }
  }

  if (toUnlock.length === 0) {
    return new Response(JSON.stringify({ unlocked: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Insert badges
  await supabase.from('user_badges').insert(toUnlock);

  // Award bonus points per badge
  if (pointsToAward.length > 0) {
    const totalBonus = pointsToAward.reduce((a, b) => a + b, 0);
    await supabase.from('points_transactions').insert({
      user_id,
      points:      totalBonus,
      reason:      `Badge bonus: ${toUnlock.length} badge(s) earned`,
      source_type: 'badge',
    });
  }

  // Notify user
  const badgeNames = (badges ?? [])
    .filter((b: any) => toUnlock.some(u => u.badge_id === b.id))
    .map((b: any) => b.name);

  await supabase.from('notifications').insert({
    user_id,
    title:   `🎖️ Badge${toUnlock.length > 1 ? 's' : ''} unlocked!`,
    body:    badgeNames.join(', '),
    type:    'badge',
    payload: { badge_ids: toUnlock.map(u => u.badge_id) },
  });

  return new Response(
    JSON.stringify({ unlocked: toUnlock.length, badges: badgeNames }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
