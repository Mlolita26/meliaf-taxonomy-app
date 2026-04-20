/**
 * Edge Function: assign-reviews
 * Assigns terms to reviewers using a weighted round-robin algorithm.
 * Enforces: max 2 reviewers per term, no self-review of proposed terms.
 *
 * Trigger: POST /functions/v1/assign-reviews
 * Body: { trigger: 'new_user' | 'new_term' | 'manual', user_id?: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl     = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase        = createClient(supabaseUrl, serviceRoleKey);

  const { trigger, user_id } = await req.json();

  // ─── 1. Fetch all active reviewers (non-admins) ──────────────────────────────
  const { data: reviewers } = await supabase
    .from('profiles')
    .select('id, preferred_element')
    .eq('is_admin', false)
    .eq('is_active', true);

  if (!reviewers || reviewers.length < 1) {
    return new Response(JSON.stringify({ message: 'No reviewers available' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ─── 2. Fetch terms needing reviewers ─────────────────────────────────────────
  const { data: allTerms } = await supabase
    .from('taxonomy_terms')
    .select('id, element, proposed_by')
    .eq('is_active', true)
    .eq('is_proposed', false);

  // ─── 3. Get current assignment counts per term and per reviewer ───────────────
  const { data: existingAssignments } = await supabase
    .from('review_assignments')
    .select('term_id, reviewer_id, status');

  const termReviewerMap: Record<string, string[]> = {};
  const reviewerLoadMap: Record<string, number>   = {};

  for (const a of existingAssignments ?? []) {
    if (a.status === 'skipped') continue;
    if (!termReviewerMap[a.term_id]) termReviewerMap[a.term_id] = [];
    termReviewerMap[a.term_id].push(a.reviewer_id);
    reviewerLoadMap[a.reviewer_id] = (reviewerLoadMap[a.reviewer_id] ?? 0) + 1;
  }

  const maxLoad = Math.max(...Object.values(reviewerLoadMap), 1);

  // ─── 4. Build assignment pairs ───────────────────────────────────────────────
  const toInsert: { term_id: string; reviewer_id: string; due_date: string; status: string }[] = [];

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);
  const dueDateStr = dueDate.toISOString();

  for (const term of allTerms ?? []) {
    const current = termReviewerMap[term.id] ?? [];
    const slotsNeeded = 2 - current.length;
    if (slotsNeeded <= 0) continue;

    // Eligible reviewers: not already assigned, not the proposer
    const eligible = (reviewers ?? []).filter(
      (r: any) => !current.includes(r.id) && r.id !== term.proposed_by
    );

    if (eligible.length === 0) continue;

    // Score each eligible reviewer
    const scored = eligible.map((r: any) => {
      const load        = reviewerLoadMap[r.id] ?? 0;
      const loadPenalty = (load / maxLoad) * 0.5;
      const affinity    = r.preferred_element === term.element ? 0.2 : 0;
      return { id: r.id, score: 1.0 - loadPenalty + affinity };
    });

    scored.sort((a: any, b: any) => b.score - a.score);

    for (let i = 0; i < Math.min(slotsNeeded, scored.length); i++) {
      const reviewerId = scored[i].id;

      // Skip if we already queued this pair in this run
      if (toInsert.find(x => x.term_id === term.id && x.reviewer_id === reviewerId)) continue;
      // Skip if only assigning to a specific new user and this reviewer doesn't match
      if (trigger === 'new_user' && user_id && reviewerId !== user_id && i >= slotsNeeded - 1) continue;

      toInsert.push({ term_id: term.id, reviewer_id: reviewerId, due_date: dueDateStr, status: 'pending' });

      // Update in-memory load to avoid overloading one reviewer in this batch
      reviewerLoadMap[reviewerId] = (reviewerLoadMap[reviewerId] ?? 0) + 1;
    }
  }

  if (toInsert.length === 0) {
    return new Response(JSON.stringify({ message: 'No new assignments needed', assigned: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ─── 5. Insert assignments (trigger in DB enforces max-2 constraint) ──────────
  const { data: inserted, error } = await supabase
    .from('review_assignments')
    .insert(toInsert)
    .select('id, reviewer_id');

  if (error) {
    console.error('Assignment error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ─── 6. Notify each newly-assigned reviewer ───────────────────────────────────
  const notifications = (inserted ?? []).map((a: any) => ({
    user_id: a.reviewer_id,
    title:   'New term assigned for review 🌿',
    body:    'You have a new term in your review queue.',
    type:    'assignment',
  }));

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
  }

  return new Response(
    JSON.stringify({ message: 'Assignments created', assigned: (inserted ?? []).length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
