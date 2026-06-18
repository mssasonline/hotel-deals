'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getCurrentTier, calcLivePrice, calcActualDiscount, isBookingOpen, type PriceTier } from '@/lib/pricingEngine';
import { getRoomImage } from '@/lib/roomImages';
import CurrencyAmount from '@/app/components/CurrencyAmount';
import LiveBookingModal from './LiveBookingModal';
import { useTranslation } from '@/lib/i18n/useTranslation';

function useLiveTier(): PriceTier {
  const [tier, setTier] = useState<PriceTier>(() => getCurrentTier());
  useEffect(() => {
    const ms = tier.nextTierTime.getTime() - Date.now();
    const id = setTimeout(() => setTier(getCurrentTier()), Math.max(ms + 500, 1000));
    return () => clearTimeout(id);
  }, [tier]);
  return tier;
}

function useBookingOpen(): boolean {
  const [open, setOpen] = useState(() => isBookingOpen());
  useEffect(() => {
    const id = setInterval(() => setOpen(isBookingOpen()), 60_000);
    return () => clearInterval(id);
  }, []);
  return open;
}

interface Room {
  id: string;
  name: string;
  base_price: number;
  min_price: number | null;
  capacity: number;
  image_url: string | null;
  room_type: string | null;
  quantity_available?: number | null;
  area_sqm?: number | null;
  bed_type?: string | null;
  features?: string[] | null;
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
  breakfastPricePerPerson?: number | null;
}

function getRoomBasePrice(room: Room): number {
  return Number(room.base_price) > 0 ? Number(room.base_price) : 0;
}

function getRoomMinPrice(room: Room): number {
  if (Number(room.min_price) > 0) return Number(room.min_price);
  return Math.round(getRoomBasePrice(room) * 0.6);
}

export default function RoomsGrid({ rooms, hotelId, hotelName, city, location, address, stars, rating, breakfastPricePerPerson }: Props) {
  const [modalRoom, setModalRoom] = useState<Room | null>(null);
  const tier        = useLiveTier();
  const bookingOpen = useBookingOpen();
  const t           = useTranslation();

  if (rooms.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-500">
        {t['hotel.noRoomsAvailable']}
      </div>
    );
  }

  return (
    <>
      {modalRoom && (
        <LiveBookingModal
          room={modalRoom}
          hotelId={hotelId}
          hotelName={hotelName}
          city={city}
          location={location}
          address={address}
          stars={stars}
          rating={rating}
          breakfastPricePerPerson={breakfastPricePerPerson ?? null}
          onClose={() => setModalRoom(null)}
        />
      )}

      <div className="space-y-4">
        {rooms.map((room) => {
          const basePrice         = getRoomBasePrice(room);
          const minPrice          = getRoomMinPrice(room);
          const livePrice         = calcLivePrice(basePrice, minPrice, tier);
          const discountPercent   = calcActualDiscount(basePrice, livePrice);
          const quantityAvailable = room.quantity_available ?? null;
          const soldOut           = quantityAvailable !== null && quantityAvailable <= 0;

          return (
            <div
              key={room.id}
              className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Room image */}
                <div className="relative h-40 sm:h-auto sm:w-44 shrink-0 overflow-hidden">
                  <Image
                    src={getRoomImage(room.room_type, room.image_url)}
                    alt={room.name}
                    fill
                    className="object-cover"
                  />
                  {discountPercent > 0 && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
                      -{discountPercent}%
                    </div>
                  )}
                </div>

                {/* Room info */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {room.room_type && (
                        <span className="text-xs font-semibold uppercase tracking-widest text-brand-blue bg-brand-blue-light px-2.5 py-0.5 rounded-full border border-brand-blue/15">
                          {room.room_type}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                        {t['booking.nonRefundableBadge']}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 text-base mb-1">{room.name}</h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                        </svg>
                        {t['hotel.upToGuests'].replace('{n}', String(room.capacity))}
                      </span>
                      {room.area_sqm && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                          {room.area_sqm} m²
                        </span>
                      )}
                      {room.bed_type && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          {room.bed_type}
                        </span>
                      )}
                      {quantityAvailable !== null && quantityAvailable <= 5 && (
                        <span className={`inline-flex items-center gap-1 font-semibold ${soldOut ? 'text-red-600' : 'text-orange-600'}`}>
                          {soldOut ? (
                            <>
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round">
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                              {t['hotel.soldOutTonight']}
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                              </svg>
                              {t['hotel.leftTonight'].replace('{n}', String(quantityAvailable))}
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    {Array.isArray(room.features) && room.features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {room.features.map((f) => (
                          <span key={f} className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                            <svg className="w-3 h-3 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Price + Book button */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      {discountPercent > 0 && (
                        <p className="text-xs text-red-400 line-through">
                          <CurrencyAmount amount={basePrice} />
                        </p>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-extrabold text-green-600">
                          <CurrencyAmount amount={livePrice} />
                        </span>
                        <span className="text-xs text-gray-400">{t['price.perNight']}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!bookingOpen || soldOut}
                      onClick={() => setModalRoom(room)}
                      className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                        !bookingOpen || soldOut
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'text-white hover:-translate-y-0.5'
                      }`}
                      style={!bookingOpen || soldOut ? {} : { background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
                    >
                      {!bookingOpen ? t['hotel.bookingOpensNoon'] : soldOut ? t['booking.soldOutBtn'] : t['hotel.bookNow']}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
