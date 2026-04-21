'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/home',        icon: '🏠', label: 'Home' },
  { href: '/browse',      icon: '🔍', label: 'Browse' },
  { href: '/reviews',     icon: '📝', label: 'Reviews' },
  { href: '/leaderboard', icon: '🏆', label: 'Ranks' },
  { href: '/profile',     icon: '👤', label: 'Profile' },
];

export function AppNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
      <div className="max-w-2xl mx-auto flex">
        {NAV_ITEMS.map(({ href, icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 text-xs transition-colors ${
                active ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-xl leading-none">{icon}</span>
              <span className={active ? 'font-semibold' : ''}>{label}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin"
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 text-xs transition-colors ${
              pathname.startsWith('/admin') ? 'text-purple-600' : 'text-purple-400 hover:text-purple-600'
            }`}
          >
            <span className="text-xl leading-none">⚙️</span>
            <span className={pathname.startsWith('/admin') ? 'font-semibold' : ''}>Admin</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
