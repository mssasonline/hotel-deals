'use client';

import { useState, useEffect } from 'react';
import { getCurrentTier, type PriceTier } from '@/lib/pricingEngine';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';

// Map tierIndex → deal intensity position (0 = weakest, 3 = strongest)
// Midnight(0)=best(3), EarlyBird(1)=weakest(0), Afternoon(2)=mid(1), Evening(3)=strong(2)
const DEAL_INTENSITY = [3, 0, 1, 2];

const SEGMENTS = [
  { discount: 10, color: '#3B82F6', glow: 'rgba(59,130,246,0.6)',  label: '10% off' },
  { discount: 15, color: '#F59E0B', glow: 'rgba(245,158,11,0.6)',  label: '15% off' },
  { discount: 35, color: '#EF4444', glow: 'rgba(239,68,68,0.6)',   label: '35% off' },
  { discount: 50, color: '#A855F7', glow: 'rgba(168,85,247,0.65)', label: '50% off' },
];

export default function PricingPulseBar() {
  const [tier, setTier] = useState<PriceTier>(() => getCurrentTier());
  const [mounted, setMounted] = useState(false);
  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTier(getCurrentTier()), 60_000);
    return () => clearInterval(id);
  }, []);

  const position = DEAL_INTENSITY[tier.tierIndex]; // 0–3
  const activeSeg = SEGMENTS[position];
  // dot left % — center of the active segment
  const dotPct = ((position + 0.5) / 4) * 100;

  if (!mounted) return null;

  return (
    <div
      dir="ltr"
      className="w-full max-w-xs mx-auto mb-7 opacity-0 animate-fade-in"
      style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}
    >
      {/* Live indicator label */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <span className="text-white/50 text-[10px] font-semibold uppercase tracking-[0.16em]">
          {t['pulse.savingsNow']}
        </span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: activeSeg.color, color: '#fff', boxShadow: `0 0 8px ${activeSeg.glow}` }}
        >
          {activeSeg.label}
        </span>
      </div>

      {/* The gauge bar */}
      <div className="relative">
        {/* Track */}
        <div className="flex rounded-full overflow-hidden h-[5px] gap-[2px]">
          {SEGMENTS.map((seg, i) => (
            <div
              key={seg.discount}
              className="flex-1 rounded-full transition-all duration-700"
              style={{
                background: i <= position ? seg.color : 'rgba(255,255,255,0.15)',
                opacity: i < position ? 0.55 : 1,
              }}
            />
          ))}
        </div>

        {/* Glowing pulse dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-700"
          style={{ left: `calc(${dotPct}% - 8px)` }}
        >
          {/* Pulse ring */}
          <div
            className="absolute inset-0 rounded-full live-ping opacity-60"
            style={{ background: activeSeg.color, scale: '2.2' }}
          />
          {/* Solid dot */}
          <div
            className="relative w-4 h-4 rounded-full border-2 border-white"
            style={{
              background: activeSeg.color,
              boxShadow: `0 0 12px ${activeSeg.glow}, 0 0 4px ${activeSeg.glow}`,
            }}
          />
        </div>
      </div>

      {/* Segment labels */}
      <div className="flex justify-between mt-2.5 px-0">
        {SEGMENTS.map((seg, i) => (
          <span
            key={seg.discount}
            className="text-[9px] font-semibold transition-all duration-500 text-center"
            style={{
              color: i === position ? '#fff' : 'rgba(255,255,255,0.28)',
              flex: 1,
            }}
          >
            {i === 0 ? t['pulse.low'] : i === 1 ? t['pulse.mid'] : i === 2 ? t['pulse.high'] : t['pulse.best']}
          </span>
        ))}
      </div>
    </div>
  );
}
