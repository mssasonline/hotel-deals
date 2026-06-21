'use server';

import { sendBookingConfirmation, type BookingEmailData } from '@/lib/emailService';
import { createAdminClient } from '@/lib/supabase-admin';
import { fromAEDTo } from '@/lib/currency';
import { CURRENCY_MAP } from '@/lib/currencyData';
import type { CurrencyCode } from '@/lib/currencyData';

export async function sendBookingEmailAction(bookingId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Fetch booking with hotel + room + partner + contact details
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id,
        guest_name,
        guest_email,
        check_in,
        check_out,
        total_price,
        charged_currency,
        hotels (
          id,
          name,
          contact_phone,
          contact_email,
          contact_whatsapp,
          checkin_time,
          checkout_time,
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

    const h = hotel as Record<string, unknown>;
    const totalPrice    = Number(booking.total_price ?? 0);
    const currency      = (String(booking.charged_currency ?? 'aed')) as CurrencyCode;
    const currencyInfo  = CURRENCY_MAP[currency] ?? CURRENCY_MAP['aed'];
    const displayTotal  = fromAEDTo(totalPrice, currency);

    const data: BookingEmailData = {
      guestName:    String(booking.guest_name  ?? ''),
      guestEmail:   String(booking.guest_email ?? ''),
      hotelName:    String(h?.name ?? ''),
      roomName:     String((room  as Record<string, unknown>)?.name ?? ''),
      checkIn,
      checkOut,
      nights,
      totalPrice,
      displayTotal,
      currencySymbol: currencyInfo.symbol,
      bookingRef:   String(booking.id).slice(0, 8).toUpperCase(),
      partnerEmail: partner?.email,
      partnerName:  partner?.full_name,
      hotelPhone:       (h?.contact_phone    as string | null) ?? undefined,
      hotelEmail:       (h?.contact_email    as string | null) ?? undefined,
      hotelWhatsapp:    (h?.contact_whatsapp as string | null) ?? undefined,
      hotelCheckinTime: (h?.checkin_time     as string | null) ?? undefined,
      hotelCheckoutTime:(h?.checkout_time    as string | null) ?? undefined,
    };

    await sendBookingConfirmation(data);
  } catch (err) {
    // Fire-and-forget — never block the booking flow
    console.error('[sendBookingEmailAction] Error:', err);
  }
}
