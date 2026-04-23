import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ELEMENT_LABELS, ELEMENT_COLORS } from '@/constants/points';

export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const [
    { data: agreedTxns },
    { data: suggestions },
  ] = await Promise.all([
    // Terms the user agreed with — use source_id to look up the term
    supabase
      .from('points_transactions')
      .select('source_id, created_at')
      .eq('user_id', user.id)
      .eq('source_type', 'term_approved')
      .order('created_at', { ascending: false }),
    supabase
      .from('suggestions')
      .select('id, suggestion_type, field_name, status, proposed_value, proposed_term, created_at')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  // Fetch term details for agreed terms
  const termIds = (agreedTxns ?? []).map(t => t.source_id).filter(Boolean);
  const { data: agreedTerms } = termIds.length
    ? await supabase
        .from('taxonomy_terms')
        .select('id, term_code, element, level_1, level_2')
        .in('id', termIds)
    : { data: [] };

  const termMap = Object.fromEntries((agreedTerms ?? []).map(t => [t.id, t]));

  const suggestionsAccepted = (suggestions ?? []).filter(s => s.status === 'accepted').length;

  const statusStyle: Record<string, string> = {
    submitted: 'bg-yellow-100 text-yellow-700',
    accepted:  'bg-green-100 text-green-700',
    rejected:  'bg-red-100 text-red-700',
    draft:     'bg-gray-100 text-gray-500',
  };

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-xl font-bold text-gray-900 pt-2">My Activity</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '🤝', value: agreedTxns?.length ?? 0,  label: 'Agreed',    color: 'text-green-700' },
          { icon: '✏️', value: suggestions?.length ?? 0,  label: 'Suggested', color: 'text-blue-700'  },
          { icon: '✅', value: suggestionsAccepted,        label: 'Accepted',  color: 'text-emerald-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-xl">{s.icon}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Terms I agreed with */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-gray-700">Terms I agreed with ({agreedTxns?.length ?? 0})</h2>
        </div>
        {agreedTxns && agreedTxns.length > 0 ? (
          <div className="space-y-2">
            {agreedTxns.map((txn: any) => {
              const term = termMap[txn.source_id];
              if (!term) return null;
              const elColor = ELEMENT_COLORS[term.element] ?? 'bg-gray-100 text-gray-700';
              return (
                <Link
                  key={txn.source_id}
                  href={`/browse/${txn.source_id}`}
                  className="block bg-white rounded-xl border border-gray-100 p-3 hover:border-green-200 transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${elColor}`}>
                          {ELEMENT_LABELS[term.element] ?? term.element}
                        </span>
                        {term.level_1 && <span className="text-xs text-gray-400 truncate">{term.level_1}</span>}
                      </div>
                      <p className="font-medium text-gray-800 truncate">{term.level_2}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs text-green-600 font-medium">+10 pts</span>
                      <p className="text-xs text-gray-400 mt-0.5">{format(new Date(txn.created_at), 'MMM d')}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
            <p className="text-gray-400 text-sm">No agreements yet.</p>
            <Link href="/browse" className="mt-2 inline-block text-sm text-green-600 hover:underline">
              Browse terms to start →
            </Link>
          </div>
        )}
      </section>

      {/* My suggestions */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-gray-700">My suggestions ({suggestions?.length ?? 0})</h2>
        </div>
        {suggestions && suggestions.length > 0 ? (
          <div className="space-y-2">
            {suggestions.map((s: any) => {
              const isNewTerm = s.suggestion_type === 'new_term';
              const label = isNewTerm
                ? `New term: ${s.proposed_term?.level_2 ?? s.proposed_term?.level_1 ?? 'Proposal'}`
                : `Edit: ${s.field_name ?? s.suggestion_type}`;
              return (
                <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${isNewTerm ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {isNewTerm ? '📚 New term' : '✏️ Edit'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 truncate">{label}</p>
                      {!isNewTerm && s.proposed_value && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">"{s.proposed_value}"</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle[s.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {s.status}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{format(new Date(s.created_at), 'MMM d')}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
            <p className="text-gray-400 text-sm">No suggestions yet.</p>
            <Link href="/browse" className="mt-2 inline-block text-sm text-green-600 hover:underline">
              Browse to suggest an edit →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
