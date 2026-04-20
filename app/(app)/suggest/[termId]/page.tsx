import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { SuggestEditForm } from '@/components/review/SuggestEditForm';

export default async function SuggestEditPage({
  params,
  searchParams,
}: {
  params: { termId: string };
  searchParams: { field?: string; from?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: term } = await supabase
    .from('taxonomy_terms')
    .select('*')
    .eq('id', params.termId)
    .single();

  if (!term) notFound();

  return (
    <SuggestEditForm
      term={term as any}
      userId={user.id}
      preSelectedField={searchParams.field}
      assignmentId={searchParams.from}
    />
  );
}
