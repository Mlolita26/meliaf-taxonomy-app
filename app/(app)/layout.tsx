import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppNav } from '@/components/layout/AppNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 max-w-2xl mx-auto w-full pb-20">
        {children}
      </div>
      <AppNav isAdmin={profile?.is_admin ?? false} />
    </div>
  );
}
