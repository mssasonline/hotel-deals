'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { sendPartnerWelcome } from '@/lib/emailService';

type Result = { error?: string; success?: boolean };
type ResetResult = { link?: string; error?: string };
type CreateResult = Result & { emailSent?: boolean };

async function requireAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('Forbidden');
}

// ── Create Property (hotel + partner account in one step) ─────────────────────

export interface PropertyCreateFields {
  // Hotel
  name: string;
  city: string;
  country: string;
  address: string;
  description: string;
  star_rating: number | null;
  // Partner
  partnerFullName: string;
  partnerEmail: string;
  partnerTempPassword: string;
}

export async function createProperty(fields: PropertyCreateFields): Promise<CreateResult> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const admin = createAdminClient();

  // 1. Create hotel
  const { data: hotelData, error: hotelErr } = await admin
    .from('hotels')
    .insert({
      name:        fields.name,
      city:        fields.city,
      country:     fields.country,
      address:     fields.address,
      description: fields.description,
      star_rating: fields.star_rating,
      email:       fields.partnerEmail,
    })
    .select('id')
    .single();

  if (hotelErr) return { error: hotelErr.message };
  const hotelId = hotelData.id;

  // 2. Create partner auth user
  let userId: string;
  const { data: userData, error: createErr } = await admin.auth.admin.createUser({
    email:         fields.partnerEmail,
    password:      fields.partnerTempPassword,
    email_confirm: true,
    user_metadata: { full_name: fields.partnerFullName },
  });

  if (createErr) {
    if (createErr.message.toLowerCase().includes('already been registered') || createErr.code === 'email_exists') {
      const { data: listData, error: listErr } = await admin.auth.admin.listUsers();
      if (listErr) return { error: listErr.message };
      const existing = listData.users.find(u => u.email?.toLowerCase() === fields.partnerEmail.toLowerCase());
      if (!existing) return { error: 'User exists but could not be retrieved.' };
      userId = existing.id;
    } else {
      // Rollback hotel creation
      await admin.from('hotels').delete().eq('id', hotelId);
      return { error: createErr.message };
    }
  } else {
    userId = userData.user.id;
  }

  // 3. Upsert partner profile
  const { error: profileErr } = await admin.from('profiles').upsert({
    id:        userId,
    full_name: fields.partnerFullName,
    email:     fields.partnerEmail,
    role:      'partner',
    status:    'active',
  });
  if (profileErr) return { error: profileErr.message };

  // 4. Link hotel to partner
  const { error: linkErr } = await admin
    .from('hotel_partners')
    .upsert({ user_id: userId, hotel_id: hotelId }, { onConflict: 'hotel_id' });
  if (linkErr) return { error: linkErr.message };

  // 5. Send welcome email
  const emailSent = process.env.NOTIFICATIONS_ENABLED === 'true';
  await sendPartnerWelcome({
    partnerName:  fields.partnerFullName,
    partnerEmail: fields.partnerEmail,
    tempPassword: fields.partnerTempPassword,
    hotelName:    fields.name,
    loginUrl:     `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/login`,
  });

  revalidatePath('/admin/properties');
  return { success: true, emailSent };
}

// ── Delete Property (hotel + optionally partner account) ──────────────────────

export async function deleteProperty(hotelId: number, partnerId: string | null): Promise<Result> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const admin = createAdminClient();

  // Delete hotel (cascades to rooms, hotel_partners, deals)
  const { error: hotelErr } = await admin.from('hotels').delete().eq('id', hotelId);
  if (hotelErr) return { error: hotelErr.message };

  // Delete partner auth account if one is assigned
  if (partnerId) {
    await admin.auth.admin.deleteUser(partnerId);
  }

  revalidatePath('/admin/properties');
  return { success: true };
}

// ── Suspend / Activate partner ────────────────────────────────────────────────

export async function setPropertyPartnerStatus(
  userId: string,
  hotelId: number,
  status: 'active' | 'suspended',
): Promise<Result> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const admin = createAdminClient();

  const { error } = await admin.from('profiles').update({ status }).eq('id', userId);
  if (error) return { error: error.message };

  await admin.from('hotels').update({ is_active: status === 'active' }).eq('id', hotelId);

  if (status === 'suspended') {
    await admin
      .from('partner_deals')
      .update({ status: 'paused' })
      .eq('hotel_id', hotelId)
      .eq('status', 'active');
  }

  revalidatePath('/admin/properties');
  return { success: true };
}

// ── Generate password reset link ──────────────────────────────────────────────

export async function generatePropertyPasswordReset(userId: string): Promise<ResetResult> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const admin = createAdminClient();
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
  if (userError || !userData.user?.email) return { error: 'User not found or has no email' };

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: userData.user.email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/reset-password` },
  });

  if (error) return { error: error.message };
  const link = (data as { properties?: { action_link?: string } })?.properties?.action_link;
  if (!link) return { error: 'Failed to generate link' };

  return { link };
}

// ── Update hotel basic info ───────────────────────────────────────────────────

export interface HotelUpdateFields {
  name?: string;
  city?: string;
  country?: string;
  address?: string;
  description?: string;
  star_rating?: number | null;
}

export async function updatePropertyHotel(hotelId: number, fields: HotelUpdateFields): Promise<Result> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const admin = createAdminClient();
  const { error } = await admin.from('hotels').update(fields).eq('id', hotelId);
  if (error) return { error: error.message };

  revalidatePath('/admin/properties');
  return { success: true };
}
