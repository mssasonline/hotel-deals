'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export type PartnerHotel = {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
  description: string;
  star_rating: number | null;
  amenities: string[];
  latitude: number | null;
  longitude: number | null;
  airport_code: string | null;
  breakfast_price_per_person: number | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_whatsapp: string | null;
  emergency_phone: string | null;
  checkin_time: string | null;
  checkout_time: string | null;
  parking_info: string | null;
  category: string | null;
};

export type HotelImage = {
  id: string;
  hotel_id: string;
  image_url: string;
  sort_order: number;
};

export type PartnerRoom = {
  id: string;
  hotel_id: string;
  name: string;
  type: string;
  area_sqm: number | null;
  bed_type: string | null;
  image_url: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  features: string[];
  base_price: number;
  min_price: number;
  min_price_weekend: number;
  capacity: number;
  available: number;
  quantity_total: number;
  quantity_available: number;
};

// ── Shared data types for server-side hotel queries ──────────────────────────

export type HotelBooking = {
  id: string;
  hotel_id: string;
  room_id: string | null;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  status: string;
  payment_status: string;
  total_price: number;
  subtotal: number | null;
  room_count: number | null;
  created_at: string;
  rooms: { id: string; name: string } | null;
  partner_amount: number | null;
  admin_amount: number | null;
};

export type HotelRoom = {
  id: string;
  name: string;
  room_type: string | null;
  base_price: number;
  capacity: number;
  available: boolean | number;
};

export type HotelReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type HotelData = {
  bookings: HotelBooking[];
  rooms: HotelRoom[];
  reviews: HotelReview[];
  imageCount: number;
};

export type MyProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  addr_city: string | null;
  addr_country: string | null;
  avatar_url: string | null;
  role: string;
  status: string;
};

// ── getHotelData ──────────────────────────────────────────────────────────────
// Returns bookings, rooms, and reviews for a hotel the partner manages.
// Uses server-side client — avoids browser token-refresh race conditions.

export async function getHotelData(hotelId: string): Promise<HotelData> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { bookings: [], rooms: [], reviews: [], imageCount: 0 };

  // Ownership check
  const { data: hp } = await supabase
    .from('hotel_partners')
    .select('hotel_id')
    .eq('user_id', user.id)
    .eq('hotel_id', hotelId)
    .maybeSingle();
  if (!hp) return { bookings: [], rooms: [], reviews: [], imageCount: 0 };

  const admin = createAdminClient();
  const [bookingsRes, roomsRes, reviewsRes, imagesRes] = await Promise.all([
    admin
      .from('bookings')
      .select('id, hotel_id, room_id, guest_name, guest_email, check_in, check_out, status, payment_status, total_price, subtotal, room_count, created_at, rooms(id, name), booking_revenue(partner_amount, admin_amount)')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false }),
    admin
      .from('rooms')
      .select('id, name, room_type, base_price, capacity, available')
      .eq('hotel_id', hotelId)
      .order('name'),
    admin
      .from('reviews')
      .select('id, rating, comment, created_at')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false }),
    admin
      .from('hotel_images')
      .select('id', { count: 'exact', head: true })
      .eq('hotel_id', hotelId),
  ]);

  type RawBooking = Omit<HotelBooking, 'rooms' | 'partner_amount' | 'admin_amount'> & {
    rooms: { id: string; name: string }[] | { id: string; name: string } | null;
    booking_revenue: { partner_amount: number; admin_amount: number }[] | { partner_amount: number; admin_amount: number } | null;
  };

  return {
    bookings: ((bookingsRes.data ?? []) as RawBooking[]).map(row => {
      const rev = Array.isArray(row.booking_revenue)
        ? (row.booking_revenue[0] ?? null)
        : (row.booking_revenue ?? null);
      return {
        ...row,
        id: String(row.id),
        hotel_id: String(row.hotel_id),
        rooms: Array.isArray(row.rooms) ? (row.rooms[0] ?? null) : (row.rooms ?? null),
        partner_amount: rev?.partner_amount ?? null,
        admin_amount:   rev?.admin_amount   ?? null,
      };
    }),
    rooms: (roomsRes.data ?? []) as HotelRoom[],
    reviews: (reviewsRes.data ?? []) as HotelReview[],
    imageCount: imagesRes.count ?? 0,
  };
}

// ── getMyProfile ──────────────────────────────────────────────────────────────

