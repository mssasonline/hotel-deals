'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { SearchHotel } from '@/app/lib/searchData';
import { FALLBACK_HOTEL_IMAGE } from '@/app/lib/searchData';
import { getUrgencyConfig } from '@/lib/dealsEngine';
import { getCurrentTier, calcLivePrice, calcActualDiscount, type PriceTier } from '@/lib/pricingEngine';
import { formatDistance } from '@/lib/geo';

/** Updates at each tier boundary (every ~4 hours). Zero re-renders between boundaries. */
function useLiveTier(): PriceTier {
  const [tier, setTier] = useState<PriceTier>(() => getCurrentTier());

  useEffect(() => {
    const msUntilNext = tier.nextTierTime.getTime() - Date.now();
    const id = setTimeout(() => {
      setTier(getCurrentTier());
    }, Math.max(msUntilNext + 500, 1000));
    return () => clearTimeout(id);
  }, [tier]);

  return tier;
}
import { useBookingStore } from '@/store/bookingStore';
import CurrencyAmount from '@/app/components/CurrencyAmount';
import FavoriteButton from '@/app/components/FavoriteButton';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';

function getRatingLabel(r: number): string {
  if (r >= 4.8) return 'Exceptional';
  if (r >= 4.5) return 'Superb';
  if (r >= 4.0) return 'Very Good';
  if (r >= 3.5) return 'Good';
  return 'Okay';
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5 text-brand-gold fill-current" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

/** Countdown clock that ticks every second from an initial total-seconds value. */
function CountdownTimer({ hours, minutes }: { hours: number; minutes: number }) {
  const [secs, setSecs] = useState(hours * 3600 + minutes * 60);

  useEffect(() => {
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const urgent = h < 3;

  if (secs === 0) {
    return <span className="font-bold text-red-600 text-sm">Expired</span>;
  }

  return (
    <span
      className={`font-mono font-bold text-sm tabular-nums ${
        urgent ? 'text-red-600 animate-pulse' : 'text-orange-500'
      }`}
    >
      {String(h).padStart(2, '0')}h {String(m).padStart(2, '0')}m {String(s).padStart(2, '0')}s
    </span>
  );
}

interface HotelListingCardProps {
  hotel: SearchHotel;
  /** Kept for API compatibility — SelectedRoom is always same-day, date not used for pricing. */
  checkinDate?: string;
  /** Set in GPS mode — distance from user's current location */
  gpsDistanceKm?: number;
}

export default function HotelListingCard({ hotel, gpsDistanceKm }: HotelListingCardProps) {
  const router = useRouter();
  const setSelectedHotel = useBookingStore((s) => s.setSelectedHotel);
  const timeLeft = hotel.countdownHours + hotel.countdownMinutes / 60;
  const urgency = getUrgencyConfig(timeLeft);

  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);

  // Live time-based pricing — updates automatically at each tier boundary
  const tier = useLiveTier();

  const { displayPrice, displayOriginal, displayDiscount, savings } = useMemo(() => {
    const live = hotel.basePrice > 0
      ? calcLivePrice(hotel.basePrice, hotel.minPrice, tier)
      : 0;
    const discount = calcActualDiscount(hotel.basePrice, live);
    return {
      displayPrice:    live,
      displayOriginal: hotel.basePrice,
      displayDiscount: discount,
      savings:         Math.max(0, hotel.basePrice - live),
    };
  }, [hotel.basePrice, hotel.minPrice, tier]);

  function goToHotel() {
    setSelectedHotel({
      id: hotel.id,
      name: hotel.name,
      location: hotel.location,
      address: '',
      city: hotel.city,
      stars: hotel.stars,
      rating: hotel.rating,
    });
    router.push(`/hotel/${hotel.id}`);
  }

  return (
    <article
      className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-100 group cursor-pointer"
      onClick={goToHotel}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && goToHotel()}
    >
      <div className="flex flex-col sm:flex-row">

        {/* ── Image ───────────────────────────────────────────────── */}
        <div className="relative h-56 sm:h-auto sm:w-64 lg:w-72 shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hotel.imageUrl ?? FALLBACK_HOTEL_IMAGE}
            alt={hotel.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Category label */}
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/55 to-transparent p-4">
            <span className="text-white/90 text-[11px] font-medium uppercase tracking-widest">
              {hotel.category}
            </span>
          </div>

          {/* Tonight Only badge — always true for SelectedRoom */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            <div className="bg-brand-gold text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              {t['hotel.tonightOnly']}
            </div>
            {gpsDistanceKm !== undefined && isFinite(gpsDistanceKm) && (
              <div className="bg-white/90 backdrop-blur-sm text-green-700 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm border border-green-200/50">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {formatDistance(gpsDistanceKm)} {t['search.fromYou']}
              </div>
            )}
          </div>

          {/* Dynamic discount badge */}
          {displayDiscount > 0 && (
            <div className="absolute top-3 right-3 bg-red-500 text-white font-extrabold text-sm px-2.5 py-1 rounded-lg shadow-sm leading-none">
              -{displayDiscount}%
            </div>
          )}

          {/* Favorite button */}
          <div className="absolute bottom-3 right-3 z-10" onClick={e => e.stopPropagation()}>
            <FavoriteButton hotelId={hotel.id} />
          </div>

          {/* Hover shimmer */}
          <div className="absolute inset-0 bg-brand-blue/0 group-hover:bg-brand-blue/8 transition-colors duration-300" />
        </div>

        {/* ── Content ─────────────────────────────────────────────── */}
        <div className="flex-1 p-5 flex flex-col min-w-0">

          {/* Deal badge + score row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${urgency.badgeBg} ${urgency.badgeText}`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${urgency.dotColor}`} />
                {urgency.label}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-brand-blue-light text-brand-blue text-xs font-semibold px-2.5 py-1 rounded-full border border-brand-blue/15">
                {hotel.dealBadge}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="bg-brand-blue text-white text-sm font-bold px-2 py-0.5 rounded-lg leading-none min-w-[2.5rem] text-center">
                {hotel.rating}
              </div>
              <div>
                <div className="text-gray-900 text-xs font-semibold leading-tight">
                  {getRatingLabel(hotel.rating)}
                </div>
                <div className="text-gray-400 text-[10px]">
                  {hotel.reviewCount.toLocaleString()} reviews
                </div>
              </div>
            </div>
          </div>

          {/* Stars */}
          <Stars count={hotel.stars} />

          {/* Hotel name */}
          <h2 className="font-bold text-gray-900 text-lg sm:text-xl mt-1.5 mb-1 leading-tight line-clamp-1">
            {hotel.name}
          </h2>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-3 flex-wrap">
            <svg className="w-4 h-4 text-brand-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{hotel.location}</span>
            <span className="text-gray-300 hidden sm:inline">·</span>
            <span className="text-gray-400 text-xs hidden sm:inline">
              {hotel.distanceKm} km from center
            </span>
          </div>

          {/* Amenity pills */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {hotel.amenities.slice(0, 4).map(amenity => (
              <span
                key={amenity}
                className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2.5 py-1 rounded-full"
              >
                {amenity}
              </span>
            ))}
          </div>

          {/* ── Bottom section: urgency left / price+CTA right ──── */}
          <div className="mt-auto pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-end justify-between gap-4">

            {/* Urgency + inventory column */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-500 text-xs">{t['hotel.expiresIn']}</span>
                <CountdownTimer hours={hotel.countdownHours} minutes={hotel.countdownMinutes} />
              </div>

              {hotel.roomsLeft > 0 && hotel.roomsLeft <= 5 && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-red-600 text-xs font-semibold">
                    {t['hotel.only']} {hotel.roomsLeft} {hotel.roomsLeft === 1 ? t['hotel.roomLeft'] : t['hotel.roomsLeft']}!
                  </span>
                </div>
              )}

              {/* Price decreasing urgency note */}
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-orange-600 text-xs font-medium">
                  Price drops until midnight
                </span>
              </div>
            </div>

            {/* Price + CTA column */}
            <div className="sm:text-right shrink-0">
              {displayDiscount > 0 ? (
                <>
                  <div className="line-through text-red-500 text-sm leading-none">
                    <CurrencyAmount amount={displayOriginal} />{t['price.perNight']}
                  </div>
                  <div className="flex sm:justify-end items-baseline gap-1 mt-1">
                    <span className="text-[11px] text-gray-500 font-medium mr-0.5">From</span>
                    <span className="text-green-600 font-extrabold text-3xl leading-none">
                      <CurrencyAmount amount={displayPrice} />
                    </span>
                    <span className="text-gray-400 text-sm">{t['price.perNight']}</span>
                  </div>
                  <div className="text-green-600 text-xs font-medium mt-0.5 mb-2.5">
                    {t['price.youSave']} <CurrencyAmount amount={savings} /> tonight
                  </div>
                </>
              ) : (
                <div className="flex sm:justify-end items-baseline gap-1 mb-2.5 mt-1">
                  <span className="text-[11px] text-gray-500 font-medium mr-0.5">From</span>
                  <span className="text-green-600 font-extrabold text-3xl leading-none">
                    <CurrencyAmount amount={displayPrice} />
                  </span>
                  <span className="text-gray-400 text-sm">{t['price.perNight']}</span>
                </div>
              )}
              <button
                className="w-full sm:w-auto bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold px-7 py-2.5 rounded-xl transition-colors text-sm whitespace-nowrap shadow-sm"
                onClick={(e) => { e.stopPropagation(); goToHotel(); }}
              >
                {t['hotel.seeAvailability']}
              </button>
            </div>

          </div>
        </div>
      </div>
    </article>
  );
}
