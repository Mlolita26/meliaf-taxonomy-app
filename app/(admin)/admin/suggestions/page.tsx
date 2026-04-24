import { createClient } from '@/lib/supabase/server';
import { AdminSuggestionActions } from '@/components/admin/AdminSuggestionActions';

interface SearchParams { status?: string }

export default async function AdminSuggestionsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const status = searchParams.status ?? 'submitted';

  const { data: suggestions } = await supabase
    .from('suggestions')
    .select(`
      *,
      profiles!suggestions_author_id_fkey(pseudonym, institution),
      taxonomy_terms(term_code, element, level_1, level_2)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false });

  const statusOptions = ['submitted', 'accepted', 'rejected', 'draft'];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Suggestions</h1>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {statusOptions.map(s => (
          <a
            key={s}
            href={`/admin/suggestions?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              s === status
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </a>
        ))}
      </div>

      <div className="space-y-3">
        {(suggestions ?? []).map((s: any) => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">
                  {s.taxonomy_terms
                    ? (s.taxonomy_terms.level_2 ?? s.taxonomy_terms.level_1 ?? s.taxonomy_terms.term_code)
                    : 'New term'}
                  {' · '}{s.field_name ?? s.suggestion_type}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  by @{s.profiles?.pseudonym} · {new Date(s.created_at).toLocaleDateString()}
                  {s.confidence && ` · ${s.confidence}⭐ confidence`}
                </p>
              </div>
              {s.is_major_change && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Major change</span>
              )}
            </div>

            {/* Diff */}
            {s.suggestion_type === 'field_edit' && (
              <div className="space-y-2 text-sm">
                {s.original_value && (
                  <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <span className="text-xs font-medium block mb-1">Current:</span>
                    {s.original_value}
                  </div>
                )}
                <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-800">
                  <span className="text-xs font-medium block mb-1">Proposed:</span>
                  {s.proposed_value}
                </div>
              </div>
            )}

            {s.suggestion_type === 'new_term' && s.proposed_term && (
              <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="font-medium text-blue-800 mb-1">New term proposal</p>
                <p className="text-blue-700">
                  {(s.proposed_term as any).element} / {(s.proposed_term as any).level_1} / {(s.proposed_term as any).level_2}
                </p>
                <p className="text-blue-600 text-xs mt-1">{(s.proposed_term as any).definition}</p>
              </div>
            )}

            {s.rationale && (
              <p className="text-sm text-gray-500 italic">&quot;{s.rationale}&quot;</p>
            )}

            {/* Admin note (if rejected) */}
            {s.admin_note && (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">Admin: {s.admin_note}</p>
            )}

            {/* Actions */}
            {status === 'submitted' && (
              <AdminSuggestionActions suggestion={s} />
            )}
          </div>
        ))}

        {(suggestions ?? []).length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No {status} suggestions.
          </div>
        )}
      </div>
    </div>
  );
}
