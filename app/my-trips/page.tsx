'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { saveLoginRedirect } from '@/lib/auth';
import { useAuth } from '@/lib/authContext';
import { fetchMyTrips } from '@/app/user-actions';
import CurrencyAmount from '@/app/components/CurrencyAmount';
import { submitReview } from '@/app/actions/submitReview';
import ManageBookingModal from '@/app/components/ManageBookingModal';
import type { ManageableBooking } from '@/app/components/ManageBookingModal';

type BookingStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';
type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed';
type CancellationPolicy = 'free_cancelation' | 'non_refundable';

interface Booking {
  id: string;
  hotelId: string;
  hotelName: string;
  location: string;
  city: string;
  imageUrl: string;
  checkIn: string;
  checkOut: string;
  checkInRaw: string;
  checkOutRaw: string;
  nights: number;
  guests: number;
  roomType: string;
  price: number;
  status: BookingStatus;
  bookingRef: string;
  cancellationPolicy: CancellationPolicy;
  paymentStatus: PaymentStatus;
}

interface SupabaseBooking {
  id: number;
  hotel_id: number;
  check_in: string;
  check_out: string;
  total_price: number;
  status: string | null;
  payment_status: string | null;
  guests_count?: number | null;
  hotels: { name: string; city: string; image_url: string | null } | null;
  rooms: { name: string } | null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function deriveStatus(row: SupabaseBooking): BookingStatus {
  if (row.status === 'cancelled') return 'cancelled';
  if (!row.check_in || !row.check_out) return 'upcoming';

  const today = getTodayStr();
  const checkInStr = row.check_in.slice(0, 10);
  const checkOutStr = row.check_out.slice(0, 10);

  if (today < checkInStr) return 'upcoming';
  if (today >= checkInStr && today <= checkOutStr) return 'active';
  return 'completed';
}

function mapBooking(b: SupabaseBooking): Booking {
  const checkInRaw = b.check_in.slice(0, 10);
  const checkOutRaw = b.check_out.slice(0, 10);
  const nightCount = Math.max(
    1,
    Math.ceil((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000)
  );

  // All SelectedRoom bookings are non-refundable same-day deals
  const cancellationPolicy: CancellationPolicy = 'non_refundable';

  const rawPayment = b.payment_status ?? 'unpaid';
  const paymentStatus: PaymentStatus = ['unpaid', 'pending', 'paid', 'failed'].includes(rawPayment)
    ? (rawPayment as PaymentStatus)
    : 'unpaid';

  return {
    id: String(b.id),
    hotelId: String(b.hotel_id),
    hotelName: b.hotels?.name ?? 'Hotel',
    location: b.hotels?.city ?? '',
    city: b.hotels?.city ?? '',
    imageUrl: b.hotels?.image_url ?? '',
    checkIn: formatDate(b.check_in),
    checkOut: formatDate(b.check_out),
    checkInRaw,
    checkOutRaw,
    nights: nightCount,
    guests: b.guests_count ?? 1,
    roomType: b.rooms?.name ?? 'Room',
    price: b.total_price,
    status: deriveStatus(b),
    bookingRef: `SR-${b.id}`,
    cancellationPolicy,
    paymentStatus,
  };
}

const TAB_LABELS: { key: string; label: string; status: BookingStatus }[] = [
  { key: 'upcoming', label: 'Upcoming', status: 'upcoming' },
  { key: 'active', label: 'Active', status: 'active' },
  { key: 'past', label: 'Past Trips', status: 'completed' },
];

const STATUS_CONFIG: Record<BookingStatus, { label: string; bg: string; text: string; dot: string }> = {
  upcoming: {
    label: 'Upcoming',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  active: {
    label: 'Active',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-brand-blue-light',
    text: 'text-brand-blue',
    dot: 'bg-brand-blue',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-red-50',
    text: 'text-red-600',
    dot: 'bg-red-400',
  },
};

const PAYMENT_CONFIG: Record<PaymentStatus, { label: string; bg: string; text: string }> = {
  unpaid: { label: 'Unpaid', bg: 'bg-gray-100', text: 'text-gray-500' },
  pending: { label: 'Payment Pending', bg: 'bg-amber-50', text: 'text-amber-700' },
  paid: { label: 'Paid', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  failed: { label: 'Payment Failed', bg: 'bg-red-50', text: 'text-red-600' },
};

const POLICY_CONFIG: Record<CancellationPolicy, { label: string; bg: string; text: string }> = {
  free_cancelation: { label: 'Free Cancellation', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  non_refundable: { label: 'Non-Refundable', bg: 'bg-red-50', text: 'text-red-600' },
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 ${cfg.bg} ${cfg.text} text-xs font-semibold px-2.5 py-1 rounded-full`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const cfg = PAYMENT_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 ${cfg.bg} ${cfg.text} text-xs font-semibold px-2.5 py-1 rounded-full`}>
      {cfg.label}
    </span>
  );
}

function PolicyBadge({ policy }: { policy: CancellationPolicy }) {
  const cfg = POLICY_CONFIG[policy];
  return (
    <span className={`inline-flex items-center gap-1 ${cfg.bg} ${cfg.text} text-xs font-medium px-2 py-0.5 rounded-lg`}>
      {cfg.label}
    </span>
  );
}

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
          aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
        >
          <svg
            className={`w-9 h-9 fill-current transition-colors ${active >= i ? 'text-brand-gold' : 'text-gray-200'}`}
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

interface ReviewModalProps {
  booking: Booking;
  onClose: () => void;
  onSubmitted: (bookingId: string) => void;
}

function ReviewModal({ booking, onClose, onSubmitted }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (rating === 0) {
      setErrorMsg('Please select a star rating.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');

    const result = await submitReview(
      Number(booking.id),
      Number(booking.hotelId),
      rating,
      comment.trim() || null,
    );

    setSubmitting(false);
    if (!result.success) {
      setErrorMsg(result.error ?? 'Failed to submit review. Please try again.');
      return;
    }

    setSuccess(true);
    setTimeout(() => onSubmitted(booking.id), 1500);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting && !success) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5" style={{ background: 'linear-gradient(135deg, #0F2260 0%, #1E3A8A 55%, #2563EB 100%)' }}>
          <div>
            <h2 className="font-bold text-lg" style={{ color: '#ffffff' }}>Leave a Review</h2>
            <p className="text-sm mt-0.5 text-white">
              {booking.hotelName} · {booking.bookingRef}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting || success}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-40 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-bold text-gray-900 text-lg">Review Submitted!</p>
              <p className="text-gray-500 text-sm">
                Thank you for sharing your experience at {booking.hotelName}.
              </p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Your Rating
                </p>
                <StarSelector
                  value={rating}
                  onChange={(v) => {
                    setRating(v);
                    setErrorMsg('');
                  }}
                />
                {rating > 0 && (
                  <p className="text-sm text-gray-500 mt-2 font-medium">{RATING_LABELS[rating]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Comment{' '}
                  <span className="text-gray-400 font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience at this hotel..."
                  rows={4}
                  maxLength={1000}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
                <p className="text-gray-400 text-xs mt-1 text-right">{comment.length}/1000</p>
              </div>

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-red-700 text-sm font-medium">{errorMsg}</p>
                </div>
              )}
            </>
          )}
        </div>

        {!success && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="text-gray-500 hover:text-gray-700 disabled:opacity-40 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              className="inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 12px rgba(30,58,138,0.3)' }}
            >
              {submitting && <Spinner />}
              Submit Review
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


function BookingCard({
  booking,
  hasReview,
  onLeaveReview,
}: {
  booking: Booking;
  hasReview?: boolean;
  onLeaveReview?: () => void;
}) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${booking.hotelName} ${booking.city}`
  )}`;
  const canReview = booking.status === 'completed';

  return (
    <div className="bg-white rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }} onMouseEnter={e => (e.currentTarget.style.boxShadow='0 8px 28px rgba(15,34,96,0.13)')} onMouseLeave={e => (e.currentTarget.style.boxShadow='0 2px 12px rgba(15,34,96,0.06)')}>
      <div className="flex flex-col sm:flex-row">
        {/* Hotel image */}
        <div className="sm:w-52 sm:shrink-0 h-48 sm:h-auto relative overflow-hidden bg-brand-blue-light">
          {booking.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={booking.imageUrl}
              alt={booking.hotelName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-blue to-brand-blue-dark flex items-center justify-center">
              <svg className="w-12 h-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent sm:bg-gradient-to-r" />
        </div>

        {/* Card body */}
        <div className="flex-1 p-5 flex flex-col gap-4">
          {/* Top row: hotel name + badges */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-gray-900 text-lg leading-snug truncate">
                {booking.hotelName}
              </h3>
              <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-brand-gold shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {booking.location || booking.city}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="inline-block bg-brand-gold-light text-brand-gold text-xs font-semibold px-2.5 py-0.5 rounded-lg">
                  {booking.roomType}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <StatusBadge status={booking.status} />
              <PaymentBadge status={booking.paymentStatus} />
            </div>
          </div>

          {/* Stay details */}
          <div className="grid grid-cols-3 gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(30,58,138,0.04)', border: '1px solid rgba(30,58,138,0.06)' }}>
            <div>
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wide mb-0.5">Check-in</p>
              <p className="text-gray-800 text-xs font-bold">{booking.checkIn}</p>
            </div>
            <div>
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wide mb-0.5">Check-out</p>
              <p className="text-gray-800 text-xs font-bold">{booking.checkOut}</p>
            </div>
            <div>
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wide mb-0.5">Duration</p>
              <p className="text-gray-800 text-xs font-bold">{booking.nights} {booking.nights === 1 ? 'Night' : 'Nights'}</p>
            </div>
          </div>

          {/* Policy row */}
          <div className="flex items-center gap-2">
            <PolicyBadge policy={booking.cancellationPolicy} />
          </div>

          {/* Bottom row: price + actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-gray-100">
            <div>
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wide">Price</p>
              <p className="text-brand-blue font-extrabold text-xl"><CurrencyAmount amount={booking.price} /></p>
              <p className="text-gray-400 text-[11px] -mt-0.5">Ref: {booking.bookingRef}</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <Link
                href={`/booking/success/${booking.id}`}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.28)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View Details
              </Link>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 border border-gray-200 hover:border-brand-blue/40 hover:bg-brand-blue-light text-gray-700 hover:text-brand-blue text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-150"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Maps
              </a>
              {canReview && (
                hasReview ? (
                  <span className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-emerald-600 bg-emerald-50 text-sm font-semibold px-4 py-2.5 rounded-xl">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Review Submitted
                  </span>
                ) : onLeaveReview ? (
                  <button
                    type="button"
                    onClick={onLeaveReview}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 border border-brand-gold/40 bg-brand-gold-light hover:bg-brand-gold/10 text-brand-gold text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-150"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    Leave Review
                  </button>
                ) : null
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: BookingStatus }) {
  const messages: Record<BookingStatus, { title: string; sub: string }> = {
    upcoming: { title: 'No upcoming trips', sub: 'Book a stay and it will appear here.' },
    active: { title: 'No active stays', sub: 'Trips in progress will appear here.' },
    completed: { title: 'No past trips', sub: 'Your completed stays will appear here.' },
    cancelled: { title: 'No cancelled trips', sub: "You haven't cancelled any bookings." },
  };
  const { title, sub } = messages[tab];
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-brand-blue-light rounded-full flex items-center justify-center mb-5">
        <svg className="w-10 h-10 text-brand-blue/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <h3 className="font-extrabold text-gray-900 text-xl mb-2">{title}</h3>
      <p className="text-gray-500 text-sm mb-7 max-w-xs">{sub}</p>
      <Link
        href="/search?city=Dubai"
        className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5"
        style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Explore Last Minute Deals
      </Link>
    </div>
  );
}

function SuccessBanner() {
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  if (!searchParams.get('booked') || dismissed) return null;

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="font-bold text-emerald-800">Booking confirmed!</p>
        <p className="text-emerald-700 text-sm mt-0.5">Your trip has been booked successfully and will appear below.</p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-emerald-500 hover:text-emerald-700 transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function MyTripsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<BookingStatus>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [fetching, setFetching] = useState(true);
  const [managingBooking, setManagingBooking] = useState<Booking | null>(null);
  const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) {
      saveLoginRedirect('/my-trips');
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    async function doFetch() {
      setFetching(true);
      try {
        const { bookings: raw, reviewedBookingIds: ids } = await fetchMyTrips();
        setBookings(raw.map(b => mapBooking(b as unknown as SupabaseBooking)));
        setReviewedBookingIds(new Set(ids));
      } catch (err) {
        console.error('[MyTrips] fetch error:', err);
      } finally {
        setFetching(false);
      }
    }

    doFetch();

    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) doFetch();
    }
    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return;
      doFetch();
    }
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function handleBookingUpdated(updated: Partial<Booking>) {
    if (!managingBooking) return;
    const updatedBooking = { ...managingBooking, ...updated };
    setBookings((prev) =>
      prev.map((b) => (b.id === managingBooking.id ? updatedBooking : b))
    );
    if (updated.status === 'cancelled') {
      setManagingBooking(null);
    } else {
      setManagingBooking(updatedBooking);
    }
  }

  function handleReviewSubmitted(bookingId: string) {
    setReviewedBookingIds((prev) => new Set([...prev, bookingId]));
    setReviewingBooking(null);
  }

  if (loading || !user) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFC' }}>
          <Spinner className="w-8 h-8 text-brand-blue" />
        </main>
        <Footer />
      </>
    );
  }

  const filtered = bookings.filter((b) => b.status === activeTab);

  const countByStatus = (status: BookingStatus) =>
    bookings.filter((b) => b.status === status).length;

  return (
    <>
      <Header />

      <main className="min-h-screen" style={{ background: '#F8FAFC' }}>
        {/* Page header */}
        <div style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)', boxShadow: '0 4px 12px rgba(180,83,9,0.4)' }}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #D97706 0%, #B45309 100%)' }} />
                  <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>My Trips</h1>
                </div>
                <p className="text-white/45 text-xs pl-3">Manage your bookings and travel history</p>
              </div>
            </div>

            {/* Stats row — clicking switches the active tab */}
            <div className="grid grid-cols-3 gap-3">
              {TAB_LABELS.map(({ key, label, status }) => {
                const isActive = activeTab === status;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(status)}
                    className="rounded-xl px-4 py-3 text-center transition-all duration-200 focus:outline-none"
                    style={
                      isActive
                        ? { background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.55)', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }
                        : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }
                    }
                  >
                    <p className="text-white font-extrabold text-2xl">{countByStatus(status)}</p>
                    <p className={`text-xs font-semibold mt-0.5 ${isActive ? 'text-white' : 'text-white/55'}`}>{label}</p>
                    {isActive && (
                      <div className="mt-2 mx-auto w-5 h-0.5 rounded-full bg-brand-gold" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Booking list */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Suspense fallback={null}>
            <SuccessBanner />
          </Suspense>
          {fetching ? (
            <div className="flex justify-center py-20">
              <Spinner className="w-8 h-8 text-brand-blue" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            <div className="space-y-4">
              {filtered.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  hasReview={reviewedBookingIds.has(booking.id)}
                  onLeaveReview={
                    booking.status === 'completed' && booking.paymentStatus === 'paid'
                      ? () => setReviewingBooking(booking)
                      : undefined
                  }
                />
              ))}
            </div>
          )}

          {/* Upsell banner */}
          {!fetching && activeTab !== 'upcoming' && activeTab !== 'active' && (
            <div className="mt-10 rounded-2xl px-6 py-6 text-center text-white" style={{ background: 'linear-gradient(135deg, #0F2260 0%, #1E3A8A 55%, #2563EB 100%)' }}>
              <p className="text-white/55 text-[11px] font-medium uppercase tracking-widest mb-2">
                Ready for your next adventure?
              </p>
              <p className="font-extrabold text-xl mb-1 leading-tight">
                Exclusive last-minute hotel deals
              </p>
              <p className="text-white/60 text-sm mb-5">
                Up to 50% off premium hotels — available tonight only
              </p>
              <Link
                href="/search?city=Dubai"
                className="inline-block text-white font-bold px-6 py-2.5 rounded-xl transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)', boxShadow: '0 4px 12px rgba(180,83,9,0.35)' }}
              >
                Browse Last Minute Deals
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {managingBooking && (
        <ManageBookingModal
          booking={{
            id: managingBooking.id,
            hotelName: managingBooking.hotelName,
            bookingRef: managingBooking.bookingRef,
            checkInRaw: managingBooking.checkInRaw,
            checkOutRaw: managingBooking.checkOutRaw,
            guests: managingBooking.guests,
            status: managingBooking.status,
            paymentStatus: managingBooking.paymentStatus,
            cancellationPolicy: managingBooking.cancellationPolicy,
          } satisfies ManageableBooking}
          onClose={() => setManagingBooking(null)}
          onUpdated={(updated) => handleBookingUpdated(updated as Partial<Booking>)}
        />
      )}

      {reviewingBooking && (
        <ReviewModal
          booking={reviewingBooking}
          onClose={() => setReviewingBooking(null)}
          onSubmitted={handleReviewSubmitted}
        />
      )}
    </>
  );
}
