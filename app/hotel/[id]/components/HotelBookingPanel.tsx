'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBookingStore } from '@/store/bookingStore';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { useTranslation } from '@/lib/i18n/useTranslation';
import CurrencyAmount from '@/app/components/CurrencyAmount';
import { formatPrice } from '@/lib/currency';
import type { RoomCategory } from '@/lib/roomImages';
import type { DealStatus } from '@/lib/dealsEngine';
import { countNightsBetween, getCurrentTier, calcLivePrice, calcActualDiscount, calcNightlyRates, calcNightlyStayPrice, isBookingOpen, minutesUntilOpen, type PriceTier, type NightlyStayResult } from '@/lib/pricingEngine';
import { localDateISO as todayISO } from '@/lib/dateUtils';
import CountdownTimer from '@/app/components/CountdownTimer';
import DateRangePicker from '@/app/components/DateRangePicker';

interface Room {
  id: string;
  name: string;
  base_price: number;
  min_price: number | null;
  capacity: number;
  image_url: string | null;
  room_type: string | null;
  quantity_available?: number | null;
}

interface Props {
  rooms: Room[];
  hotelId: number;
  hotelName: string;
  city: string;
  location: string;
  address: string;
  stars: number;
  rating: number;
  urgencyStatus: DealStatus;
  urgencyBg: string;
  urgencyBorder: string;
  urgencyText: string;
  dealBadge: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
}

// ── Date utilities ─────────────────────────────────────────────

