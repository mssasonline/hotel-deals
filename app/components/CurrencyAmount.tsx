'use client';

import { useState, useEffect } from 'react';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { formatPrice, convertPrice } from '@/lib/currency';
import AEDIcon from './AEDIcon';

interface Props {
  amount: number;
  className?: string;
}

export default function CurrencyAmount({ amount, className }: Props) {
  const currency = useAppSettingsStore((s) => s.currency);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <span className={className}>${amount.toLocaleString()}</span>;
  }

  if (currency === 'aed') {
    const value = convertPrice(amount, 'aed').toLocaleString();
    return (
      <span className={className}>
        <AEDIcon />
        {' '}{value}
      </span>
    );
  }

  return <span className={className}>{formatPrice(amount, currency)}</span>;
}
