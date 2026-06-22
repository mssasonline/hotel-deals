'use server';

import { createAdminClient } from '@/lib/supabase-admin';

export async function subscribeNewsletter(
  email: string,
): Promise<{ success: boolean; alreadySubscribed?: boolean; error?: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { success: false, error: 'Invalid email address' };
  }

  const admin = createAdminClient();

  // Upsert: if already exists, reactivate; otherwise insert.
  const { error } = await admin
    .from('newsletter_subscribers')
    .upsert({ email: trimmed, is_active: true }, { onConflict: 'email' });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
