'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

// ── Bookings ──────────────────────────────────────────────────────────────────

export interface UserBooking {
  id: string;
  hotel_id: number;
  room_id: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  total_price: number;
  locked_price?: number;
  status: string;
  payment_status: string;
  guests_count: number;
  created_at: string;
  hotels?: { name: string; city: string; image_url: string | null };
  rooms?: { name: string; capacity: number };
}

export async function fetchMyBookings(): Promise<UserBooking[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();

  const { data } = await admin
    .from('bookings')
    .select('*, hotels(name, city, image_url), rooms(name, capacity)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  type RawRow = Omit<UserBooking, 'hotels' | 'rooms'> & {
    hotels: UserBooking['hotels'] | UserBooking['hotels'][] | null;
    rooms: UserBooking['rooms'] | UserBooking['rooms'][] | null;
  };
  const rows = ((data ?? []) as RawRow[]).map(row => ({
    ...row,
    hotels: Array.isArray(row.hotels) ? (row.hotels[0] ?? undefined) : (row.hotels ?? undefined),
    rooms: Array.isArray(row.rooms) ? (row.rooms[0] ?? undefined) : (row.rooms ?? undefined),
  })) as UserBooking[];

  const now = new Date();

  const toComplete = rows.filter(
    b => (b.status === 'upcoming' || b.status === 'active') && new Date(b.check_out) < now
  );
  if (toComplete.length > 0) {
    const ids = toComplete.map(b => b.id);
    await admin.from('bookings').update({ status: 'completed' }).in('id', ids);
    await Promise.all(
      toComplete.map(b =>
        admin.from('notifications').insert({
          user_id: user.id,
          title: 'Stay Completed',
          message: `We hope you enjoyed your stay at ${b.hotels?.name ?? 'the hotel'}! Your booking has been marked as completed.`,
        })
      )
    );
    toComplete.forEach(b => { b.status = 'completed'; });
  }

  const toActivate = rows.filter(
    b =>
      b.status === 'upcoming' &&
      new Date(b.check_in) <= now &&
      new Date(b.check_out) >= now
  );
  if (toActivate.length > 0) {
    const ids = toActivate.map(b => b.id);
    await admin.from('bookings').update({ status: 'active' }).in('id', ids);
    toActivate.forEach(b => { b.status = 'active'; });
  }

  return rows;
}

// ── Trips (bookings + review IDs) ────────────────────────────────────────────

export interface TripBooking {
  id: number;
  hotel_id: number;
  check_in: string;
  check_out: string;
  total_price: number;
  status: string | null;
  payment_status: string | null;
  guests_count?: number | null;
  hotels: { name: string; city: string; image_url: string | null } | null;
  rooms: { name: string } | null;
}

export interface MyTripsResult {
  bookings: TripBooking[];
  reviewedBookingIds: string[];
}

export async function fetchMyTrips(): Promise<MyTripsResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { bookings: [], reviewedBookingIds: [] };

  const admin = createAdminClient();

  const [bookingsRes, reviewsRes] = await Promise.all([
    admin
      .from('bookings')
      .select('*, hotels(name, city, image_url), rooms(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    admin
      .from('reviews')
      .select('id, booking_id')
      .eq('user_id', user.id),
  ]);

  type RawTripRow = Omit<TripBooking, 'hotels' | 'rooms'> & {
    hotels: TripBooking['hotels'] | TripBooking['hotels'][] | null;
    rooms: TripBooking['rooms'] | TripBooking['rooms'][] | null;
  };

  const bookings = ((bookingsRes.data ?? []) as RawTripRow[]).map(row => ({
    ...row,
    hotels: Array.isArray(row.hotels) ? (row.hotels[0] ?? null) : (row.hotels ?? null),
    rooms: Array.isArray(row.rooms) ? (row.rooms[0] ?? null) : (row.rooms ?? null),
  })) as TripBooking[];

  const reviewedBookingIds = ((reviewsRes.data ?? []) as { booking_id: string | null }[])
    .map(r => r.booking_id)
    .filter((id): id is string => Boolean(id));

  return { bookings, reviewedBookingIds };
}

// ── Account profile + saved cards ─────────────────────────────────────────────

export interface AccountProfile {
  full_name: string | null;
  phone_country_code: string | null;
  phone_country_iso: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  gender: string | null;
  addr_country: string | null;
  addr_city: string | null;
  addr_district: string | null;
  addr_building: string | null;
  addr_apartment: string | null;
  addr_street: string | null;
  addr_postal_code: string | null;
  addr_additional: string | null;
}

export interface AccountSavedCard {
  id: number;
  user_id: string;
  card_holder: string;
  last_four: string;
  network: string;
  expiry: string;
  is_default: boolean;
  created_at: string;
}

export interface AccountData {
  profile: AccountProfile | null;
  savedCards: AccountSavedCard[];
}

export async function fetchMyAccountData(): Promise<AccountData> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { profile: null, savedCards: [] };

  const admin = createAdminClient();

  const [profileRes, cardsRes] = await Promise.all([
    admin
      .from('profiles')
      .select('full_name,phone_country_code,phone_country_iso,phone_number,date_of_birth,nationality,gender,addr_country,addr_city,addr_district,addr_building,addr_apartment,addr_street,addr_postal_code,addr_additional')
      .eq('id', user.id)
      .maybeSingle(),
    admin
      .from('saved_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  return {
    profile: (profileRes.data as AccountProfile | null) ?? null,
    savedCards: (cardsRes.data as AccountSavedCard[]) ?? [],
  };
}

// ── Notifications ────────────────────────────────────────────────────────────

export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export async function fetchMyNotifications(): Promise<UserNotification[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return (data as UserNotification[]) ?? [];
}

// ── Favorites ─────────────────────────────────────────────────────────────────

export interface RawFavoriteResult {
  hotel_id: number;
  hotels: Record<string, unknown> | null;
}

export async function fetchMyFavorites(): Promise<RawFavoriteResult[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();

  const { data } = await admin
    .from('favorites')
    .select('hotel_id, hotels(*, hotel_images(image_url, sort_order), rooms(base_price, min_price, quantity_available, quantity_total))')
    .eq('user_id', user.id);

  return ((data ?? []) as Record<string, unknown>[]).map(row => ({
    hotel_id: row.hotel_id as number,
    hotels: Array.isArray(row.hotels)
      ? ((row.hotels as Record<string, unknown>[])[0] ?? null)
      : (row.hotels as Record<string, unknown> | null),
  }));
}
