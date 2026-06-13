'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';

type Result = { error?: string; success?: boolean };

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

export interface HotelCreateFields {
  name: string;
  city: string;
  country: string;
  address: string;
  description: string;
  star_rating: number | null;
}

export async function createHotel(fields: HotelCreateFields): Promise<Result> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const admin = createAdminClient();
  const { error } = await admin.from('hotels').insert({
    name:        fields.name,
    city:        fields.city,
    country:     fields.country,
    address:     fields.address,
    description: fields.description,
    star_rating: fields.star_rating,
  });

  if (error) return { error: error.message };
  revalidatePath('/admin/hotels');
  revalidatePath('/admin/partners');
  return { success: true };
}

export async function updateHotel(id: number, fields: Partial<HotelCreateFields>): Promise<Result> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const admin = createAdminClient();
  const { error } = await admin.from('hotels').update(fields).eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/admin/hotels');
  return { success: true };
}

export async function deleteHotel(id: number): Promise<Result> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const admin = createAdminClient();
  const { error } = await admin.from('hotels').delete().eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/admin/hotels');
  revalidatePath('/admin/partners');
  return { success: true };
}

// ── Hotel Images ──────────────────────────────────────────────────────────────

export type HotelImageRow = {
  id: string;
  hotel_id: number;
  image_url: string;
  sort_order: number;
};

export async function getHotelImages(hotelId: number): Promise<{ data?: HotelImageRow[]; error?: string }> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('hotel_images')
    .select('id, hotel_id, image_url, sort_order')
    .eq('hotel_id', hotelId)
    .order('sort_order');

  if (error) return { error: error.message };
  return { data: (data ?? []) as HotelImageRow[] };
}

export async function addHotelImage(hotelId: number, imageUrl: string, sortOrder: number): Promise<Result> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const admin = createAdminClient();
  const { error } = await admin.from('hotel_images').insert({
    hotel_id:   hotelId,
    image_url:  imageUrl,
    sort_order: sortOrder,
  });

  if (error) return { error: error.message };
  revalidatePath('/admin/hotels');
  revalidatePath(`/hotel/${hotelId}`);
  return { success: true };
}

export async function deleteHotelImage(imageId: string, hotelId: number): Promise<Result> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const admin = createAdminClient();
  const { error } = await admin.from('hotel_images').delete().eq('id', imageId);

  if (error) return { error: error.message };
  revalidatePath('/admin/hotels');
  revalidatePath(`/hotel/${hotelId}`);
  return { success: true };
}

export async function reorderHotelImages(images: Array<{ id: string; sort_order: number }>): Promise<Result> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const admin = createAdminClient();
  const updates = images.map(({ id, sort_order }) =>
    admin.from('hotel_images').update({ sort_order }).eq('id', id)
  );
  await Promise.all(updates);
  return { success: true };
}
