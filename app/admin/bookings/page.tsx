import { createAdminClient } from '@/lib/supabase-admin';
import BookingsClient, { type AdminBooking, type BookingStatus } from './BookingsClient';
import { calcCommission } from '@/lib/calcCommission';

export const dynamic = 'force-dynamic';

type RawRow = {
  id: string | number;
  guest_name: string | null;
  guest_email: string | null;
  check_in: string;
  check_out: string;
  status: string;
  payment_status: string | null;
  total_price: number;
  subtotal: number | null;
  room_count: number | null;
  guests_count: number | null;
  breakfast_included: boolean | null;
  breakfast_price_per_person: number | null;
  created_at: string;
  rooms: { name: string } | { name: string }[] | null;
  hotels: { name: string; city: string } | { name: string; city: string }[] | null;
};

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000));
}

function resolveJoin<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function BookingsPage() {
  const supabase = createAdminClient();

  const { data: raw, error } = await supabase
    .from('bookings')
    .select(`
      id, guest_name, guest_email, check_in, check_out,
      status, payment_status,
      total_price, subtotal, room_count, guests_count, breakfast_included, breakfast_price_per_person, created_at,
      rooms(name),
      hotels(name, city)
    `)
    .order('created_at', { ascending: false });


  const bookings: AdminBooking[] = ((raw ?? []) as RawRow[]).map((row) => {
    const room  = resolveJoin(row.rooms);
    const hotel = resolveJoin(row.hotels);
    const validStatuses: BookingStatus[] = ['upcoming', 'confirmed', 'pending', 'completed', 'cancelled'];
    const status = validStatuses.includes(row.status as BookingStatus) ? (row.status as BookingStatus) : 'pending';
    const total  = status === 'cancelled' ? 0 : Number(row.total_price ?? 0);
    const { adminAmount, partnerAmount } = calcCommission({
      subtotal: row.subtotal,
      total_price: total,
      breakfast_included: row.breakfast_included,
      breakfast_price_per_person: row.breakfast_price_per_person,
      guests_count: row.guests_count,
      check_in: row.check_in,
      check_out: row.check_out,
    });

    return {
      id:             String(row.id),
      guestName:      row.guest_name  || '—',
      guestEmail:     row.guest_email || '—',
      hotelName:      hotel?.name     || '—',
      roomName:       room?.name      || '—',
      city:           hotel?.city     || '—',
      checkIn:        row.check_in,
      checkOut:       row.check_out,
      nights:         nightsBetween(row.check_in, row.check_out),
      bookingDate:    row.created_at,
      status,
      paymentStatus:  row.payment_status || 'pending',
      amount:         total,
      partnerAmount,
      adminAmount,
      subtotal:               row.subtotal,
      roomCount:              row.room_count,
      guestsCount:            row.guests_count,
      breakfastIncluded:      row.breakfast_included,
      breakfastPricePerPerson: row.breakfast_price_per_person,
    };
  });

  return <BookingsClient initialBookings={bookings} />;
}
