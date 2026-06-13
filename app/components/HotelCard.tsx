'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUrgencyConfig } from '@/lib/dealsEngine';
import { calcActualDiscount, getCurrentTier, calcLivePrice, type PriceTier } from '@/lib/pricingEngine';
import FavoriteButton from './FavoriteButton';
import CurrencyAmount from './CurrencyAmount';
import CountdownTimer from './CountdownTimer';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import { formatPrice } from '@/lib/currency';

const FALLBACK_HOTEL_IMAGE =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';

export interface Hotel {
  id: number;
  name: string;
  location: string;
  gradient: string;
  category: string;
  stars: number;
  rating: number;
  reviewCount: number;
  /** Lowest room base_price — hotel's own website price, shown as strikethrough */
  basePrice: number;
  /** Lowest room min_price — floor the engine won't go below */
  minPrice: number;
  tonightOnly: boolean;
  roomsLeft: number;
  countdownHours: number;
  imageUrl: string | null;
}

interface HotelCardProps {
  hotel: Hotel;
  initialFavorited?: boolean;
  onUnfavorite?: () => void;
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

export default function HotelCard({ hotel, initialFavorited, onUnfavorite }: HotelCardProps) {
  const [tier, setTier] = useState<PriceTier>(() => getCurrentTier());

  useEffect(() => {
    const id = setInterval(() => setTier(getCurrentTier()), 60_000);
    return () => clearInterval(id);
  }, []);

  const livePrice     = calcLivePrice(hotel.basePrice, hotel.minPrice, tier);
  const totalDiscount = calcActualDiscount(hotel.basePrice, livePrice);
  const savings       = Math.max(0, hotel.basePrice - livePrice);

  const urgency = getUrgencyConfig(hotel.countdownHours);

  const language = useAppSettingsStore((s) => s.language);
  const currency = useAppSettingsStore((s) => s.currency);
  const t = getTranslations(language);

  const bookNowLabel = t['hotel.seeAvailability'];

  return (
    <article className="relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-100 flex flex-col group">

      {/* Image area */}
      <div className="relative h-48 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hotel.imageUrl ?? FALLBACK_HOTEL_IMAGE}
          alt={hotel.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Category label at bottom of image */}
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/45 to-transparent p-3">
          <span className="text-white/90 text-[11px] font-medium uppercase tracking-widest">
            {hotel.category}
          </span>
        </div>

        {/* Tonight Only badge */}
        {hotel.tonightOnly && (
          <div className="absolute top-3 left-3 bg-brand-gold text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            {t['hotel.tonightOnly']}
          </div>
        )}

        {/* Live tier discount badge */}
        {totalDiscount > 0 && (
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
            <div className="bg-red-500 text-white text-sm font-extrabold px-2.5 py-1 rounded-lg leading-none shadow-sm">
              -{totalDiscount}%
            </div>
            <div className="bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-sm">
              {tier.label}
            </div>
          </div>
        )}

        {/* Favorite button */}
        <div className="absolute bottom-3 right-3 z-10">
          <FavoriteButton
            hotelId={hotel.id}
            initialFavorited={initialFavorited}
            onUnfavorite={onUnfavorite}
          />
        </div>

        {/* Hover shimmer */}
        <div className="absolute inset-0 bg-brand-blue/0 group-hover:bg-brand-blue/8 transition-colors duration-300" />
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1">

        {/* Stars + score */}
        <div className="flex items-center justify-between mb-2">
          <Stars count={hotel.stars} />
          <div className="flex items-center gap-1.5">
            <span className="bg-brand-blue text-white text-xs font-bold px-1.5 py-0.5 rounded">
              {hotel.rating}
            </span>
            <span className="text-gray-400 text-xs">
              {hotel.reviewCount.toLocaleString()} reviews
            </span>
          </div>
        </div>

        {/* Urgency label badge */}
        <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full mb-2 w-fit ${urgency.badgeBg} ${urgency.badgeText}`}>
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${urgency.dotColor}`} />
          {urgency.label}
        </div>

        {/* Name */}
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-1 line-clamp-1">
          {hotel.name}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
          <svg className="w-3.5 h-3.5 text-brand-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{hotel.location}</span>
        </div>

        {/* Price block — live tier pricing */}
        <div className="flex items-end justify-between mb-2">
          <div>
            {hotel.basePrice > 0 && hotel.basePrice > livePrice && (
              <span className="line-through text-red-500 text-sm block leading-none mb-0.5">
                <CurrencyAmount amount={hotel.basePrice} />{t['price.perNight']}
              </span>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-[11px] text-gray-500 font-medium mr-0.5">From</span>
              <span className="text-green-600 font-extrabold text-2xl leading-none">
                <CurrencyAmount amount={livePrice} />
              </span>
              <span className="text-gray-400 text-xs">{t['price.perNight']}</span>
            </div>
          </div>
          {savings > 0 && (
            <div className="text-right bg-green-50 border border-green-100 rounded-lg px-2.5 py-1.5">
              <div className="text-green-600 text-[10px] font-medium leading-none mb-0.5">{t['price.youSave']}</div>
              <div className="text-green-700 font-bold text-sm leading-none">
                <CurrencyAmount amount={savings} />
              </div>
            </div>
          )}
        </div>

        {/* Countdown to next tier */}
        <div className="text-[11px] text-orange-600 mb-2">
          <CountdownTimer
            nextTierTime={tier.nextTierTime}
            nextDiscountPercent={tier.nextDiscountPercent}
            variant="full"
          />
        </div>

        {/* Urgency banner */}
        {hotel.roomsLeft <= 5 && (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 mb-3">
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-red-600 text-xs font-semibold">
              {t['hotel.only']} {hotel.roomsLeft} {hotel.roomsLeft === 1 ? t['hotel.roomLeft'] : t['hotel.roomsLeft']}!
            </span>
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto relative z-10">
          <Link
            href={`/hotel/${hotel.id}`}
            className="block w-full bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold py-2.5 rounded-xl transition-colors text-sm text-center"
          >
            {bookNowLabel}
          </Link>
        </div>

      </div>
      {/* Stretched link covers the whole card */}
      <Link href={`/hotel/${hotel.id}`} className="absolute inset-0 z-0" aria-label={`View ${hotel.name}`} />
    </article>
  );
}
