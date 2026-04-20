import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProposeTermForm } from '@/components/review/ProposeTermForm';

export default async function ProposeTermPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  // Get existing level_1 values per element for the cascade dropdowns
  const { data: terms } = await supabase
    .from('taxonomy_terms')
    .select('element, level_1, level_2')
    .eq('is_active', true)
    .order('element');

  return <ProposeTermForm userId={user.id} existingTerms={terms ?? []} />;
}
