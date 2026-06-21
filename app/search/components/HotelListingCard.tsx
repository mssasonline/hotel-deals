'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { SearchHotel } from '@/app/lib/searchData';
import { FALLBACK_HOTEL_IMAGE } from '@/app/lib/searchData';
import { getUrgencyConfig } from '@/lib/dealsEngine';
import { getCurrentTier, calcLivePrice, calcActualDiscount, type PriceTier } from '@/lib/pricingEngine';
import { formatDistance } from '@/lib/geo';

const AMENITY_LABELS: Record<string, string> = {
  pool:            'Pool',
  gym:             'Gym',
  spa:             'Spa',
  restaurant:      'Restaurant',
  free_parking:    'Free Parking',
  paid_parking:    'Paid Parking',
  airport_shuttle: 'Airport Shuttle',
  business_center: 'Business Center',
  conference:      'Conference Room',
  free_wifi:       'Free Wi-Fi',
  room_service:    'Room Service',
  pet_friendly:    'Pet Friendly',
  kids_club:       'Kids Club',
  beach_access:    'Beach Access',
  golf:            'Golf',
  bar_lounge:      'Bar & Lounge',
  rooftop:         'Rooftop',
  valet_parking:   'Valet Parking',
  casino:          'Casino',
};

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
      className="bg-white rounded-2xl overflow-hidden border group cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
      style={{ borderColor: 'rgba(30,58,138,0.10)', boxShadow: '0 2px 12px rgba(30,58,138,0.07)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(30,58,138,0.14)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(30,58,138,0.2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(30,58,138,0.07)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(30,58,138,0.10)'; }}
      onClick={goToHotel}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && goToHotel()}
    >
      <div className="flex flex-col sm:flex-row">

        {/* ── Image ───────────────────────────────────────────────── */}
        <div className="relative h-40 sm:h-auto sm:w-48 lg:w-56 shrink-0 overflow-hidden">
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

          {/* GPS badge only */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {gpsDistanceKm !== undefined && isFinite(gpsDistanceKm) && (
              <div className="bg-white/90 backdrop-blur-sm text-green-700 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm border border-green-200/50">
                <span className="relative flex items-center justify-center w-3 h-3 shrink-0">
                  <span className="absolute w-3 h-3 rounded-full live-ping opacity-40" style={{ background: '#15803d' }} />
                  <svg className="w-3 h-3 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                {formatDistance(gpsDistanceKm)} {t['search.fromYou']}
              </div>
            )}
          </div>

          {/* Dynamic discount badge */}
          {displayDiscount > 0 && (
            <div className="absolute top-3 right-3 text-white font-extrabold text-sm px-2.5 py-1 rounded-lg shadow-md leading-none" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}>
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
        <div className="flex-1 p-3.5 flex flex-col min-w-0">

          {/* Deal badge + score row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${urgency.badgeBg} ${urgency.badgeText}`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${urgency.dotColor}`} />
                {urgency.label}
              </span>
              <span className="inline-flex items-center gap-1.5 text-white text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, #92400E 0%, #D97706 100%)' }}>
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shrink-0" />
                {t['hotel.tonightOnly']}
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
              </div>
            </div>
          </div>

          {/* Stars */}
          <Stars count={hotel.stars} />

          {/* Hotel name */}
          <h2 className="font-bold text-xl mt-1 mb-0.5 leading-tight line-clamp-1" style={{ color: '#B45309' }}>
            {hotel.name}
          </h2>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-2 flex-wrap">
            <svg className="w-4 h-4 text-brand-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{hotel.location}</span>
            {hotel.distanceKm != null && (
              <>
                <span className="text-gray-300 hidden sm:inline">·</span>
                <span className="text-gray-400 text-xs hidden sm:inline">
                  {hotel.distanceKm.toFixed(1)} km from center
                </span>
              </>
            )}
          </div>

          {/* Amenity pills */}
          <div className="flex flex-wrap gap-1 mb-2">
            {hotel.amenities.slice(0, 4).map(amenity => (
              <span
                key={amenity}
                className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full"
              >
                {AMENITY_LABELS[amenity] ?? amenity}
              </span>
            ))}
          </div>

          {/* ── Bottom section: urgency left / price+CTA right ──── */}
          <div className="mt-auto pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">

            {/* Urgency + inventory column */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-500 text-xs">{t['hotel.expiresIn']}</span>
                <CountdownTimer hours={hotel.countdownHours} minutes={hotel.countdownMinutes} />
              </div>

              {hotel.roomsLeft > 0 && hotel.roomsLeft <= 5 && (
                <span className="text-red-600 text-xs font-semibold">
                  {t['hotel.only']} {hotel.roomsLeft} {hotel.roomsLeft === 1 ? t['hotel.roomLeft'] : t['hotel.roomsLeft']}!
                </span>
              )}

            </div>

            {/* Price + CTA column */}
            <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-0 shrink-0">
              <div className="sm:text-right">
                {displayDiscount > 0 ? (
                  <>
                    <div className="text-base font-semibold leading-none text-red-500">
                      <CurrencyAmount amount={displayOriginal} className="line-through decoration-2 decoration-red-500" />{t['price.perNight']}
                    </div>
                    <div className="flex sm:justify-end items-baseline gap-0.5 mt-0.5">
                      <span className="text-[10px] text-gray-500 font-medium mr-0.5">From</span>
                      <span className="text-green-600 font-extrabold text-2xl leading-none">
                        <CurrencyAmount amount={displayPrice} />
                      </span>
                      <span className="text-gray-400 text-xs">{t['price.perNight']}</span>
                    </div>
                    <div className="text-green-600 text-[11px] font-medium">
                      {t['price.youSave']} <CurrencyAmount amount={savings} /> tonight
                    </div>
                  </>
                ) : (
                  <div className="flex sm:justify-end items-baseline gap-0.5">
                    <span className="text-[10px] text-gray-500 font-medium mr-0.5">From</span>
                    <span className="text-green-600 font-extrabold text-2xl leading-none">
                      <CurrencyAmount amount={displayPrice} />
                    </span>
                    <span className="text-gray-400 text-xs">{t['price.perNight']}</span>
                  </div>
                )}
              </div>
              <button
                className="text-white font-semibold px-5 py-2 rounded-xl text-sm whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 mt-1.5"
                style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.28)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(30,58,138,0.38)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(30,58,138,0.28)'; }}
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
