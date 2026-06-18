'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveLoginRedirect } from '@/lib/auth';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';
import { fetchMyAccountData } from '@/app/user-actions';
import { sendBookingEmailAction } from '@/lib/actions/sendBookingEmail';
import { createBooking } from '../actions';
import type { HotelDetail } from '@/app/hotel/[id]/lib/hotelDetailData';
import { useBookingStore } from '@/store/bookingStore';
import { calcRoomPrice, calcTaxBreakdown } from '@/lib/pricingEngine';
import { useTranslation } from '@/lib/i18n/useTranslation';
import BookingSummary from './BookingSummary';
import PriceBreakdownCard from './PriceBreakdownCard';
import UserDetailsForm, { type UserDetailsValues } from './UserDetailsForm';
import PaymentForm from './PaymentForm';
import CurrencyAmount from '@/app/components/CurrencyAmount';
import SavedCardSelector, { type SavedCard } from './SavedCardSelector';

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
  taxVatPct = 5,
  fixedFeePerNight = 15,
  taxCountryCode = 'AE',
  serviceChargePct = 10,
  municipalityFeePct = 7,
}: {
  hotel: HotelDetail;
  taxVatPct?: number;
  fixedFeePerNight?: number;
  taxCountryCode?: string;
  serviceChargePct?: number;
  municipalityFeePct?: number;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const t = useTranslation();
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
  const { selectedRoom: storeRoom, checkInDate, checkOutDate, guests, confirmBooking, breakfastIncluded, breakfastPricePerPerson } =
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
  const hasBreakfast = breakfastIncluded && breakfastPricePerPerson > 0;
  const breakfastTotal = hasBreakfast ? breakfastPricePerPerson * Math.max(1, guests) * nights : 0;
  const taxBreakdown = calcTaxBreakdown({
    roomSubtotal: subtotal,
    breakfastSubtotal: breakfastTotal,
    nights,
    rooms: roomsCount,
    serviceChargePct,
    municipalityFeePct,
    tourismDirhamPerNight: fixedFeePerNight,
    vatPct: taxVatPct,
  });
  const taxes = taxBreakdown.total;
  const total = subtotal + breakfastTotal + taxes;

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

    try {
      // The entire write runs in a Server Action (see ../actions). The browser
      // Supabase client serializes every query behind GoTrue's auth lock, which
      // deadlocks after the tab has been backgrounded — that was the TIMEOUT on
      // return from another app. Running server-side reads the session from
      // cookies and sidesteps that lock, the same reason "My Trips" always
      // loads on return.
      const result = await createBooking({
        hotelId:       hotel.id,
        roomId:        storeRoom?.id ? String(storeRoom.id) : supabaseRoomId,
        roomName:      room.name,
        guest: {
          fullName:         guestDetails.fullName,
          phoneCountryCode: guestDetails.phoneCountryCode,
          phoneCountryIso:  guestDetails.phoneCountryIso,
          phoneNumber:      guestDetails.phoneNumber,
          countryIso:       guestDetails.countryIso,
        },
        checkInISO,
        checkOutISO,
        total,
        subtotal,
        taxCountryCode,
        taxVatPct,
        fixedFeePerNight,
        taxes,
        pricePerNight,
        roomsCount,
        guests,
        hotelName:               hotel.name,
        checkInLabel:            checkIn,
        checkOutLabel:           checkOut,
        breakfastIncluded:       hasBreakfast,
        breakfastPricePerPerson: hasBreakfast ? breakfastPricePerPerson : 0,
      });

      if (!result.ok) {
        if (result.code === 'AUTH') {
          saveLoginRedirect(`/booking/${hotel.id}`);
          router.push('/login');
          return;
        }
        setSubmitError(
          result.code === 'ROOM_UNAVAILABLE'
            ? t['booking.roomJustBooked']
            : result.code === 'LIMIT'
            ? result.message
            : `${t['booking.bookingFailed']}${result.message ? ` — ${result.message}` : ''}`
        );
        return;
      }

      confirmBooking();

      // Email notification — fire-and-forget, gated by NOTIFICATIONS_ENABLED.
      sendBookingEmailAction(result.bookingId).catch(() => {});

      router.push(`/booking/success/${result.bookingId}`);
    } catch (err: unknown) {
      console.error('handleConfirm error:', err);
      setSubmitError(t['booking.bookingFailed']);
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
          <BookingSummary hotel={hotel} room={room} checkIn={checkIn} checkOut={checkOut} guests={guests} nights={nights} breakfastIncluded={breakfastIncluded} breakfastPricePerPerson={breakfastPricePerPerson} />
        </div>

        {/* User details */}
        <UserDetailsForm
          email={user.email!}
          initialValues={profileInitial}
          onChange={setGuestDetails}
        />

        {/* Mobile price breakdown between forms */}
        <div className="lg:hidden">
          <PriceBreakdownCard hotel={hotel} room={room} taxVatPct={taxVatPct} fixedFeePerNight={fixedFeePerNight} taxCountryCode={taxCountryCode} serviceChargePct={serviceChargePct} municipalityFeePct={municipalityFeePct} />
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
          <BookingSummary hotel={hotel} room={room} checkIn={checkIn} checkOut={checkOut} guests={guests} nights={nights} breakfastIncluded={breakfastIncluded} breakfastPricePerPerson={breakfastPricePerPerson} />
          <PriceBreakdownCard hotel={hotel} room={room} taxVatPct={taxVatPct} fixedFeePerNight={fixedFeePerNight} taxCountryCode={taxCountryCode} serviceChargePct={serviceChargePct} municipalityFeePct={municipalityFeePct} />
        </div>
      </div>

    </div>
    </>
  );
}
