'use client';

import { useState, useEffect } from 'react';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { CURRENCY_MAP } from '@/lib/currencyData';
import AEDIcon from '@/app/components/AEDIcon';

const AED_TO_USD = 1 / 3.67;

function convertToString(aed: number, currency: string): string {
  const info = CURRENCY_MAP[currency as keyof typeof CURRENCY_MAP];
  if (!info || currency === 'aed') return `د.إ${Math.round(aed).toLocaleString()}`;
  const converted = Math.round(aed * AED_TO_USD * info.exchangeRate);
  return `${info.symbol}${converted.toLocaleString()}`;
}

interface Props {
  amount: number;
  className?: string;
}

export default function AEDAmount({ amount, className }: Props) {
  const currency = useAppSettingsStore(s => s.currency);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (mounted && currency === 'aed') {
    return (
      <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15em' }}>
        <AEDIcon />
        {Math.round(amount).toLocaleString()}
      </span>
    );
  }

  const display = mounted
    ? convertToString(amount, currency)
    : `د.إ${Math.round(amount).toLocaleString()}`;

  return <span className={className}>{display}</span>;
}

export function useAEDFormat() {
  const currency = useAppSettingsStore(s => s.currency);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return (aed: number) => mounted ? convertToString(aed, currency) : `د.إ${Math.round(aed).toLocaleString()}`;
}
