'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/authContext';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { formatPrice } from '@/lib/currency';
import CurrencyAmount from '@/app/components/CurrencyAmount';
import { localDateISO } from '@/lib/dateUtils';
import { getCurrentTier, calcLivePrice } from '@/lib/pricingEngine';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface Room {
  id: string;
  name: string;
  base_price: number;
  min_price: number | null;
}

interface Props {
  room: Room;
  hotelId: number;
  onClose: () => void;
}

export default function BookingModal({ room, hotelId, onClose }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const currency = useAppSettingsStore((s) => s.currency);
  const t = useTranslation();
  const [guestName, setGuestName] = useState(
    (user?.user_metadata?.full_name as string | undefined) ?? ''
  );
  const [guestEmail, setGuestEmail] = useState(user?.email ?? '');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState<number | null>(null);
  const [checkingAvail, setCheckingAvail] = useState(false);

  const pricePerNight = calcLivePrice(Number(room.base_price), Number(room.min_price ?? 0), getCurrentTier());

  const nights =
    checkIn && checkOut
      ? Math.max(
          0,
          Math.ceil(
            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
          )
        )
      : 0;

  const totalPrice = nights * pricePerNight;

  const today = localDateISO();

  useEffect(() => {
    if (nights <= 0) { setAvailability(null); return; }
    let cancelled = false;
    setCheckingAvail(true);
    fetch(`/api/availability?room_id=${room.id}&check_in=${checkIn}&check_out=${checkOut}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setAvailability(typeof data.available === 'number' ? data.available : null);
          setCheckingAvail(false);
        }
      })
      .catch(() => { if (!cancelled) { setAvailability(null); setCheckingAvail(false); } });
    return () => { cancelled = true; };
  }, [checkIn, checkOut, nights, room.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nights <= 0) {
      setError(t['hotel.errorCheckoutAfterCheckin']);
      return;
    }
    if (availability !== null && availability <= 0) {
      setError(t['hotel.errorRoomSoldOut']);
      return;
    }
    setLoading(true);
    setError('');

    const { data: newBooking, error: insertError } = await supabase
      .from('bookings')
      .insert({
        hotel_id: hotelId,
        room_id: room.id,
        user_id: user?.id ?? null,
        guest_name: guestName,
        guest_email: guestEmail,
        check_in: checkIn,
        check_out: checkOut,
        total_price: totalPrice,
        locked_price: pricePerNight,
        room_count: 1,
        status: 'upcoming',
        payment_status: 'unpaid',
      })
      .select('id')
      .single();

    setLoading(false);
    if (insertError || !newBooking) {
      const msg = insertError?.message ?? '';
      setError(
        msg.includes('ROOM_UNAVAILABLE')
          ? t['hotel.errorJustBooked']
          : t['hotel.errorBookingFailed']
      );
      return;
    }
    router.push('/my-trips?booked=1');
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Gradient header */}
        <div className="relative px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0F2260 0%, #1E3A8A 55%, #2563EB 100%)' }}>
          <div>
            <h2 className="font-bold text-white text-lg">{t['hotel.bookRoom']}</h2>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{room.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Room summary */}
        <div className="px-6 pt-5">
          <div className="bg-brand-blue/5 border border-brand-blue/15 rounded-xl px-4 py-3 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-gray-900">{room.name}</span>
              <span className="font-extrabold text-brand-blue">
                <CurrencyAmount amount={pricePerNight} />{t['price.perNight']}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-amber-600 text-xs font-medium">
              <span>{t['hotel.nonRefundableBooking']}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t['hotel.fullName']}</label>
            <input
              type="text"
              required
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="John Smith"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t['hotel.email']}</label>
            <input
              type="email"
              required
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t['booking.checkIn']}</label>
              <input
                type="date"
                required
                min={today}
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t['booking.checkOut']}</label>
              <input
                type="date"
                required
                min={checkIn || today}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>
          </div>

          {nights > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
              <div className="flex justify-between items-center text-gray-600">
                <span>
                  <CurrencyAmount amount={pricePerNight} /> × {nights} night{nights !== 1 ? 's' : ''}
                </span>
                <span className="font-bold text-gray-900"><CurrencyAmount amount={totalPrice} /></span>
              </div>
              <div className="flex justify-between items-center font-bold text-gray-900 border-t border-gray-200 pt-2">
                <span>{t['price.total']}</span>
                <span><CurrencyAmount amount={totalPrice} /></span>
              </div>
            </div>
          )}

          {/* Availability indicator */}
          {nights > 0 && (
            <div className={`rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 ${
              checkingAvail
                ? 'bg-gray-50 text-gray-400'
                : availability === 0
                ? 'bg-red-50 text-red-600 border border-red-200'
                : availability !== null && availability <= 3
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {checkingAvail ? (
                <>
                  <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t['hotel.checkingAvailability']}
                </>
              ) : availability === null ? null : availability === 0 ? (
                t['hotel.soldOutDates']
              ) : availability === 1 ? (
                t['hotel.lastRoomTonight']
              ) : (
                t['hotel.roomsRemaining'].replace('{n}', String(availability))
              )}
            </div>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || nights <= 0 || availability === 0}
            className="w-full disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
          >
            {loading
              ? t['hotel.bookingInProgress']
              : totalPrice > 0
              ? t['hotel.confirmBookingAmount'].replace('{amount}', formatPrice(totalPrice, currency))
              : t['hotel.selectDatesToContinue']}
          </button>
        </form>
      </div>
    </div>
  );
}
