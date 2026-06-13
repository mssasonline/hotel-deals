'use client';

import { useAppSettingsStore } from '@/store/appSettingsStore';

export function getEffectiveTimezone(stored: string): string {
  if (!stored) {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
    catch { return 'UTC'; }
  }
  return stored;
}

export function useAdminDateFormat() {
  const timezone = useAppSettingsStore(s => s.timezone);
  const tz = getEffectiveTimezone(timezone);

  function fmtDate(iso: string | null, opts?: Intl.DateTimeFormatOptions): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      timeZone: tz,
      ...opts,
    });
  }

  function fmtDateTime(iso: string | null, opts?: Intl.DateTimeFormatOptions): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: tz,
      ...opts,
    });
  }

  return { fmtDate, fmtDateTime, tz };
}
