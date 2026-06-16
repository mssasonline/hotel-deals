import type { CurrencyCode } from '@/lib/currencyData';
import { CURRENCIES, CURRENCY_MAP } from '@/lib/currencyData';

export type { CurrencyCode };

// Derived maps kept for any internal consumers
export const EXCHANGE_RATES = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c.exchangeRate])
) as Record<CurrencyCode, number>;

export const CURRENCY_SYMBOLS = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c.symbol])
) as Record<CurrencyCode, string>;

export function convertPrice(priceUSD: number, currency: CurrencyCode): number {
  return Math.round(priceUSD * CURRENCY_MAP[currency].exchangeRate);
}

export function formatPrice(priceUSD: number, currency: CurrencyCode): string {
  const { symbol } = CURRENCY_MAP[currency];
  return `${symbol}${convertPrice(priceUSD, currency).toLocaleString()}`;
}

/** Convert an amount in any currency to AED. */
export function toAED(amount: number, currency: CurrencyCode): number {
  const aedRate = CURRENCY_MAP['aed'].exchangeRate;
  const fromRate = CURRENCY_MAP[currency].exchangeRate;
  return Math.round((amount / fromRate) * aedRate);
}

/** Convert an amount in AED to any currency. */
export function fromAEDTo(aed: number, currency: CurrencyCode): number {
  const aedRate = CURRENCY_MAP['aed'].exchangeRate;
  const toRate  = CURRENCY_MAP[currency].exchangeRate;
  return Math.round((aed / aedRate) * toRate);
}
