'use server';

import {
  getCommissionRate,       saveCommissionRate,
  getMinCommission,        saveMinCommission,
  getGuestBookingLimit,    saveGuestBookingLimit,
  getAutoSuspendThreshold, saveAutoSuspendThreshold,
} from '@/lib/platformSettings';
import { createAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export type TaxRate = {
  country_code: string;
  country_name: string;
  vat_pct: number;
  fixed_fee_per_night: number;
  fixed_fee_currency: string;
  notes: string | null;
};

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('Forbidden');
}

export async function fetchTaxRates(): Promise<TaxRate[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('tax_rates')
    .select('country_code, country_name, vat_pct, fixed_fee_per_night, fixed_fee_currency, notes')
    .order('country_name');
  return (data ?? []) as TaxRate[];
}

export async function upsertTaxRate(rate: TaxRate): Promise<{ error?: string }> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }
  const admin = createAdminClient();
  const { error } = await admin.from('tax_rates').upsert({
    country_code:        rate.country_code.toUpperCase().slice(0, 2),
    country_name:        rate.country_name.trim(),
    vat_pct:             rate.vat_pct,
    fixed_fee_per_night: rate.fixed_fee_per_night,
    fixed_fee_currency:  rate.fixed_fee_currency.toUpperCase().slice(0, 3),
    notes:               rate.notes ?? null,
    updated_at:          new Date().toISOString(),
  });
  return error ? { error: error.message } : {};
}

export async function deleteTaxRate(country_code: string): Promise<{ error?: string }> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }
  const admin = createAdminClient();
  const { error } = await admin.from('tax_rates').delete().eq('country_code', country_code);
  return error ? { error: error.message } : {};
}

export async function fetchCommissionRate(): Promise<number> {
  return getCommissionRate();
}

export async function updateCommissionRate(rate: number): Promise<{ error?: string }> {
  if (isNaN(rate) || rate < 0 || rate > 100) return { error: 'Rate must be between 0 and 100.' };
  return saveCommissionRate(rate);
}

export async function fetchMinCommission(): Promise<number> {
  return getMinCommission();
}

export async function updateMinCommission(amount: number): Promise<{ error?: string }> {
  if (isNaN(amount) || amount < 0) return { error: 'Minimum commission must be 0 or greater.' };
  return saveMinCommission(amount);
}

export async function fetchUserPolicies(): Promise<{ bookingLimit: number; suspendThreshold: number }> {
  const [bookingLimit, suspendThreshold] = await Promise.all([
    getGuestBookingLimit(),
    getAutoSuspendThreshold(),
  ]);
  return { bookingLimit, suspendThreshold };
}

export async function updateUserPolicies(
  bookingLimit: number,
  suspendThreshold: number,
): Promise<{ error?: string }> {
  if (isNaN(bookingLimit) || bookingLimit < 1 || bookingLimit > 100)
    return { error: 'Booking limit must be between 1 and 100.' };
  if (isNaN(suspendThreshold) || suspendThreshold < 1 || suspendThreshold > 20)
    return { error: 'Suspend threshold must be between 1 and 20.' };

  const [r1, r2] = await Promise.all([
    saveGuestBookingLimit(bookingLimit),
    saveAutoSuspendThreshold(suspendThreshold),
  ]);
  return r1.error ? r1 : r2.error ? r2 : {};
}
