import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProposeTermForm } from '@/components/review/ProposeTermForm';

interface SearchParams { type?: string; element?: string; level1?: string }

export default async function ProposeTermPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: terms } = await supabase
    .from('taxonomy_terms')
    .select('element, level_1, level_2')
    .eq('is_active', true)
    .order('element');

  return (
    <ProposeTermForm
      userId={user.id}
      existingTerms={terms ?? []}
      defaultType={(searchParams.type === 'level_1' ? 'level_1' : 'level_2')}
      defaultElement={searchParams.element}
      defaultLevel1={searchParams.level1 ? decodeURIComponent(searchParams.level1) : undefined}
    />
  );
}
