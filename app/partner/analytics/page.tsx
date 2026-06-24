'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getMyHotels, getHotelData } from '../actions';
import { getTranslations } from '@/lib/i18n/translations';
import { useAEDFormat } from '../components/AEDAmount';

// ── Types ─────────────────────────────────────────────────────────────────────

type Hotel = { id: string; name: string; city: string; address: string };

type AnalyticsBooking = {
  id: string;
  hotel_id: string;
  room_id: string | null;
  check_in: string;
  check_out: string;
  status: string;
  payment_status: string;
  total_price: number;
  subtotal: number | null;
  room_count: number | null;
  created_at: string;
  rooms: { name: string } | null;
  partner_amount: number | null;
};

type AnalyticsRoom = { id: string; name: string; type: string; available: number };

type Review = { id: string; rating: number; created_at: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLastNMonths(n: number): string[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1).toLocaleString('default', { month: 'short' });
}

/** Whole nights between two ISO dates (minimum 1). */
function nightsBetween(checkIn: string, checkOut: string): number {
  const diff = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000);
  return diff > 0 ? diff : 1;
}

/** Signed day delta between two ISO dates (to - from). */
function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KPIProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: 'blue' | 'gold' | 'green' | 'red' | 'purple';
  /** Period-over-period change. `pct` null = not enough data to compare. */
  trend?: { pct: number | null; goodWhenUp?: boolean };
}

const ACCENT: Record<string, { icon: string; border: string }> = {
  blue:   { icon: 'bg-brand-blue-light text-brand-blue', border: 'border-blue-100'    },
  gold:   { icon: 'bg-amber-50 text-amber-500',          border: 'border-amber-100'   },
  green:  { icon: 'bg-emerald-50 text-emerald-600',      border: 'border-emerald-100' },
  red:    { icon: 'bg-red-50 text-red-500',              border: 'border-red-100'     },
  purple: { icon: 'bg-purple-50 text-purple-600',        border: 'border-purple-100'  },
};

function TrendChip({ pct, goodWhenUp = true }: { pct: number; goodWhenUp?: boolean }) {
  const up = pct >= 0;
  const positive = up === goodWhenUp;
  return (
    <span
      title="vs. last month"
      className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${
        positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
      }`}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
          d={up ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
      </svg>
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function KPICard({ title, value, subtitle, icon, accent, trend }: KPIProps) {
  const s = ACCENT[accent];
  const showTrend = trend && trend.pct !== null && isFinite(trend.pct);
  return (
    <div className={`bg-white rounded-2xl border ${s.border} shadow-sm p-5`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.icon}`}>
          {icon}
        </div>
        {showTrend && <TrendChip pct={trend!.pct as number} goodWhenUp={trend!.goodWhenUp} />}
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-sm font-medium text-gray-600 mt-1">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}

// ── Mini Stat (secondary operational metrics) ───────────────────────────────────

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1.5 leading-none">{value}</p>
      <p className="text-xs text-gray-400 mt-1.5">{hint}</p>
    </div>
  );
}

// ── Revenue Line Chart ────────────────────────────────────────────────────────

