'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveLoginRedirect } from '@/lib/auth';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';
import { fetchMyAccountData } from '@/app/user-actions';
import { createNotification } from '@/lib/notifications';
import { sendBookingEmailAction } from '@/lib/actions/sendBookingEmail';
import type { HotelDetail } from '@/app/hotel/[id]/lib/hotelDetailData';
import { useBookingStore } from '@/store/bookingStore';
import { calcRoomPrice } from '@/lib/pricingEngine';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import BookingSummary from './BookingSummary';
import PriceBreakdownCard from './PriceBreakdownCard';
import UserDetailsForm, { type UserDetailsValues } from './UserDetailsForm';
import PaymentForm from './PaymentForm';
import CurrencyAmount from '@/app/components/CurrencyAmount';
import SavedCardSelector, { type SavedCard } from './SavedCardSelector';
import { processPayment } from '@/app/payment/lib/paymentService';

function parseToISO(dateStr: string): string {
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const match = dateStr.match(/\w{3},\s+(\w{3})\s+(\d{1,2}),\s+(\d{4})/);
  if (!match) return dateStr;
  const [, mon, day, year] = match;
  const mm = months[mon] ?? '01';
  return `${year}-${mm}-${day.padStart(2, '0')}`;
}

export default function BookingPageClient({
  hotel,
  taxVatPct = 15,
  fixedFeePerNight = 0,
  taxCountryCode = 'AE',
}: {
  hotel: HotelDetail;
  taxVatPct?: number;
  fixedFeePerNight?: number;
  taxCountryCode?: string;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const t = useTranslation();
  const { currency } = useAppSettingsStore();
  const [authChecked, setAuthChecked] = useState(false);
  const [guestDetails, setGuestDetails] = useState<UserDetailsValues>({
    fullName: '', phoneCountryCode: '+971', phoneCountryIso: 'AE', phoneNumber: '', countryIso: '',
  });
  const [paymentData, setPaymentData] = useState({ cardNumber: '', expiry: '', cvv: '', cardHolder: '' });
  const [profileInitial, setProfileInitial] = useState<UserDetailsValues | undefined>(undefined);

  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [availability, setAvailability] = useState<number | null>(null);
  const [supabaseRoomId, setSupabaseRoomId] = useState<string | null>(null);
  const { selectedRoom: storeRoom, checkInDate, checkOutDate, guests, confirmBooking } =
    useBookingStore();

  // Prefer the store room (has real Supabase prices set by HotelBookingPanel).
  // Fall back to mock only when navigating directly without going through hotel page.
  const room = (storeRoom ?? hotel.rooms[0]) as typeof hotel.rooms[0];

  const checkIn = checkInDate;
  const checkOut = checkOutDate;
  const checkInISO = parseToISO(checkIn);
  const checkOutISO = parseToISO(checkOut);
  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(checkOutISO).getTime() - new Date(checkInISO).getTime()) / 86400000
    )
  );
  const roomPricing = calcRoomPrice(room.basePrice, room.pricePerNight);
  const pricePerNight = roomPricing.currentPrice;
  const roomsCount = Math.max(1, room.quantity ?? 1);
  const subtotal = nights * pricePerNight * roomsCount;
  const vatAmount = Math.round(subtotal * (taxVatPct / 100));
  const fixedFees = Math.round(fixedFeePerNight * nights * roomsCount);
  const taxes = vatAmount + fixedFees;
  const total = subtotal + taxes;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      saveLoginRedirect(`/booking/${hotel.id}`);
      router.replace('/login');
      return;
    }
    setAuthChecked(true);

    const meta = user.user_metadata ?? {};
    const metaName = (meta.full_name as string | undefined) || (meta.name as string | undefined) || user.email?.split('@')[0] || '';

    fetchMyAccountData().then(({ profile, savedCards: cards }) => {
      setProfileInitial({
        fullName:         profile?.full_name         || metaName,
        phoneCountryCode: profile?.phone_country_code || (meta.phone_country_code as string | undefined) || '+971',
        phoneCountryIso:  profile?.phone_country_iso  || (meta.phone_country_iso  as string | undefined) || 'AE',
        phoneNumber:      profile?.phone_number       || (meta.phone_number        as string | undefined) || '',
        countryIso:       profile?.addr_country       || profile?.nationality      || '',
      });
      if (cards.length > 0) {
        setSavedCards(cards as SavedCard[]);
        const def = cards.find(c => c.is_default);
        if (def) setSelectedCardId(def.id);
      }
    }).catch(err => console.error('[BookingPageClient] profile/cards fetch error:', err));
  }, [user, loading, hotel.id, router]);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;

    (async () => {
      try {
        const { data: dbRoom } = await supabase
          .from('rooms')
          .select('id')
          .eq('hotel_id', hotel.id)
          .eq('name', room.name)
          .maybeSingle();

        if (cancelled || !dbRoom) return;
        const rid = String(dbRoom.id);
        setSupabaseRoomId(rid);

        const res = await fetch(
          `/api/availability?room_id=${rid}&check_in=${checkInISO}&check_out=${checkOutISO}`
        );
        const data = await res.json();
        if (!cancelled && typeof data.available === 'number') {
          setAvailability(data.available);
        }
      } catch {}
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked]);

  if (!authChecked || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin w-8 h-8 text-brand-blue" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  async function handleConfirm() {
    if (!user) return;
    if (availability !== null && availability <= 0) {
      setSubmitError(t['booking.soldOutDates']);
      return;
    }

    if (!guestDetails.fullName.trim())  { setSubmitError(t['form.errorFullName']); return; }
    if (!guestDetails.phoneNumber.trim()) { setSubmitError(t['form.errorPhone']); return; }
    if (!guestDetails.countryIso)       { setSubmitError(t['form.errorCountry']); return; }

    if (selectedCardId === null) {
      const rawCard = paymentData.cardNumber.replace(/\s/g, '');
      if (!paymentData.cardHolder.trim()) { setSubmitError(t['payment.errorName']); return; }
      if (rawCard.length < 16) { setSubmitError(t['payment.errorCard']); return; }
      if (paymentData.expiry.length < 5) { setSubmitError(t['payment.errorExpiry']); return; }
      if (paymentData.cvv.length < 3) { setSubmitError(t['payment.errorCvv']); return; }
    }

    setSubmitting(true);
    setSubmitError('');

    // Timeout helper — rejects after ms milliseconds
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function withTimeout(p: Promise<any>, ms: number): Promise<any> {
      let timerId: ReturnType<typeof setTimeout>;
      const timeout = new Promise<never>((_, reject) => {
        timerId = setTimeout(() => reject(new Error('TIMEOUT')), ms);
      });
      return Promise.race([p, timeout]).finally(() => clearTimeout(timerId));
    }

    try {
      // PAYMENT DISABLED FOR TESTING — remove the next line and uncomment the block to enable
      let transactionId: string | undefined;
      // const paymentResult = await processPayment({
      //   method: 'credit-card',
      //   amount: Math.round(total * 100), // convert to smallest unit (e.g. halalas / cents)
      //   currency,                        // from useAppSettingsStore — matches user's display currency
      //   cardDetails: {
      //     cardholderName: paymentData.cardHolder,
      //     cardNumber:     paymentData.cardNumber.replace(/\s/g, ''),
      //     expiryDate:     paymentData.expiry,
      //     cvv:            paymentData.cvv,
      //   },
      // });
      // if (!paymentResult.success) {
      //   setSubmitError(paymentResult.error ?? t['booking.bookingFailed']); return;
      // }
      // transactionId = paymentResult.transactionId;

      // Check active booking limit — best-effort, non-blocking if table or network is slow
      let bookingLimit = 50;
      let activeCount  = 0;
      try {
        const [limitRes, activeRes] = await withTimeout(
          Promise.all([
            supabase.from('platform_settings').select('value').eq('key', 'guest_booking_limit').maybeSingle(),
            supabase.from('bookings').select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .not('status', 'in', '("completed","cancelled")'),
          ]),
          8000
        );
        bookingLimit = limitRes.data ? Number(limitRes.data.value) : 5;
        activeCount  = activeRes.count ?? 0;
      } catch { /* network slow or table missing — proceed with defaults */ }

      if (activeCount >= bookingLimit) {
        setSubmitError(
          `You have reached the maximum of ${bookingLimit} active booking${bookingLimit !== 1 ? 's' : ''}. Complete or cancel an existing booking first.`
        );
        setSubmitting(false);
        return;
      }

      // Prefer the ID already stored in the booking store (set by our modals),
      // fall back to name-based lookup only when missing.
      const storeRoomId = storeRoom?.id ?? null;
      let roomId: string | null = storeRoomId || supabaseRoomId;
      if (!roomId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: roomData } = await withTimeout(
            supabase.from('rooms').select('id')
              .eq('hotel_id', hotel.id).eq('name', room.name).maybeSingle() as unknown as Promise<any>,
            5000
          );
          roomId = roomData ? String(roomData.id) : null;
        } catch { /* proceed without room ID */ }
      }

      const insertResult = await withTimeout(
        supabase
          .from('bookings').insert({
            hotel_id:       hotel.id,
            room_id:        roomId,
            user_id:        user.id,
            guest_name:     guestDetails.fullName || user.email,
            guest_email:    user.email!,
            check_in:       checkInISO,
            check_out:      checkOutISO,
            total_price:      total,
            subtotal:         subtotal,
            tax_country_code: taxCountryCode,
            tax_vat_pct:      taxVatPct,
            tax_fixed_fee:    fixedFeePerNight,
            tax_amount:       taxes,
            locked_price:     pricePerNight,
            room_count:     roomsCount,
            status:         'upcoming',
            payment_status: 'paid',     // change to: transactionId ? 'paid' : 'unpaid'  when payment is enabled
            ...(transactionId ? { transaction_id: transactionId } : {}),
            guests_count:   guests,
          }).select('id').single() as unknown as Promise<{ data: { id: unknown } | null; error: { message: string; code?: string; hint?: string } | null }>,
        12000
      );

      const newBooking  = insertResult?.data ?? null;
      const insertError = insertResult?.error ?? null;

      if (insertError || !newBooking) {
        const msg  = insertError?.message ?? '';
        const code = insertError?.code    ?? '';
        const hint = insertError?.hint    ?? '';
        console.error('Booking insert error:', insertError);
        setSubmitError(
          msg.includes('ROOM_UNAVAILABLE')
            ? t['booking.roomJustBooked']
            : msg.includes('No API key')
            ? 'Session expired — please refresh the page and try again.'
            : `${t['booking.bookingFailed']} — ${msg}${hint ? ` (${hint})` : ''}${code ? ` [${code}]` : ''}`
        );
        return;
      }

      confirmBooking();

      // Fire-and-forget — booking already confirmed, profile save must not block navigation
      void supabase.from('profiles').update({
        full_name:          guestDetails.fullName          || null,
        phone_country_code: guestDetails.phoneCountryCode  || null,
        phone_country_iso:  guestDetails.phoneCountryIso   || null,
        phone_number:       guestDetails.phoneNumber       || null,
        addr_country:       guestDetails.countryIso        || null,
      }).eq('id', user.id);

      // Notifications are fire-and-forget — never block the booking flow
      createNotification(
        user.id,
        'Booking Confirmed',
        `Your reservation at ${hotel.name} (${room.name}) from ${checkIn} to ${checkOut} is confirmed. Booking ref: SR-${String(newBooking.id).slice(0, 8).toUpperCase()}.`
      ).catch(() => {});

      // Email notifications (gated by NOTIFICATIONS_ENABLED env var)
      sendBookingEmailAction(String(newBooking.id)).catch(() => {});

      router.push(`/booking/success/${newBooking.id}`);
    } catch (err: unknown) {
      const isTimeout = err instanceof Error && err.message === 'TIMEOUT';
      console.error('handleConfirm error:', err);
      setSubmitError(
        isTimeout
          ? 'Connection timeout — please check your internet and try again.'
          : t['booking.bookingFailed']
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Page title */}
      <div className="mb-6">
        <h1 className="font-extrabold text-gray-900 text-2xl sm:text-3xl leading-tight">
          {t['booking.completeYourBooking']}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {t['booking.almostThere']}{' '}
          <span className="font-semibold text-gray-700">{hotel.name}</span>
        </p>
      </div>

    <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 lg:items-start">

      {/* ── Main content (left) ─────────────────────── */}
      <div className="space-y-5">

        {/* Booking summary shown on mobile at top */}
        <div className="lg:hidden">
          <BookingSummary hotel={hotel} room={room} checkIn={checkIn} checkOut={checkOut} guests={guests} nights={nights} />
        </div>

        {/* User details */}
        <UserDetailsForm
          email={user.email!}
          initialValues={profileInitial}
          onChange={setGuestDetails}
        />

        {/* Mobile price breakdown between forms */}
        <div className="lg:hidden">
          <PriceBreakdownCard hotel={hotel} room={room} taxVatPct={taxVatPct} fixedFeePerNight={fixedFeePerNight} taxCountryCode={taxCountryCode} />
        </div>

        {/* Saved cards — shown when user has at least one */}
        <SavedCardSelector
          cards={savedCards}
          selectedId={selectedCardId}
          onSelect={setSelectedCardId}
        />

        {/* Payment form — hidden when a saved card is selected */}
        {selectedCardId === null && <PaymentForm onChange={setPaymentData} />}

        {/* Final CTA */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {/* Total reminder */}
          <div className="flex items-center justify-between mb-5 bg-gray-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-gray-400 text-xs">{t['booking.totalDueAtCheckIn']}</p>
              {roomPricing.discountPercent > 0 && (
                <p className="text-red-500 text-xs line-through leading-none">
                  <CurrencyAmount amount={Math.round(room.basePrice * nights * roomsCount * 1.15)} />
                </p>
              )}
              <p className="font-extrabold text-green-600 text-2xl leading-none"><CurrencyAmount amount={total} /></p>
            </div>
            {roomPricing.discountPercent > 0 && (
              <div className="bg-red-500 text-white text-xs font-extrabold px-2.5 py-1.5 rounded-lg">
                -{roomPricing.discountPercent}%
              </div>
            )}
          </div>

          {/* Availability banner */}
          {availability !== null && (
            <div className={`rounded-xl px-4 py-2.5 text-sm font-semibold mb-1 text-center ${
              availability === 0
                ? 'bg-red-50 text-red-600 border border-red-200'
                : availability <= 3
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {availability === 0
                ? t['booking.soldOutMessage']
                : availability === 1
                ? t['booking.lastRoomAvailable']
                : t['booking.roomsRemaining'].replace('{n}', String(availability))}
            </div>
          )}

          {/* Confirm button */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3">
              <p className="text-red-700 text-sm font-semibold text-center">{submitError}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || availability === 0}
            className="w-full disabled:opacity-60 text-white font-extrabold py-4 rounded-2xl text-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
          >
            {submitting
              ? t['booking.confirming']
              : availability === 0
              ? t['booking.soldOutBtn']
              : t['booking.confirmBooking']}
          </button>

          {/* Reassurance text */}
          <p className="text-center text-gray-500 text-sm mt-3 flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {t['booking.notChargedYet']}
          </p>

          {/* Trust badges */}
          <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
            {[
              {
                icon: (
                  <svg className="w-5 h-5 text-brand-blue mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                labelKey: 'booking.secureBookingBadge',
              },
              {
                icon: (
                  <svg className="w-5 h-5 text-amber-500 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                labelKey: 'booking.nonRefundableBadge',
              },
              {
                icon: (
                  <svg className="w-5 h-5 text-brand-gold mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                ),
                labelKey: 'booking.noCardFees',
              },
            ].map((badge) => (
              <div key={badge.labelKey}>
                {badge.icon}
                <p className="text-gray-500 text-[11px] font-medium leading-tight">
                  {t[badge.labelKey as keyof typeof t]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Hotel policy reminder */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="font-semibold">{t['booking.checkInLabel']}</span> {hotel.policies.checkIn}</p>
            <p><span className="font-semibold">{t['booking.checkOutLabel']}</span> {hotel.policies.checkOut}</p>
            {/* SelectedRoom: all bookings are non-refundable same-day deals */}
            <p className="flex items-center gap-1.5">
              <span className="font-semibold text-amber-700">{t['booking.cancellationLabel']}</span>
              <span className="text-amber-700 font-semibold">Non-refundable booking</span>
            </p>
          </div>
        </div>

      </div>

      {/* ── Sticky sidebar (desktop right) ─────────── */}
      <div className="hidden lg:block">
        <div className="sticky top-24 space-y-4">
          <BookingSummary hotel={hotel} room={room} checkIn={checkIn} checkOut={checkOut} guests={guests} nights={nights} />
          <PriceBreakdownCard hotel={hotel} room={room} taxVatPct={taxVatPct} fixedFeePerNight={fixedFeePerNight} taxCountryCode={taxCountryCode} />
        </div>
      </div>

    </div>
    </>
  );
}