export async function getMyProfile(): Promise<MyProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, addr_city, addr_country, avatar_url, role, status')
    .eq('id', user.id)
    .single();

  return (data as MyProfile | null) ?? null;
}

export type BookingRow = {
  id: string;
  hotel_id: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  status: string;
  payment_status: string;
  total_price: number;
  subtotal: number | null;
  created_at: string;
  rooms: { name: string } | null;
};

// ── getMyBookings ─────────────────────────────────────────────────────────────
// Returns all bookings + hotel name map for the authenticated partner.
// Runs all three DB hops server-side (single server action round-trip from browser).

export async function getMyBookings(): Promise<{
  bookings: BookingRow[];
  hotelNames: Record<string, string>;
}> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { bookings: [], hotelNames: {} };

  const { data: partnerData } = await supabase
    .from('hotel_partners')
    .select('hotel_id, hotels(id, name)')
    .eq('user_id', user.id);

  if (!partnerData || partnerData.length === 0) return { bookings: [], hotelNames: {} };

  const hotelIds = partnerData.map((row: Record<string, unknown>) => row.hotel_id as string);
  const hotelNames: Record<string, string> = {};
  partnerData.forEach((row: Record<string, unknown>) => {
    const hotel = row.hotels as { id: string; name: string } | null;
    if (hotel) hotelNames[String(row.hotel_id)] = hotel.name;
  });

  const { data: bookingData } = await supabase
    .from('bookings')
    .select('id, hotel_id, guest_name, guest_email, check_in, check_out, status, payment_status, total_price, subtotal, created_at, rooms(name)')
    .in('hotel_id', hotelIds)
    .order('created_at', { ascending: false });

  type RawRow = Omit<BookingRow, 'rooms'> & { rooms: { name: string }[] | null };
  const bookings: BookingRow[] = ((bookingData ?? []) as RawRow[]).map(row => ({
    ...row,
    id: String(row.id),
    hotel_id: String(row.hotel_id),
    rooms: row.rooms?.[0] ?? null,
  }));

  return { bookings, hotelNames };
}

// ── getMyHotels ───────────────────────────────────────────────────────────────
// Returns hotels linked to the authenticated partner via hotel_partners.
// Uses anon client + cookies (RLS policies applied to hotel_partners).

export async function getMyHotels(): Promise<PartnerHotel[]> {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('hotel_partners')
    .select('hotels(id, name, city, country, address, description, star_rating, amenities, latitude, longitude, airport_code, breakfast_price_per_person, contact_phone, contact_email, contact_whatsapp, emergency_phone, checkin_time, checkout_time, parking_info, category)')
    .eq('user_id', user.id);

  type RawHotel = {
    id: number;
    name: string;
    city: string | null;
    country: string | null;
    address: string | null;
    description: string | null;
    star_rating: number | null;
    amenities: string[] | null;
    latitude: number | null;
    longitude: number | null;
    airport_code: string | null;
    breakfast_price_per_person: number | null;
    contact_phone: string | null;
    contact_email: string | null;
    contact_whatsapp: string | null;
    emergency_phone: string | null;
    checkin_time: string | null;
    checkout_time: string | null;
    parking_info: string | null;
    category: string | null;
  };
  type Row = { hotels: RawHotel | RawHotel[] | null };

  return ((data ?? []) as Row[])
    .map(row => {
      const h = Array.isArray(row.hotels)
        ? (row.hotels as unknown as RawHotel[])[0]
        : row.hotels as unknown as RawHotel | null;
      if (!h) return null;
      return {
        id:           String(h.id),
        name:         h.name,
        city:         h.city         ?? '',
        country:      h.country      ?? '',
        address:      h.address      ?? '',
        description:  h.description  ?? '',
        star_rating:  h.star_rating,
        amenities:    Array.isArray(h.amenities) ? h.amenities : [],
        latitude:     h.latitude     ?? null,
        longitude:    h.longitude    ?? null,
        airport_code: h.airport_code ?? null,
        breakfast_price_per_person: h.breakfast_price_per_person ?? null,
        contact_phone:    h.contact_phone    ?? null,
        contact_email:    h.contact_email    ?? null,
        contact_whatsapp: h.contact_whatsapp ?? null,
        emergency_phone:  h.emergency_phone  ?? null,
        checkin_time:     h.checkin_time     ?? null,
        checkout_time:    h.checkout_time    ?? null,
        parking_info:     h.parking_info     ?? null,
        category:         h.category         ?? null,
      };
    })
    .filter((h): h is PartnerHotel => h !== null);
}

