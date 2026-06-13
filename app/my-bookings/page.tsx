'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { useAuth } from '@/lib/authContext';
import { saveLoginRedirect } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';
import { fetchMyBookings } from '@/app/user-actions';
import { useTranslation } from '@/lib/i18n/useTranslation';
import CurrencyAmount from '@/app/components/CurrencyAmount';
import { localDateISO } from '@/lib/dateUtils';

// ─────────────────────────────────── Types ───────────────────────────────────

interface Booking {
  id: string;
  hotel_id: number;
  room_id: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  total_price: number;
  locked_price?: number;
  status: string;
  payment_status: string;
  guests_count: number;
  created_at: string;
  hotels?: { name: string; city: string; image_url: string | null };
  rooms?: { name: string; capacity: number };
}


interface UpdatePayload {
  check_in: string;
  check_out: string;
  guests_count: number;
  total_price: number;
}

// ────────────────────────────────── Helpers ──────────────────────────────────

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(
    0,
    Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function toInputDate(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function cancellabilityCheck(booking: Booking): { allowed: boolean; reason?: string } {
  if (booking.status === 'cancelled') return { allowed: false };
  if (booking.status === 'completed') return { allowed: false, reason: 'Stay already completed' };
  // All SelectedRoom bookings are non-refundable same-day deals
  if (booking.payment_status === 'paid') {
    return { allowed: false, reason: 'Non-refundable booking — cancellation blocked after payment' };
  }
  return { allowed: true };
}

function canEdit(booking: Booking): boolean {
  return booking.status !== 'completed' && booking.status !== 'cancelled';
}

// ──────────────────────────── ManageBookingModal ─────────────────────────────

function ManageBookingModal({
  booking,
  onClose,
  onSave,
  onCancel,
}: {
  booking: Booking;
  onClose: () => void;
  onSave: (id: string, payload: UpdatePayload) => Promise<{ error?: string }>;
  onCancel: (id: string) => Promise<void>;
}) {
  const t = useTranslation();
  const today = localDateISO();
  const [checkIn, setCheckIn] = useState(toInputDate(booking.check_in));
  const [checkOut, setCheckOut] = useState(toInputDate(booking.check_out));
  const [guestsCount, setGuestsCount] = useState(Math.max(1, booking.guests_count || 1));
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const ratePrice = booking.locked_price ?? 0;
  const nightCount = nightsBetween(checkIn, checkOut);
  const newTotal = ratePrice > 0 ? nightCount * ratePrice : booking.total_price;
  const maxGuests = booking.rooms?.capacity ?? 10;
  const hotelName = booking.hotels?.name ?? 'Hotel';
  const cancellable = cancellabilityCheck(booking);
  const editable = canEdit(booking);

  async function handleSave() {
    if (checkIn >= checkOut) { setError(t['myBookings.checkoutAfterCheckin']); return; }
    if (checkIn < today) { setError(t['myBookings.checkinNotPast']); return; }
    if (guestsCount < 1) { setError(t['myBookings.atLeastOneGuest']); return; }
    setError('');
    setSaving(true);
    const result = await onSave(booking.id, {
      check_in: checkIn,
      check_out: checkOut,
      guests_count: guestsCount,
      total_price: newTotal,
    });
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    onClose();
  }

  async function handleCancel() {
    if (!window.confirm(`${t['myBookings.cancelThisBooking']} (${hotelName})?`)) return;
    setCancelling(true);
    await onCancel(booking.id);
    setCancelling(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">

        {/* Modal header */}
        <div className="bg-brand-blue px-6 py-5 flex items-start justify-between">
          <div>
            <h2 className="text-white font-extrabold text-xl">{t['myBookings.manageBooking']}</h2>
            <p className="text-white/60 text-sm mt-0.5">{hotelName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/60 hover:text-white transition-colors -mr-1 mt-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

          {/* ── Edit section ── */}
          {editable ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {t['myBookings.checkIn']}
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    min={today}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {t['myBookings.checkOut']}
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn || today}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                  />
                </div>
              </div>

              {/* Guests stepper */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {t['myBookings.duration']}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setGuestsCount((n) => Math.max(1, n - 1))}
                    className="w-9 h-9 rounded-xl border border-gray-200 hover:border-brand-blue/40 flex items-center justify-center text-gray-600 hover:text-brand-blue transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="font-extrabold text-gray-900 text-xl w-8 text-center select-none">
                    {guestsCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGuestsCount((n) => Math.min(maxGuests, n + 1))}
                    className="w-9 h-9 rounded-xl border border-gray-200 hover:border-brand-blue/40 flex items-center justify-center text-gray-600 hover:text-brand-blue transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <span className="text-gray-400 text-sm">
                    {guestsCount === 1 ? t['myBookings.guest'] : t['myBookings.guestsPlural']}
                  </span>
                </div>
              </div>

              {/* Live price preview */}
              {ratePrice > 0 && (
                <div className="bg-brand-blue-light rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-500 text-sm">
                    {nightCount} {nightCount === 1 ? t['myBookings.nightSingular'] : t['myBookings.nightsPlural']} × <CurrencyAmount amount={ratePrice} />
                  </span>
                  <div className="text-right">
                    <p className="font-extrabold text-brand-blue text-lg leading-none">
                      <CurrencyAmount amount={newTotal} />
                    </p>
                    {newTotal !== booking.total_price && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        was <CurrencyAmount amount={booking.total_price} />
                      </p>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-sm font-medium">{error}</p>
              )}

              <button
                onClick={handleSave}
                disabled={saving || nightCount < 1}
                className="w-full bg-brand-blue hover:bg-brand-blue-dark text-white font-bold px-4 py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? t['myBookings.saving'] : t['myBookings.saveChanges']}
              </button>
            </>
          ) : (
            <div className="bg-gray-50 rounded-xl px-4 py-5 text-center">
              <p className="text-gray-500 text-sm font-medium">
                {t['myBookings.cannotModify'].replace('{status}', booking.status)}
              </p>
            </div>
          )}

          {/* Non-refundable notice */}
          <div className="pt-5 border-t border-gray-100">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-amber-700 text-sm font-medium">This booking is non-refundable and cannot be cancelled.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────── BookingCard ───────────────────────────────

function BookingCard({
  booking,
  onManage,
  onCancel,
}: {
  booking: Booking;
  onManage: (booking: Booking) => void;
  onCancel: (id: string) => Promise<void>;
}) {
  const t = useTranslation();
  const [cancelling, setCancelling] = useState(false);
  const nightCount = nightsBetween(booking.check_in, booking.check_out);
  const hotelName = booking.hotels?.name ?? 'Hotel';
  const city = booking.hotels?.city ?? '';
  const roomName = booking.rooms?.name ?? 'Room';
  const imageUrl = booking.hotels?.image_url;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${hotelName} ${city}`
  )}`;

  const isCancelled = booking.status === 'cancelled';
  const isPast = !isCancelled && new Date(booking.check_out) < new Date();
  const isCompleted = booking.status === 'completed' || isPast;
  const isActive = booking.status === 'active' && !isPast;
  const manageable = !isCancelled && !isCompleted;
  const cancellable = cancellabilityCheck(booking);

  let statusLabel = t['myBookings.statusConfirmed'];
  if (isCancelled) statusLabel = t['myBookings.statusCancelled'];
  else if (isCompleted) statusLabel = t['myBookings.statusCompleted'];
  else if (isActive) statusLabel = t['myBookings.statusActive'];

  const statusBg = isCancelled
    ? 'bg-red-50'
    : isCompleted
    ? 'bg-brand-blue-light'
    : isActive
    ? 'bg-emerald-50'
    : 'bg-emerald-50';
  const statusText = isCancelled
    ? 'text-red-600'
    : isCompleted
    ? 'text-brand-blue'
    : 'text-emerald-700';
  const dotColor = isCancelled
    ? 'bg-red-500'
    : isCompleted
    ? 'bg-brand-blue'
    : isActive
    ? 'bg-emerald-500'
    : 'bg-emerald-400';

  async function handleCancel() {
    if (!window.confirm(`${t['myBookings.cancelThisBooking']} (${hotelName})?`)) return;
    setCancelling(true);
    await onCancel(booking.id);
    setCancelling(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="flex flex-col sm:flex-row">
        {/* Hotel image */}
        <div className="sm:w-52 sm:shrink-0 h-48 sm:h-auto relative overflow-hidden bg-brand-blue-light">
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={imageUrl} alt={hotelName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-blue to-brand-blue-dark flex items-center justify-center">
              <svg className="w-12 h-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="flex-1 p-5 flex flex-col gap-4">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-gray-900 text-lg leading-snug">{hotelName}</h3>
              {city && (
                <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-brand-gold shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  {city}
                </p>
              )}
              <span className="inline-block mt-1.5 bg-brand-gold-light text-brand-gold text-xs font-semibold px-2.5 py-0.5 rounded-lg">
                {roomName}
              </span>
            </div>
            <span className={`inline-flex items-center gap-1.5 ${statusBg} ${statusText} text-xs font-semibold px-2.5 py-1 rounded-full shrink-0`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              {statusLabel}
            </span>
          </div>

          {/* Stay details */}
          <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wide mb-0.5">{t['myBookings.checkIn']}</p>
              <p className="text-gray-800 text-xs font-bold">{formatDate(booking.check_in)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wide mb-0.5">{t['myBookings.checkOut']}</p>
              <p className="text-gray-800 text-xs font-bold">{formatDate(booking.check_out)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wide mb-0.5">{t['myBookings.duration']}</p>
              <p className="text-gray-800 text-xs font-bold">
                {nightCount} {nightCount === 1 ? t['myBookings.night'] : t['myBookings.nights']}
              </p>
            </div>
          </div>

          {/* Guests indicator */}
          {booking.guests_count > 0 && (
            <div className="flex items-center gap-1.5 text-gray-500 text-xs -mt-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-semibold text-gray-700">{booking.guests_count}</span>
              <span>{booking.guests_count === 1 ? t['myBookings.guest'] : t['myBookings.guestsPlural']}</span>
            </div>
          )}

          {/* Bottom row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-gray-100">
            <div>
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wide">{t['myBookings.totalPaid']}</p>
              <p className="text-brand-blue font-extrabold text-xl"><CurrencyAmount amount={booking.total_price} /></p>
              <p className="text-gray-400 text-[11px] -mt-0.5">Ref: SR-{booking.id}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 border border-gray-200 hover:border-brand-blue/40 hover:bg-brand-blue-light text-gray-700 hover:text-brand-blue text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-150"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                {t['myBookings.viewOnMaps']}
              </a>

              {manageable && (
                <button
                  onClick={() => onManage(booking)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-brand-blue-light hover:bg-brand-blue/10 text-brand-blue text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-150"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {t['myBookings.manage']}
                </button>
              )}


              {!cancellable.allowed && cancellable.reason && manageable && (
                <div className="w-full">
                  <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-lg">
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {cancellable.reason}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────── EmptyState ────────────────────────────────

function EmptyState() {
  const t = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-brand-blue-light rounded-full flex items-center justify-center mb-5">
        <svg className="w-10 h-10 text-brand-blue/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="font-extrabold text-gray-900 text-xl mb-2">{t['myBookings.noBookings']}</h3>
      <p className="text-gray-500 text-sm mb-7 max-w-xs">
        {t['myBookings.noBookingsDesc']}
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-brand-gold hover:bg-yellow-500 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {t['myBookings.exploreDeals']}
      </Link>
    </div>
  );
}

// ──────────────────────────────── Page ──────────────────────────────────────

export default function MyBookingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const t = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [fetching, setFetching] = useState(true);
  const [managingBooking, setManagingBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      saveLoginRedirect('/my-bookings');
      router.replace('/login');
      return;
    }
    if (user) {
      fetchBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading]);

  useEffect(() => {
    if (!user) return;
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) fetchBookings();
    }
    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return;
      fetchBookings();
    }
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function fetchBookings() {
    setFetching(true);
    try {
      const rows = await fetchMyBookings();
      setBookings(rows);
    } catch (err) {
      console.error('[my-bookings] fetchBookings error:', err);
    } finally {
      setFetching(false);
    }
  }

  async function handleCancelBooking(id: string) {
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;
    const check = cancellabilityCheck(booking);
    if (!check.allowed) return;

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) return;

    await createNotification(
      user!.id,
      'Booking Cancelled',
      `Your booking at ${booking.hotels?.name ?? 'the hotel'} (check-in ${formatDate(booking.check_in)}) has been cancelled.`
    );
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b))
    );
  }

  async function handleUpdateBooking(
    id: string,
    payload: UpdatePayload
  ): Promise<{ error?: string }> {
    const { error } = await supabase
      .from('bookings')
      .update({
        check_in: payload.check_in,
        check_out: payload.check_out,
        guests_count: payload.guests_count,
        total_price: payload.total_price,
      })
      .eq('id', id);

    if (error) {
      if (error.message.includes('ROOM_UNAVAILABLE')) {
        return { error: t['myBookings.noAvailableDates'] };
      }
      return { error: t['myBookings.updateFailed'] };
    }

    const booking = bookings.find((b) => b.id === id);
    await createNotification(
      user!.id,
      'Booking Updated',
      `Your booking at ${booking?.hotels?.name ?? 'the hotel'} has been updated. New check-in: ${formatDate(payload.check_in)}.`
    );

    setBookings((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              check_in: payload.check_in,
              check_out: payload.check_out,
              guests_count: payload.guests_count,
              total_price: payload.total_price,
            }
          : b
      )
    );
    return {};
  }

  if (loading || (!user && fetching)) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <svg className="animate-spin w-8 h-8 text-brand-blue" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="bg-gray-50 min-h-screen">
        {/* Page header */}
        <div className="bg-brand-blue">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 bg-brand-gold rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-white font-extrabold text-2xl sm:text-3xl leading-tight">{t['myBookings.title']}</h1>
                <p className="text-white/55 text-sm mt-0.5">{t['myBookings.subtitle']}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
                <p className="text-white font-extrabold text-xl">{bookings.length}</p>
                <p className="text-white/55 text-xs font-medium mt-0.5">{t['myBookings.totalBookings']}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
                <p className="text-white font-extrabold text-xl">
                  <CurrencyAmount amount={bookings.reduce((sum, b) => sum + b.total_price, 0)} />
                </p>
                <p className="text-white/55 text-xs font-medium mt-0.5">{t['myBookings.totalSpent']}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Booking list */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {fetching ? (
            <div className="flex justify-center py-20">
              <svg className="animate-spin w-8 h-8 text-brand-blue" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : bookings.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onManage={setManagingBooking}
                  onCancel={handleCancelBooking}
                />
              ))}
            </div>
          )}

          {/* Upsell */}
          {!fetching && bookings.length > 0 && (
            <div className="mt-10 bg-brand-blue rounded-2xl px-6 py-6 text-center text-white">
              <p className="text-white/55 text-[11px] font-medium uppercase tracking-widest mb-2">
                {t['myBookings.readyForNextAdventure']}
              </p>
              <p className="font-extrabold text-xl mb-1 leading-tight">
                {t['myBookings.exclusiveDeals']}
              </p>
              <p className="text-white/60 text-sm mb-5">
                {t['myBookings.upTo70Off']}
              </p>
              <Link
                href="/"
                className="inline-block bg-brand-gold hover:bg-yellow-500 text-white font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                {t['myBookings.browseDeals']}
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Manage Booking modal */}
      {managingBooking && (
        <ManageBookingModal
          booking={managingBooking}
          onClose={() => setManagingBooking(null)}
          onSave={handleUpdateBooking}
          onCancel={handleCancelBooking}
        />
      )}
    </>
  );
}
