'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { saveLoginRedirect } from '@/lib/auth';
import { useBookingStore } from '@/store/bookingStore';
import CurrencyAmount from '@/app/components/CurrencyAmount';
import type { RoomCategory } from '@/lib/roomImages';
import type { PartnerDeal } from './PartnerDealsSection';

interface Props {
  deal: PartnerDeal;
  hotelId: number;
  hotelName: string;
  city: string;
  location: string;
  address: string;
  stars: number;
  rating: number;
  breakfastPricePerPerson?: number | null;
  onClose: () => void;
}

function isoToStored(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtDisplay(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function countNights(from: string, to: string): number {
  if (!from || !to) return 0;
  return Math.max(0, Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000
  ));
}

function nextDay(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function DealBookingModal({
  deal,
  hotelId,
  hotelName,
  city,
  location,
  address,
  stars,
  rating,
  breakfastPricePerPerson,
  onClose,
}: Props) {
  const { user } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const { setRoom, setSelectedHotel, setDates, setGuests, setBreakfast } = useBookingStore();

  const today = new Date().toISOString().split('T')[0];

  // Default check-in = max(today, deal.start_date)
  const defaultCheckIn = deal.start_date > today ? deal.start_date : today;
  const defaultCheckOut = nextDay(defaultCheckIn) <= deal.end_date
    ? nextDay(defaultCheckIn)
    : deal.end_date;

  const [checkIn,  setCheckIn]  = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const capacity = deal.capacity || 2;
  const [adults,   setAdults]   = useState(Math.min(2, capacity));
  const [children, setChildren] = useState(0);
  const [breakfastSelected, setBreakfastSelected] = useState(false);

  const totalGuests = adults + children;
  const maxAdults   = capacity;
  const maxChildren = 2;

  const [availability,   setAvailability]   = useState<number | null>(null);
  const [checkingAvail,  setCheckingAvail]  = useState(false);

  const nights          = countNights(checkIn, checkOut);
  const subtotal        = nights * deal.deal_price;
  const hasBreakfast    = breakfastPricePerPerson != null && breakfastPricePerPerson > 0;
  const breakfastTotal  = hasBreakfast && breakfastSelected ? breakfastPricePerPerson! * totalGuests * nights : 0;
  const taxes           = Math.round((subtotal + breakfastTotal) * 0.15);
  const total           = subtotal + breakfastTotal + taxes;
  const disc     = deal.base_price > 0
    ? Math.round((1 - deal.deal_price / deal.base_price) * 100)
    : 0;

  // Check-in bounds: [max(today, start_date) … end_date - 1]
  const checkInMin = deal.start_date > today ? deal.start_date : today;

  function handleCheckInChange(val: string) {
    setCheckIn(val);
    if (val >= checkOut) {
      const co = nextDay(val) <= deal.end_date ? nextDay(val) : deal.end_date;
      setCheckOut(co);
    }
  }

  // Availability check
  useEffect(() => {
    if (nights <= 0) { setAvailability(null); return; }
    let cancelled = false;
    setCheckingAvail(true);
    fetch(`/api/availability?room_id=${deal.room_id}&check_in=${checkIn}&check_out=${checkOut}`)
      .then((r) => r.ok ? r.json() : {})
      .then((data: Record<string, unknown>) => {
        if (!cancelled) {
          setAvailability(typeof data.available === 'number' ? data.available : null);
          setCheckingAvail(false);
        }
      })
      .catch(() => { if (!cancelled) { setAvailability(null); setCheckingAvail(false); } });
    return () => { cancelled = true; };
  }, [checkIn, checkOut, nights, deal.room_id]);

  function handleContinue() {
    if (!user) {
      saveLoginRedirect(pathname ?? `/hotel/${hotelId}`);
      router.push('/login');
      return;
    }
    if (nights <= 0) return;

    setSelectedHotel({ id: hotelId, name: hotelName, location, address, city, stars, rating });

    setRoom({
      id:            String(deal.room_id),
      name:          deal.room_name,
      room_type:     (deal.room_type as RoomCategory) ?? 'standard',
      image_url:     undefined,
      bedType:       '',
      sizeM2:        0,
      maxGuests:     deal.capacity || 2,
      basePrice:     deal.base_price,
      pricePerNight: deal.deal_price,
      features:      [],
      quantity:      1,
    });

    setDates(isoToStored(checkIn), isoToStored(checkOut));
    setGuests(totalGuests);
    setBreakfast(breakfastSelected && hasBreakfast, hasBreakfast ? breakfastPricePerPerson! : 0);

    router.push(`/booking/${hotelId}`);
  }

  const soldOut = availability === 0;
  const canContinue = nights > 0 && !checkingAvail && !soldOut;

  return (
    <div
      className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">

        {/* ── Header ── */}
        <div
          className="flex items-start justify-between px-6 py-5 rounded-t-2xl"
          style={{ background: 'linear-gradient(135deg, #0F2260 0%, #1E3A8A 55%, #2563EB 100%)' }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-700 text-white">
                -{disc}% FIXED
              </span>
              <span className="text-xs text-white/55">Partner Deal</span>
            </div>
            <h2 className="font-bold !text-white text-lg leading-tight">
              {deal.title ?? deal.room_name}
            </h2>
            {deal.title && (
              <p className="text-sm text-white mt-0.5">{deal.room_name}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/55 hover:text-white hover:bg-white/10 shrink-0 ml-3 mt-0.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* ── Price summary banner ── */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Fixed nightly rate</p>
              {deal.base_price > deal.deal_price && (
                <p className="text-xs text-red-400 line-through">
                  <CurrencyAmount amount={deal.base_price} />
                </p>
              )}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-brand-gold">
                  <CurrencyAmount amount={deal.deal_price} />
                </span>
                <span className="text-xs text-gray-400">/night</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-0.5">Valid period</p>
              <p className="text-xs font-semibold text-gray-700">{fmtDisplay(deal.start_date)}</p>
              <p className="text-xs text-gray-400">→ {fmtDisplay(deal.end_date)}</p>
            </div>
          </div>

          {/* ── Dates ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Select Dates
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Check-in</p>
                <input
                  type="date"
                  value={checkIn}
                  min={checkInMin}
                  max={deal.end_date}
                  onChange={(e) => handleCheckInChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
                />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Check-out</p>
                <input
                  type="date"
                  value={checkOut}
                  min={nextDay(checkIn)}
                  max={deal.end_date}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
                />
              </div>
            </div>
            {nights > 0 && (
              <p className="mt-2 text-center text-xs text-gray-400">
                {nights} night{nights !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* ── Guests ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Guests
            </label>
            <div className="border border-gray-200 rounded-xl px-4 divide-y divide-gray-100">
              {/* Adults */}
              <div className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-900">Adults</p>
                  <p className="text-xs text-gray-400">Age 18+</p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setAdults((n) => Math.max(1, n - 1))} disabled={adults <= 1}
                    className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-brand-gold hover:text-brand-gold disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg leading-none transition-colors">−</button>
                  <span className="w-5 text-center font-bold text-gray-900 tabular-nums text-sm">{adults}</span>
                  <button type="button" onClick={() => setAdults((n) => Math.min(maxAdults, n + 1))} disabled={adults >= maxAdults}
                    className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-brand-gold hover:text-brand-gold disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg leading-none transition-colors">+</button>
                </div>
              </div>
              {/* Children */}
              <div className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-900">Children</p>
                  <p className="text-xs text-gray-400">Ages 0–17</p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setChildren((n) => Math.max(0, n - 1))} disabled={children <= 0}
                    className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-brand-gold hover:text-brand-gold disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg leading-none transition-colors">−</button>
                  <span className="w-5 text-center font-bold text-gray-900 tabular-nums text-sm">{children}</span>
                  <button type="button" onClick={() => setChildren((n) => Math.min(maxChildren, n + 1))} disabled={children >= maxChildren}
                    className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-brand-gold hover:text-brand-gold disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg leading-none transition-colors">+</button>
                </div>
              </div>
              <div className="py-2 text-center text-xs text-gray-400">
                {adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? ` · ${children} child${children !== 1 ? 'ren' : ''}` : ''} · Room capacity: {capacity} adults
              </div>
            </div>
          </div>

          {/* ── Availability badge ── */}
          {nights > 0 && (
            <div className={`rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 ${
              checkingAvail
                ? 'bg-gray-50 text-gray-400 border border-gray-100'
                : soldOut
                ? 'bg-red-50 text-red-600 border border-red-200'
                : availability !== null && availability <= 3
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {checkingAvail ? (
                <>
                  <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Checking availability…
                </>
              ) : soldOut ? (
                'No rooms available for these dates'
              ) : availability === 1 ? (
                'Last room available!'
              ) : availability !== null && availability <= 3 ? (
                `Only ${availability} rooms left`
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Available for your dates
                </>
              )}
            </div>
          )}

          {/* ── Breakfast add-on ── */}
          {hasBreakfast && (
            <label className="flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors"
              style={{ borderColor: breakfastSelected ? '#2563EB' : '#E5E7EB', background: breakfastSelected ? '#EFF6FF' : '#F9FAFB' }}>
              <input
                type="checkbox"
                checked={breakfastSelected}
                onChange={e => setBreakfastSelected(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-brand-blue shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">🍳 Add Breakfast</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  <CurrencyAmount amount={breakfastPricePerPerson!} /> per person · {totalGuests} guest{totalGuests !== 1 ? 's' : ''}
                  {nights > 1 && ` · ${nights} nights`}
                  {' = '}<span className="font-semibold text-gray-700"><CurrencyAmount amount={breakfastPricePerPerson! * totalGuests * nights} /></span>
                </p>
              </div>
            </label>
          )}

          {/* ── Price breakdown ── */}
          {nights > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm border border-gray-100">
              <div className="flex justify-between text-gray-600">
                <span>
                  <CurrencyAmount amount={deal.deal_price} /> × {nights} night{nights !== 1 ? 's' : ''}
                </span>
                <span className="font-semibold text-gray-800"><CurrencyAmount amount={subtotal} /></span>
              </div>
              {breakfastSelected && hasBreakfast && (
                <div className="flex justify-between text-gray-600">
                  <span>🍳 Breakfast (×{totalGuests}{nights > 1 ? ` · ${nights}n` : ''})</span>
                  <span className="font-semibold text-gray-800"><CurrencyAmount amount={breakfastTotal} /></span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Taxes & fees (15%)</span>
                <span><CurrencyAmount amount={taxes} /></span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-extrabold text-gray-900">
                <span>Total</span>
                <span className="text-brand-blue text-base"><CurrencyAmount amount={total} /></span>
              </div>
            </div>
          )}

          {/* ── CTA ── */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="w-full disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all hover:-translate-y-0.5 text-base"
            style={{ background: canContinue ? 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' : '#E2E8F0', color: canContinue ? '#fff' : '#94A3B8', boxShadow: canContinue ? '0 4px 14px rgba(30,58,138,0.3)' : 'none' }}
          >
            {nights <= 0
              ? 'Select dates to continue'
              : soldOut
              ? 'No Availability'
              : `Continue to Booking — `}
            {canContinue && <CurrencyAmount amount={total} />}
          </button>

          <p className="text-center text-gray-400 text-xs -mt-2">
            You won&apos;t be charged yet · Free cancellation not available
          </p>

        </div>
      </div>
    </div>
  );
}
