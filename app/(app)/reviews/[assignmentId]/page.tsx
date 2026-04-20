import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ReviewSession } from '@/components/review/ReviewSession';

export default async function ReviewSessionPage({ params }: { params: { assignmentId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: assignment } = await supabase
    .from('review_assignments')
    .select('*, taxonomy_terms(*)')
    .eq('id', params.assignmentId)
    .eq('reviewer_id', user.id)
    .single();

  if (!assignment) notFound();

  // Count remaining queue items
  const { count: queueCount } = await supabase
    .from('review_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('reviewer_id', user.id)
    .in('status', ['pending', 'in_progress']);

  return (
    <ReviewSession
      assignment={assignment as any}
      userId={user.id}
      queueCount={queueCount ?? 1}
    />
  );
}
