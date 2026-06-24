'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getMyHotels, getMyRooms, updateMyRoom, getTodayRoomRates, type PartnerRoom } from '../actions';
import { getTranslations } from '@/lib/i18n/translations';
import { getCurrentTier, calcLivePrice, type PriceTier } from '@/lib/pricingEngine';
import AEDAmount, { useAEDFormat } from '../components/AEDAmount';

type Room = PartnerRoom;

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
    </div>
  );
}

function AvailabilityBadge({
  available,
  total,
  onClick,
}: {
  available: number;
  total: number;
  onClick?: () => void;
}) {
  const pct = total > 0 ? available / total : 0;
  const color =
    pct > 0.5 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : pct > 0   ? 'bg-amber-50 text-amber-700 border-amber-200'
    :             'bg-red-50 text-red-600 border-red-200';

  return (
    <button
      onClick={onClick}
      title="Click to edit inventory"
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-semibold transition-colors hover:brightness-95 ${color}`}
    >
      <span>{available}</span>
      <span className="opacity-50">/</span>
      <span>{total}</span>
      <svg className="w-3 h-3 ml-0.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </button>
  );
}

// ── Edit Inventory Modal ───────────────────────────────────────────────────────

interface EditInventoryModalProps {
  room: Room;
  hotelName: string;
  onSave: (id: string, qt: number, qa: number) => void;
  onClose: () => void;
}

function EditInventoryModal({ room, hotelName, onSave, onClose }: EditInventoryModalProps) {
  const [quantityTotal,     setQuantityTotal]     = useState(String(room.quantity_total ?? 1));
  const [quantityAvailable, setQuantityAvailable] = useState(String(room.quantity_available ?? room.quantity_total ?? 1));
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    const qt = parseInt(quantityTotal, 10);
    const qa = parseInt(quantityAvailable, 10);
    if (isNaN(qt) || qt < 1)  { setError('Total Slots must be at least 1.'); return; }
    if (isNaN(qa) || qa < 0)  { setError('Available Tonight must be 0 or more.'); return; }
    if (qa > qt)               { setError('Available Tonight cannot exceed Total Slots.'); return; }
    setSaving(true);
    onSave(room.id, qt, qa);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit Inventory</h2>
            <p className="text-xs text-gray-400 mt-0.5">{room.name} · {hotelName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" disabled={saving}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Slots</label>
            <input
              type="number" value={quantityTotal}
              onChange={e => setQuantityTotal(e.target.value)}
              min="1" step="1"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
            <p className="text-xs text-gray-400 mt-1">Max rooms listed on the platform</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Available Tonight</label>
            <input
              type="number" value={quantityAvailable}
              onChange={e => setQuantityAvailable(e.target.value)}
              min="0" step="1"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
            <p className="text-xs text-gray-400 mt-1">Resets to Total each morning. Lower if rooms are booked via other channels.</p>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-700">
              Lower <strong>Available Tonight</strong> if some rooms are already booked through your own website or other channels.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-60 flex items-center gap-2 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}>
            {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LastMinRoomPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = getTranslations('en');

  const fmt = useAEDFormat();

  const [loading,      setLoading]      = useState(true);
  const [rooms,        setRooms]        = useState<Room[]>([]);
  const [hotelIds,     setHotelIds]     = useState<string[]>([]);
  const [hotelNames,   setHotelNames]   = useState<Record<string, string>>({});
  const [hotelFilter,  setHotelFilter]  = useState('all');
  const [editRoom,     setEditRoom]     = useState<Room | null>(null);
  const [saveMsg,      setSaveMsg]      = useState<string | null>(null);
  const [todayRates,   setTodayRates]   = useState<Record<string, number>>({});
  const [tier,         setTier]         = useState<PriceTier>(getCurrentTier());

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }

    async function load() {
      try {
        const myHotels = await getMyHotels();
        if (myHotels.length > 0) {
          const ids = myHotels.map(h => h.id);
          const nameMap: Record<string, string> = {};
          myHotels.forEach(h => { nameMap[h.id] = h.name; });
          setHotelIds(ids);
          setHotelNames(nameMap);
          const myRooms = await getMyRooms();
          setRooms(myRooms);
          // Load today's calendar rates for live price calculation
          const allIds = myRooms.map(r => r.id);
          if (allIds.length) {
            const rates = await getTodayRoomRates(allIds, 'en');
            setTodayRates(rates);
          }
          setTier(getCurrentTier());
        }
      } catch (err) {
        console.error('[last-min-room] load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, authLoading, router]);

  async function handleSaveInventory(id: string, qt: number, qa: number) {
    const { error } = await updateMyRoom(id, {
      quantity_total:     qt,
      quantity_available: qa,
    });

    if (error) { alert('Failed to save: ' + error); setEditRoom(null); return; }

    setRooms(prev => prev.map(r =>
      r.id === id
        ? { ...r, quantity_total: qt, quantity_available: qa, available: qa > 0 ? 1 : 0 }
        : r
    ));
    setEditRoom(null);
    showMsg('Inventory updated successfully.');
  }

  function showMsg(msg: string) {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(null), 3000);
  }

  const multiHotel = hotelIds.length > 1;

  const filtered = rooms.filter(r =>
    hotelFilter === 'all' || r.hotel_id === hotelFilter
  );

  const totalAvailable = filtered.reduce((s, r) => s + (r.quantity_available ?? r.available ?? 0), 0);
  const lowAvailRooms  = filtered.filter(r => {
    const qa = r.quantity_available ?? r.available ?? 0;
    const qt = r.quantity_total ?? 1;
    return qa / qt <= 0.2;
  }).length;

  if (loading) return <Spinner />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Page header */}
      <div className="mb-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #D97706 0%, #B45309 100%)' }} />
              <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>{t['partner.nav.lastMinRoom']}</h1>
            </div>
            <p className="text-white/45 text-xs pl-3">Control tonight&apos;s room availability — lower the count if rooms are already booked elsewhere.</p>
          </div>
          {multiHotel && (
            <select value={hotelFilter} onChange={e => setHotelFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-700">
              <option value="all">{t['partner.rooms.allHotels']}</option>
              {hotelIds.map(id => <option key={id} value={id}>{hotelNames[id] ?? id}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Toast */}
      {saveMsg && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {saveMsg}
        </div>
      )}

      {/* KPI strip */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 text-center" style={{ border: '1px solid rgba(30,58,138,0.09)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
            <p className="text-2xl font-bold text-gray-900">{filtered.length}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{t['partner.rooms.totalRooms']}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center" style={{ border: '1px solid rgba(30,58,138,0.09)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
            <p className="text-2xl font-bold text-green-600">{totalAvailable}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{t['partner.rooms.availTonight']}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center" style={{ border: '1px solid rgba(30,58,138,0.09)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
            <p className={`text-2xl font-bold ${lowAvailRooms > 0 ? 'text-red-500' : 'text-gray-900'}`}>{lowAvailRooms}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{t['partner.rooms.lowAvail']}</p>
          </div>
        </div>
      )}

      {/* Rooms table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>

        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-gray-50">
          {filtered.map(room => {
            const qtyAvailable      = room.quantity_available ?? room.available ?? 0;
            const qtyTotal          = room.quantity_total ?? 1;
            const basePrice         = Number(room.base_price ?? 0);
            const minPrice          = Number(room.min_price ?? 0);
            const minPriceWeekend   = Number(room.min_price_weekend ?? 0) || minPrice;
            const effectivePrice    = todayRates[room.id] ?? basePrice;
            const todayDow          = new Date().getDay();
            const isTodayWeekend    = todayDow === 5 || todayDow === 6 || todayDow === 0;
            const effectiveMinPrice = isTodayWeekend ? minPriceWeekend : minPrice;
            const livePrice         = calcLivePrice(effectivePrice, effectiveMinPrice, tier);
            return (
              <div key={room.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">{room.name}</p>
                    {multiHotel && <p className="text-xs text-gray-400 truncate">{hotelNames[room.hotel_id] ?? '—'}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-green-600 text-sm"><AEDAmount amount={livePrice} /></p>
                    <p className="text-xs text-gray-400 line-through"><AEDAmount amount={basePrice} /></p>
                  </div>
                </div>
                <div className="mb-3">
                  <AvailabilityBadge
                    available={qtyAvailable}
                    total={qtyTotal}
                    onClick={() => setEditRoom(room)}
                  />
                </div>
                <button
                  onClick={() => setEditRoom(room)}
                  className="flex items-center gap-1 text-xs font-medium text-brand-blue bg-brand-blue-light hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-gray-400 text-sm">{t['partner.rooms.noRooms']}</p>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="px-4 py-3">Room Name</th>
                {multiHotel && <th className="px-3 py-3">Hotel</th>}
                <th className="px-3 py-3 text-right">Original Price</th>
                <th className="px-3 py-3 text-right">
                  Current Price
                  <span className="block text-[10px] font-normal text-orange-400 normal-case leading-tight">-{tier.discountPercent}% now</span>
                </th>
                <th className="px-3 py-3 text-center">Available Tonight</th>
                <th className="px-3 py-3 text-right">{/* actions */}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(room => {
                const qtyAvailable      = room.quantity_available ?? room.available ?? 0;
                const qtyTotal          = room.quantity_total ?? 1;
                const basePrice         = Number(room.base_price ?? 0);
                const minPrice          = Number(room.min_price ?? 0);
                const minPriceWeekend   = Number(room.min_price_weekend ?? 0) || minPrice;
                const effectivePrice    = todayRates[room.id] ?? basePrice;
                const todayDow          = new Date().getDay();
                const isTodayWeekend    = todayDow === 5 || todayDow === 6 || todayDow === 0;
                const effectiveMinPrice = isTodayWeekend ? minPriceWeekend : minPrice;
                const livePrice         = calcLivePrice(effectivePrice, effectiveMinPrice, tier);
                return (
                  <tr key={room.id} className="hover:bg-gray-50/40 transition-colors border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900 text-sm">{room.name}</span>
                      {room.type && (
                        <span className="ml-2 text-xs text-gray-400">{room.type}</span>
                      )}
                    </td>
                    {multiHotel && (
                      <td className="px-3 py-3 text-gray-500 text-xs max-w-[120px] truncate">
                        {hotelNames[room.hotel_id] ?? '—'}
                      </td>
                    )}
                    <td className="px-3 py-3 text-right">
                      <span className="text-gray-400 line-through text-xs"><AEDAmount amount={basePrice} /></span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-bold text-green-600"><AEDAmount amount={livePrice} /></span>
                    </td>
                    <td className="px-3 py-3">
                      <AvailabilityBadge
                        available={qtyAvailable}
                        total={qtyTotal}
                        onClick={() => setEditRoom(room)}
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => setEditRoom(room)}
                        className="flex items-center gap-1 text-xs font-medium text-brand-blue bg-brand-blue-light hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors ml-auto"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={multiHotel ? 6 : 5} className="px-6 py-12 text-center text-gray-400 text-sm">
                    {t['partner.rooms.noRooms']}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && rooms.length !== filtered.length && (
          <div className="px-6 py-3 border-t border-gray-50 text-xs text-gray-400">
            {filtered.length} / {rooms.length}
          </div>
        )}
      </div>

      {/* Edit Inventory modal */}
      {editRoom && (
        <EditInventoryModal
          room={editRoom}
          hotelName={hotelNames[editRoom.hotel_id] ?? 'Hotel'}
          onSave={handleSaveInventory}
          onClose={() => setEditRoom(null)}
        />
      )}
    </div>
  );
}
