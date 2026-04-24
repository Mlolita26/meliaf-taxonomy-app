import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { suggestionId } = await request.json();
  if (!suggestionId) return NextResponse.json({ error: 'Missing suggestionId' }, { status: 400 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  // Fetch suggestion — RLS ensures only own suggestions are visible
  const { data: suggestion, error: fetchErr } = await supabase
    .from('suggestions')
    .select('id, author_id, status')
    .eq('id', suggestionId)
    .eq('author_id', user.id)
    .single();

  if (fetchErr || !suggestion) {
    return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
  }

  const wasAccepted = suggestion.status === 'accepted';

  // Delete all points earned for this suggestion.
  // The DELETE trigger on points_transactions auto-decrements profiles.total_points per row.
  const { error: ptErr } = await supabase
    .from('points_transactions')
    .delete()
    .eq('user_id', user.id)
    .eq('source_id', suggestionId)
    .in('source_type', ['suggestion_submitted', 'new_term_submitted', 'suggestion_accepted']);

  if (ptErr) return NextResponse.json({ error: ptErr.message }, { status: 500 });

  if (wasAccepted) {
    // Keep record visible to admins so they know to review the taxonomy change manually
    const { error: updateErr } = await supabase
      .from('suggestions')
      .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
      .eq('id', suggestionId)
      .eq('author_id', user.id);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  } else {
    // Not yet accepted — remove entirely from admin queue
    const { error: deleteErr } = await supabase
      .from('suggestions')
      .delete()
      .eq('id', suggestionId)
      .eq('author_id', user.id);
    if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, wasAccepted });
}
