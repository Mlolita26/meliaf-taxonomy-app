import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
import { SignOutButton } from '@/components/layout/SignOutButton';
import type { UserBadgeWithDef } from '@/types/database';

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const [
    { data: profile },
    { data: earnedBadges },
    { data: allBadges },
    { count: termsAgreed },
    { count: suggestionsMade },
    { count: suggestionsAccepted },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('user_badges')
      .select('*, badge_definitions(*)')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false }),
    supabase.from('badge_definitions').select('*').eq('is_hidden', false).order('sort_order'),
    supabase.from('points_transactions').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('source_type', 'term_approved'),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('author_id', user.id).eq('status', 'accepted'),
  ]);

  const earnedBadgeIds = new Set((earnedBadges ?? []).map((ub: any) => ub.badge_id));

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-xl font-bold text-gray-900 pt-2">Profile</h1>

      {/* Avatar + identity */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl font-bold text-green-700">
          {profile?.pseudonym?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">@{profile?.pseudonym}</h2>
          {profile?.institution && (
            <p className="text-sm text-gray-500 mt-0.5">{profile.institution}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            🔥 {profile?.current_streak ?? 0}-day streak · best: {profile?.longest_streak ?? 0} days
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total points', value: profile?.total_points ?? 0, color: 'text-green-700' },
          { label: 'Terms agreed', value: termsAgreed ?? 0, color: 'text-blue-700' },
          { label: 'Suggestions', value: suggestionsMade ?? 0, color: 'text-purple-700' },
          { label: 'Accepted', value: suggestionsAccepted ?? 0, color: 'text-emerald-700' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3">
          Badges ({earnedBadges?.length ?? 0}/{(allBadges ?? []).length})
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {(allBadges ?? []).map((badge: any) => {
            const earned = earnedBadgeIds.has(badge.id);
            return (
              <div
                key={badge.id}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl ${
                  earned ? 'bg-white border border-gray-100' : 'bg-gray-50 opacity-40'
                }`}
                title={`${badge.name}: ${badge.description}`}
              >
                <span className="text-2xl">{badge.icon}</span>
                <span className="text-xs text-center text-gray-600 leading-tight">{badge.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <Link
          href="/home"
          className="block w-full py-2.5 text-center border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm"
        >
          Back to home
        </Link>
        <SignOutButton />
      </div>
    </div>
  );
}
