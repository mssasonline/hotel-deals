'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';

const DESTINATIONS = ['Dubai', 'Paris', 'London', 'New York', 'Maldives', 'Tokyo'];

export default function Footer() {
  const t = useTranslation();

  const companyLinks = [
    t['footer.aboutUs'],
    t['footer.howItWorks'],
    t['footer.partnerHotels'],
    t['footer.press'],
    t['footer.careers'],
    t['footer.contact'],
  ];

  const helpLinks = [
    t['footer.faq'],
    t['footer.cancellationPolicy'],
    t['footer.privacyPolicy'],
    t['footer.termsOfService'],
    t['footer.cookieSettings'],
  ];

  return (
    <footer className="bg-brand-blue-dark text-white">

      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-brand-gold rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <polyline
                    points="9 22 9 12 15 12 15 22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-white font-bold text-lg tracking-tight">
                SelectedRoom
              </span>
            </div>
            <p className="text-white/55 text-sm leading-relaxed mb-4">
              {t['footer.tagline']}
            </p>
            <p className="text-brand-gold text-sm font-medium italic">
              &ldquo;{t['footer.slogan'].replace(/"/g, '')}&rdquo;
            </p>
          </div>

          {/* Destinations */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-white/60 mb-4">
              {t['footer.destinations']}
            </h4>
            <ul className="space-y-2.5">
              {DESTINATIONS.map((city) => (
                <li key={city}>
                  <a
                    href="#"
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
              {companyLinks.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-white/55 hover:text-brand-gold text-sm transition-colors"
                  >
                    {link}
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
              {helpLinks.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-white/55 hover:text-brand-gold text-sm transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>

            {/* Social icons */}
            <div className="flex gap-2.5">
              {[
                { label: 'Twitter / X', letter: '𝕏' },
                { label: 'Instagram', letter: 'In' },
                { label: 'LinkedIn', letter: 'Li' },
              ].map(({ label, letter }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-brand-gold flex items-center justify-center transition-colors text-xs font-bold text-white"
                >
                  {letter}
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-white/35 text-xs">
            {t['footer.copyright']}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="text-white/35 text-xs">🔒 {t['footer.ssl']}</span>
            <span className="text-white/35 text-xs">✓ {t['footer.verifiedSecure']}</span>
            <span className="text-white/35 text-xs">🏆 {t['footer.bestPrice']}</span>
          </div>
        </div>
      </div>

    </footer>
  );
}
