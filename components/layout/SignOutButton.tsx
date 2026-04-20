'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router   = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="w-full py-2.5 text-center text-red-600 border border-red-100 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium"
    >
      Sign out
    </button>
  );
}
