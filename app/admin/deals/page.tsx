'use client';

import { useState, useEffect } from 'react';
import { getAllDeals, adminUpdateDealStatus, type AdminDealRow } from './actions';
import StatusBadge from '../components/StatusBadge';
import { useAdminDateFormat } from '../components/useAdminFormat';
import AEDAmount from '../../partner/components/AEDAmount';
import type { DealStatus } from '@/app/partner/deals/actions';

const STATUS_FILTERS: Array<{ label: string; value: DealStatus | 'all' }> = [
  { label: 'All Deals', value: 'all'              },
  { label: 'Pending',   value: 'pending_approval' },
  { label: 'Active',    value: 'active'           },
  { label: 'Paused',    value: 'paused'           },
  { label: 'Ended',     value: 'ended'            },
];

type Action = 'activate' | 'pause' | 'end';

const ACTION_STYLES: Record<Action, string> = {
  activate: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  pause:    'bg-amber-50 text-amber-700 hover:bg-amber-100',
  end:      'bg-red-50 text-red-600 hover:bg-red-100',
};
const ACTION_LABELS: Record<Action, string> = {
  activate: 'Activate',
  pause:    'Pause',
  end:      'End',
};
const ACTION_MAP: Record<Action, DealStatus> = {
  activate: 'active',
  pause:    'paused',
  end:      'ended',
};

function calcDiscount(base: number, deal: number): number {
  if (!base || base <= 0) return 0;
  return Math.max(0, Math.round((1 - deal / base) * 100));
}

function getActions(deal: AdminDealRow): Action[] {
  if (deal.status === 'active') return ['pause', 'end'];
  if (deal.status === 'paused') return ['activate', 'end'];
  return [];
}

// ── Group deals by hotel ──────────────────────────────────────────────────────
type HotelGroup = {
  hotel_id: number;
  hotel_name: string;
  hotel_city: string;
  partner_name: string;
  deals: AdminDealRow[];
};

function groupByHotel(deals: AdminDealRow[]): HotelGroup[] {
  const map = new Map<number, HotelGroup>();
  for (const deal of deals) {
    if (!map.has(deal.hotel_id)) {
      map.set(deal.hotel_id, {
        hotel_id:     deal.hotel_id,
        hotel_name:   deal.hotel_name,
        hotel_city:   deal.hotel_city,
        partner_name: deal.partner_name,
        deals:        [],
      });
    }
    map.get(deal.hotel_id)!.deals.push(deal);
  }
  return Array.from(map.values());
}

// ── Hotel group card ──────────────────────────────────────────────────────────
function HotelGroupCard({
  group,
  onUpdateStatus,
  fmtDate,
}: {
  group: HotelGroup;
  onUpdateStatus: (id: string, status: DealStatus) => void;
  fmtDate: (iso: string | null) => string;
}) {
  const activeCount = group.deals.filter((d) => d.status === 'active').length;
  const pausedCount = group.deals.filter((d) => d.status === 'paused').length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Hotel header */}
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}>
            <svg className="w-4.5 h-4.5 text-white w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 truncate text-base">{group.hotel_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {group.hotel_city}
              <span className="mx-1.5 text-gray-200">·</span>
              {group.partner_name}
            </p>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeCount > 0 && (
            <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {activeCount} active
            </span>
          )}
          {pausedCount > 0 && (
            <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {pausedCount} paused
            </span>
          )}
          <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2.5 py-1 rounded-full">
            {group.deals.length} total
          </span>
        </div>
      </div>

      {/* Deals table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Room</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Base</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Deal Price</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Off</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Period</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {group.deals.map((deal) => {
              const disc    = calcDiscount(deal.base_price, deal.deal_price);
              const actions = getActions(deal);
              return (
                <tr key={deal.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* Room */}
                  <td className="px-5 py-3">
                    <p className="font-semibold text-gray-900 truncate max-w-[160px]">{deal.room_name}</p>
                    {deal.title && (
                      <span className="inline-block mt-0.5 bg-brand-gold/10 text-brand-gold text-[10px] font-semibold px-1.5 py-0.5 rounded">
                        {deal.title}
                      </span>
                    )}
                  </td>
                  {/* Base */}
                  <td className="px-4 py-3 text-right text-xs text-gray-400 line-through whitespace-nowrap">
                    <AEDAmount amount={deal.base_price} />
                  </td>
                  {/* Deal price */}
                  <td className="px-4 py-3 text-right font-bold text-green-600 whitespace-nowrap">
                    <AEDAmount amount={deal.deal_price} />
                    <span className="text-xs font-normal text-gray-400">/n</span>
                  </td>
                  {/* Discount */}
                  <td className="px-3 py-3 text-center">
                    {disc > 0 ? (
                      <span className="bg-brand-gold text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                        -{disc}%
                      </span>
                    ) : '—'}
                  </td>
                  {/* Period */}
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                    {fmtDate(deal.start_date)}
                    <span className="mx-1 text-gray-300">→</span>
                    {fmtDate(deal.end_date)}
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={deal.status} variant="deal" />
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      {actions.map((action) => (
                        <button
                          key={action}
                          onClick={() => onUpdateStatus(deal.id, ACTION_MAP[action])}
                          className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${ACTION_STYLES[action]}`}
                        >
                          {ACTION_LABELS[action]}
                        </button>
                      ))}
                    </div>
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DealsPage() {
  const [filter,  setFilter]  = useState<DealStatus | 'all'>('all');
  const [deals,   setDeals]   = useState<AdminDealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query,   setQuery]   = useState('');
  const { fmtDate } = useAdminDateFormat();

  useEffect(() => {
    getAllDeals().then((data) => { setDeals(data); setLoading(false); });
  }, []);

  async function handleUpdateStatus(id: string, status: DealStatus) {
    setDeals((prev) => prev.map((d) => d.id === id ? { ...d, status } : d));
    await adminUpdateDealStatus(id, status);
  }

  // Filter deals, then group by hotel (hide hotels with no matching deals)
  const filtered = deals.filter((d) =>
    (filter === 'all' || d.status === filter) &&
    (!query.trim() || d.hotel_name.toLowerCase().includes(query.trim().toLowerCase()))
  );
  const groups   = groupByHotel(filtered);

  const counts: Record<string, number> = {
    all:              deals.length,
    pending_approval: deals.filter((d) => d.status === 'pending_approval').length,
    active:           deals.filter((d) => d.status === 'active').length,
    paused:           deals.filter((d) => d.status === 'paused').length,
    ended:            deals.filter((d) => d.status === 'ended').length,
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1200px]">

      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hotels Deals</h1>
        </div>
      </div>

      {/* Status tabs + search */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative w-56">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search hotels..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue placeholder-gray-400 transition"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
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
              filter === value
                ? 'text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
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

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-brand-blue" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="font-medium text-gray-500">No deals in this category</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <HotelGroupCard
              key={group.hotel_id}
              group={group}
              onUpdateStatus={handleUpdateStatus}
              fmtDate={fmtDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
