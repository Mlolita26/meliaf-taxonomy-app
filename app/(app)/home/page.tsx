import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const [
    { data: profile },
    { data: assignments },
    { data: rank },
    { count: totalTerms },
    { count: coveredTerms },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('review_assignments')
      .select('*, taxonomy_terms(term_code, element, level_2)')
      .eq('reviewer_id', user.id)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true })
      .limit(5),
    supabase
      .from('leaderboard')
      .select('rank, total_points')
      .eq('id', user.id)
      .single(),
    supabase
      .from('taxonomy_terms')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_proposed', false),
    supabase.rpc('count_covered_terms' as never),
  ]);

  // Fallback for covered terms count
  const { count: covered2 } = await supabase
    .from('review_assignments')
    .select('term_id', { count: 'exact', head: true })
    .eq('status', 'completed');

  const coveragePercent = Math.round(((covered2 ?? 0) / (totalTerms ?? 96)) * 50); // /2 reviewers

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Hi, {profile?.pseudonym ?? 'Reviewer'}! 👋
          </h1>
          <p className="text-sm text-gray-500">Today is {format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg font-bold text-green-700">
          {profile?.pseudonym?.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Streak banner */}
      {profile && profile.current_streak > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="font-semibold text-orange-800">Day {profile.current_streak} streak!</p>
            <p className="text-sm text-orange-600">+3 bonus points for staying consistent</p>
          </div>
        </div>
      )}

      {/* Points card */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-5 text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-green-100 text-sm">Your points</p>
            <p className="text-4xl font-bold mt-1">{profile?.total_points ?? 0}</p>
          </div>
          <div className="text-right">
            <p className="text-green-100 text-sm">Rank</p>
            <p className="text-2xl font-bold mt-1">#{rank?.rank ?? '–'}</p>
          </div>
        </div>
        <Link
          href="/leaderboard"
          className="mt-3 inline-block text-sm text-green-100 hover:text-white underline"
        >
          View leaderboard →
        </Link>
      </div>

      {/* Community progress */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-gray-800">Community progress</h2>
          <span className="text-sm text-gray-500">{Math.min(coveragePercent, 100)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-2 bg-green-500 rounded-full transition-all"
            style={{ width: `${Math.min(coveragePercent, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {Math.min(covered2 ?? 0, totalTerms ?? 96)}/{totalTerms ?? 96} terms fully reviewed
        </p>
      </div>

      {/* Review queue */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-gray-800">Your queue</h2>
          <Link href="/reviews" className="text-sm text-green-600 hover:underline">View all</Link>
        </div>

        {assignments && assignments.length > 0 ? (
          <div className="space-y-2">
            {assignments.map((a: any) => (
              <Link
                key={a.id}
                href={`/reviews/${a.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-green-200 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-mono text-gray-400">{a.taxonomy_terms?.term_code}</span>
                    <p className="font-medium text-gray-800 mt-0.5">{a.taxonomy_terms?.level_2}</p>
                    <span className="text-xs text-gray-500">{a.taxonomy_terms?.element}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {a.status === 'in_progress' ? 'In progress' : 'Pending'}
                    </span>
                    {a.due_date && (
                      <p className="text-xs text-gray-400 mt-1">
                        Due {format(new Date(a.due_date), 'MMM d')}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
            <p className="text-gray-400 text-sm">All caught up! 🎉</p>
            <p className="text-xs text-gray-300 mt-1">Check back soon or browse terms to propose new ones.</p>
            <Link
              href="/browse"
              className="mt-3 inline-block text-sm text-green-600 hover:underline"
            >
              Browse taxonomy →
            </Link>
          </div>
        )}
      </div>

      {/* Quick action */}
      <Link
        href="/reviews"
        className="block w-full py-3 text-center bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
      >
        Start reviewing
      </Link>
    </div>
  );
}
