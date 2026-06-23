'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { subscribeNewsletter } from '@/app/actions/newsletter';

const DESTINATIONS = [
  { city: 'Dubai',    href: '/search?city=Dubai' },
  { city: 'Paris',    href: '/search?city=Paris' },
  { city: 'London',   href: '/search?city=London' },
  { city: 'New York', href: '/search?city=New+York' },
  { city: 'Maldives', href: '/search?city=Maldives' },
  { city: 'Tokyo',    href: '/search?city=Tokyo' },
];

export default function Footer() {
  const t = useTranslation();
  const [email, setEmail]     = useState('');
  const [status, setStatus]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg]   = useState('');

  const companyLinks = [
    { label: t['footer.aboutUs'],       href: '/about' },
    { label: t['footer.howItWorks'],    href: '/#how-it-works' },
    { label: t['footer.partnerHotels'], href: '/partner/onboarding' },
    { label: t['footer.press'],         href: '#' },
    { label: t['footer.careers'],       href: '#' },
    { label: t['footer.contact'],       href: '/contact' },
  ];

  const helpLinks = [
    { label: t['footer.faq'],                href: '#' },
    { label: t['footer.cancellationPolicy'], href: '#' },
    { label: t['footer.privacyPolicy'],      href: '/privacy' },
    { label: t['footer.termsOfService'],     href: '/terms' },
    { label: t['footer.cookieSettings'],     href: '#' },
  ];

  return (
    <footer style={{ background: 'linear-gradient(180deg, #0A1A52 0%, #0F2260 100%)' }} className="text-white">

      {/* Premium gold accent top border */}
      <div className="divider-gold" />

      {/* Newsletter CTA strip */}
      <div className="border-b border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <p className="font-bold text-base text-white" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              {t['footer.newsletterTitle']}
            </p>
            <p className="text-white/45 text-sm mt-0.5">{t['footer.newsletterSubtitle']}</p>
          </div>
          {status === 'success' ? (
            <div className="flex items-center gap-2.5 bg-green-500/15 border border-green-500/30 px-5 py-3 rounded-xl">
              <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-300 text-sm font-medium">{t['footer.subscribed']}</p>
            </div>
          ) : (
            <form
              className="flex gap-2 w-full sm:w-auto flex-col sm:flex-row"
              onSubmit={async (e) => {
                e.preventDefault();
                setStatus('loading');
                setErrMsg('');
                const res = await subscribeNewsletter(email);
                if (res.success) {
                  setStatus('success');
                  setEmail('');
                } else {
                  setStatus('error');
                  setErrMsg(res.error ?? 'Something went wrong');
                }
              }}
            >
              <div className="flex flex-col gap-1 flex-1 sm:flex-initial">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
                  placeholder={t['footer.newsletterPlaceholder']}
                  className="sm:w-56 text-sm px-4 py-2.5 rounded-xl text-white placeholder-white/35 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.09)',
                    border: `1px solid ${status === 'error' ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.14)'}`,
                  }}
                  onFocus={e => { if (status !== 'error') (e.currentTarget as HTMLElement).style.borderColor = 'rgba(217,119,6,0.6)'; }}
                  onBlur={e => { if (status !== 'error') (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)'; }}
                />
                {status === 'error' && (
                  <p className="text-red-400 text-xs px-1">{errMsg}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all duration-250 whitespace-nowrap disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #92400E 0%, #D97706 100%)', boxShadow: '0 2px 12px rgba(180,83,9,0.35)' }}
                onMouseEnter={e => { if (status !== 'loading') (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(180,83,9,0.55)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(180,83,9,0.35)'; }}
              >
                {status === 'loading' ? (
                  <svg className="animate-spin w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : t['footer.notifyMe']}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div>
            <div className="mb-5">
              <span className="font-bold" style={{ fontFamily: 'var(--font-montserrat, sans-serif)', fontSize: '20px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                <span style={{ color: '#fff' }}>Selected</span><span style={{ color: '#D97706' }}>Room</span>
              </span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed mb-4 max-w-[220px]">
              {t['footer.tagline']}
            </p>
            <p className="text-sm font-medium italic" style={{ color: '#FCD34D' }}>
              &ldquo;{t['footer.slogan'].replace(/"/g, '')}&rdquo;
            </p>
          </div>

          {/* Destinations */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-white/60 mb-4">
              {t['footer.destinations']}
            </h4>
            <ul className="space-y-2.5">
              {DESTINATIONS.map(({ city, href }) => (
                <li key={city}>
                  <a
                    href={href}
                    className="text-white/55 hover:text-brand-gold text-sm transition-colors"
                  >
                    {city}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-white/60 mb-4">
              {t['footer.company']}
            </h4>
            <ul className="space-y-2.5">
              {companyLinks.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-white/55 hover:text-brand-gold text-sm transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Help + Social */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-white/60 mb-4">
              {t['footer.help']}
            </h4>
            <ul className="space-y-2.5 mb-7">
              {helpLinks.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-white/55 hover:text-brand-gold text-sm transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>

            {/* Social icons */}
            <div className="flex gap-2.5">
              <a href="#" aria-label="Twitter / X" className="w-9 h-9 rounded-full bg-white/10 hover:bg-brand-gold flex items-center justify-center transition-all duration-200 hover:scale-110 text-white">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.736l7.73-8.835L1.254 2.25H8.08l4.261 5.631 5.903-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="#" aria-label="Instagram" className="w-9 h-9 rounded-full bg-white/10 hover:bg-brand-gold flex items-center justify-center transition-all duration-200 hover:scale-110 text-white">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="#" aria-label="LinkedIn" className="w-9 h-9 rounded-full bg-white/10 hover:bg-brand-gold flex items-center justify-center transition-all duration-200 hover:scale-110 text-white">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-white/30 text-xs">
            {t['footer.copyright']}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <span className="flex items-center gap-1.5 text-white/40 text-xs">
              <svg className="w-3.5 h-3.5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              {t['footer.ssl']}
            </span>
            <span className="flex items-center gap-1.5 text-white/40 text-xs">
              <svg className="w-3.5 h-3.5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              {t['footer.verifiedSecure']}
            </span>
            <span className="flex items-center gap-1.5 text-white/40 text-xs">
              <svg className="w-3.5 h-3.5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
              {t['footer.bestPrice']}
            </span>
          </div>
        </div>
      </div>

    </footer>
  );
}
