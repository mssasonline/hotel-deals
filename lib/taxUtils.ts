/**
 * Server-side utility to fetch the applicable tax rate for a hotel.
 * Uses hotel.country_code + hotel.stars → tax_rates table.
 * Falls back to UAE (AE) rate if the hotel's country has no configured rate.
 */

import { createClient } from '@supabase/supabase-js';

export interface HotelTaxRate {
  country_code:         string;
  country_name:         string;
  vat_pct:              number;
  fixed_fee_per_night:  number;
  fixed_fee_currency:   string;
  service_charge_pct:   number;
  municipality_fee_pct: number;
}

const DEFAULT_TAX: HotelTaxRate = {
  country_code:         'AE',
  country_name:         'United Arab Emirates',
  vat_pct:              5,
  fixed_fee_per_night:  15,
  fixed_fee_currency:   'AED',
  service_charge_pct:   10,
  municipality_fee_pct: 7,
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function tourismFeeByStars(
  byStars: Record<string, number> | null,
  stars: number,
): number | null {
  if (!byStars) return null;
  const key = String(Math.max(1, Math.min(5, Math.round(stars))));
  if (key in byStars) return byStars[key];
  for (let s = Math.round(stars) - 1; s >= 1; s--) {
    if (String(s) in byStars) return byStars[String(s)];
  }
  return null;
}

export async function getTaxRateForHotel(hotelId: number): Promise<HotelTaxRate> {
  const supabase = getServiceClient();

  // 1. Get hotel's country_code and stars
  const { data: hotel } = await supabase
    .from('hotels')
    .select('country_code, stars, star_rating, rating')
    .eq('id', hotelId)
    .single();

  const countryCode = hotel?.country_code ?? 'AE';
  const hotelStars = Number(
    (hotel as Record<string, unknown>)?.stars ??
    (hotel as Record<string, unknown>)?.star_rating ??
    Math.round(Number((hotel as Record<string, unknown>)?.rating ?? 4))
  );

  // 2. Fetch rate for that country (including star-based fees)
  const { data: rate } = await supabase
    .from('tax_rates')
    .select('country_code, country_name, vat_pct, fixed_fee_per_night, fixed_fee_currency, fixed_fee_by_stars, service_charge_pct, municipality_fee_pct')
    .eq('country_code', countryCode)
    .single();

  if (!rate) return DEFAULT_TAX;

  // 3. Resolve fixed fee: use star-specific rate when available (e.g. UAE Tourism Dirham)
  const byStars = (rate as Record<string, unknown>).fixed_fee_by_stars as Record<string, number> | null;
  const starFee = tourismFeeByStars(byStars, hotelStars);
  const fixedFee = starFee !== null ? starFee : Number(rate.fixed_fee_per_night);

  return {
    country_code:         rate.country_code,
    country_name:         rate.country_name,
    vat_pct:              Number(rate.vat_pct),
    fixed_fee_per_night:  fixedFee,
    fixed_fee_currency:   rate.fixed_fee_currency,
    service_charge_pct:   Number((rate as Record<string, unknown>).service_charge_pct ?? 10),
    municipality_fee_pct: Number((rate as Record<string, unknown>).municipality_fee_pct ?? 7),
  };
}
