import { createAdminClient } from '@/lib/supabase-admin';
import PropertiesClient, { type PropertyRow } from './PropertiesClient';
import type { ContractInfo } from './actions';

export const dynamic = 'force-dynamic';

export default async function PropertiesPage() {
  const admin = createAdminClient();

  // 1. Hotels + room counts
  const { data: hotelsRaw } = await admin
    .from('hotels')
    .select('id, name, city, country, address, description, star_rating, image_url, is_active, rooms(id, quantity_total)')
    .order('name');

  // 2. All hotel_partners links (many accounts per hotel)
  const { data: hpRaw } = await admin
    .from('hotel_partners')
    .select('hotel_id, user_id');

  // 3. Profiles for all linked partners
  const userIds = [...new Set((hpRaw ?? []).map((r: { user_id: string }) => r.user_id))];
  type ProfileRow = { id: string; email: string | null; status: string | null; created_at: string };
  const profilesMap = new Map<string, ProfileRow>();
  if (userIds.length > 0) {
    const { data: profilesRaw } = await admin
      .from('profiles')
      .select('id, email, status, created_at')
      .in('id', userIds);
    for (const p of (profilesRaw ?? []) as ProfileRow[]) {
      profilesMap.set(p.id, p);
    }
  }

  // 4. Booking stats per hotel
  const hotelIds = (hotelsRaw ?? []).map((h: { id: number }) => h.id);
  type BookingStat = { hotel_id: number; total: number; revenue: number };
  const statsMap = new Map<number, BookingStat>();
  if (hotelIds.length > 0) {
    const { data: bookingsRaw } = await admin
      .from('bookings')
      .select('room_id, total_price, rooms!inner(hotel_id)')
      .in('rooms.hotel_id', hotelIds)
      .neq('status', 'cancelled');

    type BookingRow = { total_price: number; rooms: { hotel_id: number } | { hotel_id: number }[] };
    for (const b of (bookingsRaw ?? []) as unknown as BookingRow[]) {
      const hotelId = Array.isArray(b.rooms) ? b.rooms[0]?.hotel_id : b.rooms?.hotel_id;
      if (!hotelId) continue;
      const cur = statsMap.get(hotelId) ?? { hotel_id: hotelId, total: 0, revenue: 0 };
      cur.total += 1;
      cur.revenue += b.total_price ?? 0;
      statsMap.set(hotelId, cur);
    }
  }

  // 5b. Contracts per hotel (latest one per hotel)
  const contractsMap = new Map<number, ContractInfo>();
  if (hotelIds.length > 0) {
    const { data: contractsRaw } = await admin
      .from('partner_contracts')
      .select('*')
      .in('hotel_id', hotelIds)
      .order('created_at', { ascending: false });

    for (const c of (contractsRaw ?? []) as ContractInfo[]) {
      if (!contractsMap.has(c.hotel_id)) contractsMap.set(c.hotel_id, c);
    }
  }

  // 6. hotel_id → accounts[] (many accounts per hotel)
  const accountsByHotel = new Map<number, { id: string; email: string; status: 'active' | 'suspended'; created_at: string }[]>();
  for (const row of (hpRaw ?? []) as { hotel_id: number; user_id: string }[]) {
    const p = profilesMap.get(row.user_id);
    if (!p) continue;
    const list = accountsByHotel.get(row.hotel_id) ?? [];
    list.push({
      id:         p.id,
      email:      p.email ?? '',
      status:     p.status === 'suspended' ? 'suspended' : 'active',
      created_at: p.created_at,
    });
    accountsByHotel.set(row.hotel_id, list);
  }

  type RawHotel = {
    id: number; name: string; city: string | null; country: string | null;
    address: string | null; description: string | null;
    star_rating: number | null; image_url: string | null;
    is_active: boolean | null; rooms: { id: number; quantity_total: number | null }[];
  };

  const properties: PropertyRow[] = ((hotelsRaw ?? []) as unknown as RawHotel[]).map(h => {
    const accounts = accountsByHotel.get(h.id) ?? [];
    const stats    = statsMap.get(h.id) ?? { total: 0, revenue: 0 };
    return {
      hotel: {
        id:          h.id,
        name:        h.name,
        city:        h.city,
        country:     h.country,
        address:     h.address,
        description: h.description,
        star_rating: h.star_rating,
        image_url:   h.image_url,
        is_active:   h.is_active ?? true,
        room_count:  Array.isArray(h.rooms)
          ? h.rooms.reduce((sum, r) => sum + (r.quantity_total ?? 1), 0)
          : 0,
      },
      accounts,
      booking_count: stats.total,
      total_revenue: stats.revenue,
      contract:      contractsMap.get(h.id) ?? null,
    };
  });

  return <PropertiesClient initialProperties={properties} />;
}
