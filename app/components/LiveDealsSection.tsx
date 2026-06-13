'use client';

import { useState, useEffect } from 'react';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import { getCurrentTier, type PriceTier } from '@/lib/pricingEngine';
import TierTimeline from './TierTimeline';
import HotelCarousel from './HotelCarousel';
import CountdownTimer from './CountdownTimer';
import type { Hotel } from './HotelCard';

interface Props {
  hotels: Hotel[];
}

export default function LiveDealsSection({ hotels }: Props) {
  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);
  const [tier, setTier] = useState<PriceTier>(() => getCurrentTier());

  useEffect(() => {
    const id = setInterval(() => setTier(getCurrentTier()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (hotels.length === 0) return null;

  return (
    <section id="live-pricing" className="py-12 bg-white scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Section header ─────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">

          {/* Left: title block */}
          <div className="shrink-0 max-w-sm">

            {/* Track label */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                {t['sections.live']}
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t['sections.trackAutomatic']}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
              {t['sections.liveHourlyPricing']}
            </h2>

            {/* One-line mechanism explainer */}
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              {t['sections.pricesDropDesc']}
            </p>

            {/* Current discount pill + countdown */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="bg-brand-blue text-white text-sm font-extrabold px-3 py-1.5 rounded-xl">
                -{tier.discountPercent}% {t['sections.rightNow']}
              </span>
              <span className="text-xs text-orange-600 font-medium">
                <CountdownTimer
                  nextTierTime={tier.nextTierTime}
                  nextDiscountPercent={tier.nextDiscountPercent}
                  variant="full"
                />
              </span>
            </div>

            <div className="mt-3 h-1 w-14 bg-brand-blue rounded-full" />
          </div>

          {/* Right: Tier Timeline — the core visual of the mechanism */}
          <div className="w-full lg:max-w-md xl:max-w-lg bg-gray-50 rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
              {t['sections.todayScheduleLabel']}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              {t['sections.scheduleResetDesc']}
            </p>
            <TierTimeline />
          </div>

        </div>

        {/* Hotel carousel */}
        <HotelCarousel
          hotels={hotels}
          viewAllHref="/search"
          viewAllLabel={t['sections.viewAllDeals']}
        />

      </div>
    </section>
  );
}
