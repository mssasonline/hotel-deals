'use client';

import { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import AEDAmount, { useAEDFormat } from '../../partner/components/AEDAmount';
import { useAdminDateFormat } from '../components/useAdminFormat';
import TaxFeeBreakdown from '@/app/components/TaxFeeBreakdown';

export type BookingStatus = 'upcoming' | 'confirmed' | 'pending' | 'completed' | 'cancelled';
type PaymentFilter = 'all' | 'paid' | 'pending' | 'failed';

export interface AdminBooking {
  id: string;
  guestName: string;
  guestEmail: string;
  hotelName: string;
  roomName: string;
  city: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  bookingDate: string;
  status: BookingStatus;
  paymentStatus: string;
  amount: number;
  partnerAmount: number;
  adminAmount: number;
  subtotal: number | null;
  roomCount: number | null;
  guestsCount: number | null;
  breakfastIncluded: boolean | null;
  breakfastPricePerPerson: number | null;
}

const BOOKING_STATUS_FILTERS: Array<{ label: string; value: BookingStatus | 'all' }> = [
  { label: 'All',       value: 'all'       },
  { label: 'Upcoming',  value: 'upcoming'  },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PAYMENT_STATUS_FILTERS: Array<{ label: string; value: PaymentFilter }> = [
  { label: 'Any Payment', value: 'all'     },
  { label: 'Paid',        value: 'paid'    },
  { label: 'Pending',     value: 'pending' },
  { label: 'Failed',      value: 'failed'  },
];

function shortId(id: string): string {
  return `SR-${String(id).padStart(4, '0')}`;
}

function PaymentStatusBadge({ status }: { status: string }) {
  const cfg =
    status === 'paid'    ? 'bg-emerald-50 text-emerald-700' :
    status === 'failed'  ? 'bg-red-50 text-red-600'         :
                           'bg-amber-50 text-amber-700';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${cfg}`}>
      {status}
    </span>
  );
}

function BookingDetailModal({ booking, onClose, fmt, fmtDate }: {
  booking: AdminBooking;
  onClose: () => void;
  fmt: (n: number) => string;
  fmtDate: (iso: string | null) => string;
}) {
  const roomSubtotal = booking.subtotal != null && booking.subtotal > 0
    ? booking.subtotal
    : Math.max(0, Math.round((booking.amount - 15 * booking.nights) / 1.22));
  const breakfastTotal = (booking.breakfastIncluded && (booking.breakfastPricePerPerson ?? 0) > 0)
    ? Math.round((booking.breakfastPricePerPerson ?? 0) * (booking.guestsCount ?? 1) * booking.nights)
    : 0;
  const roomCount = booking.roomCount ?? 1;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Booking Details</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{shortId(booking.id)}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={booking.status} variant="booking" />
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Guest Name',  value: booking.guestName },
              { label: 'Email',       value: booking.guestEmail },
              { label: 'Hotel',       value: booking.hotelName },
              { label: 'Room',        value: booking.roomName },
              { label: 'City',        value: booking.city },
              { label: 'Nights',      value: `${booking.nights} nights` },
              { label: 'Check-In',    value: fmtDate(booking.checkIn) },
              { label: 'Check-Out',   value: fmtDate(booking.checkOut) },
              { label: 'Booked On',   value: fmtDate(booking.bookingDate) },
              { label: 'Amount',      value: booking.amount > 0 ? fmt(booking.amount) : 'Cancelled' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Payment info */}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</p>
            </div>
            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <PaymentStatusBadge status={booking.paymentStatus} />
            </div>
            {booking.amount > 0 && (
              <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                <div className="bg-emerald-50 rounded-lg p-2.5">
                  <p className="text-xs text-emerald-600 mb-0.5">Partner Payout (90%)</p>
                  <p className="text-sm font-bold text-emerald-700">{fmt(booking.partnerAmount)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2.5">
                  <p className="text-xs text-blue-600 mb-0.5">Platform Revenue (10%)</p>
                  <p className="text-sm font-bold text-blue-700">{fmt(booking.adminAmount)}</p>
                </div>
              </div>
            )}
          </div>

          {booking.amount > 0 && (
            <TaxFeeBreakdown
            roomSubtotal={roomSubtotal}
            breakfastSubtotal={breakfastTotal}
            nights={booking.nights}
            rooms={roomCount}
            grandTotal={booking.amount}
          />
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookingsClient({ initialBookings }: { initialBookings: AdminBooking[] }) {
  const [bookingFilter, setBookingFilter] = useState<BookingStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState<AdminBooking | null>(null);
  const fmt = useAEDFormat();
  const { fmtDate } = useAdminDateFormat();

  const filtered = initialBookings.filter((b) => {
    const matchBooking  = bookingFilter  === 'all' || b.status === bookingFilter;
    const matchPayment  = paymentFilter  === 'all' || b.paymentStatus === paymentFilter;
    const q = search.toLowerCase();
    const matchSearch   = !q ||
      b.id.toLowerCase().includes(q) ||
      b.guestName.toLowerCase().includes(q) ||
      b.guestEmail.toLowerCase().includes(q) ||
      b.hotelName.toLowerCase().includes(q);
    return matchBooking && matchPayment && matchSearch;
  });

  const paidBookings   = initialBookings.filter(b => b.paymentStatus === 'paid');
  const totalGross     = paidBookings.reduce((s, b) => s + b.amount,        0);
  const totalPartner   = paidBookings.reduce((s, b) => s + b.partnerAmount, 0);
  const totalPlatform  = paidBookings.reduce((s, b) => s + b.adminAmount,   0);
  const pendingCount   = initialBookings.filter(b => b.paymentStatus === 'pending').length;

  const bookingCounts = {
    all:       initialBookings.length,
    upcoming:  initialBookings.filter(b => b.status === 'upcoming').length,
    confirmed: initialBookings.filter(b => b.status === 'confirmed').length,
    completed: initialBookings.filter(b => b.status === 'completed').length,
    cancelled: initialBookings.filter(b => b.status === 'cancelled').length,
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      {selected && (
        <BookingDetailModal
          booking={selected}
          onClose={() => setSelected(null)}
          fmt={fmt}
          fmtDate={fmtDate}
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-400 text-sm mt-0.5">{initialBookings.length} total bookings</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">Gross Collected</p>
          <p className="text-2xl font-bold text-gray-900"><AEDAmount amount={totalGross} /></p>
          <p className="text-xs text-gray-400 mt-1">from {paidBookings.length} paid bookings</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm p-5">
          <p className="text-xs text-emerald-600 mb-1">Partner Payouts (90%)</p>
          <p className="text-2xl font-bold text-emerald-700"><AEDAmount amount={totalPartner} /></p>
        </div>
        <div className="bg-blue-50 rounded-2xl border border-blue-100 shadow-sm p-5">
          <p className="text-xs text-blue-600 mb-1">Platform Revenue (10%)</p>
          <p className="text-2xl font-bold text-blue-700"><AEDAmount amount={totalPlatform} /></p>
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-100 shadow-sm p-5">
          <p className="text-xs text-amber-600 mb-1">Pending Payments</p>
          <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
          <p className="text-xs text-amber-500 mt-1">awaiting confirmation</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative w-56">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by ID, guest, hotel…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue placeholder-gray-400 transition"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Booking status filter */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
          {BOOKING_STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setBookingFilter(value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                bookingFilter === value ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
              style={bookingFilter === value ? { background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' } : {}}
            >
              {label}
              <span className={`ml-1 text-xs ${bookingFilter === value ? 'text-white/70' : 'text-gray-400'}`}>
                {bookingCounts[value as keyof typeof bookingCounts] ?? initialBookings.length}
              </span>
            </button>
          ))}
        </div>

        {/* Payment status filter */}
        <select
          value={paymentFilter}
          onChange={e => setPaymentFilter(e.target.value as PaymentFilter)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-gray-600"
        >
          {PAYMENT_STATUS_FILTERS.map(({ label, value }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Booking ID</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Guest</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Hotel</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Room</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Check-In</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Payment</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">No bookings found.</td></tr>
            ) : filtered.map((booking) => (
              <tr
                key={booking.id}
                className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                onClick={() => setSelected(booking)}
              >
                <td className="px-5 py-4 font-mono text-xs text-gray-500">{shortId(booking.id)}</td>
                <td className="px-5 py-4">
                  <p className="font-medium text-gray-900">{booking.guestName}</p>
                  <p className="text-xs text-gray-400">{booking.guestEmail}</p>
                </td>
                <td className="px-5 py-4 text-gray-600 max-w-[160px] truncate">{booking.hotelName}</td>
                <td className="px-5 py-4 text-gray-500 text-xs max-w-[130px] truncate">{booking.roomName}</td>
                <td className="px-5 py-4 text-gray-500 text-xs">{fmtDate(booking.checkIn)}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={booking.status} variant="booking" />
                </td>
                <td className="px-5 py-4">
                  <PaymentStatusBadge status={booking.paymentStatus} />
                </td>
                <td className="px-5 py-4 text-right font-semibold text-gray-900">
                  {booking.amount > 0 ? <AEDAmount amount={booking.amount} /> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3">Click any row to view full booking details.</p>
    </div>
  );
}