function RevenueLineChart({ data, months, fmt }: { data: number[]; months: string[]; fmt: (v: number) => string }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const W = 500, H = 160;
  const PAD = { t: 16, r: 16, b: 32, l: 56 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const max = Math.max(...data, 1);
  const step = data.length > 1 ? iW / (data.length - 1) : iW;

  const toX = (i: number) => PAD.l + i * step;
  const toY = (v: number) => PAD.t + iH - (v / max) * iH;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d)}`).join(' ');
  const areaPath = [
    ...data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d)}`),
    `L${toX(data.length - 1)},${PAD.t + iH}`,
    `L${PAD.l},${PAD.t + iH}Z`,
  ].join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHovered(null)}>
      <defs>
        <linearGradient id="analyticsRevGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#003B95" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#003B95" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => {
        const y = toY(t * max);
        return (
          <g key={t}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            <text x={PAD.l - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#94a3b8">
              {fmt(t * max)}
            </text>
          </g>
        );
      })}
      {months.map((m, i) => (
        <text
          key={m}
          x={toX(i)}
          y={H - 6}
          textAnchor="middle"
          fontSize="10"
          fill={hovered === i ? '#003B95' : '#94a3b8'}
        >
          {monthLabel(m)}
        </text>
      ))}
      <path d={areaPath} fill="url(#analyticsRevGrad)" />
      <path d={linePath} fill="none" stroke="#003B95" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle
            cx={toX(i)}
            cy={toY(d)}
            r={hovered === i ? 5 : 3}
            fill={hovered === i ? '#003B95' : 'white'}
            stroke="#003B95"
            strokeWidth="2"
          />
          {hovered === i && (
            <g>
              <rect x={toX(i) - 36} y={toY(d) - 28} width="72" height="18" rx="4" fill="#003B95" />
              <text x={toX(i)} y={toY(d) - 16} textAnchor="middle" fontSize="10" fill="white" fontWeight="700">
                {fmt(d)}
              </text>
            </g>
          )}
          <rect
            x={toX(i) - step / 2}
            y={PAD.t}
            width={step}
            height={iH}
            fill="transparent"
            onMouseEnter={() => setHovered(i)}
          />
        </g>
      ))}
    </svg>
  );
}

// ── Bookings Bar Chart ────────────────────────────────────────────────────────

