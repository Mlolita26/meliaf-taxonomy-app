import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const [
    { data: profiles },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, pseudonym, total_points, institution')
      .eq('is_admin', false)
      .order('total_points', { ascending: false }),
    supabase.from('app_settings').select('value').eq('key', 'reward_config').single(),
  ]);

  const rewardConfig = settings?.value as { first_place_prize: string; prize_tool: string } | null;

  // Rank with tie handling
  let rank = 1;
  const ranked = (profiles ?? []).map((p, i, arr) => {
    if (i > 0 && p.total_points < arr[i - 1].total_points) rank = i + 1;
    return { ...p, rank };
  });

  const top3    = ranked.slice(0, 3);
  const rest    = ranked.slice(3);
  const myEntry = ranked.find(e => e.id === user.id);

  // Podium order: 2nd, 1st, 3rd (visual)
  const podiumOrder = [1, 0, 2];
  const podiumHeights = ['h-20', 'h-28', 'h-16'];
  const podiumColors  = ['bg-gray-300', 'bg-yellow-400', 'bg-amber-600'];
  const medals        = ['🥇', '🥈', '🥉'];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900 pt-2">Leaderboard</h1>

      {/* Prize banner */}
      <div className="bg-gradient-to-r from-amber-400 to-yellow-400 rounded-2xl p-4 text-center shadow-sm">
        <p className="text-2xl mb-1">🏆</p>
        <p className="font-bold text-amber-900">Top contributor wins:</p>
        <p className="text-amber-800 font-semibold">{rewardConfig?.first_place_prize ?? 'Free 1-year subscription'}</p>
        {rewardConfig?.prize_tool && rewardConfig.prize_tool !== 'TBD' && (
          <p className="text-sm text-amber-700 mt-1">to {rewardConfig.prize_tool}</p>
        )}
      </div>

      {/* Your rank (pinned) */}
      {myEntry && (
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3">
          <p className="text-xs text-green-600 font-medium mb-1">Your rank</p>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-green-700">#{myEntry.rank}</span>
            <div className="w-9 h-9 rounded-full bg-green-200 flex items-center justify-center font-bold text-green-800 text-lg">
              {myEntry.pseudonym.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{myEntry.pseudonym}</p>
              {myEntry.institution && <p className="text-xs text-gray-400 truncate">{myEntry.institution}</p>}
            </div>
            <span className="font-black text-gray-900">{myEntry.total_points} pts</span>
          </div>
        </div>
      )}

      {/* Top-3 podium */}
      {top3.length >= 2 && (
        <div className="flex items-end justify-center gap-3 py-4">
          {podiumOrder.map(i => {
            const entry = top3[i];
            if (!entry) return null;
            const isYou = entry.id === user.id;
            return (
              <div key={entry.id} className="flex flex-col items-center gap-1 w-24">
                {isYou && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">You</span>}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl border-4 ${
                  i === 0 ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                  : i === 1 ? 'border-gray-300 bg-gray-50 text-gray-600'
                  : 'border-amber-600 bg-amber-50 text-amber-700'
                }`}>
                  {entry.pseudonym.charAt(0).toUpperCase()}
                </div>
                <p className="text-xs font-semibold text-center truncate w-full">{entry.pseudonym}</p>
                <p className="text-xs text-gray-500 font-bold">{entry.total_points} pts</p>
                <div className={`w-full ${podiumHeights[i]} ${podiumColors[i]} flex items-center justify-center rounded-t-xl`}>
                  <span className="text-2xl">{medals[i]}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="space-y-2">
        {rest.map(entry => {
          const isYou = entry.id === user.id;
          return (
            <div
              key={entry.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                isYou ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'
              }`}
            >
              <span className="w-8 text-center font-bold text-gray-400 text-sm">#{entry.rank}</span>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm ${
                isYou ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {entry.pseudonym.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {entry.pseudonym}{isYou ? ' (you)' : ''}
                </p>
                {entry.institution && (
                  <p className="text-xs text-gray-400 truncate">{entry.institution}</p>
                )}
              </div>
              <span className={`font-bold whitespace-nowrap ${entry.total_points > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                {entry.total_points} pts
              </span>
            </div>
          );
        })}
      </div>

      {ranked.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">🌱</p>
          <p>No reviewers yet.</p>
          <p className="text-sm mt-1">Be the first to earn points!</p>
        </div>
      )}
    </div>
  );
}
