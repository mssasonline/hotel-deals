'use server';

import { sendBookingConfirmation, type BookingEmailData } from '@/lib/emailService';
import { createAdminClient } from '@/lib/supabase-admin';

export async function sendBookingEmailAction(bookingId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Fetch booking with hotel + room + partner details
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id,
        guest_name,
        guest_email,
        check_in,
        check_out,
        total_price,
        hotels (
          id,
          name,
          hotel_partners ( profiles ( email, full_name ) )
        ),
        rooms ( name )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) return;

    const hotel    = Array.isArray(booking.hotels) ? booking.hotels[0] : booking.hotels;
    const room     = Array.isArray(booking.rooms)  ? booking.rooms[0]  : booking.rooms;
    const partners = (hotel as Record<string, unknown>)?.hotel_partners as
      Array<{ profiles: { email: string; full_name: string } | null }> | null;
    const partner  = partners?.[0]?.profiles;

    const checkIn  = String(booking.check_in);
    const checkOut = String(booking.check_out);
    const nights   = Math.max(
      1,
      Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
      )
    );

    const data: BookingEmailData = {
      guestName:    String(booking.guest_name  ?? ''),
      guestEmail:   String(booking.guest_email ?? ''),
      hotelName:    String((hotel as Record<string, unknown>)?.name ?? ''),
      roomName:     String((room  as Record<string, unknown>)?.name ?? ''),
      checkIn,
      checkOut,
      nights,
      totalPrice:   Number(booking.total_price ?? 0),
      bookingRef:   String(booking.id).slice(0, 8).toUpperCase(),
      partnerEmail: partner?.email,
      partnerName:  partner?.full_name,
    };

    await sendBookingConfirmation(data);
  } catch (err) {
    // Fire-and-forget — never block the booking flow
    console.error('[sendBookingEmailAction] Error:', err);
  }
}
