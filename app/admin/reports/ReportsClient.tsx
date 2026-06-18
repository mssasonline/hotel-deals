'use client';

import { useState } from 'react';
import AEDAmount, { useAEDFormat } from '../../partner/components/AEDAmount';

export type TrendPoint = {
  month: string;
  revenue: number;
  booking_count: number;
  platform_rev: number;
  partner_payout: number;
};
export type TopHotel   = { id: number; name: string; city: string; booking_count: number; revenue: number };
export type TopCity    = { city: string; booking_count: number; revenue: number };

export type ReportStats = {
  total_revenue:  number;
  growth_pct:     number;
  cancel_rate:    number;
  total_bookings: number;
};

export type PartnerRevenueSummary = {
  partner_id:       string;
  partner_name:     string;
  partner_email:    string;
  hotel_count:      number;
  booking_count:    number;
  gross_revenue:    number;
  subtotal:         number;
  tax_collected:    number;
  partner_payout:   number;
  admin_commission: number;
};

type Range = '3m' | '6m' | '12m';

// ── Charts ────────────────────────────────────────────────────

function RevenueLineChart({ data }: { data: TrendPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const fmt = useAEDFormat();
  if (data.length === 0) return null;

  const W = 500, H = 140;
  const PAD = { t: 12, r: 12, b: 28, l: 56 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const step = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const toX = (i: number) => PAD.l + i * step;
  const toY = (v: number) => PAD.t + innerH - (v / max) * innerH;
  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.revenue)}`).join(' ');
  const areaPath = [
    ...data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.revenue)}`),
    `L${toX(data.length - 1)},${PAD.t + innerH}`,
    `L${PAD.l},${PAD.t + innerH}Z`,
  ].join(' ');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Revenue Trend</h2>
        <p className="text-xs text-gray-400 mt-0.5">Monthly gross collected</p>
      </div>
      <div className="px-4 py-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHovered(null)}>
          <defs>
            <linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#003B95" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#003B95" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((t) => {
            const y = toY(t * max);
            return (
              <g key={t}>
                <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={PAD.l - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="#94a3b8">{fmt(t * max)}</text>
              </g>
            );
          })}
          {data.map((d, i) => (
            <text key={d.month} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="9" fill={hovered === i ? '#003B95' : '#94a3b8'}>{d.month}</text>
          ))}
          <path d={areaPath} fill="url(#rg2)" />
          <path d={linePath} fill="none" stroke="#003B95" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {data.map((d, i) => (
            <g key={i}>
              <circle cx={toX(i)} cy={toY(d.revenue)} r={hovered === i ? 5 : 3} fill={hovered === i ? '#003B95' : 'white'} stroke="#003B95" strokeWidth="2" />
              {hovered === i && (
                <g>
                  <rect x={toX(i) - 40} y={toY(d.revenue) - 30} width="80" height="20" rx="4" fill="#003B95" />
                  <text x={toX(i)} y={toY(d.revenue) - 16} textAnchor="middle" fontSize="10" fill="white" fontWeight="700">{fmt(d.revenue)}</text>
                </g>
              )}
              <rect x={toX(i) - step / 2} y={PAD.t} width={step} height={innerH} fill="transparent" onMouseEnter={() => setHovered(i)} />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function BookingBarChart({ data }: { data: TrendPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.booking_count), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Booking Volume</h2>
        <p className="text-xs text-gray-400 mt-0.5">Monthly bookings</p>
      </div>
      <div className="px-6 py-6">
        <div className="flex items-end gap-2 h-36">
          {data.map((d, i) => {
            const pct = (d.booking_count / max) * 100;
            const active = hovered === i;
            return (
              <div
                key={d.month}
                className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {active && (
                  <span className="text-xs font-bold text-brand-blue bg-blue-50 px-1.5 py-0.5 rounded-lg whitespace-nowrap">
                    {d.booking_count}
                  </span>
                )}
                <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                  <div
                    className={`w-full rounded-t-lg transition-all duration-200 ${active ? 'bg-brand-blue' : 'bg-blue-100 group-hover:bg-blue-200'}`}
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${active ? 'text-brand-blue' : 'text-gray-400'}`}>{d.month}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Tables ────────────────────────────────────────────────────

function TopHotelsPanel({ hotels }: { hotels: TopHotel[] }) {
  const max = hotels[0]?.revenue || 1;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Top Hotels by Revenue</h2>
        <p className="text-xs text-gray-400 mt-0.5">All time</p>
      </div>
      <div className="px-6 py-4 space-y-4">
        {hotels.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No data yet.</p>
        ) : hotels.map((hotel, i) => {
          const pct = (hotel.revenue / max) * 100;
          return (
            <div key={hotel.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-gray-400 w-4">#{i + 1}</span>
                  <p className="text-sm font-medium text-gray-800 truncate">{hotel.name}</p>
                  <span className="text-xs text-gray-400 shrink-0">{hotel.city}</span>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="text-sm font-bold text-gray-900"><AEDAmount amount={hotel.revenue} /></span>
                  <p className="text-xs text-gray-400">{hotel.booking_count} bookings</p>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-blue to-blue-400" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CityBreakdown({ cities }: { cities: TopCity[] }) {
  const total = cities.reduce((s, c) => s + c.booking_count, 0) || 1;
  const colors = ['bg-brand-blue', 'bg-blue-400', 'bg-blue-300', 'bg-amber-400', 'bg-amber-300'];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Top Cities</h2>
        <p className="text-xs text-gray-400 mt-0.5">Booking distribution · All time</p>
      </div>
      <div className="px-6 py-4">
        <div className="flex h-3 rounded-full overflow-hidden mb-5">
          {cities.map((c, i) => (
            <div
              key={c.city}
              className={`${colors[i % colors.length]} transition-all`}
              style={{ width: `${(c.booking_count / total) * 100}%` }}
            />
          ))}
        </div>
        <div className="space-y-3">
          {cities.map((c, i) => (
            <div key={c.city} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors[i % colors.length]}`} />
                <span className="text-sm font-medium text-gray-700 truncate">{c.city}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="text-xs text-gray-400">{c.booking_count} bookings</span>
                <span className="text-xs font-semibold text-gray-600 w-8 text-right">
                  {((c.booking_count / total) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PartnerTable({ partners, commissionRate }: { partners: PartnerRevenueSummary[]; commissionRate: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Partner Performance</h2>
        <p className="text-xs text-gray-400 mt-0.5">All time · {commissionRate}% platform commission</p>
      </div>
      {partners.length === 0 ? (
        <div className="px-6 py-8 text-center text-gray-400 text-sm">No partner data yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Partner</th>
                <th className="px-5 py-3 text-right">Hotels</th>
                <th className="px-5 py-3 text-right">Bookings</th>
                <th className="px-5 py-3 text-right">Gross</th>
                <th className="px-5 py-3 text-right text-amber-600">Platform ({commissionRate}%)</th>
                <th className="px-5 py-3 text-right text-emerald-600">Partner Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {partners.map((p) => (
                <tr key={p.partner_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900 truncate max-w-[160px]">{p.partner_name}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[160px]">{p.partner_email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-600">{p.hotel_count}</td>
                  <td className="px-5 py-3.5 text-right text-gray-600">{p.booking_count}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-900"><AEDAmount amount={p.gross_revenue} /></td>
                  <td className="px-5 py-3.5 text-right font-medium text-amber-600"><AEDAmount amount={p.admin_commission} /></td>
                  <td className="px-5 py-3.5 text-right font-bold text-emerald-600"><AEDAmount amount={p.partner_payout} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-right">
                <td className="px-5 py-3 text-left text-gray-900">Total</td>
                <td className="px-5 py-3 text-gray-700">{partners.reduce((s, p) => s + p.hotel_count, 0)}</td>
                <td className="px-5 py-3 text-gray-700">{partners.reduce((s, p) => s + p.booking_count, 0)}</td>
                <td className="px-5 py-3 text-gray-900"><AEDAmount amount={partners.reduce((s, p) => s + p.gross_revenue, 0)} /></td>
                <td className="px-5 py-3 text-amber-600"><AEDAmount amount={partners.reduce((s, p) => s + p.admin_commission, 0)} /></td>
                <td className="px-5 py-3 text-emerald-600"><AEDAmount amount={partners.reduce((s, p) => s + p.partner_payout, 0)} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function ReportsClient({
  stats, trend, topHotels, topCities, partnerRevenue, commissionRate,
}: {
  stats: ReportStats;
  trend: TrendPoint[];
  topHotels: TopHotel[];
  topCities: TopCity[];
  partnerRevenue: PartnerRevenueSummary[];
  commissionRate: number;
}) {
  const [range, setRange] = useState<Range>('6m');
  const sliceCount = range === '3m' ? 3 : range === '6m' ? 6 : 12;
  const sliced = trend.slice(-sliceCount);

  // KPI metrics derived from sliced period
  const periodRevenue    = sliced.reduce((s, d) => s + d.revenue,        0);
  const periodPlatform   = sliced.reduce((s, d) => s + d.platform_rev,   0);
  const periodPartner    = sliced.reduce((s, d) => s + d.partner_payout, 0);
  const periodBookings   = sliced.reduce((s, d) => s + d.booking_count,  0);
  const adr              = periodBookings > 0 ? Math.round(periodRevenue / periodBookings) : 0;

  // MoM growth: last month vs month before
  const last  = sliced[sliced.length - 1]?.revenue ?? 0;
  const prev  = sliced[sliced.length - 2]?.revenue ?? 0;
  const momPct = prev > 0 ? Number(((last - prev) / prev * 100).toFixed(1)) : 0;

  const RANGE_LABELS: Record<Range, string> = { '3m': 'Last 3 Months', '6m': 'Last 6 Months', '12m': 'Last 12 Months' };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-6 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
        <div className="px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #D97706 0%, #B45309 100%)' }} />
              <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>Analytics & Reports</h1>
            </div>
            <p className="text-white/45 text-xs pl-3">Platform-wide performance · {RANGE_LABELS[range]}</p>
          </div>
          {/* Date range tabs */}
          <div className="flex gap-1 bg-white/10 rounded-xl p-1">
            {(['3m', '6m', '12m'] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  range === r ? 'bg-white text-brand-blue shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                {r === '3m' ? '3M' : r === '6m' ? '6M' : '12M'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Gross Revenue',    value: periodRevenue,  isAED: true  },
          { label: 'Platform Revenue', value: periodPlatform, isAED: true,  amber: true },
          { label: 'Partner Payouts',  value: periodPartner,  isAED: true,  green: true },
          { label: 'Bookings',         value: periodBookings, isAED: false },
          { label: 'Avg Booking (ADR)',value: adr,            isAED: true,  blue: true  },
          { label: 'Cancel Rate',      value: `${stats.cancel_rate}%`, isAED: false, red: stats.cancel_rate > 10 },
        ].map(({ label, value, isAED, amber, green, blue, red }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 leading-tight">{label}</p>
            <p className={`text-xl font-bold ${
              amber ? 'text-amber-600' : green ? 'text-emerald-600' : blue ? 'text-brand-blue' : red ? 'text-red-500' : 'text-gray-900'
            }`}>
              {isAED && typeof value === 'number' ? <AEDAmount amount={value} /> : value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <RevenueLineChart data={sliced} />
        <BookingBarChart  data={sliced} />
      </div>

      {/* MoM growth callout */}
      {sliced.length >= 2 && (
        <div className={`mb-6 rounded-2xl px-6 py-4 flex items-center gap-3 ${momPct >= 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
          <span className={`text-2xl font-bold ${momPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {momPct >= 0 ? '↑' : '↓'} {Math.abs(momPct)}%
          </span>
          <div>
            <p className={`text-sm font-semibold ${momPct >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              Month-over-Month Revenue {momPct >= 0 ? 'Growth' : 'Decline'}
            </p>
            <p className="text-xs text-gray-400">
              Comparing {sliced[sliced.length - 1]?.month} vs {sliced[sliced.length - 2]?.month}
            </p>
          </div>
        </div>
      )}

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <TopHotelsPanel hotels={topHotels} />
        <CityBreakdown  cities={topCities} />
      </div>

      <PartnerTable partners={partnerRevenue} commissionRate={commissionRate} />
    </div>
  );
}
