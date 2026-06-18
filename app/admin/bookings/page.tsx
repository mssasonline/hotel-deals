import { createAdminClient } from '@/lib/supabase-admin';
import BookingsClient, { type AdminBooking, type BookingStatus } from './BookingsClient';

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
  created_at: string;
  rooms: { name: string } | { name: string }[] | null;
  hotels: { name: string; city: string } | { name: string; city: string }[] | null;
  booking_revenue: { partner_amount: number; admin_amount: number } | { partner_amount: number; admin_amount: number }[] | null;
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
      total_price, subtotal, created_at,
      rooms(name),
      hotels(name, city),
      booking_revenue(partner_amount, admin_amount)
    `)
    .order('created_at', { ascending: false });


  const bookings: AdminBooking[] = ((raw ?? []) as RawRow[]).map((row) => {
    const room    = resolveJoin(row.rooms);
    const hotel   = resolveJoin(row.hotels);
    const revenue = resolveJoin(row.booking_revenue);
    const validStatuses: BookingStatus[] = ['upcoming', 'confirmed', 'pending', 'completed', 'cancelled'];
    const status = validStatuses.includes(row.status as BookingStatus) ? (row.status as BookingStatus) : 'pending';
    const total  = status === 'cancelled' ? 0 : Number(row.total_price ?? 0);

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
      partnerAmount:  Number(revenue?.partner_amount ?? total * 0.9),
      adminAmount:    Number(revenue?.admin_amount   ?? total * 0.1),
    };
  });

  return <BookingsClient initialBookings={bookings} />;
}
