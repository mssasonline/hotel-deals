'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { HotelDetail, RoomType } from '../lib/hotelDetailData';
import PriceCard from './PriceCard';
import RoomCard from './RoomCard';
import BookingCTA from './BookingCTA';
import { useBookingStore } from '@/store/bookingStore';
import { calcRoomPrice, isBookingOpen } from '@/lib/pricingEngine';
import AmenityIcon from '@/app/components/AmenityIcon';

function deriveCity(location: string): string {
  const parts = location.split(',');
  return parts[parts.length - 1].trim() || 'Dubai';
}

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
    return <span className="font-bold text-red-600">Deal Expired</span>;
  }

  return (
    <span className={`font-mono font-extrabold text-2xl tabular-nums ${urgent ? 'text-red-600 animate-pulse' : 'text-orange-500'}`}>
      {String(h).padStart(2, '0')}
      <span className="mx-0.5 opacity-60">h</span>
      {String(m).padStart(2, '0')}
      <span className="mx-0.5 opacity-60">m</span>
      {String(s).padStart(2, '0')}
      <span className="mx-0.5 opacity-60">s</span>
    </span>
  );
}

export default function HotelBookingSection({ hotel }: { hotel: HotelDetail }) {
  const { setSelectedHotel, setRoom, selectedRoom: storeRoom } = useBookingStore();
  const [bookingOpen, setBookingOpen] = useState(() => isBookingOpen());
  useEffect(() => {
    const id = setInterval(() => setBookingOpen(isBookingOpen()), 60_000);
    return () => clearInterval(id);
  }, []);

  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(() => {
    if (storeRoom && hotel.rooms.some((r) => r.id === storeRoom.id)) {
      return hotel.rooms.find((r) => r.id === storeRoom.id) ?? null;
    }
    return null;
  });

  useEffect(() => {
    setSelectedHotel({
      id: hotel.id,
      name: hotel.name,
      location: hotel.location,
      address: hotel.address,
      city: deriveCity(hotel.location),
      stars: hotel.stars,
      rating: hotel.rating,
    });
  }, [hotel.id]);

  function handleRoomSelect(room: RoomType) {
    const next = selectedRoom?.id === room.id ? null : room;
    setSelectedRoom(next);
    setRoom(next);
  }

  return (
    <>
      <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-8 lg:items-start">
        {/* ── Left column ──────────────────────────────────── */}
        <div>
          {/* Price Card */}
          <PriceCard hotel={hotel} />

          {/* Urgency Section */}
          <div className={`rounded-2xl border p-5 mb-6 ${hotel.urgency.urgencyBg} ${hotel.urgency.urgencyBorder}`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${hotel.urgency.badgeBg}`}>
                <svg className={`w-4 h-4 ${hotel.urgency.urgencyText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Deal expires in</p>
                <CountdownTimer hours={hotel.countdownHours} minutes={hotel.countdownMinutes} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white/70 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${hotel.urgency.badgeBg}`}>
                  <svg className={`w-4 h-4 ${hotel.urgency.urgencyText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className={`font-bold text-sm leading-none ${hotel.urgency.urgencyText}`}>Only {hotel.roomsLeft} left!</p>
                  <p className="text-gray-500 text-xs mt-0.5">Rooms at this price</p>
                </div>
              </div>

              <div className="bg-white/70 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${hotel.urgency.badgeBg}`}>
                  <svg className={`w-4 h-4 ${hotel.urgency.urgencyText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className={`font-bold text-sm leading-none ${hotel.urgency.urgencyText}`}>{hotel.urgency.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {hotel.urgency.status === 'CRITICAL' && 'Extreme demand right now'}
                    {hotel.urgency.status === 'HIGH_DEMAND' && 'Many people viewing now'}
                    {hotel.urgency.status === 'MEDIUM_DEMAND' && 'Steady interest from travellers'}
                    {hotel.urgency.status === 'LOW_DEMAND' && 'Good time to book'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-brand-gold rounded-full" />
              Hotel Amenities
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {hotel.amenities.map((amenity) => (
                <div
                  key={amenity.label}
                  className="flex items-center gap-2.5 bg-gray-50 hover:bg-blue-50 rounded-xl px-3 py-2.5 transition-colors duration-150"
                >
                  <AmenityIcon label={amenity.label} className="w-5 h-5 text-brand-blue shrink-0" />
                  <span className="text-gray-700 text-sm font-medium leading-tight">{amenity.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Room Selection */}
          <div className="mb-8">
            <h2 className="font-bold text-gray-900 text-xl mb-1 flex items-center gap-2">
              <span className="w-1 h-6 bg-brand-blue rounded-full" />
              Choose Your Room
            </h2>
            <p className="text-gray-500 text-sm mb-5 ml-3">
              All rooms at tonight's exclusive last-minute rate
            </p>

            <div className="space-y-4">
              {hotel.rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  isSelected={selectedRoom?.id === room.id}
                  onSelect={() => handleRoomSelect(room)}
                />
              ))}
            </div>
          </div>

          {/* Hotel Policies */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-brand-gold rounded-full" />
              Hotel Policies
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-brand-blue-light rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Check-in</p>
                  <p className="text-gray-500 text-sm">{hotel.policies.checkIn}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-brand-blue-light rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Check-out</p>
                  <p className="text-gray-500 text-sm">{hotel.policies.checkOut}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Cancellation</p>
                  <p className="text-gray-500 text-sm">Non-refundable — same-day deal</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column — sticky desktop booking card ── */}
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <BookingCTA hotel={hotel} selectedRoom={selectedRoom} />
          </div>
        </div>
      </div>

      {/* ── Mobile sticky bottom bar ─────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            {(() => {
              const src = selectedRoom ?? hotel.rooms[0];
              const p = src ? calcRoomPrice(src.basePrice, src.pricePerNight) : null;
              return (
                <>
                  {p && p.basePrice > p.currentPrice && (
                    <div className="text-gray-400 text-xs line-through leading-none">
                      AED {p.basePrice.toLocaleString()}/night
                    </div>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-brand-blue font-extrabold text-2xl leading-none">
                      AED {(p?.currentPrice ?? 0).toLocaleString()}
                    </span>
                  </div>
                </>
              );
            })()}
            <div className="text-green-600 text-xs font-medium truncate">
              {selectedRoom ? selectedRoom.name : 'Select a room'}
            </div>
          </div>
          {bookingOpen ? (
            <Link
              href={`/booking/${hotel.id}`}
              className="shrink-0 text-white font-bold px-7 py-3 rounded-xl text-sm transition-all active:scale-[0.97] hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
            >
              Book Now
            </Link>
          ) : (
            <button
              disabled
              className="shrink-0 bg-gray-200 text-gray-400 cursor-not-allowed font-bold px-7 py-3 rounded-xl text-sm"
            >
              تفتح الساعة 12 PM
            </button>
          )}
        </div>
      </div>

      {/* Mobile spacer so content isn't hidden behind the sticky bar */}
      <div className="h-20 lg:hidden" />
    </>
  );
}
