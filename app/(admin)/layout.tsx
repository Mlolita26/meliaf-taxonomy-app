import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) redirect('/home');

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-amber-600 text-white px-4 py-3 flex items-center gap-3">
        <span className="text-xl">⚙️</span>
        <span className="font-bold">Admin Dashboard</span>
        <Link href="/home" className="ml-auto text-sm text-amber-100 hover:text-white">
          ← Back to app
        </Link>
      </header>
      <nav className="bg-white border-b border-gray-200 px-4 flex gap-4 text-sm overflow-x-auto">
        {[
          { href: '/admin', label: 'Overview' },
          { href: '/admin/suggestions', label: 'Suggestions' },
          { href: '/admin/agreements', label: 'Agreements' },
          { href: '/admin/terms', label: 'Terms' },
          { href: '/admin/users', label: 'Users' },
        ].map(n => (
          <Link key={n.href} href={n.href} className="py-3 font-medium text-gray-600 hover:text-amber-700 whitespace-nowrap">
            {n.label}
          </Link>
        ))}
      </nav>
      <main className="max-w-4xl mx-auto p-4">{children}</main>
    </div>
  );
}
