'use client';

import { useState, useEffect } from 'react';
import { getCurrentTier, calcLivePrice, calcActualDiscount, getAllTiers, type PriceTier } from '@/lib/pricingEngine';
import CountdownTimer from '@/app/components/CountdownTimer';
import CurrencyAmount from '@/app/components/CurrencyAmount';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations, type TranslationKey } from '@/lib/i18n/translations';

interface Props {
  baseNightPrice: number;
  minNightPrice?: number;
}

const TIER_TIME_KEYS: Partial<Record<number, TranslationKey>> = {
  10: 'how.tier1Time',
  15: 'how.tier2Time',
  35: 'how.tier3Time',
  50: 'how.tier4Time',
};

const TIER_COLORS: Record<number, { bg: string; ring: string }> = {
  10: { bg: 'bg-blue-500',   ring: 'ring-blue-300'   },
  15: { bg: 'bg-orange-500', ring: 'ring-orange-300' },
  35: { bg: 'bg-red-500',    ring: 'ring-red-300'    },
  50: { bg: 'bg-purple-700', ring: 'ring-purple-400' },
};

export default function HotelTierBanner({ baseNightPrice, minNightPrice = 0 }: Props) {
  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);
  const [tier, setTier] = useState<PriceTier>(() => getCurrentTier());

  useEffect(() => {
    const id = setInterval(() => setTier(getCurrentTier()), 60_000);
    return () => clearInterval(id);
  }, []);

  const livePrice      = baseNightPrice > 0 ? calcLivePrice(baseNightPrice, minNightPrice, tier) : 0;
  const actualDiscount = calcActualDiscount(baseNightPrice, livePrice);
  const savings        = baseNightPrice > 0 ? baseNightPrice - livePrice : 0;
  const nextHigher     = tier.nextDiscountPercent > tier.discountPercent;
  const allTiers = [...getAllTiers(baseNightPrice, minNightPrice)].sort((a, b) => {
    // Treat hour 0 (midnight) as 24 so it appears last in the day schedule
    const ha = a.hour === 0 ? 24 : a.hour;
    const hb = b.hour === 0 ? 24 : b.hour;
    return ha - hb;
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">

      {/* Current tier highlight */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500 p-4 sm:p-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="text-5xl font-black leading-none">{actualDiscount}%</div>
            <div>
              <div className="font-bold text-lg leading-tight">{tier.label}</div>
              <div className="text-white/80 text-sm">{t['hotel.tier.activeDiscountAll']}</div>
            </div>
          </div>
          {baseNightPrice > 0 && (
            <div className="sm:text-right">
              <div className="line-through text-white/60 text-sm leading-none mb-1">
                <CurrencyAmount amount={baseNightPrice} /> {t['price.perNight']}
              </div>
              <div className="text-2xl font-extrabold leading-none">
                <CurrencyAmount amount={livePrice} /> {t['price.perNight']}
              </div>
              <div className="text-white/80 text-xs mt-1">
                {t['hotel.tier.savingsTonight'].replace('{amount}', '')}
                <CurrencyAmount amount={savings} />
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-white/20">
          <CountdownTimer
            nextTierTime={tier.nextTierTime}
            nextDiscountPercent={tier.nextDiscountPercent}
            variant="full"
            className="text-white/90 text-sm"
          />
        </div>
      </div>

      {/* Tier timeline grid */}
      <div className="p-4 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center mb-3">
          {t['hotel.tier.dailySchedule']}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {allTiers.map((dt) => {
            const isActive = dt.tierIndex === tier.tierIndex;
            const timeKey = TIER_TIME_KEYS[dt.tierDiscount];
            const colors = TIER_COLORS[dt.tierDiscount];
            return (
              <div
                key={dt.tierIndex}
                className={`rounded-xl p-2.5 text-center border-2 transition-all ${
                  isActive && colors
                    ? `${colors.bg} ring-2 ${colors.ring} shadow-md scale-105 border-transparent`
                    : 'border-transparent bg-white'
                }`}
              >
                <div className={`font-extrabold text-lg leading-none ${isActive ? 'text-white' : 'text-gray-700'}`}>
                  {dt.discountPercent}%
                </div>
                <div className={`text-[10px] mt-1 ${isActive ? 'text-white/80' : 'text-gray-400'}`}>{timeKey ? t[timeKey] : ''}</div>
                {isActive && (
                  <div className="mt-1 text-[10px] font-bold text-white flex items-center justify-center gap-0.5">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    {t['how.tierNow']}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Warning: next tier has higher discount but rooms may run out */}
        {nextHigher && (
          <div className="mt-3 flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 text-sm text-orange-800">
            <svg className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {t['hotel.tier.discountRisesWarning'].replace('{pct}', String(tier.nextDiscountPercent))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
