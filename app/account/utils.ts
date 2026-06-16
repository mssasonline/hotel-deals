import { CURRENCIES } from '@/lib/currencyData';
import { LANGUAGES } from '@/lib/languageData';
import type { EditValues, ProfileRow, SelectOption } from './types';

export function getDisplayName(user: { user_metadata?: Record<string, unknown>; email?: string }): string {
  const meta = user.user_metadata ?? {};
  return (
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'User'
  );
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function detectNetwork(cardNumber: string): string {
  const n = cardNumber.replace(/\s/g, '');
  if (n.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^(6011|65|64[4-9]|622)/.test(n)) return 'discover';
  return 'unknown';
}

export function networkBadge(network: string): { label: string; cls: string } {
  const map: Record<string, { label: string; cls: string }> = {
    visa:       { label: 'VISA',  cls: 'text-blue-700 bg-blue-50 border-blue-200' },
    mastercard: { label: 'MC',    cls: 'text-orange-700 bg-orange-50 border-orange-200' },
    amex:       { label: 'AMEX', cls: 'text-green-700 bg-green-50 border-green-200' },
    discover:   { label: 'DISC',  cls: 'text-amber-700 bg-amber-50 border-amber-200' },
    unknown:    { label: '••••',  cls: 'text-gray-600 bg-gray-100 border-gray-200' },
  };
  return map[network] ?? map.unknown;
}

export function buildEditValuesFromProfile(
  profile: ProfileRow | null,
  email: string,
  fallbackName: string,
): EditValues {
  const s = (v: string | null | undefined) => v ?? '';
  return {
    full_name: s(profile?.full_name) || fallbackName,
    email,
    phone_country_code: s(profile?.phone_country_code) || '+971',
    phone_country_iso: s(profile?.phone_country_iso) || 'AE',
    phone_number: s(profile?.phone_number),
    date_of_birth: s(profile?.date_of_birth),
    nationality: s(profile?.nationality),
    gender: s(profile?.gender),
    addr_country: s(profile?.addr_country),
    addr_city: s(profile?.addr_city),
    addr_district: s(profile?.addr_district),
    addr_building: s(profile?.addr_building),
    addr_apartment: s(profile?.addr_apartment),
    addr_street: s(profile?.addr_street),
    addr_postal_code: s(profile?.addr_postal_code),
    addr_additional: s(profile?.addr_additional),
  };
}

export const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:opacity-50';
export const LABEL_CLASS = 'block text-xs font-medium text-gray-500 mb-1';

export const CURRENCY_OPTIONS: SelectOption[] = CURRENCIES.map((c) => ({
  value: c.code,
  primary: `${c.code.toUpperCase()} — ${c.name}`,
  secondary: c.symbol,
}));

export const LANGUAGE_OPTIONS: SelectOption[] = LANGUAGES.filter((l) => l.supported).map((l) => ({
  value: l.code,
  primary: l.nativeName,
  secondary: l.englishName !== l.nativeName ? l.englishName : undefined,
}));
