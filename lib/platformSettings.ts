import { createAdminClient } from './supabase-admin';

export const DEFAULT_COMMISSION_RATE    = 10;
export const DEFAULT_BOOKING_LIMIT      = 5;
export const DEFAULT_SUSPEND_THRESHOLD  = 3;

const TTL_MS = 60_000; // 1 minute
const _cache = new Map<string, { value: number; expires: number }>();

async function getSetting(key: string, fallback: number): Promise<number> {
  const now = Date.now();
  const hit = _cache.get(key);
  if (hit && hit.expires > now) return hit.value;

  try {
    const { data } = await createAdminClient()
      .from('platform_settings')
      .select('value')
      .eq('key', key)
      .single();
    const value = data ? Number(data.value) : fallback;
    _cache.set(key, { value, expires: now + TTL_MS });
    return value;
  } catch {
    return fallback;
  }
}

export function invalidateSettingsCache(key?: string) {
  if (key) _cache.delete(key);
  else _cache.clear();
}

async function saveSetting(key: string, value: number): Promise<{ error?: string }> {
  try {
    const { error } = await createAdminClient()
      .from('platform_settings')
      .upsert({ key, value: String(value) });
    if (error) return { error: error.message };
    _cache.delete(key);
    return {};
  } catch (e) {
    return { error: String(e) };
  }
}

export const getCommissionRate       = () => getSetting('commission_rate',        DEFAULT_COMMISSION_RATE);
export const getGuestBookingLimit    = () => getSetting('guest_booking_limit',    DEFAULT_BOOKING_LIMIT);
export const getAutoSuspendThreshold = () => getSetting('auto_suspend_threshold', DEFAULT_SUSPEND_THRESHOLD);

export const saveCommissionRate       = (v: number) => saveSetting('commission_rate',       v);
export const saveGuestBookingLimit    = (v: number) => saveSetting('guest_booking_limit',   v);
export const saveAutoSuspendThreshold = (v: number) => saveSetting('auto_suspend_threshold', v);
