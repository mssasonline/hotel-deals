'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { sendPartnerWelcome } from '@/lib/emailService';

type Result = { error?: string; success?: boolean; userId?: string; emailSent?: boolean };

async function requireAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') throw new Error('Forbidden');
}

// ── Create a new partner account ────────────────────────────────────────────
export async function createPartnerAccount(
  email: string,
  fullName: string,
  tempPassword: string,
  hotelId?: number,
): Promise<Result> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const adminClient = createAdminClient();

  // 1. Create auth user — if already exists, look up the existing user instead
  let userId: string;
  const { data: userData, error: createErr } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createErr) {
    // If the user already exists, fetch them by email and continue with profile/hotel steps
    if (createErr.message.toLowerCase().includes('already been registered') || createErr.code === 'email_exists') {
      const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers();
      if (listErr) return { error: listErr.message };
      const existing = listData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!existing) return { error: 'User exists but could not be retrieved.' };
      userId = existing.id;
    } else {
      return { error: createErr.message };
    }
  } else {
    userId = userData.user.id;
  }

  // 2. Upsert profile with partner role + email
  //    The handle_new_user trigger may have already created the row; upsert handles both cases.
  const { error: profileErr } = await adminClient.from('profiles').upsert({
    id: userId,
    full_name: fullName,
    email,
    role: 'partner',
    status: 'active',
  });
  if (profileErr) return { error: profileErr.message };

  // 3. Assign hotel if provided — ignore duplicate (already assigned is fine)
  if (hotelId) {
    const { error: assignErr } = await adminClient
      .from('hotel_partners')
      .upsert({ user_id: userId, hotel_id: hotelId }, { onConflict: 'user_id,hotel_id' });
    if (assignErr && !assignErr.message.includes('duplicate key')) {
      return { error: assignErr.message };
    }
    await adminClient.from('hotels').update({ email }).eq('id', hotelId);
  }

  // Send welcome email with login credentials (skipped when NOTIFICATIONS_ENABLED != 'true')
  let hotelName: string | undefined;
  if (hotelId) {
    const { data: hotel } = await adminClient.from('hotels').select('name').eq('id', hotelId).single();
    hotelName = hotel?.name ?? undefined;
  }
  const emailSent = process.env.NOTIFICATIONS_ENABLED === 'true';
  await sendPartnerWelcome({
    partnerName:  fullName,
    partnerEmail: email,
    tempPassword: tempPassword,
    hotelName,
    loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/login`,
  });

  revalidatePath('/admin/partners');
  return { success: true, userId, emailSent };
}

// ── Assign a hotel to an existing partner ───────────────────────────────────
export async function assignHotelToPartner(userId: string, hotelId: number): Promise<Result> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('hotel_partners')
    .upsert({ user_id: userId, hotel_id: hotelId }, { onConflict: 'user_id,hotel_id' });

  if (error) return { error: error.message };

  const { data: profile } = await adminClient
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  if (profile?.email) {
    await adminClient.from('hotels').update({ email: profile.email }).eq('id', hotelId);
  }

  revalidatePath('/admin/partners');
  return { success: true };
}

// ── Remove a hotel from a partner ───────────────────────────────────────────
export async function removeHotelFromPartner(userId: string, hotelId: number): Promise<Result> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('hotel_partners')
    .delete()
    .eq('user_id', userId)
    .eq('hotel_id', hotelId);

  if (error) return { error: error.message };
  revalidatePath('/admin/partners');
  return { success: true };
}

// ── Suspend or activate a partner account ───────────────────────────────────
export async function setPartnerStatus(
  userId: string,
  status: 'active' | 'suspended',
): Promise<Result> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('profiles')
    .update({ status })
    .eq('id', userId);

  if (error) return { error: error.message };

  // When suspending: pause all active deals so no new bookings can be made.
  // Existing bookings are untouched — only future availability is blocked.
  if (status === 'suspended') {
    await adminClient
      .from('partner_deals')
      .update({ status: 'paused' })
      .eq('partner_id', userId)
      .eq('status', 'active');
  }

  revalidatePath('/admin/partners');
  return { success: true };
}

// ── Generate a password reset link for a partner ────────────────────────────
export async function generatePasswordResetLink(
  userId: string,
): Promise<{ link?: string; error?: string }> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const adminClient = createAdminClient();

  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);
  if (userError || !userData.user?.email) {
    return { error: 'User not found or has no email' };
  }

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email: userData.user.email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/reset-password` },
  });

  if (error) return { error: error.message };

  const link = (data as { properties?: { action_link?: string } })?.properties?.action_link;
  if (!link) return { error: 'Failed to generate link' };

  return { link };
}


// ── Permanently delete a partner account ────────────────────────────────────
export async function deletePartnerAccount(userId: string): Promise<Result> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  // Service role required to delete from auth.users
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) return { error: error.message };
  revalidatePath('/admin/partners');
  return { success: true };
}
