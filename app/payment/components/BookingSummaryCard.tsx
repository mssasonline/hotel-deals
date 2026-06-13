'use client';

import CurrencyAmount from '@/app/components/CurrencyAmount';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import type { SelectedHotel, SelectedRoom } from '@/store/bookingStore';
import { getRoomImage } from '@/lib/roomImages';
import { calcRoomPrice } from '@/lib/pricingEngine';

interface Props {
  hotel: SelectedHotel | null;
  room: SelectedRoom | null;
  checkIn: string;
  checkOut: string;
  guests: number;
}

function StarIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-brand-gold" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export default function BookingSummaryCard({ hotel, room, checkIn, checkOut, guests }: Props) {
  if (!hotel) return null;

  const pricing = room ? calcRoomPrice(room.basePrice, room.pricePerNight) : null;
  const originalPrice = pricing?.basePrice ?? 0;
  const discountedPrice = pricing?.currentPrice ?? 0;
  const discountPercent = pricing?.discountPercent ?? 0;
  const discount = originalPrice - discountedPrice;
  const taxes = Math.round(discountedPrice * 0.15);
  const total = discountedPrice + taxes;

  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="bg-brand-blue px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-white/55 text-[11px] font-medium uppercase tracking-widest mb-1">
              {t['booking.yourBooking']}
            </p>
            <h2 className="text-white font-extrabold text-lg leading-tight">{hotel.name}</h2>
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: hotel.stars }).map((_, i) => (
                <StarIcon key={i} />
              ))}
            </div>
            <p className="text-white/60 text-xs mt-1 flex items-center gap-1">
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {hotel.location}
            </p>
          </div>
          {discountPercent > 0 && (
            <div className="bg-red-500 text-white text-xs font-extrabold px-2.5 py-1.5 rounded-xl shrink-0">
              -{discountPercent}%
            </div>
          )}
        </div>
      </div>

      {/* Room type thumbnail */}
      {room && (
        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getRoomImage(room.room_type, room.image_url)}
            alt={room.name}
            className="w-16 h-12 rounded-xl shrink-0 object-cover"
          />
          <div>
            <p className="font-bold text-gray-900 text-sm">{room.name}</p>
            <p className="text-gray-400 text-xs mt-0.5">
              {room.bedType} · {room.sizeM2} m² · up to {room.maxGuests} guests
            </p>
          </div>
        </div>
      )}

      {/* Stay details */}
      <div className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-gray-50">
        <div>
          <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wide mb-1">{t['booking.checkIn']}</p>
          <p className="font-bold text-gray-900 text-sm">{checkIn}</p>
          <p className="text-gray-400 text-xs mt-0.5">{t['booking.checkInTime']}</p>
        </div>
        <div>
          <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wide mb-1">{t['booking.checkOut']}</p>
          <p className="font-bold text-gray-900 text-sm">{checkOut}</p>
          <p className="text-gray-400 text-xs mt-0.5">{t['booking.checkOutTime']}</p>
        </div>
        <div>
          <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wide mb-1">{t['booking.guests']}</p>
          <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
            <svg className="w-4 h-4 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {guests} {guests === 1 ? t['booking.guest'] : t['booking.guests']}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wide mb-1">{t['booking.room']}</p>
          <p className="font-bold text-gray-900 text-sm">{room?.name ?? 'Standard Room'}</p>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="px-6 py-5">
        <h3 className="font-bold text-gray-900 text-sm mb-3">{t['price.breakdown']}</h3>
        <div className="bg-gray-50 rounded-xl px-4 py-4 space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{t['price.originalPrice']}</span>
            <span className="text-red-500 line-through"><CurrencyAmount amount={originalPrice} /></span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-600 font-semibold flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {t['booking.discount'].replace('{pct}', String(discountPercent))}
            </span>
            <span className="text-green-600 font-semibold">-<CurrencyAmount amount={discount} /></span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{t['price.roomRate']}</span>
            <span className="text-gray-700 font-semibold"><CurrencyAmount amount={discountedPrice} /></span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{t['price.taxes']}</span>
            <span className="text-gray-700 font-semibold"><CurrencyAmount amount={taxes} /></span>
          </div>
          <div className="h-px bg-gray-200" />
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-gray-900">{t['price.totalDue']}</span>
            <span className="font-extrabold text-brand-blue text-xl"><CurrencyAmount amount={total} /></span>
          </div>
        </div>

        {/* Savings callout */}
        <div className="mt-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center gap-2.5">
          <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-green-700 text-sm font-semibold">
            {t['price.youAreSaving']} <span className="font-extrabold"><CurrencyAmount amount={discount} /></span> {t['price.onThisBooking']}
          </p>
        </div>
      </div>

      {/* Trust signals */}
      <div className="px-6 pb-5 grid grid-cols-3 gap-3 text-center">
        <div className="bg-amber-50 rounded-xl py-3 px-2">
          <svg className="w-5 h-5 text-amber-500 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-amber-700 text-[10px] font-bold leading-tight">Non-refundable</p>
          <p className="text-gray-400 text-[9px] mt-0.5">Same-day deal</p>
        </div>
        <div className="bg-brand-blue-light rounded-xl py-3 px-2">
          <svg className="w-5 h-5 text-brand-blue mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <p className="text-brand-blue text-[10px] font-bold leading-tight">{t['trust.noFees']}</p>
          <p className="text-gray-400 text-[9px] mt-0.5">{t['trust.noFeesSub']}</p>
        </div>
        <div className="bg-brand-blue-light rounded-xl py-3 px-2">
          <svg className="w-5 h-5 text-brand-blue mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-brand-blue text-[10px] font-bold leading-tight">{t['trust.payLater']}</p>
          <p className="text-gray-400 text-[9px] mt-0.5">{t['trust.payLaterSub']}</p>
        </div>
      </div>
    </div>
  );
}
