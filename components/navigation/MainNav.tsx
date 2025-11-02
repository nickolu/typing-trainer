'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function MainNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Typing Test' },
    { href: '/stats', label: 'Stats' },
    { href: '/settings', label: 'Settings' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/updates', label: 'Updates' },
  ];

  return (
    <nav className="bg-editor-bg border-b border-editor-muted">
      <div className="max-w-6xl mx-auto px-8">
        <div className="flex items-center h-16 justify-center">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-editor-fg hover:text-editor-accent transition-colors">
              CunningType
            </Link>
            <div className="flex gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`font-medium transition-colors ${
                    pathname === item.href
                      ? 'text-editor-accent'
                      : 'text-editor-muted hover:text-editor-fg'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
