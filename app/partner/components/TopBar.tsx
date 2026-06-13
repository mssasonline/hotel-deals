'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import NotificationBell from '@/app/components/NotificationBell';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import type { Language, CurrencyCode } from '@/store/appSettingsStore';
import { CURRENCIES } from '@/lib/currencyData';
import { LANGUAGES } from '@/lib/languageData';
import { getTranslations } from '@/lib/i18n/translations';

const PAGE_TITLES: Record<string, string> = {
  '/partner/dashboard': 'Dashboard',
  '/partner/hotels':    'Hotels',
  '/partner/rooms':     'Rooms',
  '/partner/deals':     'Deals',
  '/partner/bookings':  'Bookings',
  '/partner/tasks':     'Tasks',
  '/partner/analytics': 'Analytics',
  '/partner/settings':  'Settings',
};

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getDisplayName(user: { user_metadata?: Record<string, string>; email?: string }) {
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Partner'
  );
}

export default function PartnerTopBar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const language    = useAppSettingsStore(s => s.language);
  const currency    = useAppSettingsStore(s => s.currency);
  const setLanguage = useAppSettingsStore(s => s.setLanguage);
  const setCurrency = useAppSettingsStore(s => s.setCurrency);
  const t = getTranslations(language);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [dropdownOpen]);

  const displayName = user ? getDisplayName(user) : '';
  const avatarUrl   = user?.user_metadata?.avatar_url as string | undefined;
  const initials    = getInitials(displayName);

  const PAGE_TITLE_KEYS: Record<string, keyof ReturnType<typeof getTranslations>> = {
    '/partner/dashboard': 'partner.nav.dashboard',
    '/partner/hotels':    'partner.nav.hotels',
    '/partner/rooms':     'partner.nav.rooms',
    '/partner/deals':     'partner.nav.deals',
    '/partner/bookings':  'partner.nav.bookings',
    '/partner/tasks':     'partner.nav.tasks',
    '/partner/analytics': 'partner.nav.analytics',
    '/partner/settings':  'partner.nav.settings',
  };
  const pageTitle = t[PAGE_TITLE_KEYS[pathname] ?? 'partner.nav.dashboard'] ?? PAGE_TITLES[pathname] ?? 'Partner Portal';

  function handleSignOut() {
    setDropdownOpen(false);
    window.location.href = '/api/auth/signout';
  }

  return (
    <header className="sticky top-0 z-40 h-14 bg-white border-b border-gray-100 flex items-center px-6 gap-4 shrink-0">
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <span className="text-2xl font-bold text-gray-900">{pageTitle}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">

        {/* Language */}
        <select
          aria-label="Language"
          value={language}
          onChange={e => setLanguage(e.target.value as Language)}
          className="text-xs text-gray-600 border border-gray-200 rounded-lg px-2 py-1.5 bg-white hover:border-brand-blue/40 focus:outline-none focus:border-brand-blue transition-colors cursor-pointer"
        >
          {LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.nativeName}</option>
          ))}
        </select>

        {/* Currency */}
        <select
          aria-label="Currency"
          value={currency}
          onChange={e => setCurrency(e.target.value as CurrencyCode)}
          className="text-xs text-gray-600 border border-gray-200 rounded-lg px-2 py-1.5 bg-white hover:border-brand-blue/40 focus:outline-none focus:border-brand-blue transition-colors cursor-pointer"
        >
          {CURRENCIES.map(curr => (
            <option key={curr.code} value={curr.code}>{curr.code.toUpperCase()}</option>
          ))}
        </select>

        {/* Notifications */}
        {!loading && user && <NotificationBell variant="light" />}

        {/* User dropdown */}
        {!loading && user && (
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="flex items-center gap-2 hover:bg-gray-50 px-2.5 py-1.5 rounded-xl transition-colors"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-7 h-7 bg-brand-blue rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {initials}
                </div>
              )}
              <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate hidden sm:block">
                {displayName}
              </span>
              <svg
                className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                {/* User info */}
                <div className="px-4 py-3 border-b border-gray-100 mb-1">
                  <div className="flex items-center gap-2.5 mb-2">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={displayName} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 bg-brand-blue rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 bg-brand-blue-light text-brand-blue text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {t['partner.badge']}
                  </span>
                </div>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {t['partner.signOut']}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
