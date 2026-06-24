'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getMyHotels, getHotelData } from '../actions';
import { fetchCommissionRate } from '@/app/admin/settings/actions';
import DashboardCard from '../components/DashboardCard';
import AEDAmount, { useAEDFormat } from '../components/AEDAmount';
import SetupChecklist, { type SetupProgress } from '../components/SetupChecklist';
import { type Booking, type RawBookingRow, normalizeBooking } from '@/lib/types';
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
  const [imageCount, setImageCount]     = useState(0);
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
        if (partnerHotels.length === 0) {
          router.replace('/partner/onboarding');
          return;
        }
        setSelectedId(partnerHotels[0].id);
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
      const { bookings: b, rooms: r, reviews: rv, imageCount: ic } = await getHotelData(hotelId);
      setBookings(b.map(row => normalizeBooking(row as unknown as RawBookingRow)));
      setRooms(r as HotelRoom[]);
      setReviews(rv as Review[]);
      setImageCount(ic);
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
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const totalBookings  = bookings.length;
  // Active = non-cancelled, non-completed, AND check_out is today or future
  const activeBookings = bookings.filter(b =>
    !['completed', 'cancelled'].includes(b.status) && b.check_out >= today
  ).length;
  // Upcoming bookings shown in dashboard table: active ones sorted soonest first
  const upcomingBookings = bookings
    .filter(b => !['completed', 'cancelled'].includes(b.status) && b.check_out >= today)
    .sort((a, b) => a.check_in.localeCompare(b.check_in))
    .slice(0, 8);
  const paidBookings   = bookings.filter(b => b.payment_status === 'paid');
  // grossRevenue = total guest paid (room + taxes)
  const grossRevenue   = paidBookings.reduce((sum, b) => sum + (b.total_price ?? 0), 0);
  // Use stored amounts from booking_revenue — reflect the rate in effect at booking time
  const partnerRevenue = paidBookings.reduce((sum, b) => sum + (b.partner_amount ?? 0), 0);
  const adminRevenue   = paidBookings.reduce((sum, b) => sum + (b.admin_amount   ?? 0), 0);
  const taxCollected   = grossRevenue - partnerRevenue - adminRevenue;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)
    : null;

  const selectedHotel = hotels.find(h => h.id === selectedId);
  const fmt      = useAEDFormat();
  const t = getTranslations('en');

  const setupProgress: SetupProgress = {
    hasDescription: !!(selectedHotel as unknown as { description?: string } | undefined)?.description?.trim(),
    hasLocation:    !!(selectedHotel as unknown as { latitude?: number | null } | undefined)?.latitude,
    hasRooms:       rooms.length > 0,
    hasAmenities:   ((selectedHotel as unknown as { amenities?: string[] } | undefined)?.amenities ?? []).length > 0,
    hasImages:      imageCount > 0,
  };

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      {/* Premium page header */}
      <div className="mb-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #D97706 0%, #B45309 100%)' }} />
              <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>{t['partner.dash.subtitle'] ?? 'Partner Dashboard'}</h1>
            </div>
            <p className="text-white/45 text-xs pl-3">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10B981' }} />
            <span className="text-white/70 text-xs font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* Hotel tab selector */}
      {hotels.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6 pb-5" style={{ borderBottom: '1px solid rgba(30,58,138,0.08)' }}>
          {hotels.map(h => (
            <button
              key={h.id}
              onClick={() => setSelectedId(h.id)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
              style={selectedId === h.id ? {
                background: 'linear-gradient(135deg, #0F2260 0%, #1E3A8A 100%)',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(15,34,96,0.25)',
              } : {
                background: '#fff',
                border: '1px solid rgba(30,58,138,0.12)',
                color: '#334155',
              }}
            >
              {h.name}
              {h.city && (
                <span className="ml-1.5 text-xs" style={{ color: selectedId === h.id ? 'rgba(255,255,255,0.6)' : '#94A3B8' }}>
                  {h.city}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Selected hotel label */}
      {selectedHotel && (
        <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl" style={{ background: '#fff', border: '1px solid rgba(30,58,138,0.09)', boxShadow: '0 1px 6px rgba(15,34,96,0.05)' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold leading-tight" style={{ color: '#0F172A', fontFamily: 'var(--font-playfair, Georgia, serif)', fontSize: '1.1rem' }}>{selectedHotel.name}</h2>
            {selectedHotel.city && (
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {selectedHotel.city}{selectedHotel.address ? ` · ${selectedHotel.address}` : ''}
              </p>
            )}
          </div>
          <div className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#EEF4FF', color: '#1E3A8A' }}>
            Active
          </div>
        </div>
      )}

      {dataLoading ? <Spinner /> : (
        <>
          {/* ── Setup checklist ──────────────────────────────────────────── */}
          <SetupChecklist progress={setupProgress} />

          {/* ── KPI Cards ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 mb-6">
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
              title={t['partner.dash.avgRating']}
              value={avgRating !== null ? avgRating.toFixed(1) : '—'}
              subtitle={reviews.length > 0 ? `${avgRating?.toFixed(1)} · ${reviews.length}` : t['partner.dash.noReviewsYet']}
              accent="gold"
              onClick={() => document.getElementById('guest-reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              }
            />
          </div>

          {/* ── Revenue hero ──────────────────────────────────────────────── */}
          <div className="rounded-2xl p-6 mb-6" style={{ background: 'linear-gradient(135deg, #0F2260 0%, #1E3A8A 55%, #2563EB 100%)' }}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-white/60 text-sm font-medium mb-1">{t['partner.dash.totalRevenue']}</p>
                <p className="text-2xl sm:text-4xl font-bold text-white"><AEDAmount amount={grossRevenue} /></p>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-white/10 rounded-xl px-3 py-3 sm:px-4">
                <p className="text-white/50 text-xs mb-1">{t['partner.dash.totalRevBox']}</p>
                <p className="text-white font-bold text-base sm:text-lg"><AEDAmount amount={grossRevenue} /></p>
                <p className="text-white/40 text-xs mt-0.5">Guest paid</p>
              </div>
              <div className="bg-white/5 rounded-xl px-3 py-3 sm:px-4">
                <p className="text-white/40 text-xs mb-1">Taxes (15%)</p>
                <p className="text-white/60 font-bold text-base sm:text-lg"><AEDAmount amount={taxCollected} /></p>
                <p className="text-white/30 text-xs mt-0.5">Gov. collected</p>
              </div>
              <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-3 py-3 sm:px-4">
                <p className="text-emerald-200 text-xs mb-1">{t['partner.dash.partnerShare'].replace(/\d+%/, `${100 - commissionRate}%`)}</p>
                <p className="text-white font-bold text-base sm:text-lg"><AEDAmount amount={partnerRevenue} /></p>
                <p className="text-emerald-300/70 text-xs mt-0.5">{t['partner.dash.netIncome']}</p>
              </div>
              <div className="bg-white/5 rounded-xl px-3 py-3 sm:px-4">
                <p className="text-white/40 text-xs mb-1">{t['partner.dash.platformFee'].replace(/\d+%/, `${commissionRate}%`)}</p>
                <p className="text-white/60 font-bold text-base sm:text-lg"><AEDAmount amount={adminRevenue} /></p>
                <p className="text-white/30 text-xs mt-0.5">{t['partner.dash.serviceFee']}</p>
              </div>
            </div>
          </div>

          {/* ── Bookings table ────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl overflow-hidden mb-6" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{t['partner.dash.recentBookings']}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{totalBookings}</p>
              </div>
              <a href="/partner/bookings" className="text-sm text-brand-blue font-medium hover:underline">
                {t['partner.viewAll']}
              </a>
            </div>
            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-gray-50">
              {upcomingBookings.map(b => (
                <div key={b.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{b.guest_name}</p>
                      <p className="text-xs text-gray-400 truncate">{b.guest_email}</p>
                    </div>
                    <StatusBadge status={b.status} t={t} />
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{b.rooms?.name ?? '—'}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                    <span>{b.check_in}</span>
                    <span>→</span>
                    <span>{b.check_out}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-mono">{String(b.id).slice(0, 8)}…</span>
                    <div className="text-right">
                      {b.payment_status === 'paid' ? (
                        <>
                          <p className="text-sm font-bold text-gray-900"><AEDAmount amount={b.total_price ?? 0} /></p>
                          {b.partner_amount != null && (
                            <p className="text-xs font-semibold text-emerald-600"><AEDAmount amount={b.partner_amount} /></p>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {bookings.length === 0 && (
                <p className="px-4 py-10 text-center text-gray-400 text-sm">{t['partner.dash.noBookings']}</p>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
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
                  {upcomingBookings.map(b => (
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
                        {b.payment_status === 'paid' && b.partner_amount != null
                          ? <AEDAmount amount={b.partner_amount} />
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
            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(30,58,138,0.06)' }}>
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
                        <AEDAmount amount={room.base_price ?? 0} />
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
            <div id="guest-reviews" className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
              <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(30,58,138,0.06)' }}>
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