// ── getMyRooms ────────────────────────────────────────────────────────────────
// Returns all rooms for hotels the authenticated partner manages.
// Uses service-role admin client to bypass any RLS gaps on the rooms table.

export async function getMyRooms(): Promise<PartnerRoom[]> {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get the partner's hotel IDs (RLS policy exists for hotel_partners now)
  const { data: hpData } = await supabase
    .from('hotel_partners')
    .select('hotel_id')
    .eq('user_id', user.id);

  if (!hpData || hpData.length === 0) return [];

  const hotelIds = (hpData as { hotel_id: number }[]).map(row => row.hotel_id);

  // Admin client bypasses any RLS gaps on rooms
  const admin = createAdminClient();
  const { data: roomData, error } = await admin
    .from('rooms')
    .select('id, hotel_id, name, room_type, area_sqm, bed_type, image_url, image_url_2, image_url_3, features, base_price, min_price, min_price_weekend, capacity, available, quantity_total, quantity_available')
    .in('hotel_id', hotelIds)
    .order('hotel_id')
    .order('name');

  if (error) {
    console.error('[getMyRooms] error:', error.message);
    return [];
  }

  type RawRoom = {
    id: number;
    hotel_id: number;
    name: string;
    room_type: string | null;
    area_sqm: number | null;
    bed_type: string | null;
    image_url: string | null;
    image_url_2: string | null;
    image_url_3: string | null;
    features: string[] | null;
    base_price: number;
    min_price: number | null;
    min_price_weekend: number | null;
    capacity: number;
    available: boolean | number;
    quantity_total: number | null;
    quantity_available: number | null;
  };

  const rooms = (roomData ?? []) as RawRoom[];

  // Compute live availability for TODAY in a single query (avoids N RPC calls).
  // A booking overlaps today if check_in < tomorrow AND check_out > today.
  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];
  const roomIds  = rooms.map(r => r.id);

  const { data: bookedRows } = roomIds.length > 0
    ? await admin
        .from('bookings')
        .select('room_id, room_count')
        .in('room_id', roomIds)
        .in('status', ['upcoming', 'active'])
        .lt('check_in', tomorrow)
        .gt('check_out', today)
    : { data: [] };

  // Sum booked room_count per room_id
  const bookedByRoom: Record<string, number> = {};
  for (const b of (bookedRows ?? []) as { room_id: number; room_count: number | null }[]) {
    const key = String(b.room_id);
    bookedByRoom[key] = (bookedByRoom[key] ?? 0) + (b.room_count ?? 1);
  }

  return rooms.map(r => {
    const qty       = r.quantity_total ?? 1;
    const booked    = bookedByRoom[String(r.id)] ?? 0;
    const liveAvail = Math.max(0, qty - booked);
    return {
      id:                 String(r.id),
      hotel_id:           String(r.hotel_id),
      name:               r.name,
      type:               r.room_type ?? '',
      area_sqm:           r.area_sqm ?? null,
      bed_type:           r.bed_type ?? null,
      image_url:          r.image_url   ?? null,
      image_url_2:        r.image_url_2 ?? null,
      image_url_3:        r.image_url_3 ?? null,
      features:           r.features  ?? [],
      base_price:         r.base_price,
      min_price:          r.min_price ?? 0,
      min_price_weekend:  r.min_price_weekend ?? 0,
      capacity:           r.capacity,
      available:          liveAvail > 0 ? 1 : 0,
      quantity_total:     qty,
      quantity_available: liveAvail,
    };
  });
}

// ── updateMyRoom ──────────────────────────────────────────────────────────────
// Updates pricing/availability for a room the partner manages.
// Verifies ownership before writing.

export async function syncRoomAvailability(
  roomId: string,
): Promise<{ available: number; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { available: 0, error: 'Not authenticated' };

  const admin = createAdminClient();

  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];

  const { data, error: rpcErr } = await admin.rpc('get_room_availability', {
    p_room_id:  roomId,
    p_check_in:  today,
    p_check_out: tomorrow,
  });

  if (rpcErr) return { available: 0, error: rpcErr.message };

  const available = Number(data ?? 0);
  const { error: updErr } = await admin
    .from('rooms')
    .update({ quantity_available: available, available: available > 0 })
    .eq('id', roomId);

  return { available, error: updErr?.message ?? null };
}