function storedToISO(stored: string): string {
  if (!stored) return todayISO();
  const d = new Date(stored);
  if (isNaN(d.getTime())) return todayISO();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoToStored(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Guest counter component ───────────────────────────────────

interface CounterProps {
  label: string;
  sublabel?: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  min?: number;
  max?: number;
}

function GuestCounter({ label, sublabel, value, onDecrement, onIncrement, min = 0, max = 20 }: CounterProps) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <span className="text-gray-900 font-medium text-sm">{label}</span>
        {sublabel && <div className="text-gray-400 text-xs">{sublabel}</div>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDecrement}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-brand-blue hover:text-brand-blue disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-lg leading-none"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="w-4 text-center font-semibold text-gray-900 text-sm tabular-nums">{value}</span>
        <button
          type="button"
          onClick={onIncrement}
          disabled={value >= max}
          className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-brand-blue hover:text-brand-blue disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-lg leading-none"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ── Resolve room pricing ──────────────────────────────────────

function getRoomBasePrice(room: Room): number {
  return Number(room.base_price) > 0 ? Number(room.base_price) : 0;
}

function getRoomMinPrice(room: Room): number {
  if (Number(room.min_price) > 0) return Number(room.min_price);
  return Math.round(getRoomBasePrice(room) * 0.6);
}

// ── Main component ────────────────────────────────────────────

export default function HotelBookingPanel({
  rooms,
  hotelId,
  hotelName,
  city,
  location,
  address,
  stars,
  rating,
  urgencyStatus,
  urgencyBg,
  urgencyBorder,
  urgencyText,
  dealBadge,
  badgeBg,
  badgeText,
  dotColor,
}: Props) {
  const t = useTranslation();
  const router = useRouter();
  const currency = useAppSettingsStore((s) => s.currency);
  const {
    checkInDate,
    checkOutDate,
    guests,
    setDates,
    setGuests,
    setRoom,
    setSelectedHotel,
  } = useBookingStore();

  // ── Local state ──────────────────────────────────────────────
  const [checkIn, setCheckIn] = useState(() => storedToISO(checkInDate) || todayISO());
  // 12:00 AM–11:59 AM → same-day checkout at 12 PM (booking in the early-morning window)
  // 12:00 PM–11:59 PM → next-day checkout at 12 PM (deal starts at noon, overnight stay)
  const [checkOut, setCheckOut] = useState(() => {
    const ciISO = storedToISO(checkInDate) || todayISO();
    if (new Date().getHours() >= 12) {
      const d = new Date(ciISO + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    }
    return ciISO;
  });

  const [adults, setAdults] = useState(Math.max(1, guests));
  const [children, setChildren] = useState(0);
  const [roomsCount, setRoomsCount] = useState(1);
  const [guestOpen, setGuestOpen] = useState(false);
  const guestRef = useRef<HTMLDivElement>(null);

  const [selectedRoomId, setSelectedRoomId] = useState<string>(() =>
    rooms.length > 0 ? String(rooms[0].id) : ''
  );

  const [tier, setTier] = useState<PriceTier>(() => getCurrentTier());
  const [bookingOpen, setBookingOpen] = useState(() => isBookingOpen());

  // Refresh tier and booking window every minute
  useEffect(() => {
    const id = setInterval(() => {
      setTier(getCurrentTier());
      setBookingOpen(isBookingOpen());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Close guest dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (guestRef.current && !guestRef.current.contains(e.target as Node)) {
        setGuestOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Derived values ───────────────────────────────────────────
  const nights = useMemo(() => countNightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const totalGuests = adults + children;

  const selectedRoom = useMemo(
    () => rooms.find((r) => String(r.id) === String(selectedRoomId)) ?? rooms[0] ?? null,
    [rooms, selectedRoomId]
  );

  // ── Fetch per-night rates from room_rates table ──────────────
  const [ratesMap, setRatesMap] = useState<Record<string, number>>({});
  const [ratesLoading, setRatesLoading] = useState(false);

  useEffect(() => {
    if (!selectedRoom || !checkIn || !checkOut) return;
    let cancelled = false;
    setRatesLoading(true);
    fetch(`/api/room-rates?room_id=${selectedRoom.id}&check_in=${checkIn}&check_out=${checkOut}`)
      .then(r => r.ok ? r.json() : {})
      .then(data => { if (!cancelled) { setRatesMap(data); setRatesLoading(false); } })
      .catch(() => { if (!cancelled) setRatesLoading(false); });
    return () => { cancelled = true; };
  }, [selectedRoom?.id, checkIn, checkOut]);

  // ── Per-night pricing (tonight discounted, future nights at calendar rate) ──
  const pricing = useMemo((): NightlyStayResult | null => {
    if (!selectedRoom) return null;
    const basePrice = getRoomBasePrice(selectedRoom);
    const minPrice  = getRoomMinPrice(selectedRoom);
    const nightRates = calcNightlyRates(checkIn, checkOut, basePrice, minPrice, tier, ratesMap);
    return calcNightlyStayPrice(nightRates, roomsCount);
  }, [selectedRoom, checkIn, checkOut, roomsCount, tier, ratesMap]);

  const minRooms = useMemo(() => {
    const capacity = selectedRoom?.capacity ?? 0;
    if (capacity <= 0) return 1;
    return Math.max(1, Math.ceil(adults / capacity), Math.ceil(children / 2));
  }, [adults, children, selectedRoom]);

  // Sync rooms count to match guest count and room capacity
  useEffect(() => {
    setRoomsCount(minRooms);
  }, [minRooms]);

  // Rooms left tonight from quantity_available
  const quantityAvailable = selectedRoom?.quantity_available ?? null;

  const urgencyLabel =
    urgencyStatus === 'CRITICAL'
      ? t['urgency.critical']
      : urgencyStatus === 'HIGH_DEMAND'
      ? t['urgency.high']
      : urgencyStatus === 'MEDIUM_DEMAND'
      ? t['urgency.medium']
      : t['urgency.low'];

  const avgPerNight = pricing?.avgPerNight ?? 0;

  // ── Handlers ─────────────────────────────────────────────────
  const handleDatesChange = useCallback((newCheckIn: string, newCheckOut: string) => {
    setCheckIn(newCheckIn);
    setCheckOut(newCheckOut);
  }, []);

  const handleBookNow = useCallback(() => {
    if (!selectedRoom || !pricing) return;

    const basePrice = getRoomBasePrice(selectedRoom);
    const pricePerNight = avgPerNight > 0 ? avgPerNight : calcLivePrice(basePrice, getRoomMinPrice(selectedRoom), tier);

    setDates(isoToStored(checkIn), isoToStored(checkOut));
    setGuests(totalGuests);

    setSelectedHotel({
      id: hotelId,
      name: hotelName,
      location,
      address,
      city,
      stars,
      rating,
    });

    setRoom({
      id: selectedRoom.id,
      name: selectedRoom.name,
      room_type: (selectedRoom.room_type as RoomCategory) ?? 'standard',
      image_url: selectedRoom.image_url ?? undefined,
      bedType: '',
      sizeM2: 0,
      maxGuests: selectedRoom.capacity,
      basePrice,
      pricePerNight,
      features: [],
      quantity: roomsCount,
      quantity_available: selectedRoom.quantity_available ?? undefined,
    });

    router.push(`/booking/${hotelId}`);
  }, [
    checkIn,
    checkOut,
    totalGuests,
    hotelId,
    hotelName,
    location,
    address,
    city,
    stars,
    rating,
    pricing,
    selectedRoom,
    roomsCount,
    tier,
    setDates,
    setGuests,
    setSelectedHotel,
    setRoom,
    router,
  ]);

  const nightRates     = pricing?.nights ?? [];
  const tonightRate    = nightRates.find(n => n.isTonight) ?? nightRates[0] ?? null;
  const pricePerNight  = tonightRate?.finalPrice ?? 0;
  const basePrice      = selectedRoom ? getRoomBasePrice(selectedRoom) : 0;
  const tonightPublished = tonightRate?.publishedPrice ?? basePrice;
  const subtotal       = pricing?.subtotal ?? 0;
  const taxes          = pricing?.taxes ?? 0;
  const total          = pricing?.total ?? 0;
  const discountPercent = tonightRate ? calcActualDiscount(tonightPublished, pricePerNight) : 0;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* ── Deal badge + urgency ── */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-50">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {discountPercent > 0 && (
            <span className="bg-red-500 text-white text-xs font-extrabold px-3 py-1 rounded-full">
              -{discountPercent}% OFF
            </span>
          )}
          <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${badgeBg} ${badgeText}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`} />
            {dealBadge}
          </span>
        </div>

        {/* Urgency pill */}
        <div className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border ${urgencyBg} ${urgencyBorder} ${urgencyText}`}>
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          {urgencyLabel}
        </div>

        {/* Price display */}
        <div className="flex items-end gap-3 flex-wrap mt-4">
          <div>
            {discountPercent > 0 && (
              <div className="text-gray-400 text-xs line-through mb-0.5">
                <CurrencyAmount amount={basePrice} />
                {t['price.perNight']}
              </div>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-brand-blue font-extrabold text-4xl leading-none">
                <CurrencyAmount amount={pricePerNight} />
              </span>
              <span className="text-gray-400 text-sm">{t['price.perNight']}</span>
            </div>
            <span className="inline-block mt-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              -{calcActualDiscount(basePrice, pricePerNight)}% {tier.label}
            </span>
          </div>
          {discountPercent > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
              <div className="text-green-700 font-extrabold text-base leading-none">
                {t['price.save']} <CurrencyAmount amount={Math.max(0, basePrice - pricePerNight)} />
              </div>
              <div className="text-green-600 text-xs mt-0.5">{t['price.tonightOnly']}</div>
            </div>
          )}
        </div>

        {/* Rooms left tonight */}
        {quantityAvailable !== null && quantityAvailable <= 5 && (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-red-600">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {quantityAvailable === 0
              ? 'Sold out tonight'
              : `${quantityAvailable} room${quantityAvailable === 1 ? '' : 's'} left tonight`}
          </div>
        )}

        {/* Countdown to next tier */}
        <div className="mt-2 text-xs text-orange-600">
          <CountdownTimer
            nextTierTime={tier.nextTierTime}
            nextDiscountPercent={tier.nextDiscountPercent}
            variant="full"
          />
        </div>

        {/* Price lock message */}
        <div className="mt-1 flex items-center gap-1.5 text-xs text-green-700">
          <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          السعر يُقفّل عند الحجز ولا يتغير
        </div>
      </div>

      {/* ── Booking closed banner (6:00 AM → 11:59 AM) ── */}
      {!bookingOpen && (
        <div className="px-5 py-6 bg-gray-50 border-b border-gray-100 text-center">
          <div className="w-14 h-14 bg-red-50 border-2 border-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-extrabold text-gray-900 text-base mb-1">الحجوزات مغلقة الآن</p>
          <p className="text-gray-500 text-sm mb-4">
            تفتح حجوزات الليلة الساعة{' '}
            <span className="font-bold text-brand-blue">12:00 PM</span>
          </p>
          {minutesUntilOpen() > 0 && (
            <div className="inline-flex items-center gap-2 bg-brand-blue/10 border border-brand-blue/20 rounded-xl px-4 py-2.5">
              <svg className="w-4 h-4 text-brand-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-brand-blue font-bold text-sm">
                تفتح خلال{' '}
                {Math.floor(minutesUntilOpen() / 60) > 0
                  ? `${Math.floor(minutesUntilOpen() / 60)} ساعة و`
                  : ''}
                {minutesUntilOpen() % 60} دقيقة
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Booking form ── */}
      <div className="px-5 py-5 space-y-4">

        {/* Dates — professional date range picker */}
        <DateRangePicker
          mode="inline"
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={handleDatesChange}
          checkInLabel={t['booking.checkIn']}
          checkOutLabel={t['booking.checkOut']}
        />

        {/* Nights summary */}
        <div className="flex justify-center">
          <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">
            {nights === 1 ? t['hotel.nightStay'] : t['hotel.nightsStay'].replace('{n}', String(nights))}
          </span>
        </div>

        {/* Guest selector */}
        <div ref={guestRef} className="relative">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {t['booking.guests']}
          </label>
          <button
            type="button"
            onClick={() => setGuestOpen((o) => !o)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 font-medium text-left flex items-center justify-between gap-2 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-colors"
          >
            <span>
              {adults} {adults === 1 ? t['booking.guest'] : t['booking.guests']}
              {children > 0 && `, ${children} ${t['hotel.children'].toLowerCase()}`}
              {roomsCount > 1 && `, ${roomsCount} ${t['hotel.roomsCount'].toLowerCase()}`}
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${guestOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {guestOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-40 p-4">
              <GuestCounter
                label={t['hotel.adults']}
                sublabel="Age 18+"
                value={adults}
                onDecrement={() => setAdults((n) => Math.max(1, n - 1))}
                onIncrement={() => setAdults((n) => n + 1)}
                min={1}
                max={20}
              />
              <div className="border-t border-gray-50 my-1" />
              <GuestCounter
                label={t['hotel.children']}
                sublabel="Ages 0–17"
                value={children}
                onDecrement={() => setChildren((n) => Math.max(0, n - 1))}
                onIncrement={() => setChildren((n) => n + 1)}
                min={0}
                max={10}
              />
              <div className="border-t border-gray-50 my-1" />
              <GuestCounter
                label={t['hotel.roomsCount']}
                value={roomsCount}
                onDecrement={() => setRoomsCount((n) => Math.max(minRooms, n - 1))}
                onIncrement={() => setRoomsCount((n) => n + 1)}
                min={minRooms}
                max={10}
              />
              <button
                type="button"
                onClick={() => setGuestOpen(false)}
                className="mt-3 w-full text-white font-semibold text-sm py-2 rounded-xl transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
              >
                {t['hotel.guestsDone']}
              </button>
            </div>
          )}
        </div>

        {/* Room type selector */}
        {rooms.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t['hotel.roomType']}
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 font-medium focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-colors appearance-none cursor-pointer"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px', paddingRight: '36px' }}
            >
              {rooms.map((room) => {
                const bp   = getRoomBasePrice(room);
                const live = calcLivePrice(bp, getRoomMinPrice(room), tier);
                return (
                  <option key={room.id} value={String(room.id)}>
                    {room.name}
                    {live > 0 ? ` — from ${formatPrice(live, currency)}/night (was ${formatPrice(bp, currency)})` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {rooms.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
            {t['hotel.noRoomsAvailable']}
          </div>
        )}

        {/* Price breakdown */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
          <div className="font-semibold text-gray-700 mb-3">{t['hotel.priceBreakdown']}</div>

          {ratesLoading ? (
            <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
              <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-brand-blue rounded-full animate-spin" />
              جارٍ تحميل الأسعار…
            </div>
          ) : nightRates.length > 0 ? (
            <>
              {/* Tonight line — discounted */}
              {tonightRate && (
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1.5">
                    الليلة
                    {tonightRate.discountPercent > 0 && (
                      <span className="text-[10px] bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                        -{tonightRate.discountPercent}%
                      </span>
                    )}
                  </span>
                  <span className="font-medium text-gray-800">
                    <CurrencyAmount amount={tonightRate.finalPrice} />
                  </span>
                </div>
              )}

              {/* Remaining nights — grouped if all same price, else individually */}
              {(() => {
                const future = nightRates.filter(n => !n.isTonight);
                if (future.length === 0) return null;
                const allSame = future.every(n => n.finalPrice === future[0].finalPrice);
                if (allSame) {
                  return (
                    <div className="flex justify-between text-gray-600">
                      <span>
                        {future.length === 1
                          ? '1 ليلة إضافية'
                          : `${future.length} ليالي إضافية × `}
                        {allSame && <CurrencyAmount amount={future[0].finalPrice} />}
                      </span>
                      <span className="font-medium text-gray-800">
                        <CurrencyAmount amount={future.reduce((s, n) => s + n.finalPrice, 0)} />
                      </span>
                    </div>
                  );
                }
                return future.map(n => (
                  <div key={n.date} className="flex justify-between text-gray-600">
                    <span className="text-xs">
                      {new Date(n.date + 'T12:00:00').toLocaleDateString('ar', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="font-medium text-gray-800">
                      <CurrencyAmount amount={n.finalPrice} />
                    </span>
                  </div>
                ));
              })()}

              {roomsCount > 1 && (
                <div className="flex justify-between text-gray-600">
                  <span>{t['hotel.breakdown.rooms'].replace('{n}', String(roomsCount))}</span>
                  <span className="font-medium text-gray-800">
                    <CurrencyAmount amount={subtotal} />
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex justify-between text-gray-600">
              <span>
                {nights === 1 ? t['hotel.breakdown.night'] : t['hotel.breakdown.nights'].replace('{n}', String(nights))}
                {avgPerNight > 0 && nights > 1 && <span className="text-gray-400 text-xs mr-1">(متوسط <CurrencyAmount amount={avgPerNight} />/ليلة)</span>}
              </span>
              <span className="font-medium text-gray-800">
                <CurrencyAmount amount={subtotal} />
              </span>
            </div>
          )}

          <div className="flex justify-between text-gray-500">
            <span>{t['hotel.taxesFees']}</span>
            <span><CurrencyAmount amount={taxes} /></span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between font-extrabold text-gray-900">
            <span>{t['hotel.totalPrice']}</span>
            <span className="text-brand-blue text-lg"><CurrencyAmount amount={total} /></span>
          </div>
        </div>
      </div>

      {/* ── Book Now CTA ── */}
      <div className="px-5 pb-5">
        <button
          type="button"
          onClick={handleBookNow}
          disabled={!bookingOpen || rooms.length === 0 || (quantityAvailable !== null && quantityAvailable <= 0)}
          className="w-full disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all text-lg flex items-center justify-between px-5 hover:-translate-y-0.5 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
        >
          <span>
            {!bookingOpen
              ? 'تفتح الساعة 12:00 PM'
              : quantityAvailable !== null && quantityAvailable <= 0
              ? 'Sold Out Tonight'
              : t['hotel.bookNow']}
          </span>
          <span className="font-extrabold text-xl">
            {bookingOpen && <CurrencyAmount amount={total} />}
          </span>
        </button>
        <p className="text-center text-gray-400 text-xs mt-2">{t['booking.notChargedYet']}</p>
      </div>

      {/* ── Non-refundable policy + trust signals ── */}
      <div className="border-t border-gray-50 px-5 pb-5 pt-4 space-y-2">
        {/* Non-refundable — always true for SelectedRoom same-day deals */}
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-amber-800 text-sm font-semibold">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Non-refundable booking
        </div>
        {[
          t['hotel.noHiddenFees'],
          t['hotel.reserveNowPayLater'],
        ].map((label) => (
          <div key={label} className="flex items-center gap-2 text-gray-600 text-sm">
            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
