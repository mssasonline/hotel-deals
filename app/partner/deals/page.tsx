'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getMyDeals,
  getMyRooms,
  createDeal,
  updateDeal,
  updateDealStatus,
  deleteDeal,
  exportDealsCSV,
  importDealsCSV,
  updateRoomQuantity,
  type PartnerDeal,
  type DealRoom,
  type DealStatus,
  type CreateDealData,
} from './actions';
import AEDAmount from '@/app/partner/components/AEDAmount';
import StatusBadge from '@/app/admin/components/StatusBadge';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { toAED } from '@/lib/currency';
import { CURRENCY_MAP } from '@/lib/currencyData';
import type { CurrencyCode } from '@/lib/currencyData';

const STATUS_FILTERS: Array<{ label: string; value: DealStatus | 'all' }> = [
  { label: 'All',             value: 'all'              },
  { label: 'Pending',         value: 'pending_approval' },
  { label: 'Active',          value: 'active'           },
  { label: 'Paused',          value: 'paused'           },
  { label: 'Ended',           value: 'ended'            },
];

type Action = 'activate' | 'pause' | 'end';
const ACTION_STATUS: Record<Action, DealStatus> = {
  activate: 'active',
  pause:    'paused',
  end:      'ended',
};

function calcDiscount(base: number, deal: number): number {
  if (!base || base <= 0) return 0;
  return Math.max(0, Math.round((1 - deal / base) * 100));
}

// ── Availability Badge ────────────────────────────────────────────────────────

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
      title="Click to edit room inventory"
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

// ── Deal Availability Badge ───────────────────────────────────────────────────
// Fetches live available slots for a deal's own independent inventory.

function DealAvailabilityBadge({ deal }: { deal: PartnerDeal }) {
  const [available, setAvailable] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/deal-availability?deal_id=${deal.id}&check_in=${deal.start_date}&check_out=${deal.end_date}`
    )
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setAvailable(Number(d.available ?? deal.quantity_total)); })
      .catch(() => { if (!cancelled) setAvailable(deal.quantity_total); });
    return () => { cancelled = true; };
  }, [deal.id, deal.start_date, deal.end_date, deal.quantity_total]);

  const total = deal.quantity_total;
  const avail = available ?? total;
  const pct   = total > 0 ? avail / total : 0;
  const color =
    pct > 0.5 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : pct > 0   ? 'bg-amber-50 text-amber-700 border-amber-200'
    :             'bg-red-50 text-red-600 border-red-200';

  return (
    <span
      title={`${avail} of ${total} deal slots available`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-semibold ${color}`}
    >
      {available === null ? (
        <span className="opacity-50">…</span>
      ) : (
        <>
          <span>{avail}</span>
          <span className="opacity-50">/</span>
          <span>{total}</span>
        </>
      )}
    </span>
  );
}

// ── Edit Deal Modal ───────────────────────────────────────────────────────────

