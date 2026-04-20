import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ELEMENT_LABELS, ELEMENT_COLORS } from '@/constants/points';

export default async function ReviewsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const [
    { data: queue },
    { data: completed },
    { data: suggestions },
  ] = await Promise.all([
    supabase
      .from('review_assignments')
      .select('*, taxonomy_terms(id, term_code, element, level_1, level_2)')
      .eq('reviewer_id', user.id)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true }),
    supabase
      .from('review_assignments')
      .select('*, taxonomy_terms(id, term_code, element, level_2)')
      .eq('reviewer_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(20),
    supabase
      .from('suggestions')
      .select('*, taxonomy_terms(term_code, level_2)')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      submitted: 'bg-yellow-100 text-yellow-700',
      accepted:  'bg-green-100 text-green-700',
      rejected:  'bg-red-100 text-red-700',
      draft:     'bg-gray-100 text-gray-600',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900 pt-2">My Reviews</h1>

      {/* Queue */}
      <section>
        <h2 className="font-semibold text-gray-700 mb-2">Queue ({queue?.length ?? 0})</h2>
        {queue && queue.length > 0 ? (
          <div className="space-y-2">
            {queue.map((a: any) => {
              const elColor = ELEMENT_COLORS[a.taxonomy_terms?.element] ?? 'bg-gray-100 text-gray-700';
              return (
                <Link
                  key={a.id}
                  href={`/reviews/${a.id}`}
                  className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-green-200 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">{a.taxonomy_terms?.term_code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${elColor}`}>
                          {ELEMENT_LABELS[a.taxonomy_terms?.element] ?? a.taxonomy_terms?.element}
                        </span>
                      </div>
                      <p className="font-medium text-gray-800">{a.taxonomy_terms?.level_2}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {a.status === 'in_progress' ? 'In progress' : 'Pending'}
                      </span>
                      {a.due_date && (
                        <p className="text-xs text-gray-400 mt-1">Due {format(new Date(a.due_date), 'MMM d')}</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
            <p className="text-gray-400">No pending reviews. Check back soon!</p>
            <Link href="/browse" className="mt-2 inline-block text-sm text-green-600 hover:underline">
              Browse taxonomy →
            </Link>
          </div>
        )}
      </section>

      {/* Completed */}
      <section>
        <h2 className="font-semibold text-gray-700 mb-2">Completed ({completed?.length ?? 0})</h2>
        {completed && completed.length > 0 ? (
          <div className="space-y-2">
            {completed.map((a: any) => (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-mono text-gray-400">{a.taxonomy_terms?.term_code}</span>
                    <p className="font-medium text-gray-700">{a.taxonomy_terms?.level_2}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Done ✓</span>
                    {a.completed_at && (
                      <p className="text-xs text-gray-400 mt-1">{format(new Date(a.completed_at), 'MMM d')}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 pl-1">No completed reviews yet.</p>
        )}
      </section>

      {/* Suggestions */}
      <section>
        <h2 className="font-semibold text-gray-700 mb-2">My suggestions ({suggestions?.length ?? 0})</h2>
        {suggestions && suggestions.length > 0 ? (
          <div className="space-y-2">
            {suggestions.map((s: any) => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">
                      {s.taxonomy_terms?.term_code} · {s.field_name ?? s.suggestion_type}
                    </p>
                    <p className="text-sm text-gray-700 mt-0.5 truncate">{s.proposed_value ?? 'New term proposal'}</p>
                    {s.admin_note && (
                      <p className="text-xs text-gray-500 mt-1 italic">Admin: {s.admin_note}</p>
                    )}
                  </div>
                  <span className={`ml-2 flex-shrink-0 text-xs px-2 py-1 rounded-full ${statusBadge(s.status)}`}>
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 pl-1">No suggestions yet.</p>
        )}
      </section>
    </div>
  );
}
