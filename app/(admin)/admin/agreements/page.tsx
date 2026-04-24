import { createClient } from '@/lib/supabase/server';
import { ELEMENT_LABELS, ELEMENT_COLORS } from '@/constants/points';

export const dynamic = 'force-dynamic';

export default async function AdminAgreementsPage() {
  const supabase = createClient();

  const { data: txns } = await supabase
    .from('points_transactions')
    .select('id, user_id, source_id, created_at')
    .eq('source_type', 'term_approved')
    .not('source_id', 'is', null)
    .order('created_at', { ascending: false });

  const userIds = Array.from(new Set((txns ?? []).map((t: any) => t.user_id)));
  const termIds = Array.from(new Set((txns ?? []).map((t: any) => t.source_id).filter(Boolean)));

  const [{ data: profiles }, { data: terms }] = await Promise.all([
    userIds.length
      ? supabase.from('profiles').select('id, pseudonym, institution').in('id', userIds)
      : Promise.resolve({ data: [] }),
    termIds.length
      ? supabase.from('taxonomy_terms').select('id, element, level_1, level_2').in('id', termIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
  const termMap    = Object.fromEntries((terms ?? []).map((t: any) => [t.id, t]));

  // Compute per-term agreement counts for the summary header
  const termAgreeCount: Record<string, number> = {};
  (txns ?? []).forEach((t: any) => {
    termAgreeCount[t.source_id] = (termAgreeCount[t.source_id] ?? 0) + 1;
  });
  const uniqueTermsWithTwoPlus = Object.values(termAgreeCount).filter(c => c >= 2).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Agreements</h1>
        <div className="text-sm text-gray-500">
          {(txns ?? []).length} total · {uniqueTermsWithTwoPlus} terms validated by 2+ users
        </div>
      </div>

      <div className="space-y-2">
        {(txns ?? []).map((txn: any) => {
          const profile = profileMap[txn.user_id];
          const term    = termMap[txn.source_id];
          const elColor = term ? (ELEMENT_COLORS[term.element] ?? 'bg-gray-100 text-gray-700') : 'bg-gray-100 text-gray-700';
          return (
            <div key={txn.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 flex-shrink-0">
                {profile?.pseudonym?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-gray-900">@{profile?.pseudonym ?? 'unknown'}</span>
                  <span className="text-xs text-gray-400">agreed with</span>
                  {term && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${elColor}`}>
                      {ELEMENT_LABELS[term.element] ?? term.element}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 truncate mt-0.5">
                  {term ? (term.level_2 ?? term.level_1 ?? '—') : <span className="text-gray-400 italic">Term deleted</span>}
                </p>
                {term?.level_1 && term?.level_2 && (
                  <p className="text-xs text-gray-400 truncate">{term.level_1}</p>
                )}
              </div>
              <p className="text-xs text-gray-400 flex-shrink-0">
                {new Date(txn.created_at).toLocaleDateString()}
              </p>
            </div>
          );
        })}

        {(txns ?? []).length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>No agreements yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
