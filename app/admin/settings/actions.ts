'use server';

import {
  getCommissionRate,       saveCommissionRate,
  getGuestBookingLimit,    saveGuestBookingLimit,
  getAutoSuspendThreshold, saveAutoSuspendThreshold,
} from '@/lib/platformSettings';

export async function fetchCommissionRate(): Promise<number> {
  return getCommissionRate();
}

export async function updateCommissionRate(rate: number): Promise<{ error?: string }> {
  if (isNaN(rate) || rate < 0 || rate > 100) return { error: 'Rate must be between 0 and 100.' };
  return saveCommissionRate(rate);
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
