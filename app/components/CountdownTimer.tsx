'use client';

import { useState, useEffect } from 'react';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';

interface Props {
  nextTierTime: Date;
  nextDiscountPercent: number;
  /** 'full' shows "السعر يرتفع خلال HH:MM:SS" — 'compact' shows only HH:MM:SS */
  variant?: 'full' | 'compact';
  className?: string;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function CountdownTimer({ nextTierTime, nextDiscountPercent, variant = 'full', className = '' }: Props) {
  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);
  const [remaining, setRemaining] = useState(() => nextTierTime.getTime() - Date.now());

  useEffect(() => {
    // Resync on mount in case server/client time differ
    setRemaining(nextTierTime.getTime() - Date.now());
    const id = setInterval(() => {
      setRemaining(nextTierTime.getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [nextTierTime]);

  const time = formatCountdown(remaining);

  if (variant === 'compact') {
    return <span className={`font-mono font-bold tabular-nums ${className}`} suppressHydrationWarning>{time}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <svg className="w-3.5 h-3.5 shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>
        {t['countdown.priceRises'].replace('{pct}', String(nextDiscountPercent))}{' '}
        <span className="font-mono font-bold tabular-nums" suppressHydrationWarning>{time}</span>
      </span>
    </span>
  );
}
