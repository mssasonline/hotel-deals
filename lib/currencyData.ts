export type CurrencyCode =
  | 'usd' | 'eur' | 'gbp' | 'chf' | 'cad' | 'aud' | 'nzd'
  | 'aed' | 'sar' | 'qar' | 'kwd' | 'bhd' | 'omr' | 'jod' | 'egp' | 'mad'
  | 'jpy' | 'cny' | 'hkd' | 'sgd' | 'inr' | 'pkr' | 'bdt' | 'krw'
  | 'try' | 'rub' | 'zar' | 'brl' | 'mxn';

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  /** Rate vs USD: 1 USD = exchangeRate units of this currency */
  exchangeRate: number;
}

export const CURRENCIES: CurrencyInfo[] = [
  // Americas
  { code: 'usd', name: 'US Dollar',           symbol: '$',    exchangeRate: 1 },
  { code: 'cad', name: 'Canadian Dollar',      symbol: 'CA$',  exchangeRate: 1.36 },
  { code: 'brl', name: 'Brazilian Real',       symbol: 'R$',   exchangeRate: 5.0 },
  { code: 'mxn', name: 'Mexican Peso',         symbol: 'MX$',  exchangeRate: 17.2 },
  // Europe
  { code: 'eur', name: 'Euro',                 symbol: '€',    exchangeRate: 0.92 },
  { code: 'gbp', name: 'British Pound',        symbol: '£',    exchangeRate: 0.79 },
  { code: 'chf', name: 'Swiss Franc',          symbol: 'CHF',  exchangeRate: 0.90 },
  { code: 'rub', name: 'Russian Ruble',        symbol: '₽',    exchangeRate: 90 },
  // Gulf / MENA
  { code: 'aed', name: 'UAE Dirham',           symbol: 'AED',  exchangeRate: 3.67 },
  { code: 'sar', name: 'Saudi Riyal',          symbol: 'SR',   exchangeRate: 3.75 },
  { code: 'qar', name: 'Qatari Riyal',         symbol: 'QR',   exchangeRate: 3.64 },
  { code: 'kwd', name: 'Kuwaiti Dinar',        symbol: 'KD',   exchangeRate: 0.308 },
  { code: 'bhd', name: 'Bahraini Dinar',       symbol: 'BD',   exchangeRate: 0.377 },
  { code: 'omr', name: 'Omani Rial',           symbol: 'OMR',  exchangeRate: 0.385 },
  { code: 'jod', name: 'Jordanian Dinar',      symbol: 'JD',   exchangeRate: 0.709 },
  { code: 'egp', name: 'Egyptian Pound',       symbol: 'E£',   exchangeRate: 48.5 },
  { code: 'mad', name: 'Moroccan Dirham',      symbol: 'MAD',  exchangeRate: 10.0 },
  // Asia Pacific
  { code: 'jpy', name: 'Japanese Yen',         symbol: '¥',    exchangeRate: 155 },
  { code: 'cny', name: 'Chinese Yuan',         symbol: 'CN¥',  exchangeRate: 7.25 },
  { code: 'hkd', name: 'Hong Kong Dollar',     symbol: 'HK$',  exchangeRate: 7.82 },
  { code: 'sgd', name: 'Singapore Dollar',     symbol: 'S$',   exchangeRate: 1.34 },
  { code: 'aud', name: 'Australian Dollar',    symbol: 'A$',   exchangeRate: 1.53 },
  { code: 'nzd', name: 'New Zealand Dollar',   symbol: 'NZ$',  exchangeRate: 1.63 },
  { code: 'krw', name: 'South Korean Won',     symbol: '₩',    exchangeRate: 1350 },
  { code: 'inr', name: 'Indian Rupee',         symbol: '₹',    exchangeRate: 83.5 },
  { code: 'pkr', name: 'Pakistani Rupee',      symbol: '₨',    exchangeRate: 279 },
  { code: 'bdt', name: 'Bangladeshi Taka',     symbol: '৳',    exchangeRate: 110 },
  // Other
  { code: 'try', name: 'Turkish Lira',         symbol: '₺',    exchangeRate: 32.5 },
  { code: 'zar', name: 'South African Rand',   symbol: 'R',    exchangeRate: 18.6 },
];

export const CURRENCY_MAP = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c])
) as Record<CurrencyCode, CurrencyInfo>;
