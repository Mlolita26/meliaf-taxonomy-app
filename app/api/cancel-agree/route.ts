import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId, termId, termCode } = await request.json();
  if (!userId || !termId) {
    return NextResponse.json({ error: 'Missing userId or termId' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Delete agree transaction(s) for this term (handles both new source_id style and old reason style)
  await supabase.from('points_transactions')
    .delete()
    .eq('user_id', userId)
    .eq('source_type', 'term_approved')
    .eq('source_id', termId);

  if (termCode) {
    await supabase.from('points_transactions')
      .delete()
      .eq('user_id', userId)
      .eq('reason', `Agreed with term: ${termCode}`);
  }

  // Decrement profile total_points by 10 (DB trigger only fires on INSERT, not DELETE)
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_points')
    .eq('id', userId)
    .single();

  await supabase
    .from('profiles')
    .update({ total_points: Math.max(0, (profile?.total_points ?? 10) - 10) })
    .eq('id', userId);

  return NextResponse.json({ success: true });
}
