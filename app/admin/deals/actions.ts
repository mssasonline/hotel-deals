'use server';

import { createAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { DealStatus } from '@/app/partner/deals/actions';

export type AdminDealRow = {
  id: string;
  partner_id: string;
  partner_name: string;
  hotel_id: number;
  hotel_name: string;
  hotel_city: string;
  room_id: number;
  room_name: string;
  base_price: number;
  deal_price: number;
  title: string | null;
  start_date: string;
  end_date: string;
  status: DealStatus;
  created_at: string;
};

export async function getAllDeals(): Promise<AdminDealRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();

  // Step 1: fetch deals with direct FK joins only (rooms + hotels)
  // profiles cannot be joined here because partner_id → auth.users, not profiles
  const { data, error } = await admin
    .from('partner_deals')
    .select('id, partner_id, hotel_id, room_id, deal_price, title, start_date, end_date, status, created_at, rooms(name, base_price), hotels(name, city)')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  // Step 2: fetch partner names from profiles using collected partner_ids
  const partnerIds = [...new Set(data.map((r) => String(r.partner_id)))];
  const { data: profileRows } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', partnerIds);

  const profileMap = new Map<string, string>();
  for (const p of profileRows ?? []) {
    profileMap.set(String(p.id), String(p.full_name ?? p.email ?? '').trim() || String(p.id).slice(0, 8));
  }

  return data.map((row) => {
    const room  = Array.isArray(row.rooms)  ? row.rooms[0]  : row.rooms;
    const hotel = Array.isArray(row.hotels) ? row.hotels[0] : row.hotels;
    return {
      id:           String(row.id),
      partner_id:   String(row.partner_id),
      partner_name: profileMap.get(String(row.partner_id)) ?? String(row.partner_id).slice(0, 8),
      hotel_id:     Number(row.hotel_id),
      hotel_name:   String(hotel?.name ?? ''),
      hotel_city:   String(hotel?.city ?? ''),
      room_id:      Number(row.room_id),
      room_name:    String(room?.name ?? ''),
      base_price:   Number(room?.base_price ?? 0),
      deal_price:   Number(row.deal_price),
      title:        row.title ? String(row.title) : null,
      start_date:   String(row.start_date),
      end_date:     String(row.end_date),
      status:       row.status as DealStatus,
      created_at:   String(row.created_at),
    };
  });
}

export async function adminUpdateDealStatus(
  id: string,
  status: DealStatus,
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('partner_deals')
    .update({ status })
    .eq('id', id);
  if (error) return { error: error.message };
  return {};
}
