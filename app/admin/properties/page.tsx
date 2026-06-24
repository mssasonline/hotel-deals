import { createAdminClient } from '@/lib/supabase-admin';
import PropertiesClient, { type PropertyRow } from './PropertiesClient';

export const dynamic = 'force-dynamic';

export default async function PropertiesPage() {
  const admin = createAdminClient();

  // 1. Hotels + room counts
  const { data: hotelsRaw } = await admin
    .from('hotels')
    .select('id, name, city, country, address, description, star_rating, image_url, is_active, rooms(id, quantity_total)')
    .order('name');

  // 2. hotel_partners links
  const { data: hpRaw } = await admin
    .from('hotel_partners')
    .select('hotel_id, user_id');

  // 3. Profiles for those partners
  const userIds = [...new Set((hpRaw ?? []).map((r: { user_id: string }) => r.user_id))];
  type ProfileRow = { id: string; full_name: string | null; email: string | null; status: string | null; created_at: string };
  const profilesMap = new Map<string, ProfileRow>();
  if (userIds.length > 0) {
    const { data: profilesRaw } = await admin
      .from('profiles')
      .select('id, full_name, email, status, created_at')
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

  // 5. hotel_id → partner map (one-to-one after migration 071)
  const partnerByHotel = new Map<number, { id: string; full_name: string; email: string; status: 'active' | 'suspended'; created_at: string }>();
  for (const row of (hpRaw ?? []) as { hotel_id: number; user_id: string }[]) {
    const p = profilesMap.get(row.user_id);
    if (!p) continue;
    partnerByHotel.set(row.hotel_id, {
      id:         p.id,
      full_name:  p.full_name ?? 'Unknown',
      email:      p.email ?? '',
      status:     p.status === 'suspended' ? 'suspended' : 'active',
      created_at: p.created_at,
    });
  }

  type RawHotel = {
    id: number; name: string; city: string | null; country: string | null;
    address: string | null; description: string | null;
    star_rating: number | null; image_url: string | null;
    is_active: boolean | null; rooms: { id: number; quantity_total: number | null }[];
  };

  const properties: PropertyRow[] = ((hotelsRaw ?? []) as unknown as RawHotel[]).map(h => {
    const partner = partnerByHotel.get(h.id) ?? null;
    const stats   = statsMap.get(h.id) ?? { total: 0, revenue: 0 };
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
      partner,
      booking_count: stats.total,
      total_revenue: stats.revenue,
    };
  });

  return <PropertiesClient initialProperties={properties} />;
}
