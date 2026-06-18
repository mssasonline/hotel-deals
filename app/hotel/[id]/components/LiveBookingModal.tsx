'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { saveLoginRedirect } from '@/lib/auth';
import { useBookingStore } from '@/store/bookingStore';
import CurrencyAmount from '@/app/components/CurrencyAmount';
import { getCurrentTier, calcLivePrice, calcActualDiscount, isBookingOpen, calcTaxBreakdown, type HotelFeeConfig, UAE_FEE_DEFAULTS } from '@/lib/pricingEngine';
import { localDateISO } from '@/lib/dateUtils';
import type { RoomCategory } from '@/lib/roomImages';
import { useTranslation } from '@/lib/i18n/useTranslation';

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
  breakfastPricePerPerson?: number | null;
  feeConfig?: HotelFeeConfig;
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
  breakfastPricePerPerson,
  feeConfig = UAE_FEE_DEFAULTS,
  onClose,
}: Props) {
  const { user }  = useAuth();
  const router    = useRouter();
  const pathname  = usePathname();
  const { setRoom, setSelectedHotel, setDates, setGuests, setBreakfast } = useBookingStore();
  const t         = useTranslation();

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
  const [breakfastSelected, setBreakfastSelected] = useState(false);

  const totalGuests       = adults + children;
  const maxAdults         = capacity;
  const maxChildren       = 2;
  const hasBreakfast   = breakfastPricePerPerson != null && breakfastPricePerPerson > 0;
  const breakfastTotal = hasBreakfast && breakfastSelected ? breakfastPricePerPerson! * totalGuests : 0;
  const taxBreakdown   = calcTaxBreakdown({
    roomSubtotal: livePrice,
    breakfastSubtotal: breakfastTotal,
    nights: 1,
    rooms: 1,
    ...feeConfig,
  });
  const taxes = taxBreakdown.total;
  const total = livePrice + breakfastTotal + taxes;

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
    setBreakfast(breakfastSelected && hasBreakfast, hasBreakfast ? breakfastPricePerPerson! : 0);

    router.push(`/booking/${hotelId}`);
  }

  return (
    <div
      className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="relative px-5 py-4" style={{ background: 'linear-gradient(135deg, #0F2260 0%, #1E3A8A 55%, #2563EB 100%)' }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex items-center gap-1 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  {t['sections.live']}
                </span>
                {discount > 0 && (
                  <span className="text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(180,83,9,0.85)' }}>
                    -{discount}% {t['price.tonightOnly']}
                  </span>
                )}
              </div>
              <h2 className="font-bold text-white text-base leading-tight">{room.name}</h2>
            </div>
            <button type="button" onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 shrink-0 ml-2 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Price banner */}
          <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(30,58,138,0.06)', border: '1px solid rgba(30,58,138,0.12)' }}>
            <div>
              <p className="text-xs mb-0.5" style={{ color: '#64748B' }}>{t['hotel.tonightRate']}</p>
              {discount > 0 && (
                <p className="text-xs mb-0.5" style={{ color: '#94A3B8', textDecoration: 'line-through', textDecorationColor: '#CBD5E1', textDecorationThickness: '1.5px' }}>
                  <CurrencyAmount amount={basePrice} />
                </p>
              )}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold" style={{ color: '#1E3A8A' }}>
                  <CurrencyAmount amount={livePrice} />
                </span>
                <span className="text-xs" style={{ color: '#94A3B8' }}>{t['price.perNight']}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold" style={{ color: '#0F172A' }}>{fmtDateShort(checkIn)}</p>
              <p className="text-xs" style={{ color: '#94A3B8' }}>{t['hotel.nightStay']}</p>
            </div>
          </div>

          {/* Guests */}
          <div className="border border-gray-200 rounded-xl px-4 divide-y divide-gray-100">
            <Counter
              label={t['hotel.adults']}
              sublabel={t['hotel.adultsSublabel']}
              value={adults}
              onDec={() => setAdults((n) => Math.max(1, n - 1))}
              onInc={() => setAdults((n) => Math.min(maxAdults, n + 1))}
              min={1}
              max={maxAdults}
            />
            <Counter
              label={t['hotel.children']}
              sublabel={t['hotel.childrenSublabel']}
              value={children}
              onDec={() => setChildren((n) => Math.max(0, n - 1))}
              onInc={() => setChildren((n) => Math.min(maxChildren, n + 1))}
              min={0}
              max={Math.min(2, maxChildren)}
            />
            <div className="py-2 text-center text-xs text-gray-400">
              {t['hotel.roomCapacity'].replace('{n}', String(capacity))}
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
                {t['hotel.checkingAvailability']}
              </>
            ) : soldOut ? (
              t['hotel.soldOutTonight']
            ) : availability === 1 ? (
              t['hotel.lastRoomTonight']
            ) : availability !== null && availability <= 3 ? (
              t['hotel.onlyNRoomsLeft'].replace('{n}', String(availability))
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {t['hotel.availableTonight']}
              </>
            )}
          </div>

          {/* Breakfast add-on */}
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
                  {' = '}<span className="font-semibold text-gray-700"><CurrencyAmount amount={breakfastPricePerPerson! * totalGuests} /></span>
                </p>
              </div>
            </label>
          )}

          {/* Price breakdown */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm border border-gray-100">
            <div className="flex justify-between text-gray-600">
              <span>{t['hotel.nightStay']} × <CurrencyAmount amount={livePrice} /></span>
              <span className="font-semibold text-gray-800"><CurrencyAmount amount={livePrice} /></span>
            </div>
            {breakfastSelected && hasBreakfast && (
              <div className="flex justify-between text-gray-600">
                <span>🍳 Breakfast (×{totalGuests})</span>
                <span className="font-semibold text-gray-800"><CurrencyAmount amount={breakfastTotal} /></span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>{t['hotel.taxesFees']}</span>
              <span><CurrencyAmount amount={taxes} /></span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between font-extrabold text-gray-900">
              <span>{t['price.total']}</span>
              <span className="text-brand-blue text-base"><CurrencyAmount amount={total} /></span>
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleBook}
            disabled={!bookingOpen || soldOut || checkingAvail}
            className="w-full disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-base flex items-center justify-between px-5 transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
          >
            <span>{!bookingOpen ? t['hotel.bookingOpensNoon'] : soldOut ? t['booking.soldOutBtn'] : t['hotel.bookNow']}</span>
            {!soldOut && <span><CurrencyAmount amount={total} /></span>}
          </button>

          <p className="text-center text-gray-400 text-xs -mt-2">
            {t['booking.notChargedYet']}
          </p>
        </div>
      </div>
    </div>
  );
}
