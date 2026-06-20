'use client';

import CurrencyAmount from '@/app/components/CurrencyAmount';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import type { RoomType } from '../lib/hotelDetailData';
import { getRoomImage } from '@/lib/roomImages';
import { calcRoomPrice } from '@/lib/pricingEngine';

interface RoomCardProps {
  room: RoomType;
  isSelected: boolean;
  onSelect: () => void;
}

export default function RoomCard({ room, isSelected, onSelect }: RoomCardProps) {
  const { currentPrice, savings, discountPercent } = calcRoomPrice(room.basePrice, room.pricePerNight);

  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);

  return (
    <article
      className={`bg-white rounded-2xl overflow-hidden border-2 transition-all duration-200 shadow-sm hover:shadow-md ${
        isSelected ? 'border-brand-blue shadow-brand-blue/10 shadow-lg' : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Room image */}
        <div className="relative h-44 sm:h-auto sm:w-52 shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getRoomImage(room.room_type, room.image_url)}
            alt={room.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3">
            <span className="text-white/80 text-[11px] font-medium uppercase tracking-widest">
              {room.bedType}
            </span>
          </div>
          {savings > 0 && (
            <div className="absolute top-3 right-3 bg-red-500 text-white text-[11px] font-extrabold px-2 py-1 rounded-lg leading-none">
              -{Math.round((savings / room.basePrice) * 100)}%
            </div>
          )}
          {isSelected && (
            <div className="absolute top-3 left-3 bg-brand-blue text-white text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Selected
            </div>
          )}
        </div>

        {/* Room details */}
        <div className="flex-1 p-5 flex flex-col">
          {/* Header */}
          <div className="mb-3">
            <h3 className="font-bold text-xl leading-tight mb-1" style={{ color: '#B45309' }}>{room.name}</h3>
            <div className="flex items-center gap-3 text-gray-500 text-sm flex-wrap">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                {room.sizeM2} m²
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Up to {room.maxGuests} guests
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                {room.bedType}
              </span>
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {room.features.map((feature) => (
              <span
                key={feature}
                className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2.5 py-1 rounded-full flex items-center gap-1"
              >
                <svg className="w-3 h-3 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {feature}
              </span>
            ))}
          </div>

          {/* Price + CTA */}
          <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              {discountPercent > 0 && (
                <div className="text-red-500 text-sm line-through leading-none">
                  <CurrencyAmount amount={room.basePrice} />{t['price.perNight']}
                </div>
              )}
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-green-600 font-extrabold text-2xl leading-none">
                  <CurrencyAmount amount={currentPrice} />
                </span>
                <span className="text-gray-400 text-sm">{t['price.perNight']}</span>
              </div>
              {savings > 0 && (
                <div className="text-green-600 text-xs font-medium mt-0.5">
                  {t['price.save']} <CurrencyAmount amount={savings} /> on this room
                </div>
              )}
            </div>

            <button
              onClick={onSelect}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 whitespace-nowrap text-white hover:-translate-y-0.5"
              style={isSelected
                ? { background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)', cursor: 'default' }
                : { background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }
              }
            >
              {isSelected ? t['hotel.roomSelected'] : t['hotel.selectRoom']}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
