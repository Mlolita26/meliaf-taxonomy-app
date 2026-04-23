import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const [
    { count: totalTerms },
    { count: pendingSuggestions },
    { data: profiles },
    { data: agreements },
    { data: suggestions },
  ] = await Promise.all([
    supabase.from('taxonomy_terms').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('profiles').select('id, pseudonym, total_points, institution').eq('is_admin', false).order('total_points', { ascending: false }),
    supabase.from('points_transactions').select('user_id').eq('source_type', 'term_approved'),
    supabase.from('suggestions').select('id, suggestion_type, status, author_id, proposed_term, field_name, created_at').order('created_at', { ascending: false }),
  ]);

  // ── Compute stats ──────────────────────────────────────────────
  const allSugs         = suggestions ?? [];
  const fieldEdits      = allSugs.filter(s => s.suggestion_type === 'field_edit');
  const newTermProps    = allSugs.filter(s => s.suggestion_type === 'new_term');
  const accepted        = allSugs.filter(s => s.status === 'accepted');
  const acceptedEdits   = accepted.filter(s => s.suggestion_type === 'field_edit');
  const acceptedNewTerms= accepted.filter(s => s.suggestion_type === 'new_term');

  const l1Proposals  = newTermProps.filter(s => !s.proposed_term?.level_2);
  const l2Proposals  = newTermProps.filter(s =>  s.proposed_term?.level_2);
  const l1Accepted   = acceptedNewTerms.filter(s => !s.proposed_term?.level_2);
  const l2Accepted   = acceptedNewTerms.filter(s =>  s.proposed_term?.level_2);

  const agreementsCount = (agreements ?? []).length;
  const coveragePct     = Math.min(Math.round((agreementsCount / (totalTerms ?? 96)) * 100), 100);

  // Per-user stats
  const agreementsByUser: Record<string, number> = {};
  (agreements ?? []).forEach((a: any) => {
    agreementsByUser[a.user_id] = (agreementsByUser[a.user_id] ?? 0) + 1;
  });

  const suggestionsByUser: Record<string, { edits: number; editsAccepted: number; terms: number; termsAccepted: number }> = {};
  allSugs.forEach((s: any) => {
    const uid = s.author_id;
    if (!suggestionsByUser[uid]) suggestionsByUser[uid] = { edits: 0, editsAccepted: 0, terms: 0, termsAccepted: 0 };
    if (s.suggestion_type === 'field_edit') {
      suggestionsByUser[uid].edits++;
      if (s.status === 'accepted') suggestionsByUser[uid].editsAccepted++;
    } else {
      suggestionsByUser[uid].terms++;
      if (s.status === 'accepted') suggestionsByUser[uid].termsAccepted++;
    }
  });

  const userRows = (profiles ?? []).map(p => ({
    ...p,
    agreements:    agreementsByUser[p.id] ?? 0,
    ...( suggestionsByUser[p.id] ?? { edits: 0, editsAccepted: 0, terms: 0, termsAccepted: 0 }),
  }));

  const topStats = [
    { label: 'Terms in taxonomy', value: totalTerms ?? 0,        color: 'bg-blue-50 text-blue-700',    href: '/admin/terms' },
    { label: 'Pending review',    value: pendingSuggestions ?? 0, color: 'bg-amber-50 text-amber-700',  href: '/admin/suggestions' },
    { label: 'Agreements',        value: agreementsCount,         color: 'bg-green-50 text-green-700',  href: null },
    { label: 'Reviewers',         value: (profiles ?? []).length, color: 'bg-purple-50 text-purple-700',href: '/admin/users' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Overview</h1>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3">
        {topStats.map(s => {
          const inner = (
            <div key={s.label} className={`${s.color} rounded-xl p-4 ${s.href ? 'hover:opacity-80 transition-opacity' : ''}`}>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-sm font-medium mt-1">{s.label}</p>
            </div>
          );
          return s.href ? <Link key={s.label} href={s.href}>{inner}</Link> : <div key={s.label}>{inner}</div>;
        })}
      </div>

      {/* Community engagement bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-gray-800">Community engagement</h2>
          <span className="text-sm font-bold text-green-700">{coveragePct}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" style={{ width: `${coveragePct}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-1">{agreementsCount} total agreements across {totalTerms ?? 96} terms</p>
      </div>

      {/* Suggestions breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Contributions breakdown</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Field edits submitted',  value: fieldEdits.length },
            { label: 'Field edits accepted',   value: acceptedEdits.length },
            { label: 'New terms proposed',     value: newTermProps.length },
            { label: 'New terms accepted',     value: acceptedNewTerms.length },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* New terms by level */}
        {newTermProps.length > 0 && (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <p className="text-sm font-medium text-gray-700">New terms by level</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Level 1 proposed',  value: l1Proposals.length,  sub: `${l1Accepted.length} accepted`,  color: 'bg-purple-50 text-purple-700' },
                { label: 'Level 2 proposed',  value: l2Proposals.length,  sub: `${l2Accepted.length} accepted`,  color: 'bg-blue-50 text-blue-700' },
              ].map(s => (
                <div key={s.label} className={`${s.color} rounded-lg p-3`}>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs font-medium">{s.label}</p>
                  <p className="text-xs opacity-70 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Per-user table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Per reviewer</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Reviewer</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Pts</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">🤝</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Edits</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">✅</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">New</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">✅</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {userRows.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-800">{u.pseudonym}</p>
                    {u.institution && <p className="text-xs text-gray-400">{u.institution}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold text-green-700">{u.total_points}</td>
                  <td className="px-3 py-2.5 text-center text-gray-700">{u.agreements}</td>
                  <td className="px-3 py-2.5 text-center text-gray-700">{u.edits}</td>
                  <td className="px-3 py-2.5 text-center text-gray-700">{u.editsAccepted}</td>
                  <td className="px-3 py-2.5 text-center text-gray-700">{u.terms}</td>
                  <td className="px-3 py-2.5 text-center text-gray-700">{u.termsAccepted}</td>
                </tr>
              ))}
              {userRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No reviewers yet.</td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-4 py-2">🤝 = agreements · Edits = field edits submitted · New = new terms proposed · ✅ = accepted</p>
        </div>
      </div>

      {/* Quick action */}
      <Link
        href="/admin/suggestions"
        className="block w-full py-3 text-center bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-colors"
      >
        Review pending suggestions ({pendingSuggestions ?? 0})
      </Link>
    </div>
  );
}
