'use client';

import { useState, useEffect } from 'react';
import { getCurrentTier, type PriceTier } from '@/lib/pricingEngine';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';

// Display order: chronological during the day
// pricingEngine tierIndex: 0=Midnight, 1=EarlyBird, 2=Afternoon, 3=Evening
const TIERS = [
  { peIdx: 1, timeRange: '12AM–12PM', discountPct: 10,  colorClass: 'bg-blue-500',   ringClass: 'ring-blue-300'   },
  { peIdx: 2, timeRange: '12PM–4PM',  discountPct: 15,  colorClass: 'bg-orange-500', ringClass: 'ring-orange-300' },
  { peIdx: 3, timeRange: '4PM–8PM',   discountPct: 35,  colorClass: 'bg-red-500',    ringClass: 'ring-red-300'    },
  { peIdx: 0, timeRange: '8PM–12AM',  discountPct: 50,  colorClass: 'bg-purple-700', ringClass: 'ring-purple-400' },
] as const;

const LABEL_KEYS = [
  'tier.earlyBird',
  'tier.afternoon',
  'tier.evening',
  'tier.midnight',
] as const;

interface Props {
  compact?: boolean;
}

export default function TierTimeline({ compact = false }: Props) {
  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);
  const [tier, setTier] = useState<PriceTier>(() => getCurrentTier());

  useEffect(() => {
    const id = setInterval(() => setTier(getCurrentTier()), 30_000);
    return () => clearInterval(id);
  }, []);

  const currentDisplayIdx = TIERS.findIndex((ti) => ti.peIdx === tier.tierIndex);

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {TIERS.map((ti, i) => {
          const isActive  = ti.peIdx === tier.tierIndex;
          const isPast    = i < currentDisplayIdx;
          return (
            <div
              key={i}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                isActive
                  ? `${ti.colorClass} text-white ring-2 ${ti.ringClass} shadow-md`
                  : isPast
                  ? 'bg-gray-100 text-gray-400 line-through'
                  : 'bg-gray-50 text-gray-500'
              }`}
            >
              {isActive && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shrink-0" />}
              -{ti.discountPct}%
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Track */}
      <div className="relative flex items-start">
        {/* Connector line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 z-0" />

        {TIERS.map((ti, i) => {
          const isActive  = ti.peIdx === tier.tierIndex;
          const isPast    = i < currentDisplayIdx;

          return (
            <div key={i} className="relative flex-1 flex flex-col items-center z-10">
              {/* Node */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm mb-2 transition-all duration-300 ${
                  isActive
                    ? `${ti.colorClass} text-white ring-4 ${ti.ringClass} scale-110 shadow-lg`
                    : isPast
                    ? 'bg-gray-200 text-gray-400'
                    : 'bg-gray-100 text-gray-500 border-2 border-dashed border-gray-300'
                }`}
              >
                {isActive && (
                  <span className="absolute inset-0 rounded-full animate-ping opacity-25 bg-current" />
                )}
                -{ti.discountPct}%
              </div>

              {/* Time range */}
              <div className={`text-[11px] font-semibold text-center leading-tight mb-0.5 ${
                isActive ? 'text-gray-900' : isPast ? 'text-gray-300' : 'text-gray-400'
              }`}>
                {ti.timeRange}
              </div>

              {/* Label */}
              <div className={`text-[10px] text-center ${
                isActive ? 'text-gray-600 font-medium' : 'text-gray-300'
              }`}>
                {t[LABEL_KEYS[i]]}
              </div>

              {/* NOW badge */}
              {isActive && (
                <div className="mt-1.5 flex items-center gap-1 bg-brand-gold text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                  NOW
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
