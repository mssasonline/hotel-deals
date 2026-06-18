'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export interface CreateBookingInput {
  hotelId: number;
  roomId: string | null;   // preferred id from the client store
  roomName: string;        // fallback for a server-side lookup
  guest: {
    fullName: string;
    phoneCountryCode: string;
    phoneCountryIso: string;
    phoneNumber: string;
    countryIso: string;
  };
  checkInISO: string;
  checkOutISO: string;
  total: number;
  subtotal: number;
  taxCountryCode: string;
  taxVatPct: number;
  fixedFeePerNight: number;
  taxes: number;
  pricePerNight: number;
  roomsCount: number;
  guests: number;
  hotelName: string;       // for the confirmation notification
  checkInLabel: string;
  checkOutLabel: string;
  breakfastIncluded: boolean;
  breakfastPricePerPerson: number;
}

export type CreateBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; code: 'AUTH' | 'LIMIT' | 'ROOM_UNAVAILABLE' | 'UNKNOWN'; message: string };

/**
 * Creates a booking entirely on the server.
 *
 * Why a Server Action: the browser Supabase client serializes every query
 * behind GoTrue's in-process auth lock, which deadlocks after the tab has been
 * backgrounded — so a client-side insert hangs (the TIMEOUT users hit after
 * returning from another app). Running server-side reads the session from
 * cookies and uses the service-role client, completely sidestepping that lock,
 * exactly like fetchMyTrips() which is why "My Trips" always works on return.
 */
export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  // Auth from cookies — immune to the client-side auth lock.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: 'AUTH', message: 'Your session has expired. Please sign in again.' };
  }

  try {
    const admin = createAdminClient();

    // 1. Enforce the active-booking limit.
    const { data: limitRow } = await admin
      .from('platform_settings').select('value').eq('key', 'guest_booking_limit').maybeSingle();
    const bookingLimit = limitRow ? Number(limitRow.value) : 5;

    const { count: activeCount } = await admin
      .from('bookings').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('status', 'in', '("completed","cancelled")');

    if ((activeCount ?? 0) >= bookingLimit) {
      return {
        ok: false,
        code: 'LIMIT',
        message: `You have reached the maximum of ${bookingLimit} active booking${bookingLimit !== 1 ? 's' : ''}. Complete or cancel an existing booking first.`,
      };
    }

    // 2. Resolve the room id (prefer what the client already has).
    let roomId = input.roomId;
    if (!roomId) {
      const { data: roomRow } = await admin
        .from('rooms').select('id').eq('hotel_id', input.hotelId).eq('name', input.roomName).maybeSingle();
      roomId = roomRow ? String(roomRow.id) : null;
    }

    // 3. Insert the booking. DB triggers still enforce availability
    //    (ROOM_UNAVAILABLE) and record the revenue split.
    const { data: inserted, error: insertError } = await admin
      .from('bookings').insert({
        hotel_id:         input.hotelId,
        room_id:          roomId,
        user_id:          user.id,
        guest_name:       input.guest.fullName || user.email,
        guest_email:      user.email,
        check_in:         input.checkInISO,
        check_out:        input.checkOutISO,
        total_price:      input.total,
        subtotal:         input.subtotal,
        tax_country_code: input.taxCountryCode,
        tax_vat_pct:      input.taxVatPct,
        tax_fixed_fee:    input.fixedFeePerNight,
        tax_amount:       input.taxes,
        locked_price:     input.pricePerNight,
        room_count:                input.roomsCount,
        status:                    'upcoming',
        payment_status:            'paid',
        guests_count:              input.guests,
        breakfast_included:        input.breakfastIncluded,
        breakfast_price_per_person: input.breakfastPricePerPerson > 0 ? input.breakfastPricePerPerson : null,
      })
      .select('id').single();

    if (insertError || !inserted) {
      const msg = insertError?.message ?? '';
      if (msg.includes('ROOM_UNAVAILABLE')) {
        return { ok: false, code: 'ROOM_UNAVAILABLE', message: 'This room was just booked for the selected dates.' };
      }
      console.error('[createBooking] insert error:', insertError);
      return { ok: false, code: 'UNKNOWN', message: msg };
    }

    const bookingId = String(inserted.id);

    // 4. Best-effort side effects — never fail the confirmed booking.
    try {
      await admin.from('profiles').update({
        full_name:          input.guest.fullName         || null,
        phone_country_code: input.guest.phoneCountryCode || null,
        phone_country_iso:  input.guest.phoneCountryIso  || null,
        phone_number:       input.guest.phoneNumber      || null,
        addr_country:       input.guest.countryIso       || null,
      }).eq('id', user.id);

      await admin.from('notifications').insert({
        user_id: user.id,
        title:   'Booking Confirmed',
        message: `Your reservation at ${input.hotelName} (${input.roomName}) from ${input.checkInLabel} to ${input.checkOutLabel} is confirmed. Booking ref: SR-${bookingId.slice(0, 8).toUpperCase()}.`,
      });
    } catch (sideErr) {
      console.error('[createBooking] post-insert side effect failed (ignored):', sideErr);
    }

    return { ok: true, bookingId };
  } catch (err) {
    console.error('[createBooking] unexpected error:', err);
    return { ok: false, code: 'UNKNOWN', message: 'Booking failed. Please try again.' };
  }
}
