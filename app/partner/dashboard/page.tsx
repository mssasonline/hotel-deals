'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getMyHotels, getHotelData } from '../actions';
import { fetchCommissionRate } from '@/app/admin/settings/actions';
import DashboardCard from '../components/DashboardCard';
import AEDAmount, { useAEDFormat } from '../components/AEDAmount';
import { type Booking, type RawBookingRow, normalizeBooking } from '@/lib/types';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';

type Hotel = {
  id: string;
  name: string;
  city: string;
  address: string;
};

type HotelRoom = {
  id: string;
  name: string;
  room_type: string | null;
  base_price: number;
  capacity: number;
  available: boolean | number;
};

type Review = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
};

const BOOKING_STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; key: string }> = {
  upcoming:   { bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-500',  key: 'partner.status.upcoming'   },
  confirmed:  { bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-500',  key: 'partner.status.confirmed'  },
  checked_in: { bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-500', key: 'partner.status.checkedIn'  },
  completed:  { bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-500', key: 'partner.status.completed'  },
  cancelled:  { bg: 'bg-red-50',    text: 'text-red-600',   dot: 'bg-red-400',   key: 'partner.status.cancelled'  },
};

function StatusBadge({ status, t }: { status: string; t: ReturnType<typeof getTranslations> }) {
  const cfg = BOOKING_STATUS_STYLE[status];
  const label = cfg
    ? (t[cfg.key as keyof typeof t] as string)
    : status.replace(/_/g, ' ');
  const style = cfg ?? { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i < Math.round(rating) ? 'text-brand-gold fill-current' : 'text-gray-200 fill-current'}`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="ml-1 text-xs font-semibold text-gray-700">{rating.toFixed(1)}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [hotelsLoading, setHotelsLoading] = useState(true);
  const [dataLoading, setDataLoading]     = useState(false);
  const [hotels, setHotels]             = useState<Hotel[]>([]);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [bookings, setBookings]         = useState<Booking[]>([]);
  const [rooms, setRooms]               = useState<HotelRoom[]>([]);
  const [reviews, setReviews]           = useState<Review[]>([]);
  const [error, setError]               = useState<string | null>(null);
  const [commissionRate, setCommissionRate] = useState(10);

  // ── Auth + fetch partner hotels ───────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }

    setHotelsLoading(true);
    async function init() {
      try {
        const [partnerHotels, rate] = await Promise.all([
          getMyHotels(),
          fetchCommissionRate(),
        ]);
        setCommissionRate(rate);
        setHotels(partnerHotels);
        if (partnerHotels.length > 0) setSelectedId(partnerHotels[0].id);
      } catch (err) {
        console.error('[dashboard] init error:', err);
        setError('Failed to load dashboard data. Please refresh.');
      } finally {
        setHotelsLoading(false);
      }
    }
    init();
  }, [user, authLoading, router]);

  // ── Fetch per-hotel data whenever selected hotel changes ─────────────────
  const fetchHotelData = useCallback(async (hotelId: string) => {
    setDataLoading(true);
    try {
      const { bookings: b, rooms: r, reviews: rv } = await getHotelData(hotelId);
      setBookings(b.map(row => normalizeBooking(row as unknown as RawBookingRow)));
      setRooms(r as HotelRoom[]);
      setReviews(rv as Review[]);
    } catch (err) {
      console.error('[dashboard] fetchHotelData error:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) fetchHotelData(selectedId);
  }, [selectedId, fetchHotelData]);

  // ── Metrics ───────────────────────────────────────────────────────────────
  const totalBookings  = bookings.length;
  const activeBookings = bookings.filter(b => !['completed', 'cancelled'].includes(b.status)).length;
  const grossRevenue   = bookings
    .filter(b => b.payment_status === 'paid')
    .reduce((sum, b) => sum + (b.total_price ?? 0), 0);
  const partnerRevenue = Math.round(grossRevenue * ((100 - commissionRate) / 100) * 100) / 100;
  const adminRevenue   = Math.round(grossRevenue * (commissionRate / 100) * 100) / 100;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)
    : null;

  const selectedHotel = hotels.find(h => h.id === selectedId);
  const fmt      = useAEDFormat();
  const language = useAppSettingsStore(s => s.language);
  const t        = getTranslations(language);

  // ── Render states ─────────────────────────────────────────────────────────
  if (authLoading || hotelsLoading) return <Spinner />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-gray-700 font-medium">{error}</p>
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t['partner.noHotels']}</h2>
        <p className="text-gray-500 text-sm max-w-sm">{t['partner.noHotelsDesc']}</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Page header */}
      <div className="mb-6">
        <p className="text-gray-500 text-sm">{t['partner.dash.subtitle']}</p>
      </div>

      {/* Hotel tab selector */}
      {hotels.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6 pb-5 border-b border-gray-100">
          {hotels.map(h => (
            <button
              key={h.id}
              onClick={() => setSelectedId(h.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedId === h.id
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-blue/40 hover:text-brand-blue'
              }`}
            >
              {h.name}
              {h.city && (
                <span className={`ml-1.5 text-xs ${selectedId === h.id ? 'text-white/70' : 'text-gray-400'}`}>
                  {h.city}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Selected hotel label */}
      {selectedHotel && (
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-blue-light rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-lg leading-tight">{selectedHotel.name}</h2>
            {selectedHotel.city && (
              <p className="text-gray-400 text-xs mt-0.5">
                {selectedHotel.city}{selectedHotel.address ? ` · ${selectedHotel.address}` : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {dataLoading ? <Spinner /> : (
        <>
          {/* ── KPI Cards ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <DashboardCard
              title={t['partner.dash.totalBookings']}
              value={totalBookings}
              subtitle={t['partner.dash.alltimeRes']}
              accent="blue"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />
            <DashboardCard
              title={t['partner.dash.activeBookings']}
              value={activeBookings}
              subtitle={t['partner.dash.upcoming']}
              accent="gold"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <DashboardCard
              title={t['partner.dash.revenue']}
              value={fmt(partnerRevenue)}
              subtitle={`${t['partner.dash.fromPaid']} · ${100 - commissionRate}%`}
              accent="green"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <DashboardCard
              title={t['partner.dash.avgRating']}
              value={avgRating !== null ? avgRating.toFixed(1) : '—'}
              subtitle={reviews.length > 0 ? `${avgRating?.toFixed(1)} · ${reviews.length}` : t['partner.dash.noReviewsYet']}
              accent="gold"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              }
            />
          </div>

          {/* ── Revenue hero ──────────────────────────────────────────────── */}
          <div className="bg-brand-blue rounded-2xl p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-white/60 text-sm font-medium mb-1">{t['partner.dash.totalRevenue']}</p>
                <p className="text-4xl font-bold text-white"><AEDAmount amount={grossRevenue} /></p>
                <p className="text-white/50 text-xs mt-1">{t['partner.dash.sumPaid']}</p>
              </div>
              <div className="flex items-center gap-3 bg-white/10 rounded-xl px-5 py-4 shrink-0">
                <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-white font-bold text-lg leading-none">{activeBookings} {t['partner.dash.activeBookings']}</p>
                  <p className="text-white/50 text-xs">{t['partner.dash.upcoming']}</p>
                </div>
              </div>
            </div>
            {/* Revenue split breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 rounded-xl px-4 py-3">
                <p className="text-white/50 text-xs mb-1">{t['partner.dash.totalRevBox']}</p>
                <p className="text-white font-bold text-lg"><AEDAmount amount={grossRevenue} /></p>
                <p className="text-white/40 text-xs mt-0.5">100%</p>
              </div>
              <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-4 py-3">
                <p className="text-emerald-200 text-xs mb-1">{t['partner.dash.partnerShare'].replace(/\d+%/, `${100 - commissionRate}%`)}</p>
                <p className="text-white font-bold text-lg"><AEDAmount amount={partnerRevenue} /></p>
                <p className="text-emerald-300/70 text-xs mt-0.5">{t['partner.dash.netIncome']}</p>
              </div>
              <div className="bg-white/5 rounded-xl px-4 py-3">
                <p className="text-white/40 text-xs mb-1">{t['partner.dash.platformFee'].replace(/\d+%/, `${commissionRate}%`)}</p>
                <p className="text-white/60 font-bold text-lg"><AEDAmount amount={adminRevenue} /></p>
                <p className="text-white/30 text-xs mt-0.5">{t['partner.dash.serviceFee']}</p>
              </div>
            </div>
          </div>

          {/* ── Bookings table ────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{t['partner.dash.recentBookings']}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{totalBookings}</p>
              </div>
              <a href="/partner/bookings" className="text-sm text-brand-blue font-medium hover:underline">
                {t['partner.viewAll']}
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-6 py-3">{t['partner.dash.colId']}</th>
                    <th className="px-6 py-3">{t['partner.dash.colGuest']}</th>
                    <th className="px-6 py-3">{t['partner.dash.colRoom']}</th>
                    <th className="px-6 py-3">{t['partner.dash.colCheckIn']}</th>
                    <th className="px-6 py-3">{t['partner.dash.colCheckOut']}</th>
                    <th className="px-6 py-3">{t['partner.dash.colStatus']}</th>
                    <th className="px-6 py-3 text-right">{t['partner.dash.colAmount']}</th>
                    <th className="px-6 py-3 text-right text-emerald-600">{t['partner.dash.colPartnerShare'].replace(/\d+%/, `${100 - commissionRate}%`)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bookings.slice(0, 8).map(b => (
                    <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-xs text-gray-500 font-semibold">
                        {String(b.id).slice(0, 8)}&hellip;
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-gray-900">{b.guest_name}</p>
                        <p className="text-xs text-gray-400">{b.guest_email}</p>
                      </td>
                      <td className="px-6 py-3.5 text-gray-600">{b.rooms?.name ?? '—'}</td>
                      <td className="px-6 py-3.5 text-gray-600">{b.check_in}</td>
                      <td className="px-6 py-3.5 text-gray-600">{b.check_out}</td>
                      <td className="px-6 py-3.5"><StatusBadge status={b.status} t={t} /></td>
                      <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                        {b.payment_status === 'paid'
                          ? <AEDAmount amount={b.total_price ?? 0} />
                          : <span className="text-gray-400 font-normal">—</span>
                        }
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-emerald-600">
                        {b.payment_status === 'paid'
                          ? <AEDAmount amount={Math.round((b.total_price ?? 0) * ((100 - commissionRate) / 100) * 100) / 100} />
                          : <span className="text-gray-300 font-normal">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-400 text-sm">
                        {t['partner.dash.noBookings']}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Rooms overview + Reviews ──────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Rooms overview */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{t['partner.dash.rooms']}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{rooms.length}</p>
                </div>
                <a href="/partner/rooms" className="text-sm text-brand-blue font-medium hover:underline">
                  {t['partner.viewAll']}
                </a>
              </div>
              <div className="divide-y divide-gray-50">
                {rooms.slice(0, 6).map(room => (
                  <div
                    key={room.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="min-w-0 mr-3">
                      <p className="font-medium text-gray-900 text-sm truncate">{room.name}</p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {room.room_type ?? '—'} · {room.capacity ?? '?'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-brand-blue">
                        ${(room.base_price ?? 0).toLocaleString()}
                        <span className="text-xs text-gray-400 font-normal">{t['partner.dash.perNight']}</span>
                      </p>
                      <p className={`text-xs font-medium mt-0.5 ${Number(room.available) <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {room.available === true || Number(room.available) > 0 ? '✓' : '✗'} {t['partner.dash.avail']}
                      </p>
                    </div>
                  </div>
                ))}
                {rooms.length === 0 && (
                  <div className="px-6 py-10 text-center text-gray-400 text-sm">
                    {t['partner.dash.noRooms']}
                  </div>
                )}
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">{t['partner.dash.guestReviews']}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {avgRating !== null
                    ? `${avgRating.toFixed(1)} · ${reviews.length}`
                    : t['partner.dash.noReviewsYet']
                  }
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {reviews.slice(0, 5).map(review => (
                  <div key={review.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <StarRating rating={review.rating} />
                      <span className="text-xs text-gray-400 shrink-0">
                        {review.created_at?.slice(0, 10) ?? ''}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                        {review.comment}
                      </p>
                    )}
                    {!review.comment && (
                      <p className="text-gray-300 text-xs italic">{t['partner.dash.noComment']}</p>
                    )}
                  </div>
                ))}
                {reviews.length === 0 && (
                  <div className="px-6 py-10 text-center text-gray-400 text-sm">
                    {t['partner.dash.noReviews']}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