export async function updateMyRoom(
  roomId: string,
  fields: {
    base_price?: number;
    min_price?: number;
    min_price_weekend?: number;
    quantity_total?: number;
    available?: number;
    image_url?: string | null;
    image_url_2?: string | null;
    image_url_3?: string | null;
    features?: string[];
    type?: string;
    area_sqm?: number | null;
    bed_type?: string | null;
  }
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Verify this room belongs to one of the partner's hotels
  const { data: hpData } = await supabase
    .from('hotel_partners')
    .select('hotel_id')
    .eq('user_id', user.id);

  const hotelIds = (hpData ?? []).map((row: { hotel_id: number }) => row.hotel_id);
  if (hotelIds.length === 0) return { error: 'No hotels assigned' };

  // Use admin client to perform the update (reliable regardless of RLS state)
  const admin = createAdminClient();

  // Verify room belongs to partner's hotel
  const { data: room } = await admin
    .from('rooms')
    .select('hotel_id')
    .eq('id', roomId)
    .single();

  if (!room || !hotelIds.includes(room.hotel_id)) {
    return { error: 'Access denied' };
  }

  const update: Record<string, unknown> = {};
  if (fields.base_price         !== undefined) update.base_price         = fields.base_price;
  if (fields.min_price          !== undefined) update.min_price          = fields.min_price;
  if (fields.min_price_weekend  !== undefined) update.min_price_weekend  = fields.min_price_weekend;
  if (fields.quantity_total !== undefined) update.quantity_total = fields.quantity_total;
  if (fields.available      !== undefined) update.available      = fields.available;
  if ('image_url'   in fields) update.image_url   = fields.image_url   ?? null;
  if ('image_url_2' in fields) update.image_url_2 = fields.image_url_2 ?? null;
  if ('image_url_3' in fields) update.image_url_3 = fields.image_url_3 ?? null;
  if (fields.features  !== undefined) update.features  = fields.features;
  if (fields.type      !== undefined) update.room_type = fields.type;
  if (fields.area_sqm  !== undefined) update.area_sqm  = fields.area_sqm;
  if (fields.bed_type  !== undefined) update.bed_type  = fields.bed_type;

  const { error } = await admin
    .from('rooms')
    .update(update)
    .eq('id', roomId);

  return { error: error?.message ?? null };
}

// ── addRoom ───────────────────────────────────────────────────────────────────
// Creates a new room for a hotel the partner manages.

export async function addRoom(
  hotelId: string,
  fields: {
    name: string;
    room_type: string;
    area_sqm?: number | null;
    bed_type?: string | null;
    image_url?: string | null;
    image_url_2?: string | null;
    image_url_3?: string | null;
    features?: string[];
    base_price: number;
    min_price: number;
    capacity: number;
    quantity_total: number;
    quantity_available: number;
  }
): Promise<{ data: PartnerRoom | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  // Verify partner owns this hotel
  const { data: hpData } = await supabase
    .from('hotel_partners')
    .select('hotel_id')
    .eq('user_id', user.id)
    .eq('hotel_id', hotelId)
    .maybeSingle();

  if (!hpData) return { data: null, error: 'Access denied' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('rooms')
    .insert({
      hotel_id:           Number(hotelId),
      name:               fields.name,
      room_type:          fields.room_type || null,
      area_sqm:           fields.area_sqm ?? null,
      bed_type:           fields.bed_type  ?? null,
      image_url:          fields.image_url   ?? null,
      image_url_2:        fields.image_url_2 ?? null,
      image_url_3:        fields.image_url_3 ?? null,
      features:           fields.features    ?? [],
      base_price:         fields.base_price,
      min_price:          fields.min_price,
      capacity:           fields.capacity,
      quantity_total:     fields.quantity_total,
      quantity_available: fields.quantity_available,
      available:          fields.quantity_available > 0,
    })
    .select('id, hotel_id, name, room_type, area_sqm, bed_type, image_url, image_url_2, image_url_3, features, base_price, min_price, min_price_weekend, capacity, available, quantity_total, quantity_available')
    .single();

  if (error) return { data: null, error: error.message };

  type R = {
    id: number; hotel_id: number; name: string; room_type: string | null;
    area_sqm: number | null; bed_type: string | null;
    image_url: string | null; image_url_2: string | null; image_url_3: string | null;
    features: string[] | null;
    base_price: number; min_price: number | null; min_price_weekend: number | null; capacity: number;
    available: boolean | number; quantity_total: number; quantity_available: number;
  };
  const r = data as R;
  return {
    data: {
      id:                 String(r.id),
      hotel_id:           String(r.hotel_id),
      name:               r.name,
      type:               r.room_type ?? '',
      area_sqm:           r.area_sqm ?? null,
      bed_type:           r.bed_type ?? null,
      image_url:          r.image_url   ?? null,
      image_url_2:        r.image_url_2 ?? null,
      image_url_3:        r.image_url_3 ?? null,
      features:           r.features  ?? [],
      base_price:         r.base_price,
      min_price:          r.min_price ?? 0,
      min_price_weekend:  r.min_price_weekend ?? 0,
      capacity:           r.capacity,
      available:          typeof r.available === 'boolean' ? (r.available ? 1 : 0) : (r.available ?? 0),
      quantity_total:     r.quantity_total,
      quantity_available: r.quantity_available,
    },
    error: null,
  };
}

// ── deleteRoom ────────────────────────────────────────────────────────────────
// Deletes a room the partner manages (verifies ownership first).

export async function deleteRoom(roomId: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: hpData } = await supabase
    .from('hotel_partners')
    .select('hotel_id')
    .eq('user_id', user.id);

  const hotelIds = (hpData ?? []).map((row: { hotel_id: number }) => row.hotel_id);
  if (hotelIds.length === 0) return { error: 'No hotels assigned' };

  const admin = createAdminClient();

  const { data: room } = await admin
    .from('rooms')
    .select('hotel_id')
    .eq('id', roomId)
    .single();

  if (!room || !hotelIds.includes(room.hotel_id)) return { error: 'Access denied' };

  const { error } = await admin.from('rooms').delete().eq('id', roomId);
  return { error: error?.message ?? null };
}

