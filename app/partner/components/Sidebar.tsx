'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import type { TranslationKey } from '@/lib/i18n/translations';

const NAV_ITEMS: { href: string; key: TranslationKey; icon: React.ReactNode }[] = [
  {
    href: '/partner/dashboard',
    key: 'partner.nav.dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/partner/hotels',
    key: 'partner.nav.hotels',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: '/partner/rooms',
    key: 'partner.nav.rooms',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    href: '/partner/deals',
    key: 'partner.nav.deals',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 10V7a1 1 0 011-1h16a1 1 0 011 1v3M3 10v8a1 1 0 001 1h16a1 1 0 001-1v-8" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10V8a2 2 0 012-2h6a2 2 0 012 2v2" />
      </svg>
    ),
  },
  {
    href: '/partner/bookings',
    key: 'partner.nav.bookings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    href: '/partner/tasks',
    key: 'partner.nav.tasks',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: '/partner/analytics',
    key: 'partner.nav.analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/partner/settings',
    key: 'partner.nav.settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname  = usePathname();
  const language  = useAppSettingsStore(s => s.language);
  const t         = getTranslations(language);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  function handleSignOut() {
    window.location.href = '/api/auth/signout';
  }

  const initials = user?.user_metadata?.full_name
    ? (user.user_metadata.full_name as string).split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : user?.email
      ? user.email.slice(0, 2).toUpperCase()
      : 'HP';

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-60'} flex-shrink-0 bg-brand-blue flex flex-col transition-all duration-200 min-h-screen`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-white/10">
        {!collapsed && (
          <Link href="/partner/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 bg-brand-gold rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="leading-none min-w-0">
              <span className="text-white font-bold text-sm tracking-tight block truncate">SelectedRoom</span>
              <span className="text-brand-gold text-[9px] font-semibold tracking-widest uppercase">Partner Portal</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <div className="w-7 h-7 bg-brand-gold rounded-lg flex items-center justify-center mx-auto">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </div>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="text-white/50 hover:text-white transition-colors ml-auto shrink-0"
          aria-label="Toggle sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {collapsed
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />}
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, key, icon }) => {
          const label  = t[key];
          const active = pathname === href || (href !== '/partner/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className={`shrink-0 ${active ? 'text-brand-gold' : 'group-hover:text-brand-gold transition-colors'}`}>
                {icon}
              </span>
              {!collapsed && (
                <span className="text-sm font-medium truncate">{label}</span>
              )}
              {!collapsed && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-gold shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: back to site + partner info */}
      <div className="px-2 pb-4 space-y-1 border-t border-white/10 pt-3">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-all duration-150 group"
          title={collapsed ? t['partner.backToSite'] : undefined}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {!collapsed && <span className="text-sm font-medium">{t['partner.backToSite']}</span>}
        </Link>

        {!collapsed && (
          <div className="px-3 py-3 mt-1 bg-white/8 rounded-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-brand-gold rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-semibold truncate">
                  {user?.user_metadata?.full_name ?? 'Hotel Partner'}
                </p>
                <p className="text-white/40 text-[10px] truncate">
                  {user?.email ?? '—'}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 text-white/50 hover:text-white text-xs py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t['partner.signOut']}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
