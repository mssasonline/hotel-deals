'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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
  const { user, role, loading } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const language = useAppSettingsStore((s) => s.language);
  const currency = useAppSettingsStore((s) => s.currency);
  const setLanguage = useAppSettingsStore((s) => s.setLanguage);
  const setCurrency = useAppSettingsStore((s) => s.setCurrency);

  const t = getTranslations(language);

  useEffect(() => {
    if (!dropdownOpen && !settingsOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen, settingsOpen]);

  function handleLogout() {
    setDropdownOpen(false);
    window.location.href = '/api/auth/signout';
  }

  const displayName = user ? getDisplayName(user) : '';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: scrolled
          ? 'rgba(12, 26, 78, 0.92)'
          : 'linear-gradient(135deg, #0F2260 0%, #1E3A8A 50%, #1B3580 100%)',
        backdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'none',
        boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.28), 0 1px 0 rgba(255,255,255,0.06)' : '0 1px 0 rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        transition: 'background 0.4s cubic-bezier(0.4,0,0.2,1), box-shadow 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[66px]">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0 group">
            <div
              className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #92400E 0%, #B45309 45%, #D97706 100%)', boxShadow: '0 3px 14px rgba(180,83,9,0.45)' }}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {/* Premium ring glow */}
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 0 3px rgba(217,119,6,0.35)' }} />
            </div>
            <div className="leading-none">
              <span className="font-bold block" style={{ fontFamily: 'var(--font-montserrat, sans-serif)', fontSize: 'clamp(15px, 4.5vw, 21px)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                <span style={{ color: '#fff' }}>Selected</span><span style={{ color: '#D97706' }}>Room</span>
              </span>
              <span className="hidden sm:block text-[10px] font-semibold uppercase mt-0.5" style={{ color: '#FCD34D', letterSpacing: '0.22em' }}>
                Premium Hotels
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {!loading && (role === 'partner' || role === 'admin') && (
              <Link
                href="/partner/dashboard"
                className="relative flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-all duration-200 group py-1"
              >
                <svg className="w-4 h-4 shrink-0 text-white/50 group-hover:text-brand-gold-bright transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {t['nav.partnerDashboard']}
                <span className="absolute bottom-0 left-0 right-0 h-px bg-brand-gold-bright scale-x-0 group-hover:scale-x-100 transition-transform duration-250 origin-left" />
              </Link>
            )}

            {!loading && role === 'admin' && (
              <Link
                href="/admin/dashboard"
                className="relative flex items-center gap-1.5 text-sm font-semibold transition-all duration-200 group py-1"
                style={{ color: '#FCD34D' }}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                {t['nav.adminConsole']}
                <span className="absolute bottom-0 left-0 right-0 h-px bg-yellow-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-250 origin-left" />
              </Link>
            )}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Desktop: individual selects */}
            <select
              aria-label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="text-white/85 text-xs rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none transition-all hidden sm:block"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(217,119,6,0.6)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}
            >
              {LANGUAGES.filter((l) => l.supported).map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-brand-blue text-white">
                  {lang.nativeName}
                </option>
              ))}
            </select>

            <select
              aria-label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="text-white/85 text-xs rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none transition-all hidden sm:block"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(217,119,6,0.6)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}
            >
              {CURRENCIES.map((curr) => (
                <option key={curr.code} value={curr.code} className="bg-brand-blue text-white">
                  {curr.code.toUpperCase()}
                </option>
              ))}
            </select>

            {/* Mobile: globe button + dropdown */}
            <div ref={settingsRef} className="relative sm:hidden">
              <button
                onClick={() => setSettingsOpen((v) => !v)}
                className="flex items-center gap-1.5 text-white/85 text-xs rounded-lg px-2.5 py-1.5 transition-all"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
                aria-label="Language & Currency"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span className="font-semibold">{currency.toUpperCase()}</span>
              </button>

              {settingsOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl overflow-hidden z-50"
                  style={{ boxShadow: '0 16px 48px rgba(15,23,42,0.18)', border: '1px solid rgba(30,58,138,0.08)' }}
                >
                  <div className="p-3 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 px-1">Language</p>
                      <select
                        value={language}
                        onChange={(e) => { setLanguage(e.target.value as Language); setSettingsOpen(false); }}
                        className="w-full text-sm text-gray-800 rounded-xl px-3 py-2 cursor-pointer focus:outline-none border border-gray-200 bg-gray-50"
                      >
                        {LANGUAGES.filter((l) => l.supported).map((lang) => (
                          <option key={lang.code} value={lang.code}>{lang.nativeName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 px-1">Currency</p>
                      <select
                        value={currency}
                        onChange={(e) => { setCurrency(e.target.value as CurrencyCode); setSettingsOpen(false); }}
                        className="w-full text-sm text-gray-800 rounded-xl px-3 py-2 cursor-pointer focus:outline-none border border-gray-200 bg-gray-50"
                      >
                        {CURRENCIES.map((curr) => (
                          <option key={curr.code} value={curr.code}>{curr.code.toUpperCase()} — {curr.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell — desktop only; mobile version lives inside the user dropdown */}
            {!loading && user && <div className="hidden sm:block"><NotificationBell /></div>}

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
                    <div
                      className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-2.5 w-72 max-w-[calc(100vw-1rem)] bg-white rounded-2xl overflow-hidden z-50 animate-fade-in-up"
                      style={{ boxShadow: '0 16px 48px rgba(15,23,42,0.18), 0 2px 8px rgba(15,23,42,0.08)', border: '1px solid rgba(30,58,138,0.08)' }}
                    >
                      {/* Gradient profile header */}
                      <div className="relative px-4 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #0F2260 0%, #1E3A8A 55%, #2563EB 100%)' }}>
                        {avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={avatarUrl} alt={displayName} className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-white/40" />
                        ) : (
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ring-2 ring-white/40" style={{ background: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)' }}>
                            {getInitials(displayName)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate leading-tight">{displayName}</p>
                          <p className="text-xs text-white/65 truncate mt-0.5">{user.email}</p>
                        </div>
                      </div>

                      {/* Menu items */}
                      <div className="p-1.5">
                        {[
                          { href: '/account',      label: t['nav.myAccount'],   path: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                          { href: '/my-trips',     label: t['nav.myTrips'],     path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                          { href: '/my-favorites', label: t['nav.myFavorites'], path: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
                        ].map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-brand-blue-light transition-colors"
                          >
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors" style={{ background: '#EEF4FF', color: '#1E3A8A' }}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.path} />
                              </svg>
                            </span>
                            <span className="group-hover:text-brand-blue transition-colors">{item.label}</span>
                          </Link>
                        ))}

                        {/* Notifications — mobile only (desktop has the bell in the topbar) */}
                        <div className="sm:hidden">
                          <NotificationBell inDropdown={true} />
                        </div>

                        <div className="h-px bg-gray-100 my-1.5 mx-1" />

                        <button
                          onClick={handleLogout}
                          className="group w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-red-50 text-red-500 group-hover:bg-red-100 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                          </span>
                          {t['auth.signOut']}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Logged-out state */
                <div className="flex items-center gap-2 ml-1">
                  <Link
                    href="/login"
                    className="text-white/70 hover:text-white font-medium px-2.5 py-1.5 transition-colors duration-200 flex items-center gap-1.5"
                  >
                    {/* Person icon — mobile only */}
                    <svg className="block sm:hidden w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {/* Text — desktop only */}
                    <span className="hidden sm:inline text-sm">{t['auth.signIn']}</span>
                  </Link>
                  <Link
                    href="/signup"
                    className="hidden sm:inline-flex text-white text-sm font-bold px-5 py-2 rounded-xl transition-all duration-250"
                    style={{ background: 'linear-gradient(135deg, #92400E 0%, #B45309 45%, #D97706 100%)', boxShadow: '0 2px 14px rgba(180,83,9,0.4)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 22px rgba(180,83,9,0.55)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 14px rgba(180,83,9,0.4)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
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
