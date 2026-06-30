'use client';

import AEDAmount, { useAEDFormat } from '../../partner/components/AEDAmount';
import { useAdminDateFormat } from '../components/useAdminFormat';
import RevenueChart from '../components/RevenueChart';
import KPICard from '../components/KPICard';
import StatusBadge from '../components/StatusBadge';
import { deriveStatus } from '../../partner/lib/bookingStatus';

export type DashboardStats = {
  total_hotels: number;
  total_partners: number;
  total_users: number;
  total_bookings: number;
  total_revenue: number;
  revenue_today: number;
  active_deals: number;
  growth_pct: number;
};

export type RevenueTrendPoint = { month: string; revenue: number };

export type RecentBookingRow = {
  id: string | number;
  guest_name: string | null;
  status: string;
  check_in: string;
  check_out: string;
  total_price: number;
  created_at: string;
  hotels: { name: string } | { name: string }[] | null;
};

function resolveJoin<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function shortId(id: string | number): string {
  return `SR-${String(id).padStart(4, '0')}`;
}

function TodayCard({
  label, value, sub, accent,
}: {
  label: string; value: number | string; sub?: string;
  accent?: 'red' | 'emerald' | 'blue' | 'amber';
}) {
  const color =
    accent === 'red'     ? 'text-red-500'     :
    accent === 'emerald' ? 'text-emerald-600'  :
    accent === 'amber'   ? 'text-amber-600'    :
    accent === 'blue'    ? 'text-brand-blue'   : 'text-gray-900';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-1">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function RecentBookingsPanel({
  bookings, fmtDate,
}: {
  bookings: RecentBookingRow[];
  fmtDate: (iso: string | null) => string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
        <a href="/admin/bookings" className="text-xs text-brand-blue font-semibold hover:underline">View all →</a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">ID</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Guest</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hotel</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bookings.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">No bookings yet.</td></tr>
            ) : bookings.map((b) => {
              const hotel = resolveJoin(b.hotels);
              return (
                <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{shortId(b.id)}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">{b.guest_name || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-500 max-w-[160px] truncate">{hotel?.name || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{fmtDate(b.created_at)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={deriveStatus(b)} variant="booking" /></td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                    {b.status !== 'cancelled' && b.total_price > 0 ? <AEDAmount amount={b.total_price} /> : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActiveDealsStrip({ lastMinRoomsCount, hotelDealsCount }: { lastMinRoomsCount: number; hotelDealsCount: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Active Deals</h2>
      </div>
      <div className="divide-y divide-gray-50">
        <a href="/admin/last-min-rooms" className="px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Last Min Rooms</p>
              <p className="text-xs text-gray-400">Time-based discounts</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-2xl font-bold text-indigo-600">{lastMinRoomsCount}</span>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-brand-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>
        <a href="/admin/deals" className="px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Hotels Deals</p>
              <p className="text-xs text-gray-400">Active partner deals</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-2xl font-bold text-amber-600">{hotelDealsCount}</span>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-brand-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>
        <a href="/admin/reports" className="px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Analytics & Reports</p>
              <p className="text-xs text-gray-400">Revenue trends & partners</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-300 group-hover:text-brand-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  );
}

export default function DashboardClient({
  stats, revenueTrend, recentBookings,
  lastMinRoomsCount, hotelDealsCount,
  checkinsToday, checkoutsToday, pendingCount,
}: {
  stats: DashboardStats;
  revenueTrend: RevenueTrendPoint[];
  recentBookings: RecentBookingRow[];
  lastMinRoomsCount: number;
  hotelDealsCount: number;
  checkinsToday: number;
  checkoutsToday: number;
  pendingCount: number;
}) {
  const fmt = useAEDFormat();
  const { fmtDate } = useAdminDateFormat();
  const sparkline = revenueTrend.map((p) => p.revenue);

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Live</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-gray-400 text-sm mt-0.5">SelectedRoom admin console</p>
      </div>

      {/* Today's Pulse */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <TodayCard
          label="Revenue Today"
          value={fmt(stats.revenue_today)}
          sub="Paid bookings"
          accent="blue"
        />
        <TodayCard
          label="Check-ins Today"
          value={checkinsToday}
          sub="Arriving guests"
          accent="emerald"
        />
        <TodayCard
          label="Check-outs Today"
          value={checkoutsToday}
          sub="Departing guests"
          accent="amber"
        />
        <TodayCard
          label="Pending Payments"
          value={pendingCount}
          sub={pendingCount > 0 ? 'Needs attention' : 'All clear'}
          accent={pendingCount > 0 ? 'red' : 'emerald'}
        />
      </div>

      {/* Revenue Hero */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="sm:col-span-2 bg-[#001E5A] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">Total Platform Revenue</p>
            <p className="text-4xl font-bold text-white">{fmt(stats.total_revenue)}</p>
            <p className="text-white/40 text-xs mt-1">All-time · pre-tax revenue</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="bg-white/8 rounded-xl px-5 py-4 text-center">
              <p className={`font-bold text-xl ${stats.growth_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.growth_pct >= 0 ? '+' : ''}{stats.growth_pct}%
              </p>
              <p className="text-white/40 text-xs mt-0.5">vs Last Month</p>
            </div>
            <div className="bg-white/8 rounded-xl px-5 py-4 text-center">
              <p className="text-white font-bold text-xl">{stats.active_deals}</p>
              <p className="text-white/40 text-xs mt-0.5">Live Deals</p>
            </div>
            <div className="bg-white/8 rounded-xl px-5 py-4 text-center">
              <p className="text-white font-bold text-xl">{stats.total_bookings.toLocaleString()}</p>
              <p className="text-white/40 text-xs mt-0.5">All Bookings</p>
            </div>
          </div>
        </div>
        <ActiveDealsStrip lastMinRoomsCount={lastMinRoomsCount} hotelDealsCount={hotelDealsCount} />
      </div>

      {/* Platform KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Total Hotels"
          value={stats.total_hotels}
          subtitle="Across all markets"
          accent="blue"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
        />
        <KPICard
          title="Hotel Partners"
          value={stats.total_partners}
          subtitle="Active accounts"
          accent="gold"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <KPICard
          title="Registered Users"
          value={stats.total_users}
          subtitle="Travellers"
          accent="green"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
        />
        <KPICard
          title="Total Bookings"
          value={stats.total_bookings}
          subtitle="All time"
          accent="purple"
          trend={stats.growth_pct !== 0 ? { value: `${Math.abs(stats.growth_pct)}% MoM`, positive: stats.growth_pct >= 0 } : undefined}
          sparkline={sparkline.length > 1 ? sparkline : undefined}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
      </div>

      {/* Revenue Chart */}
      <div className="mb-6">
        <RevenueChart data={revenueTrend} />
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <RecentBookingsPanel bookings={recentBookings} fmtDate={fmtDate} />
        </div>
        <div className="space-y-4">
          {/* Quick links to other admin pages */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Quick Access</p>
            <div className="space-y-2">
              {[
                { href: '/admin/properties', label: 'Manage Hotels',   icon: '🏨' },
                { href: '/admin/users',    label: 'Manage Users',    icon: '👥' },
                { href: '/admin/bookings', label: 'All Bookings',    icon: '📋' },
                { href: '/admin/financials', label: 'Financials',    icon: '💰' },
              ].map(({ href, label, icon }) => (
                <a key={href} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                  <span className="text-base">{icon}</span>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-brand-blue transition-colors">{label}</span>
                  <svg className="w-4 h-4 text-gray-300 ml-auto group-hover:text-brand-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
