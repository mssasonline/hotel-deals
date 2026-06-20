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

function heatGradient(hours: number): string {
  if (hours < 2)  return 'linear-gradient(90deg, #7F1D1D, #DC2626, #EF4444)';
  if (hours < 6)  return 'linear-gradient(90deg, #92400E, #F97316, #FB923C)';
  if (hours < 12) return 'linear-gradient(90deg, #78350F, #D97706, #F59E0B)';
  return 'linear-gradient(90deg, #1E3A8A, #2563EB, #60A5FA)';
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
  const t = getTranslations(language);

  const bookNowLabel = t['hotel.seeAvailability'];

  return (
    <article
      className="relative bg-white rounded-3xl overflow-hidden flex flex-col group cursor-pointer transition-all duration-350"
      style={{
        boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 4px 20px rgba(30,58,138,0.07), 0 0 0 1px rgba(30,58,138,0.06)',
        border: '1px solid rgba(30,58,138,0.07)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 40px rgba(30,58,138,0.14), 0 3px 12px rgba(180,83,9,0.1), 0 0 0 1px rgba(180,83,9,0.09)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05), 0 4px 20px rgba(30,58,138,0.07), 0 0 0 1px rgba(30,58,138,0.06)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Image area */}
      <div className="relative h-56 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hotel.imageUrl ?? FALLBACK_HOTEL_IMAGE}
          alt={hotel.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Category label at bottom of image */}
        <div className="absolute inset-0 flex items-end p-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }}>
          <span className="text-white/90 text-[11px] font-semibold uppercase tracking-widest">
            {hotel.category}
          </span>
        </div>

        {/* Tonight Only badge */}
        {hotel.tonightOnly && (
          <div
            className="absolute top-3 left-3 text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5"
            style={{ background: 'linear-gradient(135deg, #92400E 0%, #D97706 100%)', boxShadow: '0 2px 10px rgba(180,83,9,0.45)' }}
          >
            <span className="w-1.5 h-1.5 bg-white rounded-full" style={{ animation: 'pulse 1.8s ease-in-out infinite' }} />
            {t['hotel.tonightOnly']}
          </div>
        )}

        {/* Live tier discount badge */}
        {totalDiscount > 0 && (
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
            <div
              className="text-white text-sm font-extrabold px-3 py-1 rounded-lg leading-none"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.45)' }}
            >
              -{totalDiscount}%
            </div>
            <div className="bg-black/50 text-white/90 text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ backdropFilter: 'blur(8px)' }}>
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

        {/* Heat strip — encodes urgency without words */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[3px] transition-all duration-500"
          style={{ background: heatGradient(hotel.countdownHours) }}
        />
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1">

        {/* Stars + score */}
        <div className="flex items-center justify-between mb-2.5">
          <Stars count={hotel.stars} />
          <div className="flex items-center gap-1.5">
            <span
              className="text-white text-xs font-bold px-2 py-0.5 rounded-md"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
            >
              {hotel.rating}
            </span>
            <span className="text-gray-400 text-xs">
              {hotel.reviewCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Urgency label badge */}
        <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full mb-2 w-fit ${urgency.badgeBg} ${urgency.badgeText}`}>
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${urgency.dotColor}`} />
          {urgency.label}
        </div>

        {/* Name */}
        <h3 className="font-bold text-xl leading-snug mb-1 line-clamp-1" style={{ color: '#B45309' }}>
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

        {/* Price block */}
        <div className="flex items-end justify-between mb-2">
          <div>
            {hotel.basePrice > 0 && hotel.basePrice > livePrice && (
              <span className="block text-base font-semibold leading-none mb-1.5 text-red-500">
                <CurrencyAmount amount={hotel.basePrice} className="line-through decoration-2 decoration-red-500" />{t['price.perNight']}
              </span>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-[11px] text-gray-400 font-medium mr-0.5">From</span>
              <span className="font-extrabold text-[1.65rem] leading-none" style={{ color: '#B45309' }}>
                <CurrencyAmount amount={livePrice} />
              </span>
              <span className="text-gray-400 text-xs">{t['price.perNight']}</span>
            </div>
          </div>
          {savings > 0 && (
            <div
              className="text-right rounded-xl px-2.5 py-1.5"
              style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', border: '1px solid rgba(180,83,9,0.15)' }}
            >
              <div className="text-amber-700 text-[10px] font-semibold leading-none mb-0.5">{t['price.youSave']}</div>
              <div className="font-bold text-sm leading-none" style={{ color: '#92400E' }}>
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
            className="block w-full text-white font-bold py-3 rounded-xl text-sm text-center transition-all duration-250"
            style={{ background: 'linear-gradient(135deg, #92400E 0%, #B45309 45%, #D97706 100%)', boxShadow: '0 2px 12px rgba(180,83,9,0.32)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 5px 20px rgba(180,83,9,0.5)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(180,83,9,0.32)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
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
