import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { LeaderboardEntry } from '@/types/database';

export default async function LeaderboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: entries } = await supabase
    .from('leaderboard')
    .select('*')
    .order('rank', { ascending: true })
    .limit(50);

  const currentEntry = (entries ?? []).find((e: LeaderboardEntry) => e.id === user.id);

  const { data: settings } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'reward_config')
    .single();

  const rewardConfig = settings?.value as { first_place_prize: string; prize_tool: string } | null;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900 pt-2">Leaderboard</h1>

      {/* Prize banner */}
      <div className="bg-gradient-to-r from-amber-400 to-yellow-400 rounded-2xl p-4 text-center">
        <p className="text-2xl mb-1">🏆</p>
        <p className="font-bold text-amber-900">Top contributor wins:</p>
        <p className="text-amber-800 font-semibold">{rewardConfig?.first_place_prize ?? 'Free 1-year subscription'}</p>
        {rewardConfig?.prize_tool && rewardConfig.prize_tool !== 'TBD' && (
          <p className="text-sm text-amber-700 mt-1">to {rewardConfig.prize_tool}</p>
        )}
      </div>

      {/* Current user (pinned) */}
      {currentEntry && (
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3">
          <p className="text-xs text-green-600 font-medium mb-1">Your rank</p>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-green-700">#{currentEntry.rank}</span>
            <div className="w-9 h-9 rounded-full bg-green-200 flex items-center justify-center font-bold text-green-800">
              {currentEntry.pseudonym.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{currentEntry.pseudonym}</p>
              <p className="text-xs text-gray-500">{currentEntry.reviews_done} reviews · {currentEntry.suggestions_accepted} accepted</p>
            </div>
            <span className="font-bold text-gray-900">{currentEntry.total_points} pts</span>
          </div>
        </div>
      )}

      {/* Top 3 podium */}
      {(entries ?? []).length >= 3 && (
        <div className="flex items-end gap-2 justify-center py-4">
          {[1, 0, 2].map(i => {
            const entry = (entries ?? [])[i] as LeaderboardEntry;
            if (!entry) return null;
            const podiumHeights = ['h-20', 'h-28', 'h-16'];
            const isYou = entry.id === user.id;
            return (
              <div key={entry.id} className={`flex flex-col items-center gap-1 w-24`}>
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-lg">
                  {entry.pseudonym.charAt(0).toUpperCase()}
                </div>
                <p className="text-xs font-medium text-center truncate w-full text-center">
                  {isYou ? 'You' : entry.pseudonym}
                </p>
                <p className="text-xs text-gray-500">{entry.total_points} pts</p>
                <div className={`w-full ${podiumHeights[i]} flex items-center justify-center rounded-t-xl ${
                  i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-300' : 'bg-amber-600'
                }`}>
                  <span className="text-2xl">{medals[i]}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="space-y-2">
        {(entries ?? []).slice(3).map((entry: LeaderboardEntry) => {
          const isYou = entry.id === user.id;
          return (
            <div
              key={entry.id}
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                isYou ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'
              }`}
            >
              <span className="w-7 text-center font-bold text-gray-500 text-sm">#{entry.rank}</span>
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-700">
                {entry.pseudonym.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {isYou ? `${entry.pseudonym} (you)` : entry.pseudonym}
                </p>
                <p className="text-xs text-gray-400">{entry.reviews_done} reviews · {entry.badges_earned} badges</p>
              </div>
              <span className="font-bold text-gray-800 whitespace-nowrap">{entry.total_points} pts</span>
            </div>
          );
        })}
      </div>

      {(entries ?? []).length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>No rankings yet.</p>
          <p className="text-sm mt-1">Be the first to complete a review!</p>
        </div>
      )}
    </div>
  );
}
