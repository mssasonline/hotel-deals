'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { saveLoginRedirect } from '@/lib/auth';
import { useAuth } from '@/lib/authContext';
import type { HotelDetail, RoomType } from '../lib/hotelDetailData';
import CurrencyAmount from '@/app/components/CurrencyAmount';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { formatPrice } from '@/lib/currency';
import { calcRoomPrice, isBookingOpen } from '@/lib/pricingEngine';

interface BookingCTAProps {
  hotel: HotelDetail;
  selectedRoom: RoomType | null;
}

function today(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BookingCTA({ hotel, selectedRoom }: BookingCTAProps) {
  const router = useRouter();
  const { user } = useAuth();
  const currency = useAppSettingsStore((s) => s.currency);
  const [bookingOpen, setBookingOpen] = useState(() => isBookingOpen());
  useEffect(() => {
    const id = setInterval(() => setBookingOpen(isBookingOpen()), 60_000);
    return () => clearInterval(id);
  }, []);
  const cheapestRoom = hotel.rooms[0];
  const sourceRoom = selectedRoom ?? cheapestRoom;
  const pricing = sourceRoom ? calcRoomPrice(sourceRoom.basePrice, sourceRoom.pricePerNight) : null;
  const price = pricing?.currentPrice ?? 0;
  const originalPrice = pricing?.basePrice ?? 0;
  const discountPct = pricing?.discountPercent ?? 0;
  const taxes = Math.round(price * 0.15);
  const total = price + taxes;
  const savings = originalPrice - price;
  const roomLabel = selectedRoom ? selectedRoom.name : 'Select a room below';

  function handleBookNow() {
    if (!user) {
      saveLoginRedirect(`/booking/${hotel.id}`);
      router.push('/login');
      return;
    }
    router.push(`/booking/${hotel.id}`);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-brand-blue px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Tonight's Price</p>
            {discountPct > 0 && (
              <div className="text-red-300 text-xs line-through leading-none mb-0.5">
                <CurrencyAmount amount={originalPrice} className="text-red-300" />/night
              </div>
            )}
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-white font-extrabold text-3xl leading-none"><CurrencyAmount amount={price} className="text-white" /></span>
              <span className="text-white/60 text-sm">/night</span>
            </div>
          </div>
          {discountPct > 0 && (
            <div className="bg-red-500 text-white text-sm font-extrabold px-3 py-1.5 rounded-lg">
              -{discountPct}%
            </div>
          )}
        </div>
        <div className="text-green-300 text-xs font-medium mt-1.5">
          You save <CurrencyAmount amount={savings} /> tonight
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Stay details */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Check-in
            </span>
            <span className="font-semibold text-gray-900">{today()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Check-out
            </span>
            <span className="font-semibold text-gray-900">{tomorrow()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Guests
            </span>
            <span className="font-semibold text-gray-900">2 Adults</span>
          </div>
        </div>

        {/* Selected room indicator */}
        <div className={`rounded-xl px-4 py-3 text-sm border ${
          selectedRoom
            ? 'bg-brand-blue-light border-brand-blue/20 text-brand-blue'
            : 'bg-gray-50 border-gray-200 text-gray-400'
        }`}>
          <div className="flex items-center gap-2">
            {selectedRoom ? (
              <svg className="w-4 h-4 shrink-0 text-brand-blue" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
            <span className={`font-medium leading-tight ${selectedRoom ? 'text-brand-blue' : 'text-gray-400'}`}>
              {roomLabel}
            </span>
          </div>
        </div>

        {/* Price breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Room rate (1 night)</span>
            <span><CurrencyAmount amount={price} /></span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Taxes & fees (15%)</span>
            <span>${taxes.toLocaleString()}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span><CurrencyAmount amount={total} /></span>
          </div>
        </div>

        {/* Book Now button */}
        <button
          onClick={handleBookNow}
          disabled={!bookingOpen}
          className="block w-full bg-brand-gold hover:bg-yellow-500 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-base transition-all duration-200 shadow-lg shadow-brand-gold/30 hover:shadow-brand-gold/50 active:scale-[0.98] text-center"
        >
          {bookingOpen ? `Book Now — ${formatPrice(total, currency)}` : 'تفتح الساعة 12:00 PM'}
        </button>

        {/* Reserve now, pay later */}
        <div className="text-center space-y-1.5">
          <p className="text-gray-500 text-xs flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Reserve now — pay at check-in
          </p>
          <p className="text-gray-500 text-xs flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Non-refundable · No credit card fee
          </p>
        </div>

        {/* Policies teaser */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-amber-700 text-xs font-medium flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Non-refundable · Same-day deal — no cancellations
          </p>
        </div>
      </div>
    </div>
  );
}