// ── updateMyHotel ─────────────────────────────────────────────────────────────
// Updates hotel details (name, city, country, address, description, star_rating, amenities).

export async function updateMyHotel(
  hotelId: string,
  fields: {
    name?: string;
    city?: string;
    country?: string;
    address?: string;
    description?: string;
    star_rating?: number | null;
    amenities?: string[];
    latitude?: number | null;
    longitude?: number | null;
    airport_code?: string | null;
    breakfast_price_per_person?: number | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    contact_whatsapp?: string | null;
    emergency_phone?: string | null;
    checkin_time?: string | null;
    checkout_time?: string | null;
    parking_info?: string | null;
    category?: string | null;
  }
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: hp } = await supabase
    .from('hotel_partners')
    .select('hotel_id')
    .eq('user_id', user.id)
    .eq('hotel_id', hotelId)
    .maybeSingle();
  if (!hp) return { error: 'Access denied' };

  const admin = createAdminClient();
  const { error } = await admin.from('hotels').update(fields).eq('id', hotelId);
  return { error: error?.message ?? null };
}

// ── getMyHotelImages ──────────────────────────────────────────────────────────
// Returns all images for a hotel the partner manages.

export async function getMyHotelImages(hotelId: string): Promise<HotelImage[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: hp } = await supabase
    .from('hotel_partners')
    .select('hotel_id')
    .eq('user_id', user.id)
    .eq('hotel_id', hotelId)
    .maybeSingle();
  if (!hp) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from('hotel_images')
    .select('id, hotel_id, image_url, sort_order')
    .eq('hotel_id', hotelId)
    .order('sort_order');

  return ((data ?? []) as { id: string; hotel_id: number; image_url: string; sort_order: number }[]).map(r => ({
    id:         r.id,
    hotel_id:   String(r.hotel_id),
    image_url:  r.image_url,
    sort_order: r.sort_order,
  }));
}

// ── addHotelImage ─────────────────────────────────────────────────────────────
// Adds a new image URL for a hotel the partner manages.

