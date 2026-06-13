'use client';

import { useState, useEffect } from 'react';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import { getCurrentTier, type PriceTier } from '@/lib/pricingEngine';

const STEP_ICONS = [
  (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
];

const TIER_COLORS = ['bg-blue-500', 'bg-orange-500', 'bg-red-500', 'bg-purple-700'];
const TIER_DISCOUNTS = [10, 15, 35, 50];
const TIER_LABEL_KEYS = ['tier.earlyBird', 'tier.afternoon', 'tier.evening', 'tier.midnight'] as const;

// Display order is chronological for the booking day: Early Bird → Afternoon → Evening → Midnight
// pricingEngine order is: Midnight(0) → Early Bird(1) → Afternoon(2) → Evening(3)
// This maps display position → pricingEngine index
const DISPLAY_TO_PE_IDX = [1, 2, 3, 0] as const;

export default function HowItWorks() {
  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);

  const [activeTier, setActiveTier] = useState<PriceTier>(() => getCurrentTier());

  // Keep the highlighted tier card in sync with the current time
  useEffect(() => {
    const id = setInterval(() => setActiveTier(getCurrentTier()), 60_000);
    return () => clearInterval(id);
  }, []);

  const STEPS = [
    { number: '01', icon: STEP_ICONS[0], title: t['how.step1Title'], desc: t['how.step1Desc'] },
    { number: '02', icon: STEP_ICONS[1], title: t['how.step2Title'], desc: t['how.step2Desc'] },
    { number: '03', icon: STEP_ICONS[2], title: t['how.step3Title'], desc: t['how.step3Desc'] },
  ];

  const TIER_TIMES = [t['how.tier1Time'], t['how.tier2Time'], t['how.tier3Time'], t['how.tier4Time']];
  const TIER_LABELS = TIER_LABEL_KEYS.map((k) => t[k]);

  return (
    <section className="py-16 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block bg-brand-blue-light text-brand-blue text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-3">
            {t['how.badge']}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t['how.heading']}
          </h2>
          <p className="mt-2 text-gray-500 text-sm max-w-lg mx-auto">
            {t['how.subtitle']}
          </p>
        </div>

        {/* 3 Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-14">
          {STEPS.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center group">
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[calc(50%+3rem)] right-0 h-px border-t-2 border-dashed border-gray-200" />
              )}
              <div className="w-20 h-20 rounded-2xl bg-white shadow-md border border-gray-100 flex items-center justify-center mb-4 text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-colors duration-300">
                {step.icon}
              </div>
              <span className="text-xs font-bold text-brand-gold uppercase tracking-widest mb-1">{step.number}</span>
              <h3 className="font-bold text-gray-900 mb-2 text-base">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Price tier timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-center text-sm font-semibold text-gray-600 mb-5">{t['how.scheduleLabel']}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TIER_DISCOUNTS.map((discount, i) => {
              const isActive = DISPLAY_TO_PE_IDX[i] === activeTier.tierIndex;
              return (
                <div
                  key={i}
                  className={`rounded-xl p-4 text-center border-2 transition-all ${
                    isActive
                      ? 'border-brand-gold shadow-lg shadow-brand-gold/10 scale-105'
                      : 'border-transparent bg-gray-50'
                  }`}
                >
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${TIER_COLORS[i]} text-white font-extrabold text-lg mb-2 mx-auto`}>
                    {discount}%
                  </div>
                  <div className="text-xs font-semibold text-gray-500 mb-0.5">{TIER_TIMES[i]}</div>
                  <div className="text-[11px] text-gray-400">{TIER_LABELS[i]}</div>
                  {isActive && (
                    <div className="mt-2 text-[11px] font-bold text-brand-gold flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 bg-brand-gold rounded-full animate-pulse" />
                      {t['how.tierNow']}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
