import { createAdminClient } from '@/lib/supabase-admin';
import HotelsClient, { type AdminHotelRow } from './HotelsClient';

export const dynamic = 'force-dynamic';

export default async function HotelsPage() {
  const admin = createAdminClient();

  // 1. Hotels + rooms count
  const { data: hotelsRaw } = await admin
    .from('hotels')
    .select('id, name, city, country, address, description, star_rating, image_url, rooms(id)')
    .order('name');

  // 2. hotel_partners — just IDs (no cross-schema join to profiles)
  const { data: hpRaw } = await admin
    .from('hotel_partners')
    .select('hotel_id, user_id');

  // 3. Fetch profiles for those user_ids
  const userIds = [...new Set((hpRaw ?? []).map((r: { user_id: string }) => r.user_id))];
  const profilesMap = new Map<string, { full_name: string; status: 'active' | 'suspended' }>();
  if (userIds.length > 0) {
    const { data: profilesRaw } = await admin
      .from('profiles')
      .select('id, full_name, status')
      .in('id', userIds);
    for (const p of (profilesRaw ?? []) as { id: string; full_name: string | null; status: string | null }[]) {
      profilesMap.set(p.id, {
        full_name: p.full_name ?? 'Unknown',
        status: (p.status === 'suspended' ? 'suspended' : 'active'),
      });
    }
  }

  // 4. Build hotel_id → partners map
  const partnersByHotel = new Map<number, Array<{ id: string; full_name: string; status: 'active' | 'suspended' }>>();
  for (const row of (hpRaw ?? []) as { hotel_id: number; user_id: string }[]) {
    const profile = profilesMap.get(row.user_id);
    if (!profile) continue;
    const list = partnersByHotel.get(row.hotel_id) ?? [];
    list.push({ id: row.user_id, full_name: profile.full_name, status: profile.status });
    partnersByHotel.set(row.hotel_id, list);
  }

  type RawHotel = {
    id: number;
    name: string;
    city: string | null;
    country: string | null;
    address: string | null;
    description: string | null;
    star_rating: number | null;
    image_url: string | null;
    rooms: { id: number }[];
  };

  const hotels: AdminHotelRow[] = ((hotelsRaw ?? []) as unknown as RawHotel[]).map((h) => ({
    id:          h.id,
    name:        h.name,
    city:        h.city,
    country:     h.country,
    address:     h.address,
    description: h.description,
    star_rating: h.star_rating,
    image_url:   h.image_url,
    room_count:  Array.isArray(h.rooms) ? h.rooms.length : 0,
    partners:    partnersByHotel.get(h.id) ?? [],
  }));

  return <HotelsClient initialHotels={hotels} />;
}
