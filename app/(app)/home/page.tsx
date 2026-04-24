import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const [
    { data: profile },
    { count: totalTerms },
    { count: totalUsers },
    { data: agreementRows },
    { count: totalAgreements },
    { count: totalSuggestions },
    { count: acceptedSuggestions },
    { count: newTermsProposed },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('taxonomy_terms').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('is_proposed', false),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('points_transactions').select('source_id, user_id').eq('source_type', 'term_approved').not('source_id', 'is', null),
    supabase.from('points_transactions').select('*', { count: 'exact', head: true }).eq('source_type', 'term_approved'),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('suggestion_type', 'new_term'),
  ]);

  // Rank = how many non-admin users have strictly more points, + 1
  const { count: aboveMe } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gt('total_points', profile?.total_points ?? 0);

  const userRank = (aboveMe ?? 0) + 1;

  // Count terms validated by 2+ distinct users
  const termUsers: Record<string, Set<string>> = {};
  (agreementRows ?? []).forEach((a: any) => {
    if (!termUsers[a.source_id]) termUsers[a.source_id] = new Set();
    termUsers[a.source_id].add(a.user_id);
  });
  const coveredTerms = Object.values(termUsers).filter(s => s.size >= 2).length;
  const coveragePct  = Math.min(Math.round((coveredTerms / (totalTerms ?? 96)) * 100), 100);

  return (
    <div className="p-4 space-y-4">
      {/* Header — avatar is clickable → profile */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Hi, {profile?.pseudonym ?? 'Reviewer'}! 👋
          </h1>
          <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <Link
          href="/profile"
          className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg font-bold text-green-700 hover:bg-green-200 transition-colors"
          title="View profile"
        >
          {profile?.pseudonym?.charAt(0).toUpperCase()}
        </Link>
      </div>

      {/* Streak banner */}
      {profile && profile.current_streak > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="font-semibold text-orange-800">Day {profile.current_streak} streak!</p>
            <p className="text-sm text-orange-600">Keep contributing to maintain it</p>
          </div>
        </div>
      )}

      {/* Points + rank card */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-5 text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-green-100 text-sm">Your points</p>
            <p className="text-4xl font-bold mt-1">{profile?.total_points ?? 0}</p>
          </div>
          <div className="text-right">
            <p className="text-green-100 text-sm">Your rank</p>
            <p className="text-2xl font-bold mt-1">
              #{userRank}
              <span className="text-sm font-normal text-green-200 ml-1">/ {totalUsers ?? '–'}</span>
            </p>
          </div>
        </div>
        <Link href="/leaderboard" className="mt-3 inline-block text-sm text-green-100 hover:text-white underline">
          View leaderboard →
        </Link>
      </div>

      {/* Community progress */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">Community progress</h2>
          <span className="text-sm font-bold text-green-600">{coveragePct}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-2.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
            style={{ width: `${coveragePct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400">{coveredTerms} terms validated by 2+ reviewers · {totalTerms ?? 96} total</p>

        {/* Activity row */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {[
            { icon: '🤝', value: totalAgreements ?? 0,   label: 'agreed' },
            { icon: '✏️', value: totalSuggestions ?? 0,  label: 'suggestions' },
            { icon: '✅', value: acceptedSuggestions ?? 0, label: 'accepted' },
            { icon: '📚', value: newTermsProposed ?? 0,  label: 'proposed' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-xl leading-none">{s.icon}</p>
              <p className="text-base font-bold text-gray-800 mt-1">{s.value}</p>
              <p className="text-xs text-gray-400 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/browse"
          className="flex flex-col items-center gap-2 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors text-sm text-center"
        >
          <span className="text-2xl">🔍</span>
          Browse & review terms
        </Link>
        <Link
          href="/propose"
          className="flex flex-col items-center gap-2 py-4 bg-white border border-gray-200 hover:border-green-300 text-gray-700 font-semibold rounded-xl transition-colors text-sm text-center"
        >
          <span className="text-2xl">📚</span>
          Propose new term
        </Link>
      </div>
    </div>
  );
}