function EditDealModal({
  deal,
  onClose,
  onSaved,
}: {
  deal: PartnerDeal;
  onClose: () => void;
  onSaved: (updated: Partial<PartnerDeal>) => void;
}) {
  const [price, setPrice]    = useState(String(deal.deal_price));
  const [qty, setQty]        = useState(String(deal.quantity_total));
  const [qa, setQa]          = useState(String(deal.quantity_available ?? deal.quantity_total));
  const [saving, setSaving]  = useState(false);
  const [err, setErr]        = useState('');

  const { currency } = useAppSettingsStore();
  const sym = CURRENCY_MAP[currency as CurrencyCode]?.symbol ?? 'AED';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p  = Number(price);
    const q  = Number(qty);
    const qa_ = Number(qa);
    if (!p || p <= 0)     { setErr('Deal price must be greater than 0'); return; }
    if (!q || q < 1)      { setErr('Total slots must be at least 1'); return; }
    if (qa_ < 0)          { setErr('Available Tonight cannot be negative'); return; }
    if (qa_ > q)          { setErr('Available Rooms cannot exceed Total Slots'); return; }
    setSaving(true); setErr('');
    const aedPrice = toAED(p, currency as CurrencyCode);
    const result = await updateDeal(deal.id, { deal_price: aedPrice, quantity_total: q, quantity_available: qa_ });
    setSaving(false);
    if (result.error) { setErr(result.error); return; }
    onSaved({ deal_price: aedPrice, quantity_total: q, quantity_available: qa_ });
    onClose();
  }

  const disc = deal.base_price > 0
    ? Math.max(0, Math.round((1 - toAED(Number(price) || deal.deal_price, currency as CurrencyCode) / deal.base_price) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Edit Deal</h2>
            <p className="text-xs text-gray-400 mt-0.5">{deal.room_name} · {deal.hotel_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Deal Price ({sym}) <span className="text-gray-400 font-normal">— original: {sym}{deal.base_price.toFixed(0)}</span>
            </label>
            <input
              type="number" min="1" step="0.01"
              value={price} onChange={e => setPrice(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
            {disc > 0 && (
              <p className="text-xs text-emerald-600 mt-1 font-medium">{disc}% discount from original price</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Total Slots</label>
            <input
              type="number" min="1" step="1"
              value={qty} onChange={e => setQty(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
            <p className="text-xs text-gray-400 mt-1">Max deal slots offered on the platform</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Available Rooms</label>
            <input
              type="number" min="0" step="1"
              value={qa} onChange={e => setQa(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
            <p className="text-xs text-amber-600 mt-1">Lower if some rooms are already taken through other channels. Resets to Total each morning.</p>
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Inventory Modal ───────────────────────────────────────────────────────

interface EditInventoryModalProps {
  room: DealRoom;
  onClose: () => void;
  onSaved: (roomId: number, newTotal: number, newAvailable: number) => void;
}

function EditInventoryModal({ room, onClose, onSaved }: EditInventoryModalProps) {
  const [total, setTotal] = useState(String(room.quantity_total));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(total);
    if (!n || n < 1) { setErr('Must be at least 1'); return; }
    setSaving(true);
    setErr('');
    const result = await updateRoomQuantity(room.id, n);
    setSaving(false);
    if (result.error) { setErr(result.error); return; }
    onSaved(room.id, n, result.available);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Edit Room Inventory</h2>
            <p className="text-xs text-gray-400 mt-0.5">{room.name} · {room.hotel_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Currently Available</p>
              <p className="text-2xl font-bold text-gray-700">{room.quantity_available}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Auto-calculated</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Total Inventory</p>
              <p className="text-2xl font-bold text-gray-700">{room.quantity_total}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">You control this</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">New Total Inventory</label>
            <input
              type="number"
              min="1"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Available rooms will be recalculated from actual bookings after saving.</p>
          </div>
          {err && <p className="text-red-500 text-xs">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60 hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}>
              {saving ? 'Saving…' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Deal Modal ─────────────────────────────────────────────────────────────

interface AddDealModalProps {
  rooms: DealRoom[];
  onClose: () => void;
  onCreated: () => void;
}

function AddDealModal({ rooms, onClose, onCreated }: AddDealModalProps) {
  const currency   = useAppSettingsStore(s => s.currency) as CurrencyCode;
  const currSymbol = CURRENCY_MAP[currency]?.symbol ?? 'AED';
  const today = new Date().toISOString().split('T')[0];
  const [roomId,     setRoomId]     = useState('');
  const [dealPrice,  setDealPrice]  = useState('');
  const [quantity,   setQuantity]   = useState('1');
  const [title,      setTitle]      = useState('');
  const [startDate,  setStartDate]  = useState(today);
  const [endDate,    setEndDate]    = useState('');
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState('');

  const selectedRoom = rooms.find((r) => String(r.id) === roomId);
  const basePrice    = selectedRoom?.base_price ?? 0;
  const discountPct  = dealPrice && basePrice ? calcDiscount(basePrice, Number(dealPrice)) : 0;

  // Group rooms by hotel
  const grouped: Record<string, DealRoom[]> = {};
  for (const r of rooms) {
    (grouped[r.hotel_name] = grouped[r.hotel_name] ?? []).push(r);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId || !dealPrice || !startDate || !endDate) {
      setErr('Please fill in all required fields.');
      return;
    }
    if (endDate < startDate) {
      setErr('End date must be on or after start date.');
      return;
    }
    if (Number(dealPrice) <= 0) {
      setErr('Deal price must be greater than 0.');
      return;
    }

    setSaving(true);
    setErr('');

    const qty = Number(quantity);
    if (!qty || qty < 1) { setSaving(false); setErr('Quantity must be at least 1.'); return; }

    const data: CreateDealData = {
      hotel_id:       selectedRoom!.hotel_id,
      room_id:        Number(roomId),
      deal_price:     toAED(Number(dealPrice), currency),
      quantity_total: qty,
      title:          title.trim() || undefined,
      start_date:     startDate,
      end_date:       endDate,
    };

    const result = await createDeal(data);
    setSaving(false);

    if (result.error) { setErr(result.error); return; }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add Special Deal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Room selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Room *</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              required
            >
              <option value="">Select a room…</option>
              {Object.entries(grouped).map(([hotelName, hotelRooms]) => (
                <optgroup key={hotelName} label={hotelName}>
                  {hotelRooms.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      {r.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Base price (read-only reference) */}
          {selectedRoom && (
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
              <span className="text-xs text-gray-500">Original price</span>
              <span className="text-sm font-semibold text-gray-700">
                <AEDAmount amount={basePrice} /> <span className="text-xs text-gray-400">/night</span>
              </span>
            </div>
          )}

          {/* Deal price + live discount */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Deal Price ({currSymbol}) *</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="0.01"
                value={dealPrice}
                onChange={(e) => setDealPrice(e.target.value)}
                placeholder="e.g. 350"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                required
              />
              {discountPct > 0 && (
                <span className="shrink-0 bg-brand-gold text-white text-xs font-bold px-2.5 py-1.5 rounded-lg">
                  -{discountPct}% OFF
                </span>
              )}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Number of Rooms for this Deal *</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 3"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Independent from your rooms inventory. This is the deal-specific stock.</p>
          </div>

          {/* Title (optional) */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Deal Label (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekend Flash Sale"
              maxLength={80}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Start Date *</label>
              <input
                type="date"
                value={startDate}
                min={today}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">End Date *</label>
              <input
                type="date"
                value={endDate}
                min={startDate || today}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                required
              />
            </div>
          </div>

          {err && <p className="text-red-500 text-xs">{err}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}
            >
              {saving ? 'Saving…' : 'Add Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function ApprovalBanner() {
  const params = useSearchParams();
  const approved = params.get('deal_approved');
  const err      = params.get('deal_error');

  if (approved === '1') return (
    <div className="mb-6 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3.5">
      <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <p className="text-emerald-800 text-sm font-medium">Deal published! Subscribers have been notified by email.</p>
    </div>
  );
  if (approved === 'already') return (
    <div className="mb-6 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3.5">
      <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-blue-800 text-sm font-medium">This deal was already published.</p>
    </div>
  );
  if (err) return (
    <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-3.5">
      <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
      <p className="text-red-700 text-sm font-medium">Could not approve deal. The link may be invalid or expired.</p>
    </div>
  );
  return null;
}

export default function PartnerDealsPage() {
  const [deals,         setDeals]         = useState<PartnerDeal[]>([]);
  const [rooms,         setRooms]         = useState<DealRoom[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState<DealStatus | 'all'>('all');
  const [showModal,     setShowModal]     = useState(false);
  const [editingRoom,   setEditingRoom]   = useState<DealRoom | null>(null);
  const [editingDeal,   setEditingDeal]   = useState<PartnerDeal | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [importMsg,     setImportMsg]     = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roomsMap = Object.fromEntries(rooms.map((r) => [r.id, r]));

  async function load() {
    setLoading(true);
    const [d, r] = await Promise.all([getMyDeals(), getMyRooms()]);
    setDeals(d);
    setRooms(r);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? deals : deals.filter((d) => d.status === filter);

  const counts = {
    all:              deals.length,
    pending_approval: deals.filter((d) => d.status === 'pending_approval').length,
    active:           deals.filter((d) => d.status === 'active').length,
    paused:           deals.filter((d) => d.status === 'paused').length,
    ended:            deals.filter((d) => d.status === 'ended').length,
  };

  function handleInventorySaved(roomId: number, newTotal: number, newAvailable: number) {
    setRooms((prev) =>
      prev.map((r) => r.id === roomId ? { ...r, quantity_total: newTotal, quantity_available: newAvailable } : r)
    );
  }

  function handleDealSaved(updated: Partial<PartnerDeal>) {
    if (!editingDeal) return;
    setDeals((prev) =>
      prev.map((d) => d.id === editingDeal.id ? { ...d, ...updated } : d)
    );
  }

  async function handleAction(deal: PartnerDeal, action: Action) {
    setActionLoading(deal.id);
    if (action === 'end') {
      if (!confirm(`End deal for "${deal.room_name}"? This cannot be undone.`)) {
        setActionLoading(null);
        return;
      }
    }
    const newStatus = ACTION_STATUS[action];
    setDeals((prev) => prev.map((d) => d.id === deal.id ? { ...d, status: newStatus } : d));
    await updateDealStatus(deal.id, newStatus);
    setActionLoading(null);
  }

  async function handleDelete(deal: PartnerDeal) {
    if (!confirm(`Delete deal for "${deal.room_name}"?`)) return;
    setDeals((prev) => prev.filter((d) => d.id !== deal.id));
    await deleteDeal(deal.id);
  }

  async function handleExport() {
    const csv = await exportDealsCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `deals_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setImportMsg('Importing…');
    const result = await importDealsCSV(text);
    if (result.errors.length > 0) {
      setImportMsg(`Imported ${result.imported} row(s). ${result.errors.length} error(s): ${result.errors.slice(0, 3).join('; ')}`);
    } else {
      setImportMsg(`Successfully imported ${result.imported} deal(s).`);
    }
    await load();
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setImportMsg(''), 6000);
  }

  function getRowActions(deal: PartnerDeal): Action[] {
    if (deal.status === 'active')           return ['pause', 'end'];
    if (deal.status === 'paused')           return ['activate', 'end'];
    if (deal.status === 'pending_approval') return ['end'];
    return [];
  }

  const actionStyles: Record<Action, string> = {
    activate: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    pause:    'bg-amber-50 text-amber-700 hover:bg-amber-100',
    end:      'bg-red-50 text-red-600 hover:bg-red-100',
  };
  const actionLabels: Record<Action, string> = { activate: 'Activate', pause: 'Pause', end: 'End' };

  function fmtDate(iso: string) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <Suspense fallback={null}>
        <ApprovalBanner />
      </Suspense>
      {/* Page header */}
      <div className="mb-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
        <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #D97706 0%, #B45309 100%)' }} />
              <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>Deals</h1>
            </div>
            <p className="text-white/45 text-xs pl-3">CSV: <code className="font-mono text-white/60">room_id, hotel_id, deal_price, start_date, end_date, title</code></p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
          {/* Import CSV */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImport}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import CSV
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>

          {/* Add Deal */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Deal
          </button>
        </div>
        </div>
      </div>

      {/* Import feedback */}
      {importMsg && (
        <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          {importMsg}
        </div>
      )}


      {/* Status tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-100 p-1 w-fit shadow-sm">
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
              {(counts as Record<string, number>)[value]}
            </span>
          </button>
        ))}
      </div>

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="font-medium text-gray-500">No deals in this category</p>
          {filter === 'all' && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-sm text-brand-blue hover:underline font-medium"
            >
              + Create your first deal
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-50">
            {filtered.map((deal) => {
              const disc = calcDiscount(deal.base_price, deal.deal_price);
              const rowActions = getRowActions(deal);
              return (
                <div key={deal.id} className="px-4 py-4 space-y-3">
                  {/* Title + Room + Hotel */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {deal.title && (
                        <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md mb-1 inline-block truncate max-w-full">
                          {deal.title}
                        </p>
                      )}
                      <p className="font-semibold text-gray-900 truncate">{deal.room_name}</p>
                      <p className="text-xs text-gray-400 truncate">{deal.hotel_name}</p>
                    </div>
                    <StatusBadge status={deal.status} variant="deal" />
                  </div>

                  {/* Price row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-bold text-green-600">
                        <AEDAmount amount={deal.deal_price} /><span className="text-xs font-normal text-gray-400">/night</span>
                      </p>
                      <p className="text-xs text-gray-400 line-through"><AEDAmount amount={deal.base_price} /></p>
                    </div>
                    <div className="flex items-center gap-2">
                      {disc > 0 && (
                        <span className="bg-brand-gold text-white text-xs font-bold px-2 py-0.5 rounded-full">-{disc}%</span>
                      )}
                      <DealAvailabilityBadge deal={deal} />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{fmtDate(deal.start_date)}</span>
                    <span className="text-gray-300">→</span>
                    <span>{fmtDate(deal.end_date)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setEditingDeal(deal)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      Edit
                    </button>
                    {deal.status === 'pending_approval' && (
                      <span className="flex items-center gap-1 text-orange-600 text-xs font-medium bg-orange-50 border border-orange-200 px-2.5 py-1.5 rounded-lg">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Confirm via email
                      </span>
                    )}
                    {rowActions.map((action) => (
                      <button
                        key={action}
                        disabled={actionLoading === deal.id}
                        onClick={() => handleAction(deal, action)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${actionStyles[action]}`}
                      >
                        {actionLabels[action]}
                      </button>
                    ))}
                    {deal.status === 'ended' && (
                      <button
                        onClick={() => handleDelete(deal)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Room · Hotel</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Base</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Deal Price</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Discount</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">From</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">To</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Availability</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((deal) => {
                  const disc = calcDiscount(deal.base_price, deal.deal_price);
                  const rowActions = getRowActions(deal);
                  const roomInfo = roomsMap[deal.room_id];
                  return (
                    <tr key={deal.id} className="hover:bg-gray-50/40 transition-colors">
                      {/* Room + Hotel */}
                      <td className="px-5 py-3.5">
                        {deal.title && (
                          <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md mb-1 truncate max-w-[200px] inline-block">
                            {deal.title}
                          </p>
                        )}
                        <p className="font-semibold text-gray-900 truncate max-w-[200px]">{deal.room_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{deal.hotel_name}</p>
                      </td>
                      {/* Base */}
                      <td className="px-4 py-3.5 text-right text-gray-400 line-through text-xs">
                        <AEDAmount amount={deal.base_price} />
                      </td>
                      {/* Deal Price */}
                      <td className="px-4 py-3.5 text-right font-bold text-green-600">
                        <AEDAmount amount={deal.deal_price} />
                        <span className="text-xs font-normal text-gray-400">/night</span>
                      </td>
                      {/* Discount */}
                      <td className="px-4 py-3.5 text-right">
                        {disc > 0 ? (
                          <span className="bg-brand-gold text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            -{disc}%
                          </span>
                        ) : '—'}
                      </td>
                      {/* Dates */}
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{fmtDate(deal.start_date)}</td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{fmtDate(deal.end_date)}</td>
                      {/* Availability — deal's own independent stock */}
                      <td className="px-4 py-3.5 text-center">
                        <DealAvailabilityBadge deal={deal} />
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={deal.status} variant="deal" />
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 justify-end flex-wrap">
                          <button
                            onClick={() => setEditingDeal(deal)}
                            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          >
                            Edit
                          </button>
                          {deal.status === 'pending_approval' && (
                            <span className="flex items-center gap-1.5 text-orange-600 text-xs font-medium bg-orange-50 border border-orange-200 px-2.5 py-1.5 rounded-lg">
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Confirm via email
                            </span>
                          )}
                          {rowActions.map((action) => (
                            <button
                              key={action}
                              disabled={actionLoading === deal.id}
                              onClick={() => handleAction(deal, action)}
                              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${actionStyles[action]}`}
                            >
                              {actionLabels[action]}
                            </button>
                          ))}
                          {deal.status === 'ended' && (
                            <button
                              onClick={() => handleDelete(deal)}
                              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Deal Modal */}
      {showModal && (
        <AddDealModal
          rooms={rooms}
          onClose={() => setShowModal(false)}
          onCreated={load}
        />
      )}

      {/* Edit Inventory Modal */}
      {editingRoom && (
        <EditInventoryModal
          room={editingRoom}
          onClose={() => setEditingRoom(null)}
          onSaved={handleInventorySaved}
        />
      )}

      {/* Edit Deal Modal */}
      {editingDeal && (
        <EditDealModal
          deal={editingDeal}
          onClose={() => setEditingDeal(null)}
          onSaved={handleDealSaved}
        />
      )}
    </div>
  );
}
