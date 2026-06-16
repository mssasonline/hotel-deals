'use client';

import { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import AEDAmount, { useAEDFormat } from '../../partner/components/AEDAmount';
import { useAdminDateFormat } from '../components/useAdminFormat';

export type BookingStatus = 'upcoming' | 'confirmed' | 'pending' | 'completed' | 'cancelled';

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
  amount: number;
}

const STATUS_FILTERS: Array<{ label: string; value: BookingStatus | 'all' }> = [
  { label: 'All',       value: 'all'       },
  { label: 'Upcoming',  value: 'upcoming'  },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Pending',   value: 'pending'   },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

function shortId(id: string): string {
  return `SR-${String(id).padStart(4, '0')}`;
}

function BookingDetailModal({ booking, onClose, fmt, fmtDate }: { booking: AdminBooking; onClose: () => void; fmt: (n: number) => string; fmtDate: (iso: string | null) => string }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
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
        </div>
      </div>
    </div>
  );
}

export default function BookingsClient({ initialBookings }: { initialBookings: AdminBooking[] }) {
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminBooking | null>(null);
  const fmt = useAEDFormat();
  const { fmtDate } = useAdminDateFormat();

  const filtered = initialBookings.filter((b) => {
    const matchStatus = filter === 'all' || b.status === filter;
    const matchSearch = !search ||
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.guestName.toLowerCase().includes(search.toLowerCase()) ||
      b.guestEmail.toLowerCase().includes(search.toLowerCase()) ||
      b.hotelName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    all:       initialBookings.length,
    upcoming:  initialBookings.filter((b) => b.status === 'upcoming').length,
    confirmed: initialBookings.filter((b) => b.status === 'confirmed').length,
    pending:   initialBookings.filter((b) => b.status === 'pending').length,
    completed: initialBookings.filter((b) => b.status === 'completed').length,
    cancelled: initialBookings.filter((b) => b.status === 'cancelled').length,
  };

  const totalRevenue = filtered
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      {selected && <BookingDetailModal booking={selected} onClose={() => setSelected(null)} fmt={fmt} fmtDate={fmtDate} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {initialBookings.length} total bookings · <AEDAmount amount={totalRevenue} className="font-semibold text-gray-700" /> revenue in current view
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative w-56">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by ID, guest, email, hotel…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue placeholder-gray-400 transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === value ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
              style={filter === value ? { background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' } : {}}
            >
              {label}
              <span className={`ml-1.5 text-xs ${filter === value ? 'text-white/70' : 'text-gray-400'}`}>
                {counts[value]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Booking ID</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Guest</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Hotel</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Room</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Check-In</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">No bookings found.</td></tr>
            ) : (
              filtered.map((booking) => (
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
                  <td className="px-5 py-4 text-gray-600 max-w-[180px] truncate">{booking.hotelName}</td>
                  <td className="px-5 py-4 text-gray-500 text-xs max-w-[140px] truncate">{booking.roomName}</td>
                  <td className="px-5 py-4 text-gray-500 text-xs">{fmtDate(booking.checkIn)}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={booking.status as string} variant="booking" />
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-gray-900">
                    {booking.amount > 0 ? <AEDAmount amount={booking.amount} /> : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3">Click any row to view full booking details.</p>
    </div>
  );
}