function BookingsBarChart({ data, months }: { data: number[]; months: string[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data, 1);

  return (
    <div className="flex items-end gap-3 h-40">
      {data.map((d, i) => {
        const pct = (d / max) * 100;
        const active = hovered === i;
        return (
          <div
            key={months[i]}
            className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {active && (
              <span className="text-xs font-bold text-brand-blue bg-blue-50 px-2 py-0.5 rounded-lg whitespace-nowrap">
                {d} booking{d !== 1 ? 's' : ''}
              </span>
            )}
            <div className="w-full flex items-end justify-center" style={{ height: '110px' }}>
              <div
                className={`w-full rounded-t-lg transition-all duration-200 ${
                  active ? 'bg-brand-blue' : 'bg-blue-200 hover:bg-brand-blue/40'
                }`}
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${active ? 'text-brand-blue' : 'text-gray-400'}`}>
              {monthLabel(months[i])}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Booking Status Breakdown ──────────────────────────────────────────────────

const STATUS_CONFIG = [
  { key: 'upcoming',   label: 'Upcoming',   color: 'bg-blue-500',  light: 'bg-blue-50',  text: 'text-blue-700'  },
  { key: 'confirmed',  label: 'Confirmed',  color: 'bg-blue-400',  light: 'bg-blue-50',  text: 'text-blue-700'  },
  { key: 'checked_in', label: 'Checked In', color: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700' },
  { key: 'completed',  label: 'Completed',  color: 'bg-green-500', light: 'bg-green-50', text: 'text-green-700' },
  { key: 'cancelled',  label: 'Cancelled',  color: 'bg-red-400',   light: 'bg-red-50',   text: 'text-red-600'   },
];

function BookingStatusBreakdown({ bookings }: { bookings: AnalyticsBooking[] }) {
  const total = bookings.length || 1;
  const counts = STATUS_CONFIG.map(g => ({
    ...g,
    count: bookings.filter(b => b.status === g.key).length,
  }));

  return (
    <div className="space-y-3">
      {counts.map(({ key, label, color, light, text, count }) => (
        <div key={key} className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${light} ${text} w-24 text-center shrink-0`}>
            {label}
          </span>
          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${color} transition-all duration-500`}
              style={{ width: `${(count / total) * 100}%` }}
            />
          </div>
          <span className="text-sm font-bold text-gray-900 w-6 text-right shrink-0">{count}</span>
          <span className="text-xs text-gray-400 w-10 text-right shrink-0">
            {((count / total) * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Room Popularity ───────────────────────────────────────────────────────────

function RoomPopularity({ bookings }: { bookings: AnalyticsBooking[] }) {
  const counts = bookings.reduce<Record<string, number>>((acc, b) => {
    const name = b.rooms?.name ?? 'Unknown Room';
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const maxCount = sorted[0]?.[1] ?? 1;

  if (sorted.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-8">No booking data yet.</p>;
  }

  return (
    <div className="space-y-3">
      {sorted.map(([name, count], i) => (
        <div key={name}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-gray-400 w-5 shrink-0">#{i + 1}</span>
              <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
            </div>
            <span className="text-sm font-bold text-gray-900 shrink-0 ml-2">
              {count} <span className="text-xs font-normal text-gray-400">booking{count !== 1 ? 's' : ''}</span>
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-blue to-blue-400 transition-all duration-500"
              style={{ width: `${(count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Rating Distribution ───────────────────────────────────────────────────────

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`w-4 h-4 ${filled ? 'text-brand-gold fill-current' : 'text-gray-200 fill-current'}`}
      viewBox="0 0 24 24"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function ReviewsAnalytics({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-8">No reviews for this hotel yet.</p>;
  }

  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => Math.round(r.rating) === star).length,
  }));
  const maxDist = Math.max(...distribution.map(d => d.count), 1);

  return (
    <>
      <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
        <div className="text-center">
          <p className="text-4xl font-bold text-gray-900 leading-none">{avgRating.toFixed(1)}</p>
          <div className="flex items-center justify-center gap-0.5 mt-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <StarIcon key={i} filled={i < Math.round(avgRating)} />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {distribution.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-3">{star}</span>
              <svg className="w-3 h-3 text-brand-gold fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-gold transition-all duration-500"
                  style={{ width: `${(count / maxDist) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-4 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router   = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = getTranslations('en');
  const fmt      = useAEDFormat();
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [dataLoading, setDataLoading]     = useState(false);
  const [hotels, setHotels]           = useState<Hotel[]>([]);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [bookings, setBookings]       = useState<AnalyticsBooking[]>([]);
  const [rooms, setRooms]             = useState<AnalyticsRoom[]>([]);
  const [reviews, setReviews]         = useState<Review[]>([]);
  const [error, setError]             = useState<string | null>(null);

  // ── Auth + load partner hotels ────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }

    setHotelsLoading(true);
    async function init() {
      try {
        const partnerHotels = await getMyHotels();
        setHotels(partnerHotels as Hotel[]);
        if (partnerHotels.length > 0) setSelectedId(partnerHotels[0].id);
      } catch (err) {
        console.error('[analytics] init error:', err);
        setError('Failed to load your hotels. Please try again.');
      } finally {
        setHotelsLoading(false);
      }
    }
    init();
  }, [user, authLoading, router]);

  // ── Fetch per-hotel analytics data ────────────────────────────────────────
  const fetchHotelData = useCallback(async (hotelId: string) => {
    setDataLoading(true);
    try {
      const { bookings: b, rooms: r, reviews: rv } = await getHotelData(hotelId);
      setBookings(b as unknown as AnalyticsBooking[]);
      setRooms(r.map(room => ({
        id: String(room.id),
        name: room.name,
        type: room.room_type ?? '',
        available: Number(room.available),
      })));
      setReviews(rv as unknown as Review[]);
    } catch (err) {
      console.error('[analytics] fetchHotelData error:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) fetchHotelData(selectedId);
  }, [selectedId, fetchHotelData]);

  // ── Computed metrics ──────────────────────────────────────────────────────
  const grossRevenue = bookings
    .filter(b => b.payment_status === 'paid')
    .reduce((s, b) => s + (b.total_price ?? 0), 0);
  // Use stored partner_amount — reflects the actual rate at time of each booking
  const totalRevenue = bookings
    .filter(b => b.payment_status === 'paid')
    .reduce((s, b) => s + (b.partner_amount ?? 0), 0);

  const totalBookings   = bookings.length;
  const cancelledCount  = bookings.filter(b => b.status === 'cancelled').length;
  const cancellationRate = totalBookings > 0 ? (cancelledCount / totalBookings) * 100 : 0;

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  const today = new Date().toISOString().slice(0, 10);
  const occupiedRoomIds = new Set(
    bookings
      .filter(b =>
        b.status !== 'cancelled' &&
        b.check_in <= today &&
        b.check_out >= today &&
        b.room_id
      )
      .map(b => b.room_id)
  );
  const occupancyRate = rooms.length > 0 ? (occupiedRoomIds.size / rooms.length) * 100 : 0;

  // ── Operational hotel metrics ──────────────────────────────────────────────
  const paidBookings = bookings.filter(b => b.payment_status === 'paid');
  const realizedBookings = paidBookings.filter(b => b.status !== 'cancelled');

  // Pre-tax room revenue (falls back to total when subtotal is missing on old rows)
  const roomRevenueOf = (b: AnalyticsBooking) => b.subtotal ?? b.total_price ?? 0;
  const roomNightsOf  = (b: AnalyticsBooking) => nightsBetween(b.check_in, b.check_out) * (b.room_count ?? 1);

  const soldRoomNights = realizedBookings.reduce((s, b) => s + roomNightsOf(b), 0);
  const adr = soldRoomNights > 0
    ? realizedBookings.reduce((s, b) => s + roomRevenueOf(b), 0) / soldRoomNights
    : 0;

  // Average booking value = partner share per paid booking
  const avgBookingValue = paidBookings.length > 0 ? totalRevenue / paidBookings.length : 0;

  const nonCancelled = bookings.filter(b => b.status !== 'cancelled');
  const avgLengthOfStay = nonCancelled.length > 0
    ? nonCancelled.reduce((s, b) => s + nightsBetween(b.check_in, b.check_out), 0) / nonCancelled.length
    : 0;

  const leadTimes = nonCancelled
    .map(b => daysBetween(b.created_at.slice(0, 10), b.check_in))
    .filter(d => d >= 0);
  const avgLeadTime = leadTimes.length > 0
    ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
    : 0;

  // ── Chart data (last 6 months) ─────────────────────────────────────────────
  const months = getLastNMonths(6);

  // Net partner share per month — matches the headline Partner Share KPI
  const revenueByMonth = months.map(ym =>
    bookings
      .filter(b => b.payment_status === 'paid' && b.created_at?.startsWith(ym))
      .reduce((s, b) => s + (b.partner_amount ?? 0), 0)
  );

  const bookingsByMonth = months.map(ym =>
    bookings.filter(b => b.created_at?.startsWith(ym)).length
  );

  // Month-over-month change for headline KPIs (last full vs previous month)
  const pctChange = (cur: number, prev: number): number | null =>
    prev > 0 ? ((cur - prev) / prev) * 100 : null;
  const last = revenueByMonth.length - 1;
  const revenueTrend  = pctChange(revenueByMonth[last],  revenueByMonth[last - 1] ?? 0);
  const bookingsTrend = pctChange(bookingsByMonth[last], bookingsByMonth[last - 1] ?? 0);

  const selectedHotel = hotels.find(h => h.id === selectedId);

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Hotels Assigned</h2>
        <p className="text-gray-500 text-sm max-w-sm">
          Your account is not linked to any hotel properties. Contact the platform administrator to request access.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Page header */}
      <div className="mb-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #D97706 0%, #B45309 100%)' }} />
              <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>{t['partner.nav.analytics']}</h1>
            </div>
            <p className="text-white/45 text-xs pl-3">Performance insights for your hotel properties.</p>
          </div>
        </div>
      </div>

      {/* Hotel selector tabs */}
      {hotels.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6 pb-5" style={{ borderBottom: '1px solid rgba(30,58,138,0.08)' }}>
          {hotels.map(h => (
            <button
              key={h.id}
              onClick={() => setSelectedId(h.id)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
              style={selectedId === h.id ? {
                background: 'linear-gradient(135deg, #0F2260 0%, #1E3A8A 100%)',
                color: '#fff', boxShadow: '0 4px 12px rgba(15,34,96,0.25)',
              } : { background: '#fff', border: '1px solid rgba(30,58,138,0.12)', color: '#334155' }}
            >
              {h.name}
              {h.city && <span className="ml-1.5 text-xs" style={{ color: selectedId === h.id ? 'rgba(255,255,255,0.6)' : '#94A3B8' }}>{h.city}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Selected hotel label */}
      {selectedHotel && (
        <div className="flex items-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-full bg-brand-gold shrink-0" />
          <p className="text-sm font-semibold text-gray-700">
            {selectedHotel.name}
            {selectedHotel.city && <span className="font-normal text-gray-400"> · {selectedHotel.city}</span>}
          </p>
        </div>
      )}

      {dataLoading ? <Spinner /> : (
        <>
          {/* ── KPI Cards ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <KPICard
              title={t['partner.dash.partnerShare']}
              value={fmt(totalRevenue)}
              subtitle={`${t['partner.dash.totalRevBox']}: ${fmt(grossRevenue)}`}
              accent="green"
              trend={{ pct: revenueTrend }}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <KPICard
              title="Total Bookings"
              value={totalBookings.toLocaleString()}
              subtitle="All-time reservations"
              accent="blue"
              trend={{ pct: bookingsTrend }}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />
            <KPICard
              title="Occupancy Rate"
              value={`${occupancyRate.toFixed(1)}%`}
              subtitle={`${occupiedRoomIds.size} of ${rooms.length} rooms today`}
              accent="purple"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
            />
            <KPICard
              title="Average Rating"
              value={avgRating !== null ? avgRating.toFixed(1) : '—'}
              subtitle={`From ${reviews.length} review${reviews.length !== 1 ? 's' : ''}`}
              accent="gold"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              }
            />
            <KPICard
              title="Cancellation Rate"
              value={`${cancellationRate.toFixed(1)}%`}
              subtitle={`${cancelledCount} of ${totalBookings} cancelled`}
              accent="red"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* ── Operational metrics strip ────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MiniStat
              label="Avg Daily Rate"
              value={fmt(adr)}
              hint="Room revenue per night sold"
            />
            <MiniStat
              label="Avg Booking Value"
              value={fmt(avgBookingValue)}
              hint="Your share per paid booking"
            />
            <MiniStat
              label="Avg Length of Stay"
              value={`${avgLengthOfStay.toFixed(1)} ${avgLengthOfStay === 1 ? 'night' : 'nights'}`}
              hint="Nights per reservation"
            />
            <MiniStat
              label="Booking Lead Time"
              value={`${avgLeadTime.toFixed(0)} ${avgLeadTime === 1 ? 'day' : 'days'}`}
              hint="Booked ahead of arrival"
            />
          </div>

          {/* ── Charts Row ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
            {/* Revenue over time */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Revenue Over Time</h2>
                <p className="text-xs text-gray-400 mt-0.5">Monthly partner share · last 6 months</p>
              </div>
              <div className="px-4 py-4">
                <RevenueLineChart data={revenueByMonth} months={months} fmt={fmt} />
              </div>
            </div>

            {/* Bookings over time */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Bookings Over Time</h2>
                <p className="text-xs text-gray-400 mt-0.5">Monthly reservations · last 6 months</p>
              </div>
              <div className="px-6 py-6">
                <BookingsBarChart data={bookingsByMonth} months={months} />
              </div>
            </div>
          </div>

          {/* ── Bottom Row ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Booking status breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Booking Status</h2>
                <p className="text-xs text-gray-400 mt-0.5">{totalBookings} total reservation{totalBookings !== 1 ? 's' : ''}</p>
              </div>
              <div className="px-6 py-5">
                {totalBookings > 0 ? (
                  <BookingStatusBreakdown bookings={bookings} />
                ) : (
                  <p className="text-gray-400 text-sm text-center py-8">No booking data yet.</p>
                )}
              </div>
            </div>

            {/* Room popularity */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Room Popularity</h2>
                <p className="text-xs text-gray-400 mt-0.5">Bookings per room type</p>
              </div>
              <div className="px-6 py-5">
                <RoomPopularity bookings={bookings} />
              </div>
            </div>

            {/* Reviews analytics */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Reviews Analytics</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {avgRating !== null
                    ? `${avgRating.toFixed(1)} avg · ${reviews.length} review${reviews.length !== 1 ? 's' : ''}`
                    : 'No reviews yet'
                  }
                </p>
              </div>
              <div className="px-6 py-5">
                <ReviewsAnalytics reviews={reviews} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
