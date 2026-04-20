import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const [
    { count: totalTerms },
    { count: pendingSuggestions },
    { count: acceptedSuggestions },
    { count: totalUsers },
  ] = await Promise.all([
    supabase.from('taxonomy_terms').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_admin', false),
  ]);

  // Coverage: terms with 2 completed reviews
  const { data: assignmentCounts } = await supabase
    .from('review_assignments')
    .select('term_id')
    .eq('status', 'completed');

  const termReviewMap: Record<string, number> = {};
  (assignmentCounts ?? []).forEach((a: any) => {
    termReviewMap[a.term_id] = (termReviewMap[a.term_id] ?? 0) + 1;
  });
  const fullyReviewed = Object.values(termReviewMap).filter(c => c >= 2).length;
  const coveragePercent = Math.round((fullyReviewed / (totalTerms ?? 96)) * 100);

  const stats = [
    { label: 'Active terms', value: totalTerms ?? 0, href: '/admin/terms', color: 'bg-blue-50 text-blue-700' },
    { label: 'Pending review', value: pendingSuggestions ?? 0, href: '/admin/suggestions', color: 'bg-amber-50 text-amber-700' },
    { label: 'Accepted suggestions', value: acceptedSuggestions ?? 0, href: '/admin/suggestions', color: 'bg-green-50 text-green-700' },
    { label: 'Reviewers', value: totalUsers ?? 0, href: '/admin/users', color: 'bg-purple-50 text-purple-700' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Overview</h1>

      {/* Coverage */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-gray-800">Review coverage</h2>
          <span className="text-sm font-bold text-green-700">{coveragePercent}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-3 bg-green-500 rounded-full transition-all"
            style={{ width: `${coveragePercent}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {fullyReviewed}/{totalTerms ?? 96} terms have received 2 reviews
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(s => (
          <Link
            key={s.label}
            href={s.href}
            className={`${s.color} rounded-xl p-5 hover:opacity-80 transition-opacity`}
          >
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm mt-1 font-medium">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        <h2 className="font-semibold text-gray-800">Quick actions</h2>
        <Link
          href="/admin/suggestions"
          className="block w-full py-3 text-center bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-colors"
        >
          Review pending suggestions ({pendingSuggestions ?? 0})
        </Link>
        <Link
          href="/admin/terms"
          className="block w-full py-3 text-center border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Manage taxonomy terms
        </Link>
      </div>
    </div>
  );
}
