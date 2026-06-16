'use client';

// Thin wrapper — logic lives in CurrencyAmount (fromAED prop).
// Re-exports useAEDFormat so existing imports continue to work.
export { useAEDFormat } from '@/app/components/CurrencyAmount';

import CurrencyAmount from '@/app/components/CurrencyAmount';

interface Props {
  amount: number;
  className?: string;
}

export default function AEDAmount({ amount, className }: Props) {
  return <CurrencyAmount amount={amount} fromAED className={className} />;
}
