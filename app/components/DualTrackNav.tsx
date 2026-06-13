'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentTier } from '@/lib/pricingEngine';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';

export default function DualTrackNav() {
  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);
  const [discountPct, setDiscountPct] = useState(() => getCurrentTier().discountPercent);

  useEffect(() => {
    const id = setInterval(() => setDiscountPct(getCurrentTier().discountPercent), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          {t['nav.chooseTrack']}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* Track 1 — Time-based */}
          <Link
            href="/search"
            className="group flex items-center gap-4 bg-white border-2 border-brand-blue/20 hover:border-brand-blue rounded-2xl px-5 py-4 text-left transition-all hover:shadow-md hover:shadow-brand-blue/10"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-blue flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-extrabold text-gray-900 text-sm">{t['nav.liveHourlyPricing']}</span>
                <span className="bg-brand-blue text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                  -{discountPct}% {t['nav.nowBadge']}
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-snug">
                {t['nav.liveDescription']}
              </p>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-brand-blue transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Link>

          {/* Track 2 — Partner deals */}
          <Link
            href="/special-deals"
            className="group flex items-center gap-4 bg-white border-2 border-brand-gold/30 hover:border-brand-gold rounded-2xl px-5 py-4 text-left transition-all hover:shadow-md hover:shadow-brand-gold/10"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-gold flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-extrabold text-gray-900 text-sm">{t['nav.partnerDeals']}</span>
                <span className="bg-brand-gold text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                  {t['nav.fixedBadge']}
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-snug">
                {t['nav.partnerDescription']}
              </p>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-brand-gold transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Link>

        </div>
      </div>
    </div>
  );
}
