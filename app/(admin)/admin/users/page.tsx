import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const supabase = createClient();

  // Fetch profiles
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('total_points', { ascending: false });

  // Fetch user emails via SECURITY DEFINER RPC (reads auth.users, works with service role)
  const emailMap: Record<string, string> = {};
  try {
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: emailRows, error: emailErr } = await adminClient
      .rpc('get_user_emails_for_admin');
    if (emailErr) console.error('[admin/users] email RPC error:', emailErr.message);
    (emailRows ?? []).forEach((r: any) => {
      emailMap[r.id] = r.email ?? '';
    });
  } catch (e: any) {
    console.error('[admin/users] email fetch threw:', e?.message);
  }

  const { data: assignmentCounts } = await supabase
    .from('review_assignments')
    .select('reviewer_id, status');

  const countsByUser: Record<string, { total: number; done: number }> = {};
  (assignmentCounts ?? []).forEach((a: any) => {
    if (!countsByUser[a.reviewer_id]) countsByUser[a.reviewer_id] = { total: 0, done: 0 };
    countsByUser[a.reviewer_id].total++;
    if (a.status === 'completed') countsByUser[a.reviewer_id].done++;
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Users ({(users ?? []).length})</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Pseudonym</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Email</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Institution</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Points</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Reviews</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Streak</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Joined</th>
              <th className="px-3 py-2 font-medium text-gray-600">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(users ?? []).map((u: any) => {
              const counts = countsByUser[u.id] ?? { total: 0, done: 0 };
              const email  = emailMap[u.id] ?? '—';
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">@{u.pseudonym}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{email}</td>
                  <td className="px-3 py-2 text-gray-500">{u.institution ?? '–'}</td>
                  <td className="px-3 py-2 font-semibold text-green-700">{u.total_points}</td>
                  <td className="px-3 py-2 text-gray-600">{counts.done}/{counts.total}</td>
                  <td className="px-3 py-2 text-orange-600">🔥 {u.current_streak}d</td>
                  <td className="px-3 py-2 text-gray-400 text-xs">
                    {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      u.is_admin ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.is_admin ? 'Admin' : 'Reviewer'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
