'use server';

import { createAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export type LastMinRoom = {
  room_id: number;
  room_name: string;
  base_price: number;
  min_price: number;
  hotel_id: number;
  hotel_name: string;
  hotel_city: string;
};

export type LastMinHotelGroup = {
  hotel_id: number;
  hotel_name: string;
  hotel_city: string;
  rooms: LastMinRoom[];
};

export async function getLastMinRooms(): Promise<LastMinHotelGroup[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('rooms')
    .select('id, name, base_price, min_price, hotels!inner(id, name, city, is_active)')
    .eq('hotels.is_active', true)
    .gt('base_price', 0)
    .order('name');

  if (error || !data) return [];

  const map = new Map<number, LastMinHotelGroup>();

  for (const row of data) {
    const hotel = Array.isArray(row.hotels) ? row.hotels[0] : row.hotels;
    if (!hotel) continue;

    const hotelId = Number(hotel.id);

    if (!map.has(hotelId)) {
      map.set(hotelId, {
        hotel_id:   hotelId,
        hotel_name: String(hotel.name ?? ''),
        hotel_city: String(hotel.city ?? ''),
        rooms:      [],
      });
    }

    map.get(hotelId)!.rooms.push({
      room_id:    Number(row.id),
      room_name:  String(row.name ?? ''),
      base_price: Number(row.base_price ?? 0),
      min_price:  Number(row.min_price ?? 0),
      hotel_id:   hotelId,
      hotel_name: String(hotel.name ?? ''),
      hotel_city: String(hotel.city ?? ''),
    });
  }

  return Array.from(map.values()).sort((a, b) => a.hotel_name.localeCompare(b.hotel_name));
}
