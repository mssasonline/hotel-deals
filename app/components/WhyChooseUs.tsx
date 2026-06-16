'use client';

import type { ReactNode } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import ScrollReveal from './ScrollReveal';

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
    <section className="py-20 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 50%, #F8FAFC 100%)' }}>
      {/* Subtle decorative background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #1E3A8A 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #B45309 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* Header */}
        <ScrollReveal className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] mb-3 px-4 py-1.5 rounded-full" style={{ color: '#B45309', background: 'rgba(180,83,9,0.07)', border: '1px solid rgba(180,83,9,0.14)' }}>
            Why SelectedRoom
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold" style={{ color: '#0F172A' }}>
            {t['why.heading']}
          </h2>
          <p className="mt-3 text-gray-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            {t['why.subtitle']}
          </p>
          <div className="mt-5 divider-gold w-16 mx-auto" />
        </ScrollReveal>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {FEATURES.map((f, i) => (
            <ScrollReveal key={f.titleKey} delay={i * 80}>
              <div className="flex flex-col items-center text-center group">
                {/* Premium icon container with rotated accent */}
                <div className="relative w-20 h-20 mb-6">
                  <div
                    className="absolute inset-0 rounded-2xl transition-all duration-400 group-hover:rotate-12 group-hover:scale-90 opacity-30"
                    style={{ background: 'linear-gradient(135deg, #B45309, #D97706)', transform: 'rotate(8deg) scale(0.88)' }}
                  />
                  <div
                    className="relative w-full h-full rounded-2xl flex items-center justify-center text-white transition-all duration-350 group-hover:scale-110 group-hover:-rotate-2"
                    style={{
                      background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
                      boxShadow: '0 6px 20px rgba(30,58,138,0.25)',
                    }}
                  >
                    {f.icon}
                  </div>
                </div>
                <h3 className="font-bold mb-2 text-[1.05rem]" style={{ color: '#0F172A' }}>
                  {t[f.titleKey as keyof typeof t]}
                </h3>
                <p className="text-sm leading-relaxed max-w-[200px]" style={{ color: '#64748B' }}>
                  {t[f.descKey as keyof typeof t]}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Press / trust bar */}
        <ScrollReveal delay={200} className="mt-16 pt-10 border-t border-gray-100">
          <p className="text-center text-gray-400 text-xs uppercase tracking-[0.2em] mb-6 font-semibold">
            {t['why.featuredIn']}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10">
            {PRESS_NAMES.map((name) => (
              <span
                key={name}
                className="font-bold text-base tracking-tight select-none transition-colors duration-200 hover:text-gray-500 cursor-default"
                style={{ color: '#CBD5E1', fontFamily: 'var(--font-playfair), Georgia, serif', letterSpacing: '-0.01em' }}
              >
                {name}
              </span>
            ))}
          </div>
        </ScrollReveal>

      </div>
    </section>
  );
}