export async function addHotelImage(
  hotelId: string,
  imageUrl: string
): Promise<{ data: HotelImage | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data: hp } = await supabase
    .from('hotel_partners')
    .select('hotel_id')
    .eq('user_id', user.id)
    .eq('hotel_id', hotelId)
    .maybeSingle();
  if (!hp) return { data: null, error: 'Access denied' };

  const admin = createAdminClient();

  const MAX_IMAGES = 15;

  // Count existing images and enforce limit
  const { count } = await admin
    .from('hotel_images')
    .select('id', { count: 'exact', head: true })
    .eq('hotel_id', hotelId);
  if ((count ?? 0) >= MAX_IMAGES) {
    return { data: null, error: `Maximum ${MAX_IMAGES} images allowed per hotel.` };
  }

  // Next sort_order = max existing + 1
  const { data: existing } = await admin
    .from('hotel_images')
    .select('sort_order')
    .eq('hotel_id', hotelId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((existing as { sort_order: number } | null)?.sort_order ?? -1) + 1;

  const { data, error } = await admin
    .from('hotel_images')
    .insert({ hotel_id: Number(hotelId), image_url: imageUrl, sort_order: nextOrder })
    .select('id, hotel_id, image_url, sort_order')
    .single();

  if (error) return { data: null, error: error.message };
  const r = data as { id: string; hotel_id: number; image_url: string; sort_order: number };
  return { data: { id: r.id, hotel_id: String(r.hotel_id), image_url: r.image_url, sort_order: r.sort_order }, error: null };
}

// ── deleteHotelImage ──────────────────────────────────────────────────────────
// Deletes an image, verifying the partner owns the hotel.

export async function deleteHotelImage(
  imageId: string,
  hotelId: string
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: hp } = await supabase
    .from('hotel_partners')
    .select('hotel_id')
    .eq('user_id', user.id)
    .eq('hotel_id', hotelId)
    .maybeSingle();
  if (!hp) return { error: 'Access denied' };

  const admin = createAdminClient();
  const { error } = await admin.from('hotel_images').delete().eq('id', imageId).eq('hotel_id', hotelId);
  return { error: error?.message ?? null };
}

// ── Room rate calendar ─────────────────────────────────────────────────────────

export type RoomRate = { date: string; price: number };

/** Fetch all room_rates for a given room in a specific month (YYYY-MM). */
export async function getRoomRates(
  roomId: string,
  year: number,
  month: number, // 1-based
): Promise<RoomRate[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  const admin = createAdminClient();
  const { data } = await admin
    .from('room_rates')
    .select('date, price')
    .eq('room_id', roomId)
    .gte('date', from)
    .lt('date', nextMonth)
    .order('date');

  return (data ?? []).map(r => ({ date: r.date, price: Number(r.price) }));
}

/** Fetch today's custom rate for each of the given room IDs in a single query.
 *  Pass `date` as YYYY-MM-DD in the client's local timezone to avoid UTC drift. */
export async function getTodayRoomRates(
  roomIds: string[],
  date: string,
): Promise<Record<string, number>> {
  if (!roomIds.length) return {};
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const today = date;
  const admin = createAdminClient();
  const { data } = await admin
    .from('room_rates')
    .select('room_id, price')
    .in('room_id', roomIds)
    .eq('date', today);

  const map: Record<string, number> = {};
  for (const row of (data ?? [])) {
    map[row.room_id] = Number(row.price);
  }
  return map;
}

/** Upsert one or many room rates (partner must own the room). */
export async function upsertRoomRates(
  roomId: string,
  rates: RoomRate[],
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Verify ownership
  const { data: hpData } = await supabase
    .from('hotel_partners')
    .select('hotel_id')
    .eq('user_id', user.id);
  const hotelIds = (hpData ?? []).map((r: { hotel_id: number }) => r.hotel_id);
  if (hotelIds.length === 0) return { error: 'No hotels assigned' };

  const admin = createAdminClient();
  const { data: room } = await admin.from('rooms').select('hotel_id').eq('id', roomId).single();
  if (!room || !hotelIds.includes(room.hotel_id)) return { error: 'Access denied' };

  const rows = rates.map(r => ({ room_id: Number(roomId), date: r.date, price: r.price }));
  const { error } = await admin
    .from('room_rates')
    .upsert(rows, { onConflict: 'room_id,date' });

  return { error: error?.message ?? null };
}

/** Delete a room rate for a specific date (reverts to base_price). */
export async function deleteRoomRate(
  roomId: string,
  date: string,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: hpData } = await supabase
    .from('hotel_partners')
    .select('hotel_id')
    .eq('user_id', user.id);
  const hotelIds = (hpData ?? []).map((r: { hotel_id: number }) => r.hotel_id);

  const admin = createAdminClient();
  const { data: room } = await admin.from('rooms').select('hotel_id').eq('id', roomId).single();
  if (!room || !hotelIds.includes(room.hotel_id)) return { error: 'Access denied' };

  const { error } = await admin
    .from('room_rates')
    .delete()
    .eq('room_id', roomId)
    .eq('date', date);

  return { error: error?.message ?? null };
}
