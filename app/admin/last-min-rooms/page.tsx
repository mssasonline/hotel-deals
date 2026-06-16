'use client';

import { useState, useEffect, useCallback } from 'react';
import { getLastMinRooms, type LastMinHotelGroup } from './actions';
import {
  getCurrentTier,
  calcLivePrice,
  calcActualDiscount,
  type PriceTier,
} from '@/lib/pricingEngine';
import AEDAmount from '@/app/partner/components/AEDAmount';

// ── Tier badge colours ────────────────────────────────────────────────────────
const TIER_STYLES: Record<number, { bg: string; text: string; dot: string }> = {
  0: { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-500'  }, // Midnight 50%
  1: { bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500'     }, // Early Bird 10%
  2: { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   }, // Afternoon 15%
  3: { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500'  }, // Evening 35%
};

function useTier() {
  const [tier, setTier] = useState<PriceTier>(() => getCurrentTier());

  useEffect(() => {
    const refresh = () => setTier(getCurrentTier());
    const ms = tier.nextTierTime.getTime() - Date.now();
    const id = setTimeout(refresh, Math.max(ms, 0));
    return () => clearTimeout(id);
  }, [tier]);

  return tier;
}

function useCountdown(target: Date) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    function tick() {
      const diff = Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000));
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setRemaining(
        h > 0
          ? `${h}h ${String(m).padStart(2, '0')}m`
          : `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`,
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return remaining;
}

// ── Discount badge colour ─────────────────────────────────────────────────────
function discountBadgeClass(pct: number): string {
  if (pct >= 40) return 'bg-red-500 text-white';
  if (pct >= 25) return 'bg-orange-500 text-white';
  if (pct >= 10) return 'bg-brand-gold text-white';
  return 'bg-gray-200 text-gray-600';
}

// ── Single hotel card ─────────────────────────────────────────────────────────
function HotelCard({ group, tier }: { group: LastMinHotelGroup; tier: PriceTier }) {
  const maxDisc = Math.max(
    ...group.rooms.map((r) => calcActualDiscount(r.base_price, calcLivePrice(r.base_price, r.min_price, tier))),
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Hotel header */}
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-base truncate">{group.hotel_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{group.hotel_city}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 font-medium">{group.rooms.length} room{group.rooms.length !== 1 ? 's' : ''}</span>
          {maxDisc > 0 && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${discountBadgeClass(maxDisc)}`}>
              up to -{maxDisc}%
            </span>
          )}
        </div>
      </div>

      {/* Rooms table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Room Type</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Base Price</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Floor Price</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Live Price</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Discount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {group.rooms.map((room) => {
              const live = calcLivePrice(room.base_price, room.min_price, tier);
              const disc = calcActualDiscount(room.base_price, live);
              const atFloor = room.min_price > 0 && live <= room.min_price;
              return (
                <tr key={room.room_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-gray-900 truncate max-w-[200px]">{room.room_name}</p>
                    {atFloor && (
                      <span className="inline-block mt-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        At floor price
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400 line-through whitespace-nowrap">
                    <AEDAmount amount={room.base_price} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">
                    {room.min_price > 0 ? <AEDAmount amount={room.min_price} /> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-600 whitespace-nowrap">
                    <AEDAmount amount={live} />
                    <span className="text-xs font-normal text-gray-400">/n</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {disc > 0 ? (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${discountBadgeClass(disc)}`}>
                        -{disc}%
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
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
export default function LastMinRoomsPage() {
  const tier    = useTier();
  const countdown = useCountdown(tier.nextTierTime);
  const [groups,  setGroups]  = useState<LastMinHotelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [query,   setQuery]   = useState('');

  const load = useCallback(() => {
    getLastMinRooms().then((data) => { setGroups(data); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const styles = TIER_STYLES[tier.tierIndex] ?? TIER_STYLES[1];
  const filtered = query.trim()
    ? groups.filter((g) => g.hotel_name.toLowerCase().includes(query.trim().toLowerCase()))
    : groups;
  const totalRooms = groups.reduce((s, g) => s + g.rooms.length, 0);

  return (
    <div className="p-6 lg:p-8 max-w-[1200px]">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Last Min Rooms</h1>
      </div>

      {/* Active tier banner */}
      <div className={`mb-6 rounded-2xl border px-5 py-4 flex items-center justify-between gap-4 ${styles.bg} border-transparent`}>
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${styles.dot} animate-pulse`} />
          <div>
            <p className={`font-bold text-base ${styles.text}`}>{tier.label}</p>
            <p className={`text-xs mt-0.5 ${styles.text} opacity-70`}>
              Current tier · {tier.discountPercent}% off base price
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-xs font-medium ${styles.text} opacity-60`}>Next tier ({tier.nextDiscountPercent}% off) in</p>
          <p className={`font-mono font-bold text-lg ${styles.text}`}>{countdown}</p>
        </div>
      </div>

      {/* Stats row */}
      {!loading && (
        <div className="flex gap-3 mb-6 flex-wrap items-center">
          {/* Search bar */}
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
          {[
            { label: 'Hotels',     value: groups.length },
            { label: 'Rooms',      value: totalRooms    },
            { label: 'Active Tier', value: tier.label   },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3 flex items-center gap-3">
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">{label}</span>
              <span className="font-bold text-gray-900 text-sm">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-brand-blue" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="font-medium text-gray-500">
            {query ? `No hotels matching "${query}"` : 'No rooms found'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map((group) => (
            <HotelCard key={group.hotel_id} group={group} tier={tier} />
          ))}
        </div>
      )}
    </div>
  );
}
