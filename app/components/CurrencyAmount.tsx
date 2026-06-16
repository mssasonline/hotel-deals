'use client';

import { useState, useEffect } from 'react';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { formatPrice, convertPrice } from '@/lib/currency';
import { CURRENCY_MAP } from '@/lib/currencyData';
import AEDIcon from './AEDIcon';

interface Props {
  amount: number;
  className?: string;
  /** Amount is in AED (from DB). Defaults to true — all DB prices are stored in AED. */
  fromAED?: boolean;
}

function aedToUSD(aed: number): number {
  return aed / CURRENCY_MAP['aed'].exchangeRate;
}

export default function CurrencyAmount({ amount, className, fromAED = true }: Props) {
  const currency = useAppSettingsStore((s) => s.currency);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const aedValue  = fromAED ? amount : convertPrice(amount, 'aed');
  const usdValue  = fromAED ? aedToUSD(amount) : amount;
  const ssrDefault = fromAED
    ? `د.إ${Math.round(aedValue).toLocaleString()}`
    : `$${amount.toLocaleString()}`;

  if (!mounted) return <span className={className}>{ssrDefault}</span>;

  if (currency === 'aed') {
    return (
      <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15em' }}>
        <AEDIcon />
        {Math.round(aedValue).toLocaleString()}
      </span>
    );
  }

  return <span className={className}>{formatPrice(usdValue, currency)}</span>;
}

export function useAEDFormat() {
  const currency = useAppSettingsStore((s) => s.currency);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return (aed: number): string => {
    if (!mounted || currency === 'aed') return `د.إ${Math.round(aed).toLocaleString()}`;
    return formatPrice(aedToUSD(aed), currency);
  };
}
