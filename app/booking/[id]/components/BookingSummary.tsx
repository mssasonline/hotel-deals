'use client';

import type { HotelDetail, RoomType } from '@/app/hotel/[id]/lib/hotelDetailData';
import { getRoomImage } from '@/lib/roomImages';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface BookingSummaryProps {
  hotel: HotelDetail;
  room: RoomType;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  breakfastIncluded?: boolean;
  breakfastPricePerPerson?: number;
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

export default function BookingSummary({ hotel, room, checkIn, checkOut, guests, nights, breakfastIncluded, breakfastPricePerPerson }: BookingSummaryProps) {
  const t = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #0F2260 0%, #1E3A8A 55%, #2563EB 100%)' }}>
        <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">{t['booking.reservationLabel']}</p>
        <h2 className="text-white font-extrabold text-xl leading-tight">{hotel.name}</h2>
        <div className="flex items-center gap-2 mt-1.5">
          <Stars count={hotel.stars} />
          <span className="text-white/70 text-xs">{hotel.location}</span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Selected room */}
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{t['booking.selectedRoomLabel']}</p>
          <div className="rounded-xl overflow-hidden border border-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getRoomImage(room.room_type, room.image_url)}
              alt={room.name}
              className="h-20 w-full object-cover"
            />
            <div className="px-3 py-2.5 bg-gray-50">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-gray-900 text-sm">{room.name}</p>
                <span className="text-[10px] font-semibold bg-brand-gold-light text-brand-gold px-2 py-0.5 rounded-md">
                  {room.room_type}
                </span>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">
                {room.bedType} · {room.sizeM2}m² · {t['hotel.upToGuests'].replace('{n}', String(room.maxGuests))}
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {room.features.slice(0, 3).map((f) => (
                  <span key={f} className="text-[10px] text-brand-blue bg-brand-blue-light px-2 py-0.5 rounded-full font-medium">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stay dates */}
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{t['booking.stayDetailsLabel']}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wide mb-0.5">{t['booking.checkIn']}</p>
              <p className="font-bold text-gray-900 text-sm">{checkIn}</p>
              <p className="text-gray-400 text-xs">{t['booking.checkInTime']}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wide mb-0.5">{t['booking.checkOut']}</p>
              <p className="font-bold text-gray-900 text-sm">{checkOut}</p>
              <p className="text-gray-400 text-xs">{t['booking.checkOutTime']}</p>
            </div>
          </div>
        </div>

        {/* Guests */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <svg className="w-4 h-4 text-brand-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{t['booking.guests']}</span>
          </div>
          <span className="font-semibold text-gray-900">
            {guests} {guests === 1 ? t['booking.guest'] : t['booking.guests']} · {nights} {nights === 1 ? t['myBookings.nightSingular'] : t['myBookings.nightsPlural']}
          </span>
        </div>

        {/* Breakfast */}
        {breakfastIncluded && breakfastPricePerPerson != null && breakfastPricePerPerson > 0 && (
          <div className="flex items-center justify-between text-sm bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2 text-amber-700">
              <span className="text-base">🍳</span>
              <div>
                <p className="font-semibold leading-none">Breakfast included</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {guests} {guests === 1 ? 'guest' : 'guests'} · {nights} {nights === 1 ? 'night' : 'nights'}
                </p>
              </div>
            </div>
            <span className="font-semibold text-amber-700 text-xs">
              {breakfastPricePerPerson} × {guests}{nights > 1 ? ` × ${nights}n` : ''}
            </span>
          </div>
        )}

        {/* Trust signals */}
        <div className="border-t border-gray-100 pt-4 space-y-2">
          {[
            t['booking.notChargedYet'],
            t['booking.noCardFees'],
            t['booking.instantConfirmation'],
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs text-gray-500">
              <svg className="w-4 h-4 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
