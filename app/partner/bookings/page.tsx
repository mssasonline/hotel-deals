'use client';

import { useEffect, useState } from 'react';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import AEDAmount, { useAEDFormat } from '../components/AEDAmount';
import { getMyBookings, type BookingRow } from '../actions';

type Booking = BookingRow;

const BOOKING_STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; key: string }> = {
  upcoming:   { bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-500',  key: 'partner.status.upcoming'   },
  confirmed:  { bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-500',  key: 'partner.status.confirmed'  },
  checked_in: { bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-500', key: 'partner.status.checkedIn'  },
  completed:  { bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-500', key: 'partner.status.completed'  },
  cancelled:  { bg: 'bg-red-50',    text: 'text-red-600',   dot: 'bg-red-400',   key: 'partner.status.cancelled'  },
};

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
    </div>
  );
}

export default function BookingsPage() {
  const language = useAppSettingsStore(s => s.language);
  const t        = getTranslations(language);
  const fmt      = useAEDFormat();
  const [loading, setLoading]           = useState(true);
  const [bookings, setBookings]         = useState<Booking[]>([]);
  const [hotelIds, setHotelIds]         = useState<string[]>([]);
  const [hotelNames, setHotelNames]     = useState<Record<string, string>>({});
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hotelFilter, setHotelFilter]   = useState('all');

  useEffect(() => {
    getMyBookings()
      .then(({ bookings: data, hotelNames: names }) => {
        setHotelIds(Object.keys(names));
        setHotelNames(names);
        setBookings(data);
      })
      .catch(err => console.error('[bookings] load error:', err))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────
  const statusCounts: Record<string, number> = {};
  bookings.forEach(b => { statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1; });

  const filtered = bookings.filter(b => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchHotel  = hotelFilter  === 'all' || b.hotel_id === hotelFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || (b.guest_name ?? '').toLowerCase().includes(q)
      || (b.guest_email ?? '').toLowerCase().includes(q)
      || b.id.toLowerCase().includes(q);
    return matchStatus && matchHotel && matchSearch;
  });

  const filteredRevenue = filtered
    .filter(b => b.payment_status === 'paid')
    .reduce((s, b) => s + (b.total_price ?? 0), 0);

  const multiHotel = hotelIds.length > 1;

  if (loading) return <Spinner />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-8"></div>

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(BOOKING_STATUS_STYLE).map(([key, cfg]) => {
          const count = statusCounts[key] ?? 0;
          if (count === 0) return null;
          const active = statusFilter === key;
          const label = t[cfg.key as keyof typeof t] as string ?? key;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(active ? 'all' : key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all ${
                active
                  ? `${cfg.bg} ${cfg.text} border-current ring-2 ring-offset-1`
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              {label}
              <span className={`font-bold ${active ? '' : 'text-gray-900'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={t['partner.bookings.searchPlaceholder']}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          />
        </div>

        {multiHotel && (
          <select
            value={hotelFilter}
            onChange={e => setHotelFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-700"
          >
            <option value="all">{t['partner.rooms.allHotels']}</option>
            {hotelIds.map(id => (
              <option key={id} value={id}>{hotelNames[id] ?? id}</option>
            ))}
          </select>
        )}

        {filteredRevenue > 0 && (
          <div className="sm:ml-auto text-right">
            <p className="text-xs text-gray-400">{t['partner.bookings.filteredRevenue']}</p>
            <p className="text-base font-bold text-brand-blue">{fmt(filteredRevenue)}</p>
          </div>
        )}
      </div>

      {/* Bookings table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3">{t['partner.dash.colId']}</th>
                <th className="px-6 py-3">{t['partner.dash.colGuest']}</th>
                {multiHotel && <th className="px-6 py-3">{t['partner.rooms.colHotel']}</th>}
                <th className="px-6 py-3">{t['partner.dash.colRoom']}</th>
                <th className="px-6 py-3">{t['partner.dash.colCheckIn']}</th>
                <th className="px-6 py-3">{t['partner.dash.colCheckOut']}</th>
                <th className="px-6 py-3">{t['partner.dash.colStatus']}</th>
                <th className="px-6 py-3">{t['partner.bookings.colPayment']}</th>
                <th className="px-6 py-3 text-right">{t['partner.bookings.colTotal']}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(b => {
                const cfg = BOOKING_STATUS_STYLE[b.status];
                const payClass =
                  b.payment_status === 'paid'     ? 'bg-green-50 text-green-700'   :
                  b.payment_status === 'pending'  ? 'bg-amber-50 text-amber-700'   :
                  b.payment_status === 'refunded' ? 'bg-purple-50 text-purple-700' :
                  'bg-gray-100 text-gray-600';

                const statusLabel = cfg
                  ? (t[cfg.key as keyof typeof t] as string ?? b.status)
                  : b.status.replace(/_/g, ' ');
                return (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500 font-semibold">
                      {String(b.id).slice(0, 8)}&hellip;
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{b.guest_name}</p>
                      <p className="text-xs text-gray-400">{b.guest_email}</p>
                    </td>
                    {multiHotel && (
                      <td className="px-6 py-4 text-gray-600 max-w-[140px] truncate">
                        {hotelNames[b.hotel_id] ?? '—'}
                      </td>
                    )}
                    <td className="px-6 py-4 text-gray-600">{b.rooms?.name ?? '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{b.check_in}</td>
                    <td className="px-6 py-4 text-gray-600">{b.check_out}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg?.bg ?? 'bg-gray-100'} ${cfg?.text ?? 'text-gray-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg?.dot ?? 'bg-gray-400'}`} />
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${payClass}`}>
                        {b.payment_status ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      {(b.total_price ?? 0) > 0
                        ? <AEDAmount amount={b.total_price} />
                        : <span className="text-gray-400 font-normal">—</span>
                      }
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={multiHotel ? 9 : 8}
                    className="px-6 py-12 text-center text-gray-400 text-sm"
                  >
                    {t['partner.bookings.noResults']}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {t['partner.bookings.showing'].replace('{n}', String(filtered.length)).replace('{m}', String(bookings.length))}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
