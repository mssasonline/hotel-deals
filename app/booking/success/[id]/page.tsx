import { notFound } from 'next/navigation';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import BookingSuccessContent from './BookingSuccessContent';

interface Props {
  params: Promise<{ id: string }>;
}

function calcNights(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const n = Math.ceil((b.getTime() - a.getTime()) / 86400000);
  return n > 0 ? n : 1;
}

export default async function BookingSuccessPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !booking) notFound();

  const [{ data: hotel }, { data: room }] = await Promise.all([
    supabase.from('hotels').select('name, city, location, address').eq('id', booking.hotel_id).single(),
    supabase.from('rooms').select('name, room_type').eq('id', booking.room_id).single(),
  ]);

  const roomTypeLabel: Record<string, string> = { standard: 'Standard', deluxe: 'Deluxe', suite: 'Suite' };

  return (
    <>
      <Header />

      <main className="min-h-screen py-8 sm:py-12" style={{ background: '#F8FAFC' }}>
        <BookingSuccessContent
          data={{
            shortId: String(id).slice(0, 8).toUpperCase(),
            hotelName: String(hotel?.name ?? 'Hotel'),
            hotelCity: String(hotel?.city ?? hotel?.location ?? ''),
            roomName: String(room?.name ?? 'Room'),
            roomType: roomTypeLabel[String(room?.room_type ?? '')] ?? String(room?.room_type ?? ''),
            checkIn: booking.check_in,
            checkOut: booking.check_out,
            nights: calcNights(booking.check_in, booking.check_out),
            guestsCount: booking.guests_count ?? 1,
            roomCount: booking.room_count ?? 1,
            totalPrice: Number(booking.total_price ?? 0),
            guestName: booking.guest_name ?? '',
            status: booking.status ?? 'pending',
          }}
        />
      </main>

      <Footer />
    </>
  );
}
