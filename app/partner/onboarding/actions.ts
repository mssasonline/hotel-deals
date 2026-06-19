'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendPartnerWelcome } from '@/lib/emailService';

export async function createHotelForPartner(fields: {
  name: string;
  city: string;
  country: string;
  address: string;
  description: string;
  star_rating: number | null;
}): Promise<{ hotelId: string | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { hotelId: null, error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['partner', 'admin'].includes(profile.role as string)) {
    return { hotelId: null, error: 'Access denied' };
  }

  const admin = createAdminClient();

  const { data: hotel, error: hotelError } = await admin
    .from('hotels')
    .insert({
      name:        fields.name.trim(),
      city:        fields.city.trim()        || null,
      country:     fields.country.trim()     || null,
      address:     fields.address.trim()     || null,
      description: fields.description.trim() || null,
      star_rating: fields.star_rating,
    })
    .select('id')
    .single();

  if (hotelError || !hotel) {
    return { hotelId: null, error: hotelError?.message ?? 'Failed to create hotel' };
  }

  const { error: hpError } = await admin
    .from('hotel_partners')
    .insert({ hotel_id: hotel.id, user_id: user.id });

  if (hpError) {
    await admin.from('hotels').delete().eq('id', hotel.id);
    return { hotelId: null, error: hpError.message };
  }

  // Fire-and-forget welcome email (gated by NOTIFICATIONS_ENABLED)
  const { data: authUser } = await admin.auth.admin.getUserById(user.id);
  if (authUser?.user?.email) {
    const name =
      (authUser.user.user_metadata?.full_name as string | undefined) ??
      authUser.user.email.split('@')[0];
    sendPartnerWelcome({
      partnerName:  name,
      partnerEmail: authUser.user.email,
      tempPassword: '',
      hotelName:    fields.name.trim(),
      loginUrl:     `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://selectedroom.com'}/partner/dashboard`,
    }).catch((err) => console.error('[onboarding] sendPartnerWelcome failed:', err));
  }

  return { hotelId: String(hotel.id), error: null };
}
