'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { clsx } from 'clsx';

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.75L12 3l9 6.75V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.75z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function BikeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M15 6a1 1 0 0 0-1-1h-1" />
      <path d="M8.5 17.5 9 11l4 2 2-4h3" />
      <path d="M9 11 5.5 17.5" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const adminSubItems = [
  { href: '/admin/activities', label: 'Aktiviteter', icon: CalendarIcon },
  { href: '/admin/users', label: 'Medlemmer', icon: UsersIcon },
];

export function BottomNav() {
  const { user, isAdmin, logout } = useAuth();
  const pathname = usePathname();
  const [adminOpen, setAdminOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Close all submenus on route change
  useEffect(() => {
    setAdminOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  if (!user) return null;

  const isAdminRoute = pathname.startsWith('/admin');
  const isProfileRoute = pathname.startsWith('/profile');

  const items = [
    { href: '/', label: 'Hjem', icon: HomeIcon },
    { href: '/activities', label: 'Aktiviteter', icon: CalendarIcon },
    { href: '/routes', label: 'Ruter', icon: BikeIcon },
    { href: '/my-rides', label: 'Mine ture', icon: BikeIcon },
  ];

  const anyOpen = adminOpen || profileOpen;

  function handleLogout() {
    setProfileOpen(false);
    logout();
  }

  return (
    <>
      {/* Backdrop – closes whichever submenu is open */}
      {anyOpen && (
        <div
          className="sm:hidden fixed inset-0 z-30"
          onClick={() => { setAdminOpen(false); setProfileOpen(false); }}
        />
      )}

      {/* Admin sub-menu sheet */}
      {isAdmin && (
        <div
          className={clsx(
            'sm:hidden fixed inset-x-0 z-40 transition-all duration-200 ease-in-out',
            adminOpen
              ? 'bottom-16 opacity-100 pointer-events-auto'
              : 'bottom-16 opacity-0 pointer-events-none translate-y-2',
          )}
        >
          <div className="mx-4 mb-2 rounded-2xl border border-gray-100 bg-white shadow-lg overflow-hidden">
            <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Admin
            </p>
            {adminSubItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-700 hover:bg-gray-50',
                  )}
                >
                  <Icon className={clsx('h-5 w-5', isActive ? 'stroke-brand-700' : 'stroke-gray-500')} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Profile sub-menu sheet */}
      <div
        className={clsx(
          'sm:hidden fixed inset-x-0 z-40 transition-all duration-200 ease-in-out',
          profileOpen
            ? 'bottom-16 opacity-100 pointer-events-auto'
            : 'bottom-16 opacity-0 pointer-events-none translate-y-2',
        )}
      >
        <div className="mx-4 mb-2 rounded-2xl border border-gray-100 bg-white shadow-lg overflow-hidden">
          <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Konto
          </p>
          <Link
            href="/profile"
            className={clsx(
              'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
              isProfileRoute ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50',
            )}
          >
            <UserIcon className={clsx('h-5 w-5', isProfileRoute ? 'stroke-brand-700' : 'stroke-gray-500')} />
            Profil
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOutIcon className="h-5 w-5 stroke-red-500" />
            Log ud
          </button>
        </div>
      </div>

      {/* Bottom navigation bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-brand-50/70 backdrop-blur-md border-t border-brand-200">
        <div className="flex h-16 items-stretch">
          {items.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                  isActive ? 'text-brand-700' : 'text-gray-500 hover:text-gray-900',
                )}
              >
                <Icon className={clsx('h-5 w-5', isActive ? 'stroke-brand-700' : 'stroke-gray-500')} />
                <span>{label}</span>
              </Link>
            );
          })}

          {/* Profile tab with submenu trigger */}
          <button
            onClick={() => { setProfileOpen((v) => !v); setAdminOpen(false); }}
            className={clsx(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
              isProfileRoute || profileOpen ? 'text-brand-700' : 'text-gray-500 hover:text-gray-900',
            )}
          >
            <UserIcon
              className={clsx(
                'h-5 w-5',
                isProfileRoute || profileOpen ? 'stroke-brand-700' : 'stroke-gray-500',
              )}
            />
            <span>Profil</span>
          </button>

          {/* Admin tab with submenu trigger */}
          {isAdmin && (
            <button
              onClick={() => { setAdminOpen((v) => !v); setProfileOpen(false); }}
              className={clsx(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                isAdminRoute || adminOpen ? 'text-brand-700' : 'text-gray-500 hover:text-gray-900',
              )}
            >
              <ShieldIcon
                className={clsx(
                  'h-5 w-5',
                  isAdminRoute || adminOpen ? 'stroke-brand-700' : 'stroke-gray-500',
                )}
              />
              <span>Admin</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
