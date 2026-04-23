import { createClient } from '@/lib/supabase/server';
import { ELEMENT_LABELS, ELEMENT_COLORS } from '@/constants/points';
import { format } from 'date-fns';

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  in_review: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  skipped:   'bg-gray-100 text-gray-500',
};

export default async function AdminAssignmentsPage() {
  const supabase = createClient();

  // Fetch all assignments with term and reviewer info
  const { data: raw } = await supabase
    .from('review_assignments')
    .select(`
      id, status, due_date, created_at,
      taxonomy_terms ( id, term_code, element, level_1, level_2 ),
      profiles ( pseudonym )
    `)
    .order('due_date', { ascending: true });

  const assignments = raw ?? [];

  // Group by term so we can show both reviewers per term on one row
  const byTerm: Record<string, {
    term: any;
    reviewers: { pseudonym: string; status: string; due_date: string }[];
  }> = {};

  for (const a of assignments) {
    const term = (a as any).taxonomy_terms;
    if (!term) continue;
    const tid = term.id;
    if (!byTerm[tid]) byTerm[tid] = { term, reviewers: [] };
    byTerm[tid].reviewers.push({
      pseudonym: (a as any).profiles?.pseudonym ?? '—',
      status:    a.status,
      due_date:  a.due_date,
    });
  }

  const rows = Object.values(byTerm);
  const totalAssigned  = rows.length;
  const totalCompleted = rows.filter(r => r.reviewers.every(rv => rv.status === 'completed')).length;
  const totalPending   = rows.filter(r => r.reviewers.some(rv => rv.status === 'pending')).length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Term Assignments</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Terms assigned', value: totalAssigned,  color: 'bg-blue-50 text-blue-700' },
          { label: 'Fully reviewed', value: totalCompleted, color: 'bg-green-50 text-green-700' },
          { label: 'Pending',        value: totalPending,   color: 'bg-amber-50 text-amber-700' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-4`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Term</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Element</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Level 1</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Reviewer 1</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Reviewer 2</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(({ term, reviewers }) => {
              const elColor = ELEMENT_COLORS[term.element] ?? 'bg-gray-100 text-gray-700';
              return (
                <tr key={term.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-800">{term.level_2 ?? term.level_1 ?? '—'}</p>
                    <p className="text-xs text-gray-400 font-mono">{term.term_code}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${elColor}`}>
                      {ELEMENT_LABELS[term.element] ?? term.element}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">{term.level_1 ?? '—'}</td>
                  {[0, 1].map(i => {
                    const rv = reviewers[i];
                    return (
                      <td key={i} className="px-3 py-2">
                        {rv ? (
                          <div>
                            <p className="font-medium text-gray-700">@{rv.pseudonym}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_STYLES[rv.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                {rv.status}
                              </span>
                              {rv.due_date && (
                                <span className="text-xs text-gray-400">
                                  due {format(new Date(rv.due_date), 'dd MMM')}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-400">
                  No assignments yet. Run the assign-reviews edge function to create them.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
