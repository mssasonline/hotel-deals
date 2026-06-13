'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import NotificationBell from '@/app/components/NotificationBell';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import type { Language, CurrencyCode } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import { CURRENCIES } from '@/lib/currencyData';
import { LANGUAGES } from '@/lib/languageData';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getDisplayName(user: { user_metadata?: Record<string, string>; email?: string }): string {
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User'
  );
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, loading } = useAuth();

  function handleNavClick(hash: string) {
    if (pathname === '/') {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      router.push(`/#${hash}`);
    }
  }
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const language = useAppSettingsStore((s) => s.language);
  const currency = useAppSettingsStore((s) => s.currency);
  const setLanguage = useAppSettingsStore((s) => s.setLanguage);
  const setCurrency = useAppSettingsStore((s) => s.setCurrency);

  const t = getTranslations(language);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  function handleLogout() {
    setDropdownOpen(false);
    window.location.href = '/api/auth/signout';
  }

  const displayName = user ? getDisplayName(user) : '';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <header className="sticky top-0 z-50 bg-brand-blue shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 bg-brand-gold rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="leading-none">
              <span className="text-white font-bold text-2xl tracking-tight block">
                SelectedRoom
              </span>
              <span className="text-brand-gold text-xs font-medium tracking-widest uppercase">
                .com
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-7">
            {!loading && (role === 'partner' || role === 'admin') && (
              <Link
                href="/partner/dashboard"
                className="flex items-center gap-1.5 text-white/75 hover:text-brand-gold text-sm font-medium transition-colors duration-150"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {t['nav.partnerDashboard']}
              </Link>
            )}

            {!loading && role === 'admin' && (
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-1.5 text-brand-gold hover:text-yellow-400 text-sm font-semibold transition-colors duration-150"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                {t['nav.adminConsole']}
              </Link>
            )}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            <select
              aria-label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-white/10 text-white/80 text-xs border border-white/20 rounded-md px-2 py-1.5 cursor-pointer hover:border-brand-gold focus:outline-none focus:border-brand-gold transition-colors hidden sm:block"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-brand-blue text-white">
                  {lang.nativeName}
                </option>
              ))}
            </select>

            <select
              aria-label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="bg-white/10 text-white/80 text-xs border border-white/20 rounded-md px-2 py-1.5 cursor-pointer hover:border-brand-gold focus:outline-none focus:border-brand-gold transition-colors hidden sm:block"
            >
              {CURRENCIES.map((curr) => (
                <option key={curr.code} value={curr.code} className="bg-brand-blue text-white">
                  {curr.code.toUpperCase()}
                </option>
              ))}
            </select>

            {/* Notification Bell — visible only when logged in */}
            {!loading && user && <NotificationBell />}

            {/* Auth section */}
            {!loading && (
              user ? (
                /* Logged-in user dropdown */
                <div ref={dropdownRef} className="relative ml-1">
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 rounded-lg transition-colors duration-150 max-w-[180px]"
                  >
                    {/* Avatar */}
                    {avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 bg-brand-gold rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {getInitials(displayName)}
                      </div>
                    )}
                    <span className="text-sm font-medium truncate hidden sm:block">{displayName}</span>
                    <svg
                      className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                      {/* User info */}
                      <div className="px-4 py-2.5 border-b border-gray-100 mb-1">
                        <p className="text-xs font-semibold text-gray-900 truncate">{displayName}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>

                      <Link
                        href="/account"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-blue-light hover:text-brand-blue transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {t['nav.myAccount']}
                      </Link>

                      <Link
                        href="/my-trips"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-blue-light hover:text-brand-blue transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {t['nav.myTrips']}
                      </Link>

                      <Link
                        href="/my-bookings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-blue-light hover:text-brand-blue transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {t['nav.myBookings']}
                      </Link>

                      <Link
                        href="/my-favorites"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-blue-light hover:text-brand-blue transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {t['nav.myFavorites']}
                      </Link>

                      <div className="h-px bg-gray-100 my-1" />

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t['auth.signOut']}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Logged-out state */
                <div className="flex items-center gap-2 ml-1">
                  <Link
                    href="/login"
                    className="text-white/75 hover:text-white text-sm font-medium px-3 py-1.5 transition-colors"
                  >
                    {t['auth.signIn']}
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-brand-gold hover:bg-yellow-500 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors shadow-sm"
                  >
                    {t['auth.register']}
                  </Link>
                </div>
              )
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
