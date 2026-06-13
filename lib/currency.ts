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
