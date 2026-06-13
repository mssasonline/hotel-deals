'use client';

import type { ReactNode } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface Feature {
  icon: ReactNode;
  titleKey: string;
  descKey: string;
}

const PRESS_NAMES = [
  'Forbes Travel',
  'Condé Nast',
  'The Guardian',
  'TripAdvisor',
  'Lonely Planet',
];

const FEATURES: Feature[] = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    titleKey: 'why.bestPriceTitle',
    descKey: 'why.bestPriceDesc',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    titleKey: 'why.securePayTitle',
    descKey: 'why.securePayDesc',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    titleKey: 'why.lastMinuteTitle',
    descKey: 'why.lastMinuteDesc',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    titleKey: 'why.conciergeTitle',
    descKey: 'why.conciergeDesc',
  },
];

export default function WhyChooseUs() {
  const t = useTranslation();

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t['why.heading']}
          </h2>
          <p className="mt-2 text-gray-500 text-sm max-w-xl mx-auto">
            {t['why.subtitle']}
          </p>
          <div className="mt-4 h-1 w-14 bg-brand-gold rounded-full mx-auto" />
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((f) => (
            <div
              key={f.titleKey}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-16 h-16 rounded-2xl bg-brand-blue-light text-brand-blue flex items-center justify-center mb-4 transition-colors duration-300 group-hover:bg-brand-blue group-hover:text-white shadow-sm">
                {f.icon}
              </div>
              <h3 className="font-bold text-gray-900 mb-2">
                {t[f.titleKey as keyof typeof t]}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {t[f.descKey as keyof typeof t]}
              </p>
            </div>
          ))}
        </div>

        {/* Press / trust bar */}
        <div className="mt-14 pt-10 border-t border-gray-100">
          <p className="text-center text-gray-400 text-xs uppercase tracking-widest mb-5 font-medium">
            {t['why.featuredIn']}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {PRESS_NAMES.map((name) => (
              <span
                key={name}
                className="text-gray-300 font-bold text-base tracking-tight select-none"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
