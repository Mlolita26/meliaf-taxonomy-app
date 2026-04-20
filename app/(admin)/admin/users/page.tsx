import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

export default async function AdminUsersPage() {
  const supabase = createClient();

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('total_points', { ascending: false });

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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Pseudonym</th>
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
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">@{u.pseudonym}</td>
                  <td className="px-3 py-2 text-gray-500">{u.institution ?? '–'}</td>
                  <td className="px-3 py-2 font-semibold text-green-700">{u.total_points}</td>
                  <td className="px-3 py-2 text-gray-600">{counts.done}/{counts.total}</td>
                  <td className="px-3 py-2 text-orange-600">🔥 {u.current_streak}d</td>
                  <td className="px-3 py-2 text-gray-400 text-xs">
                    {format(new Date(u.created_at), 'MMM d, yyyy')}
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
