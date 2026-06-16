'use client';

import { useState } from 'react';
import AnalyticsCard from '../components/AnalyticsCard';
import AEDAmount, { useAEDFormat } from '../../partner/components/AEDAmount';

// ── Types ─────────────────────────────────────────────────────

export type TrendPoint = { month: string; revenue: number; booking_count: number };
export type TopHotel   = { id: number; name: string; city: string; booking_count: number; revenue: number };
export type TopCity    = { city: string; booking_count: number; revenue: number };

export type ReportStats = {
  total_revenue:     number;
  growth_pct:        number;
  cancel_rate:       number;
  avg_booking_value: number;
  total_bookings:    number;
  status_counts:     Record<string, number>;
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

// ── Charts ────────────────────────────────────────────────────

function RevenueLineChart({ data }: { data: TrendPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const fmt = useAEDFormat();
  if (data.length === 0) return null;

  const W = 500, H = 140;
  const PAD = { t: 12, r: 12, b: 28, l: 48 };
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
        <h2 className="font-semibold text-gray-900">Revenue Growth</h2>
        <p className="text-xs text-gray-400 mt-0.5">Monthly platform revenue</p>
      </div>
      <div className="px-6 py-4">
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
                <text x={PAD.l - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#94a3b8">{fmt(t * max)}</text>
              </g>
            );
          })}
          {data.map((d, i) => (
            <text key={d.month} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="10" fill={hovered === i ? '#003B95' : '#94a3b8'}>{d.month}</text>
          ))}
          <path d={areaPath} fill="url(#rg2)" />
          <path d={linePath} fill="none" stroke="#003B95" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {data.map((d, i) => (
            <g key={i}>
              <circle cx={toX(i)} cy={toY(d.revenue)} r={hovered === i ? 5 : 3} fill={hovered === i ? '#003B95' : 'white'} stroke="#003B95" strokeWidth="2" />
              {hovered === i && (
                <g>
                  <rect x={toX(i) - 36} y={toY(d.revenue) - 28} width="72" height="20" rx="4" fill="#003B95" />
                  <text x={toX(i)} y={toY(d.revenue) - 14} textAnchor="middle" fontSize="10" fill="white" fontWeight="700">{fmt(d.revenue)}</text>
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
        <h2 className="font-semibold text-gray-900">Booking Trends</h2>
        <p className="text-xs text-gray-400 mt-0.5">Monthly bookings over last 6 months</p>
      </div>
      <div className="px-6 py-6">
        <div className="flex items-end gap-3 h-40">
          {data.map((d, i) => {
            const pct = (d.booking_count / max) * 100;
            const active = hovered === i;
            return (
              <div
                key={d.month}
                className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer group"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {active && (
                  <span className="text-xs font-bold text-brand-blue bg-blue-50 px-2 py-0.5 rounded-lg">
                    {d.booking_count}
                  </span>
                )}
                <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
                  <div
                    className={`w-full rounded-t-lg transition-all duration-200 ${active ? 'bg-brand-blue' : 'bg-brand-blue-light group-hover:bg-brand-blue/40'}`}
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

// ── Panels ────────────────────────────────────────────────────

function TopHotelsPanel({ hotels }: { hotels: TopHotel[] }) {
  const max = hotels[0]?.revenue || 1;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Top Hotels by Revenue</h2>
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
                <span className="text-sm font-bold text-gray-900 shrink-0 ml-2">
                  <AEDAmount amount={hotel.revenue} />
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
  const colors = ['bg-brand-blue', 'bg-blue-400', 'bg-blue-300', 'bg-brand-gold', 'bg-amber-300'];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Top Cities</h2>
        <p className="text-xs text-gray-400 mt-0.5">Booking distribution by city</p>
      </div>
      <div className="px-6 py-4">
        <div className="flex h-4 rounded-full overflow-hidden mb-5">
          {cities.map((c, i) => (
            <div
              key={c.city}
              className={`${colors[i % colors.length]} transition-all`}
              style={{ width: `${(c.booking_count / total) * 100}%` }}
              title={`${c.city}: ${c.booking_count} bookings`}
            />
          ))}
        </div>
        <div className="space-y-3">
          {cities.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">No data yet.</p>
          ) : cities.map((c, i) => (
            <div key={c.city} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${colors[i % colors.length]}`} />
                <span className="text-sm text-gray-700">{c.city}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{c.booking_count.toLocaleString()} bookings</span>
                <span className="font-semibold text-gray-700">{((c.booking_count / total) * 100).toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBreakdown({ counts, total }: { counts: Record<string, number>; total: number }) {
  const statuses = [
    { key: 'upcoming',  label: 'Upcoming',  color: 'bg-indigo-400' },
    { key: 'confirmed', label: 'Confirmed', color: 'bg-blue-500'   },
    { key: 'pending',   label: 'Pending',   color: 'bg-amber-400'  },
    { key: 'completed', label: 'Completed', color: 'bg-emerald-500'},
    { key: 'cancelled', label: 'Cancelled', color: 'bg-red-400'    },
  ].filter((s) => (counts[s.key] ?? 0) > 0);

  const max = Math.max(...statuses.map((s) => counts[s.key] ?? 0), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Booking Status</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Total: <span className="font-semibold text-gray-700">{total.toLocaleString()}</span> bookings
        </p>
      </div>
      <div className="px-6 py-5 space-y-3">
        {statuses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No bookings yet.</p>
        ) : statuses.map((s) => {
          const count = counts[s.key] ?? 0;
          const pct = (count / max) * 100;
          return (
            <div key={s.key} className="flex items-center gap-3">
              <div
                className={`${s.color} rounded-lg flex items-center justify-end px-3`}
                style={{ width: `${Math.max(pct, 10)}%`, minWidth: '80px', height: '36px' }}
              >
                <span className="text-xs font-bold text-white">{count.toLocaleString()}</span>
              </div>
              <span className="text-xs text-gray-500 shrink-0">{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Partner Revenue Table ─────────────────────────────────────

function PartnerRevenueTable({ partners, commissionRate }: { partners: PartnerRevenueSummary[]; commissionRate: number }) {
  const partnerRate    = 100 - commissionRate;
  const totalGross     = partners.reduce((s, p) => s + p.gross_revenue,    0);
  const totalTax       = partners.reduce((s, p) => s + p.tax_collected,    0);
  const totalAdmin     = partners.reduce((s, p) => s + p.admin_commission, 0);
  const totalPayout    = partners.reduce((s, p) => s + p.partner_payout,   0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">Partner Revenue Distribution</h2>
          <p className="text-xs text-gray-400 mt-0.5">{partnerRate}% Partner · {commissionRate}% Platform · of room price (excl. taxes)</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs shrink-0">
          <span className="px-3 py-1.5 bg-gray-50 rounded-lg text-gray-600">
            Guest paid: <strong className="text-gray-900"><AEDAmount amount={totalGross} /></strong>
          </span>
          <span className="px-3 py-1.5 bg-orange-50 rounded-lg text-orange-700">
            Taxes: <strong><AEDAmount amount={totalTax} /></strong>
          </span>
          <span className="px-3 py-1.5 bg-emerald-50 rounded-lg text-emerald-700">
            Partners: <strong><AEDAmount amount={totalPayout} /></strong>
          </span>
          <span className="px-3 py-1.5 bg-blue-50 rounded-lg text-brand-blue">
            Platform: <strong><AEDAmount amount={totalAdmin} /></strong>
          </span>
        </div>
      </div>
      {partners.length === 0 ? (
        <div className="px-6 py-10 text-center text-gray-400 text-sm">No data yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Partner</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Hotels</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Bookings</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Guest Paid</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-orange-500 uppercase">Taxes</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-emerald-600 uppercase">Partner ({partnerRate}%)</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-brand-blue uppercase">Platform ({commissionRate}%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {partners.map(p => (
                <tr key={p.partner_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">{p.partner_name}</p>
                    <p className="text-xs text-gray-400">{p.partner_email}</p>
                  </td>
                  <td className="px-5 py-4 text-center text-gray-600">{p.hotel_count}</td>
                  <td className="px-5 py-4 text-center text-gray-600">{p.booking_count}</td>
                  <td className="px-5 py-4 text-right font-semibold text-gray-900"><AEDAmount amount={p.gross_revenue} /></td>
                  <td className="px-5 py-4 text-right text-orange-600"><AEDAmount amount={p.tax_collected} /></td>
                  <td className="px-5 py-4 text-right font-semibold text-emerald-600"><AEDAmount amount={p.partner_payout} /></td>
                  <td className="px-5 py-4 text-right font-semibold text-brand-blue"><AEDAmount amount={p.admin_commission} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                <td className="px-5 py-3 text-gray-700" colSpan={3}>Total</td>
                <td className="px-5 py-3 text-right text-gray-900"><AEDAmount amount={totalGross} /></td>
                <td className="px-5 py-3 text-right text-orange-600"><AEDAmount amount={totalTax} /></td>
                <td className="px-5 py-3 text-right text-emerald-600"><AEDAmount amount={totalPayout} /></td>
                <td className="px-5 py-3 text-right text-brand-blue"><AEDAmount amount={totalAdmin} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Page Component ────────────────────────────────────────────

export default function ReportsClient({
  stats,
  trend,
  topHotels,
  topCities,
  partnerRevenue,
  commissionRate,
}: {
  stats:          ReportStats;
  trend:          TrendPoint[];
  topHotels:      TopHotel[];
  topCities:      TopCity[];
  partnerRevenue: PartnerRevenueSummary[];
  commissionRate: number;
}) {
  const adminCommission = Math.round(partnerRevenue.reduce((s, p) => s + p.admin_commission, 0) * 100) / 100;

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-400 text-sm mt-0.5">Platform performance overview</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <AnalyticsCard
          title="Total Revenue"
          value={<AEDAmount amount={stats.total_revenue} />}
          change={`${stats.growth_pct >= 0 ? '+' : ''}${stats.growth_pct}% vs last month`}
          positive={stats.growth_pct >= 0}
          description="All time"
        />
        <AnalyticsCard
          title={`Platform Commission (${commissionRate}%)`}
          value={<AEDAmount amount={adminCommission} />}
          change={`${commissionRate}% of total bookings`}
          positive={true}
          description="Platform revenue"
        />
        <AnalyticsCard
          title="Total Bookings"
          value={stats.total_bookings.toLocaleString()}
          change="All time"
          positive={true}
          description="Confirmed + active"
        />
        <AnalyticsCard
          title="Average Booking Value"
          value={stats.avg_booking_value > 0 ? <AEDAmount amount={stats.avg_booking_value} /> : '—'}
          change="Per confirmed booking"
          positive={true}
          description="Excl. cancelled"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <RevenueLineChart data={trend} />
        <BookingBarChart data={trend} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <TopHotelsPanel hotels={topHotels} />
        <CityBreakdown cities={topCities} />
        <StatusBreakdown counts={stats.status_counts} total={stats.total_bookings} />
      </div>

      {/* Partner revenue split table */}
      <PartnerRevenueTable partners={partnerRevenue} commissionRate={commissionRate} />
    </div>
  );
}
