'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { clsx } from 'clsx';

const navLinks = [
  { href: '/activities', label: 'Aktiviteter' },
  { href: '/routes', label: 'Ruter' },
  { href: '/my-rides', label: 'Mine ture' },
];

const adminLinks = [
  { href: '/admin/activities', label: 'Aktiviteter' },
  { href: '/admin/users', label: 'Medlemmer' },
];

export function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const pathname = usePathname();

  return (
    <header className={clsx(user ? 'hidden sm:block' : 'block', 'sticky top-0 z-40 bg-brand-50/70 backdrop-blur-md')}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-700 text-lg">
          <span>🚴</span>
          <span className="hidden sm:inline">Whitesparrow CC</span>
        </Link>

        {/* Nav links – hidden on mobile (handled by BottomNav) */}
        {user && (
          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname.startsWith(link.href)
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin &&
              adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    pathname.startsWith(link.href)
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  )}
                >
                  {link.label}
                </Link>
              ))}
          </nav>
        )}

        {/* Auth actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/profile" className="btn-secondary text-xs px-3 py-1.5">
                Profil
              </Link>
              <button onClick={logout} className="btn-secondary text-xs px-3 py-1.5">
                Log ud
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="btn-secondary text-xs px-3 py-1.5">
                Log ind
              </Link>
              <Link href="/register" className="btn-primary text-xs px-3 py-1.5">
                Bliv medlem
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
