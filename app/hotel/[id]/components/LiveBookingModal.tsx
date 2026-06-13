'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { saveLoginRedirect } from '@/lib/auth';
import { useBookingStore } from '@/store/bookingStore';
import CurrencyAmount from '@/app/components/CurrencyAmount';
import { getCurrentTier, calcLivePrice, calcActualDiscount, isBookingOpen } from '@/lib/pricingEngine';
import { localDateISO } from '@/lib/dateUtils';
import type { RoomCategory } from '@/lib/roomImages';

interface Room {
  id: string;
  name: string;
  base_price: number;
  min_price: number | null;
  capacity: number;
  image_url: string | null;
  room_type: string | null;
}

interface Props {
  room: Room;
  hotelId: number;
  hotelName: string;
  city: string;
  location: string;
  address: string;
  stars: number;
  rating: number;
  onClose: () => void;
}

function isoToStored(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function Counter({
  label,
  sublabel,
  value,
  onDec,
  onInc,
  min = 0,
  max = 20,
}: {
  label: string;
  sublabel?: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onDec} disabled={value <= min}
          className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-brand-blue hover:text-brand-blue disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg leading-none transition-colors">
          −
        </button>
        <span className="w-5 text-center font-bold text-gray-900 tabular-nums text-sm">{value}</span>
        <button type="button" onClick={onInc} disabled={value >= max}
          className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-brand-blue hover:text-brand-blue disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg leading-none transition-colors">
          +
        </button>
      </div>
    </div>
  );
}

export default function LiveBookingModal({
  room,
  hotelId,
  hotelName,
  city,
  location,
  address,
  stars,
  rating,
  onClose,
}: Props) {
  const { user }  = useAuth();
  const router    = useRouter();
  const pathname  = usePathname();
  const { setRoom, setSelectedHotel, setDates, setGuests } = useBookingStore();

  const tier      = getCurrentTier();
  const basePrice = Number(room.base_price) || 0;
  const minPrice  = Number(room.min_price)  || Math.round(basePrice * 0.6);
  const livePrice = calcLivePrice(basePrice, minPrice, tier);
  const discount  = calcActualDiscount(basePrice, livePrice);
  const capacity  = Number(room.capacity) || 2;

  const [bookingOpen, setBookingOpen] = useState(() => isBookingOpen());
  useEffect(() => {
    const id = setInterval(() => setBookingOpen(isBookingOpen()), 60_000);
    return () => clearInterval(id);
  }, []);

  const [adults,   setAdults]   = useState(Math.min(2, capacity));
  const [children, setChildren] = useState(0);

  const totalGuests = adults + children;
  const maxAdults   = capacity;
  const maxChildren = 2;

  const taxes   = Math.round(livePrice * 0.15);
  const total   = livePrice + taxes;

  // Dates: always tonight → tomorrow
  const checkIn  = localDateISO();
  const checkOut = (() => {
    const d = new Date(checkIn + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const [availability,  setAvailability]  = useState<number | null>(null);
  const [checkingAvail, setCheckingAvail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCheckingAvail(true);
    fetch(`/api/availability?room_id=${room.id}&check_in=${checkIn}&check_out=${checkOut}`)
      .then((r) => r.ok ? r.json() : {})
      .then((data: Record<string, unknown>) => {
        if (!cancelled) {
          setAvailability(typeof data.available === 'number' ? data.available : null);
          setCheckingAvail(false);
        }
      })
      .catch(() => { if (!cancelled) { setAvailability(null); setCheckingAvail(false); } });
    return () => { cancelled = true; };
  }, [room.id, checkIn, checkOut]);

  const soldOut = availability === 0;

  function handleBook() {
    if (!user) {
      saveLoginRedirect(pathname ?? `/hotel/${hotelId}`);
      router.push('/login');
      return;
    }
    if (soldOut) return;

    setSelectedHotel({ id: hotelId, name: hotelName, location, address, city, stars, rating });

    setRoom({
      id:            room.id,
      name:          room.name,
      room_type:     (room.room_type as RoomCategory) ?? 'standard',
      image_url:     room.image_url ?? undefined,
      bedType:       '',
      sizeM2:        0,
      maxGuests:     capacity,
      basePrice,
      pricePerNight: livePrice,
      features:      [],
      quantity:      1,
    });

    setDates(isoToStored(checkIn), isoToStored(checkOut));
    setGuests(totalGuests);

    router.push(`/booking/${hotelId}`);
  }

  return (
    <div
      className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1 bg-blue-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
              {discount > 0 && (
                <span className="bg-red-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  -{discount}% Tonight
                </span>
              )}
            </div>
            <h2 className="font-bold text-gray-900 text-base leading-tight">{room.name}</h2>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 shrink-0 ml-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Price banner */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Tonight's rate</p>
              {discount > 0 && (
                <p className="text-xs text-red-400 line-through">
                  <CurrencyAmount amount={basePrice} />
                </p>
              )}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-blue-700">
                  <CurrencyAmount amount={livePrice} />
                </span>
                <span className="text-xs text-gray-400">/night</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-1">Date</p>
              <p className="text-xs font-semibold text-gray-700">{fmtDateShort(checkIn)}</p>
              <p className="text-xs text-gray-400">1 night stay</p>
            </div>
          </div>

          {/* Guests */}
          <div className="border border-gray-200 rounded-xl px-4 divide-y divide-gray-100">
            <Counter
              label="Adults"
              sublabel="Age 18+"
              value={adults}
              onDec={() => setAdults((n) => Math.max(1, n - 1))}
              onInc={() => setAdults((n) => Math.min(maxAdults, n + 1))}
              min={1}
              max={maxAdults}
            />
            <Counter
              label="Children"
              sublabel="Ages 0–17"
              value={children}
              onDec={() => setChildren((n) => Math.max(0, n - 1))}
              onInc={() => setChildren((n) => Math.min(maxChildren, n + 1))}
              min={0}
              max={Math.min(2, maxChildren)}
            />
            <div className="py-2 text-center text-xs text-gray-400">
              {adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? ` · ${children} child${children !== 1 ? 'ren' : ''}` : ''} · Room capacity: {capacity} adults
            </div>
          </div>

          {/* Availability */}
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
              'Sold out tonight'
            ) : availability === 1 ? (
              'Last room available tonight!'
            ) : availability !== null && availability <= 3 ? (
              `Only ${availability} rooms left tonight`
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Available tonight
              </>
            )}
          </div>

          {/* Price breakdown */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm border border-gray-100">
            <div className="flex justify-between text-gray-600">
              <span>1 night × <CurrencyAmount amount={livePrice} /></span>
              <span className="font-semibold text-gray-800"><CurrencyAmount amount={livePrice} /></span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Taxes & fees (15%)</span>
              <span><CurrencyAmount amount={taxes} /></span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between font-extrabold text-gray-900">
              <span>Total</span>
              <span className="text-brand-blue text-base"><CurrencyAmount amount={total} /></span>
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleBook}
            disabled={!bookingOpen || soldOut || checkingAvail}
            className="w-full bg-brand-gold hover:bg-yellow-500 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-brand-gold/25 text-base flex items-center justify-between px-5"
          >
            <span>{!bookingOpen ? 'تفتح الساعة 12:00 PM' : soldOut ? 'Sold Out' : 'Book Now'}</span>
            {!soldOut && <span><CurrencyAmount amount={total} /></span>}
          </button>

          <p className="text-center text-gray-400 text-xs -mt-2">
            You won&apos;t be charged yet · Non-refundable
          </p>
        </div>
      </div>
    </div>
  );
}
