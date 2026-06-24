'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getCurrentTier, calcLivePrice, calcActualDiscount, type PriceTier } from '@/lib/pricingEngine';
import CountdownTimer from '@/app/components/CountdownTimer';
import { getMyHotels, getMyRooms, updateMyRoom, syncRoomAvailability, addRoom, deleteRoom, getTodayRoomRates, type PartnerRoom } from '../actions';
import RateCalendar from './RateCalendar';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import AEDAmount, { useAEDFormat } from '../components/AEDAmount';
import { toAED, fromAEDTo } from '@/lib/currency';
import { CURRENCY_MAP } from '@/lib/currencyData';
import type { CurrencyCode } from '@/lib/currencyData';

type Room = PartnerRoom;

const ROOM_TYPES = ['Standard', 'Deluxe', 'Suite', 'Junior Suite', 'Penthouse', 'Family', 'Twin', 'Economy'];
const BED_TYPES  = ['Single', 'Double', 'Queen', 'King', 'Twin', 'Bunk', 'Multiple'];

const ROOM_FEATURES: { key: string; icon: string }[] = [
  { key: 'Balcony',        icon: '🏞️' },
  { key: 'Sea View',       icon: '🌊' },
  { key: 'Pool View',      icon: '🏊' },
  { key: 'City View',      icon: '🌆' },
  { key: 'Sofa',           icon: '🛋️' },
  { key: 'Kitchenette',    icon: '🍳' },
  { key: 'Jacuzzi',        icon: '🛁' },
  { key: 'Bathtub',        icon: '🛁' },
  { key: 'Smart TV',       icon: '📺' },
  { key: 'Mini Bar',       icon: '🍾' },
  { key: 'Work Desk',      icon: '💼' },
  { key: 'Safe',           icon: '🔒' },
  { key: 'Air Conditioning', icon: '❄️' },
  { key: 'Blackout Curtains', icon: '🌑' },
  { key: 'Connecting Room', icon: '🔗' },
  { key: 'Pet Friendly',   icon: '🐾' },
];

function FeaturePicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(key: string) {
    onChange(
      selected.includes(key)
        ? selected.filter(k => k !== key)
        : [...selected, key]
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {ROOM_FEATURES.map(f => {
        const active = selected.includes(f.key);
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => toggle(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              active
                ? 'text-white border-transparent shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-blue/50 hover:text-brand-blue'
            }`}
            style={active ? { background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' } : {}}
          >
            <span>{f.icon}</span>
            {f.key}
          </button>
        );
      })}
    </div>
  );
}

const TYPE_BADGE: Record<string, string> = {
  Standard:      'bg-gray-100 text-gray-600',
  Deluxe:        'bg-blue-50 text-blue-700',
  Suite:         'bg-purple-50 text-purple-700',
  'Junior Suite':'bg-violet-50 text-violet-700',
  Penthouse:     'bg-amber-50 text-amber-700',
  Family:        'bg-green-50 text-green-700',
  Twin:          'bg-cyan-50 text-cyan-700',
  Economy:       'bg-gray-50 text-gray-500',
};

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
    </div>
  );
}

function AvailabilityBar({ available, total }: { available: number; total: number }) {
  const pct   = total > 0 ? Math.round((available / total) * 100) : 0;
  const color = pct <= 20 ? 'bg-red-400' : pct <= 50 ? 'bg-amber-400' : 'bg-green-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold ${pct <= 20 ? 'text-red-500' : pct <= 50 ? 'text-amber-600' : 'text-green-600'}`}>
        {available}
      </span>
    </div>
  );
}

// ── Edit Room Modal ────────────────────────────────────────────────────────────

interface EditRoomModalProps {
  room: Room;
  hotelName: string;
  onSave: (id: string, fields: Partial<Room>) => void;
  onClose: () => void;
  t: ReturnType<typeof getTranslations>;
}

function EditRoomModal({ room, hotelName, onSave, onClose, t }: EditRoomModalProps) {
  const [form, setForm] = useState({
    quantity_total: String(room.quantity_total ?? ''),
    area_sqm:       String(room.area_sqm ?? ''),
    bed_type:       room.bed_type ?? '',
    room_type:      room.type ?? '',
    image_url:      room.image_url   ?? '',
    image_url_2:    room.image_url_2 ?? '',
    image_url_3:    room.image_url_3 ?? '',
  });
  const [features, setFeatures] = useState<string[]>(room.features ?? []);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    setError(null);
    const qt = parseInt(form.quantity_total, 10);
    if (isNaN(qt) || qt <= 0) { setError('Total quantity must be a positive number.'); return; }

    setSaving(true);
    onSave(room.id, {
      quantity_total: qt,
      type:           form.room_type,
      area_sqm:       form.area_sqm ? parseFloat(form.area_sqm) : null,
      bed_type:       form.bed_type || null,
      image_url:      form.image_url.trim()   || null,
      image_url_2:    form.image_url_2.trim() || null,
      image_url_3:    form.image_url_3.trim() || null,
      features,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t['partner.rooms.editTitle']}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{room.name} · {hotelName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" disabled={saving}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Room specs */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t['partner.rooms.roomDetails']}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.rooms.roomTypeLabel']}</label>
                <select
                  name="room_type"
                  value={form.room_type}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
                >
                  <option value="">—</option>
                  {ROOM_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.rooms.bedTypeLabel']}</label>
                <select
                  name="bed_type"
                  value={form.bed_type}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
                >
                  <option value="">—</option>
                  {BED_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.rooms.areaLabel']}</label>
                <input
                  type="number" name="area_sqm" value={form.area_sqm} onChange={handleChange}
                  min="1" step="0.5" placeholder="e.g. 45"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t['partner.rooms.featuresLabel']}</p>
            <FeaturePicker selected={features} onChange={setFeatures} />
          </div>

          {/* Images — up to 3 */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t['partner.rooms.imageLabel']}</p>
            <div className="grid grid-cols-3 gap-3">
              {(['image_url', 'image_url_2', 'image_url_3'] as const).map((field, i) => {
                const url = form[field];
                const hasErr = imgErrors[field];
                return (
                  <div key={field} className="flex flex-col gap-1.5">
                    <div className={`relative rounded-xl overflow-hidden border h-24 bg-gray-50 flex items-center justify-center transition-all ${url && !hasErr ? 'border-brand-blue/30' : 'border-gray-200 border-dashed'}`}>
                      {url && !hasErr ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={`photo ${i + 1}`} className="h-full w-full object-cover"
                          onError={() => setImgErrors(p => ({ ...p, [field]: true }))} />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-gray-300">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-[10px] font-medium">{i === 0 ? t['partner.rooms.mainPhoto'] : `${t['partner.rooms.photo']} ${i + 1}`}</span>
                        </div>
                      )}
                      {url && (
                        <button type="button" onClick={() => { setForm(p => ({ ...p, [field]: '' })); setImgErrors(p => ({ ...p, [field]: false })); }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <input
                      type="url" name={field} value={url}
                      onChange={e => { setImgErrors(p => ({ ...p, [field]: false })); handleChange(e); }}
                      placeholder="https://..."
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                    />
                    {hasErr && <p className="text-[10px] text-red-400">{t['partner.rooms.invalidImageUrl']}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inventory */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t['partner.rooms.inventory']}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.rooms.totalLabel']}</label>
                <input type="number" name="quantity_total" value={form.quantity_total} onChange={handleChange} min="1" step="1"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.rooms.availLabel']}</label>
                <div className="w-full border border-gray-100 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-500 flex items-center justify-between">
                  <span className="font-semibold text-gray-700">{room.quantity_available ?? room.available ?? 0}</span>
                  <span className="text-[10px] text-gray-400">Auto</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Available rooms are recalculated automatically from actual bookings after saving.</p>
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

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50">
            {t['partner.cancel']}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-60 flex items-center gap-2 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}>
            {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? t['partner.saving'] : t['partner.save']}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Room Modal ─────────────────────────────────────────────────────────────

interface AddRoomModalProps {
  hotelIds: string[];
  hotelNames: Record<string, string>;
  onAdd: (room: Room) => void;
  onClose: () => void;
  t: ReturnType<typeof getTranslations>;
}

function AddRoomModal({ hotelIds, hotelNames, onAdd, onClose, t }: AddRoomModalProps) {
  const fmt        = useAEDFormat();
  const currency   = useAppSettingsStore(s => s.currency) as CurrencyCode;
  const currSymbol = CURRENCY_MAP[currency]?.symbol ?? 'AED';
  const [form, setForm] = useState({
    hotel_id:       hotelIds[0] ?? '',
    name:           '',
    room_type:      '',
    area_sqm:       '',
    bed_type:       '',
    image_url:      '',
    image_url_2:    '',
    image_url_3:    '',
    capacity:       '2',
    base_price:     '',
    min_price:      '',
    quantity_total: '1',
  });
  const [features, setFeatures] = useState<string[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const basePrice   = parseFloat(form.base_price) || 0;
  const minPrice    = parseFloat(form.min_price) || 0;
  const tier        = getCurrentTier();
  const livePreview = basePrice > 0 && minPrice > 0 ? calcLivePrice(basePrice, minPrice, tier) : 0;
  const discountPreview = calcActualDiscount(basePrice, livePreview);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleAdd() {
    setError(null);
    if (!form.name.trim()) { setError('Room name is required.'); return; }
    const bp  = parseFloat(form.base_price);
    const mp  = parseFloat(form.min_price);
    const cap = parseInt(form.capacity, 10);
    const qt  = parseInt(form.quantity_total, 10);

    if (isNaN(bp)  || bp  <= 0) { setError('Base price must be a positive number.'); return; }
    if (isNaN(mp)  || mp  <= 0) { setError('Min price must be a positive number.'); return; }
    if (mp > bp)                { setError('Min price cannot exceed Base price.'); return; }
    if (isNaN(cap) || cap <= 0) { setError('Capacity must be at least 1.'); return; }
    if (isNaN(qt)  || qt  <= 0) { setError('Total rooms must be at least 1.'); return; }

    setSaving(true);
    const { data, error: addError } = await addRoom(form.hotel_id, {
      name:               form.name.trim(),
      room_type:          form.room_type,
      area_sqm:           form.area_sqm ? parseFloat(form.area_sqm) : null,
      bed_type:           form.bed_type || null,
      image_url:          form.image_url.trim()   || null,
      image_url_2:        form.image_url_2.trim() || null,
      image_url_3:        form.image_url_3.trim() || null,
      features,
      base_price:         toAED(bp, currency),
      min_price:          toAED(mp, currency),
      capacity:           cap,
      quantity_total:     qt,
      quantity_available: qt,
    });
    setSaving(false);

    if (addError || !data) { setError(addError ?? 'Failed to add room.'); return; }
    onAdd(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t['partner.rooms.addRoomTitle']}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" disabled={saving}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Hotel selector (multi-hotel only) */}
          {hotelIds.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.rooms.colHotel']}</label>
              <select name="hotel_id" value={form.hotel_id} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white">
                {hotelIds.map(id => <option key={id} value={id}>{hotelNames[id] ?? id}</option>)}
              </select>
            </div>
          )}

          {/* Room name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.rooms.nameLabel']}</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Deluxe King Room"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue" />
          </div>

          {/* Room specs */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t['partner.rooms.roomDetails']}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.rooms.roomTypeLabel']}</label>
                <select name="room_type" value={form.room_type} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white">
                  <option value="">—</option>
                  {ROOM_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.rooms.bedTypeLabel']}</label>
                <select name="bed_type" value={form.bed_type} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white">
                  <option value="">—</option>
                  {BED_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.rooms.areaLabel']}</label>
                <input type="number" name="area_sqm" value={form.area_sqm} onChange={handleChange} min="1" step="0.5" placeholder="e.g. 45"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.rooms.capacityLabel']}</label>
                <input type="number" name="capacity" value={form.capacity} onChange={handleChange} min="1" step="1"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue" />
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t['partner.rooms.featuresLabel']}</p>
            <FeaturePicker selected={features} onChange={setFeatures} />
          </div>

          {/* Images — up to 3 */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t['partner.rooms.imageLabel']}</p>
            <div className="grid grid-cols-3 gap-3">
              {(['image_url', 'image_url_2', 'image_url_3'] as const).map((field, i) => {
                const url = form[field];
                const hasErr = imgErrors[field];
                return (
                  <div key={field} className="flex flex-col gap-1.5">
                    <div className={`relative rounded-xl overflow-hidden border h-24 bg-gray-50 flex items-center justify-center transition-all ${url && !hasErr ? 'border-brand-blue/30' : 'border-gray-200 border-dashed'}`}>
                      {url && !hasErr ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={`photo ${i + 1}`} className="h-full w-full object-cover"
                          onError={() => setImgErrors(p => ({ ...p, [field]: true }))} />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-gray-300">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-[10px] font-medium">{i === 0 ? t['partner.rooms.mainPhoto'] : `${t['partner.rooms.photo']} ${i + 1}`}</span>
                        </div>
                      )}
                      {url && (
                        <button type="button" onClick={() => { setForm(p => ({ ...p, [field]: '' })); setImgErrors(p => ({ ...p, [field]: false })); }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <input
                      type="url" name={field} value={url}
                      onChange={e => { setImgErrors(p => ({ ...p, [field]: false })); handleChange(e); }}
                      placeholder="https://..."
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                    />
                    {hasErr && <p className="text-[10px] text-red-400">{t['partner.rooms.invalidImageUrl']}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t['partner.rooms.pricingSection']}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t['partner.rooms.basePriceOnSite']}
                  <span className="text-xs text-gray-400 font-normal ml-1">(base_price)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currSymbol}</span>
                  <input type="number" name="base_price" value={form.base_price} onChange={handleChange} min="1" step="1" placeholder="500"
                    className="w-full pl-12 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t['partner.rooms.minPriceFloor']}
                  <span className="text-xs text-gray-400 font-normal ml-1">(min_price)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currSymbol}</span>
                  <input type="number" name="min_price" value={form.min_price} onChange={handleChange} min="1" step="1" placeholder="300"
                    className="w-full pl-12 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue" />
                </div>
              </div>
            </div>
            {basePrice > 0 && minPrice > 0 && (
              <div className="mt-3 p-3 bg-brand-blue-light rounded-xl text-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t['partner.rooms.pricePreviewNow'].replace('{tier}', tier.label)}</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-gray-400 text-xs">{fmt(toAED(basePrice, currency))}</span>
                    <span className="font-bold text-brand-blue">{fmt(toAED(livePreview, currency))}</span>
                    {discountPreview > 0 && (
                      <span className="text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">-{discountPreview}%</span>
                    )}
                  </div>
                </div>
                {livePreview === minPrice && (
                  <div className="text-xs text-amber-600 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t['partner.rooms.priceAtFloor'].replace('{price}', fmt(minPrice))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Inventory */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t['partner.rooms.inventory']}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.rooms.totalLabel']}</label>
                <input type="number" name="quantity_total" value={form.quantity_total} onChange={handleChange} min="1" step="1"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.rooms.availLabel']}</label>
                <div className="w-full border border-gray-100 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-500 flex items-center justify-between">
                  <span className="font-semibold text-gray-700">{form.quantity_total || '—'}</span>
                  <span className="text-[10px] text-gray-400">= Total (new)</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">A new room starts fully available. Available count updates automatically as bookings are made.</p>
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

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50">
            {t['partner.cancel']}
          </button>
          <button onClick={handleAdd} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-60 flex items-center gap-2 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}>
            {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? t['partner.saving'] : t['partner.rooms.addRoom']}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RoomsPage() {
  const router   = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = getTranslations('en');

  const [loading, setLoading]         = useState(true);
  const [rooms, setRooms]             = useState<Room[]>([]);
  const [hotelIds, setHotelIds]       = useState<string[]>([]);
  const [hotelNames, setHotelNames]   = useState<Record<string, string>>({});
  const [hotelFilter, setHotelFilter] = useState('all');
  const [typeFilter, setTypeFilter]   = useState('all');
  const [todayRates, setTodayRates]   = useState<Record<string, number>>({});
  const [editRoom, setEditRoom]       = useState<Room | null>(null);
  const [rateRoom, setRateRoom]       = useState<Room | null>(null);
  const [addingRoom, setAddingRoom]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saveMsg, setSaveMsg]         = useState<string | null>(null);
  const [deleting, setDeleting]       = useState<string | null>(null);
  const [tier, setTier]               = useState<PriceTier>(() => getCurrentTier());

  useEffect(() => {
    const id = setInterval(() => setTier(getCurrentTier()), 60_000);
    return () => clearInterval(id);
  }, []);

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
          // Use client-local date to avoid UTC drift (e.g. Dubai = UTC+4)
          const d = new Date();
          const localToday = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const rates = await getTodayRoomRates(myRooms.map(r => r.id), localToday);
          setTodayRates(rates);
        }
      } catch (err) {
        console.error('[rooms] load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, authLoading, router]);

  async function handleSaveRoom(id: string, fields: Partial<Room>) {
    const { error } = await updateMyRoom(id, {
      base_price:     fields.base_price,
      min_price:      fields.min_price,
      quantity_total: fields.quantity_total,
      image_url:      fields.image_url,
      image_url_2:    fields.image_url_2,
      image_url_3:    fields.image_url_3,
      features:       fields.features,
      type:           fields.type,
      area_sqm:       fields.area_sqm,
      bed_type:       fields.bed_type,
    });

    if (error) { alert('Failed to save: ' + error); setEditRoom(null); return; }

    // Recompute quantity_available from actual bookings
    const { available } = await syncRoomAvailability(id);

    setRooms(prev => prev.map(r =>
      r.id === id
        ? {
            ...r,
            ...fields,
            type:               fields.type      ?? r.type,
            area_sqm:           fields.area_sqm  ?? r.area_sqm,
            bed_type:           fields.bed_type  ?? r.bed_type,
            image_url:          'image_url' in fields ? fields.image_url ?? null : r.image_url,
            features:           fields.features  ?? r.features,
            quantity_available: available,
            available:          available > 0 ? 1 : 0,
          }
        : r
    ));
    setEditRoom(null);
    showMsg(t['partner.rooms.saved']);
  }

  async function handleDeleteRoom(id: string) {
    setDeleting(id);
    const { error } = await deleteRoom(id);
    setDeleting(null);
    setConfirmDelete(null);
    if (error) { alert('Failed to delete: ' + error); return; }
    setRooms(prev => prev.filter(r => r.id !== id));
    showMsg(t['partner.rooms.deleteSuccess']);
  }

  function handleAddRoom(room: Room) {
    setRooms(prev => [...prev, room]);
    setAddingRoom(false);
    showMsg(t['partner.rooms.addSuccess']);
  }

  function showMsg(msg: string) {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(null), 3000);
  }

  const multiHotel = hotelIds.length > 1;
  const roomTypes  = Array.from(new Set(rooms.map(r => r.type).filter(Boolean)));

  const filtered = rooms.filter(r => {
    const matchHotel = hotelFilter === 'all' || r.hotel_id === hotelFilter;
    const matchType  = typeFilter  === 'all' || r.type === typeFilter;
    return matchHotel && matchType;
  });

  const totalAvailable = filtered.reduce((s, r) => s + (r.quantity_available ?? r.available ?? 0), 0);
  const lowAvailRooms  = filtered.filter(r => (r.quantity_available ?? r.available ?? 0) <= 1).length;

  if (loading) return <Spinner />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Page header */}
      <div className="mb-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #D97706 0%, #B45309 100%)' }} />
              <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>{t['partner.nav.rooms']}</h1>
            </div>
            <p className="text-white/45 text-xs pl-3">{t['partner.rooms.infoNotice']}</p>
          </div>
          <div className="flex items-center gap-3">
          {roomTypes.length > 1 && (
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-700">
              <option value="all">{t['partner.rooms.allTypes']}</option>
              {roomTypes.map(rt => <option key={rt} value={rt}>{rt}</option>)}
            </select>
          )}
          {multiHotel && (
            <select value={hotelFilter} onChange={e => setHotelFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-700">
              <option value="all">{t['partner.rooms.allHotels']}</option>
              {hotelIds.map(id => <option key={id} value={id}>{hotelNames[id] ?? id}</option>)}
            </select>
          )}
          {hotelIds.length > 0 && (
            <button
              onClick={() => setAddingRoom(true)}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t['partner.rooms.addRoom']}
            </button>
          )}
        </div>
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

      {/* Live tier banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 text-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="text-4xl font-black leading-none">{tier.discountPercent}%</div>
          <div>
            <div className="font-bold text-base leading-tight">{tier.label}</div>
            <div className="text-white/80 text-xs mt-0.5">{t['partner.rooms.discountBannerDesc']}</div>
          </div>
        </div>
        <div className="text-sm text-white/90">
          <CountdownTimer
            nextTierTime={tier.nextTierTime}
            nextDiscountPercent={tier.nextDiscountPercent}
            variant="full"
            className="text-white/90"
          />
        </div>
      </div>

      {/* Summary bar */}
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
            const basePrice         = Number(room.base_price ?? 0);
            const minPrice          = Number(room.min_price ?? 0);
            const minPriceWeekend   = Number(room.min_price_weekend ?? 0) || minPrice;
            const effectivePrice    = todayRates[room.id] ?? basePrice;
            const todayDow          = new Date().getDay();
            const isTodayWeekend    = todayDow === 5 || todayDow === 6 || todayDow === 0;
            const effectiveMinPrice = isTodayWeekend ? minPriceWeekend : minPrice;
            const livePrice         = calcLivePrice(effectivePrice, effectiveMinPrice, tier);
            const qtyAvailable  = room.quantity_available ?? room.available ?? 0;
            const qtyTotal      = room.quantity_total ?? room.capacity ?? 1;
            const isDeleting    = deleting === room.id;
            const isConfirming  = confirmDelete === room.id;
            return (
              <div key={room.id} className={`px-4 py-4 ${isDeleting ? 'opacity-40' : ''}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex shrink-0 -space-x-1.5">
                    {[room.image_url, room.image_url_2, room.image_url_3].filter(Boolean).slice(0, 2).map((url, idx) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={idx} src={url!} alt="" className="w-10 h-10 rounded-lg object-cover border-2 border-white shadow-sm" style={{ zIndex: 2 - idx }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ))}
                    {![room.image_url, room.image_url_2, room.image_url_3].some(Boolean) && (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">{room.name}</p>
                    {multiHotel && <p className="text-xs text-gray-400 truncate">{hotelNames[room.hotel_id] ?? '—'}</p>}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {room.type && (
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE[room.type] ?? 'bg-gray-100 text-gray-600'}`}>{room.type}</span>
                      )}
                      {room.bed_type && <span className="text-xs text-gray-400">{room.bed_type}</span>}
                      {room.area_sqm && <span className="text-xs text-gray-400">{room.area_sqm} m²</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-green-600"><AEDAmount amount={livePrice} /></p>
                    <p className="text-xs text-gray-400">{t['partner.dash.perNight']}</p>
                  </div>
                  <AvailabilityBar available={qtyAvailable} total={qtyTotal} />
                </div>
                <div className="flex items-center gap-2">
                  {isConfirming ? (
                    <>
                      <button onClick={() => handleDeleteRoom(room.id)} disabled={isDeleting}
                        className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                        {isDeleting ? '…' : t['partner.rooms.deleteRoom']}
                      </button>
                      <button onClick={() => setConfirmDelete(null)}
                        className="text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditRoom(room)}
                        className="flex items-center gap-1 text-xs font-medium text-brand-blue bg-brand-blue-light hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        {t['partner.edit']}
                      </button>
                      <button onClick={() => setRateRoom(room)}
                        className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors border border-amber-100">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {t['partner.rooms.ratesBtn']}
                      </button>
                      <button onClick={() => setConfirmDelete(room.id)}
                        className="flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 w-7 h-7 rounded-lg transition-colors ml-auto">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-gray-400 text-sm">{t['partner.rooms.noRooms']}</p>
          )}
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="px-4 py-3">{t['partner.rooms.colName']}</th>
                {multiHotel && <th className="px-4 py-3">{t['partner.rooms.colHotel']}</th>}
                <th className="px-3 py-3">{t['partner.rooms.colType']}</th>
                <th className="px-3 py-3">{t['partner.rooms.colArea']}</th>
                <th className="px-3 py-3">{t['partner.rooms.colBed']}</th>
                <th className="px-3 py-3 max-w-[160px]">{t['partner.rooms.featuresLabel']}</th>
                <th className="px-3 py-3 text-center">{t['partner.rooms.colCapacity']}</th>
                <th className="px-3 py-3">{t['partner.rooms.colBase']}</th>
                <th className="px-3 py-3">{t['partner.rooms.colMin']}</th>
                <th className="px-3 py-3">
                  <span>{t['partner.rooms.colSystem']}</span>
                  <span className="block text-[10px] font-normal text-orange-400 normal-case leading-tight">{t['partner.rooms.guestSees']}</span>
                </th>
                <th className="px-3 py-3 min-w-[130px]">{t['partner.rooms.colAvailable']}</th>
                <th className="px-3 py-3 text-right">{/* actions */}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(room => {
                const basePrice         = Number(room.base_price ?? 0);
                const minPrice          = Number(room.min_price ?? 0);
                const minPriceWeekend   = Number(room.min_price_weekend ?? 0) || minPrice;
                const effectivePrice    = todayRates[room.id] ?? basePrice;
                const todayDow          = new Date().getDay();
                const isTodayWeekend    = todayDow === 5 || todayDow === 6 || todayDow === 0;
                const effectiveMinPrice = isTodayWeekend ? minPriceWeekend : minPrice;
                const livePrice         = calcLivePrice(effectivePrice, effectiveMinPrice, tier);
                const qtyAvailable  = room.quantity_available ?? room.available ?? 0;
                const qtyTotal      = room.quantity_total ?? room.capacity ?? 1;
                const isDeleting    = deleting === room.id;
                const isConfirming  = confirmDelete === room.id;

                return (
                  <tr key={room.id} className={`hover:bg-gray-50/40 transition-colors border-b border-gray-50 last:border-0 ${isDeleting ? 'opacity-40' : ''}`}>
                    {/* Room name + thumbnails */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex shrink-0 -space-x-2">
                          {[room.image_url, room.image_url_2, room.image_url_3]
                            .filter(Boolean)
                            .slice(0, 3)
                            .map((url, idx) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={idx} src={url!} alt=""
                                className="w-8 h-8 rounded-lg object-cover border-2 border-white shadow-sm"
                                style={{ zIndex: 3 - idx }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ))}
                          {![room.image_url, room.image_url_2, room.image_url_3].some(Boolean) && (
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">{room.name}</span>
                      </div>
                    </td>
                    {multiHotel && (
                      <td className="px-3 py-3 text-gray-500 text-xs max-w-[120px] truncate">{hotelNames[room.hotel_id] ?? '—'}</td>
                    )}
                    {/* Type badge */}
                    <td className="px-3 py-3">
                      {room.type ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE[room.type] ?? 'bg-gray-100 text-gray-600'}`}>
                          {room.type}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    {/* Area */}
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {room.area_sqm ? `${room.area_sqm} m²` : <span className="text-gray-300">—</span>}
                    </td>
                    {/* Bed */}
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {room.bed_type ?? <span className="text-gray-300">—</span>}
                    </td>
                    {/* Features */}
                    <td className="px-3 py-3 max-w-[160px]">
                      {room.features && room.features.length > 0 ? (
                        <div className="flex flex-wrap gap-0.5">
                          {room.features.slice(0, 3).map(f => {
                            const meta = ROOM_FEATURES.find(rf => rf.key === f);
                            return (
                              <span key={f} title={f}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
                                {meta?.icon} {f}
                              </span>
                            );
                          })}
                          {room.features.length > 3 && (
                            <span className="text-[10px] text-gray-400 font-medium">+{room.features.length - 3}</span>
                          )}
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    {/* Capacity */}
                    <td className="px-3 py-3 text-gray-600 text-sm text-center">{room.capacity ?? 0}</td>
                    {/* Base price — shows today's effective rate from calendar */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-semibold text-gray-800 text-sm"><AEDAmount amount={effectivePrice} /></span>
                      <span className="text-[10px] text-gray-400 block leading-tight">{t['partner.dash.perNight']}</span>
                    </td>
                    {/* Min price — shows effective floor for today (weekday vs weekend) */}
                    <td className="px-3 py-3 text-gray-500 text-sm whitespace-nowrap">
                      {effectiveMinPrice > 0 ? <AEDAmount amount={effectiveMinPrice} /> : <span className="text-gray-300">—</span>}
                    </td>
                    {/* System / live price */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-green-600 text-sm"><AEDAmount amount={livePrice} /></span>
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1 py-0.5 rounded-full leading-none">
                          {calcActualDiscount(effectivePrice, livePrice)}%
                        </span>
                      </div>
                    </td>
                    {/* Availability */}
                    <td className="px-3 py-3 min-w-[130px]">
                      <AvailabilityBar available={qtyAvailable} total={qtyTotal} />
                      {qtyAvailable <= 1 && (
                        <span className="inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-500">
                          {qtyAvailable === 0 ? t['partner.rooms.soldOut'] : t['partner.rooms.lastRoom']}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {isConfirming ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteRoom(room.id)}
                            disabled={isDeleting}
                            className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? '…' : '✓'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditRoom(room)}
                            title={t['partner.edit']}
                            className="flex items-center gap-1 text-xs font-medium text-brand-blue bg-brand-blue-light hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            {t['partner.edit']}
                          </button>
                          <button
                            onClick={() => setRateRoom(room)}
                            title={t['partner.rooms.ratesBtn']}
                            className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors border border-amber-100"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {t['partner.rooms.ratesBtn']}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(room.id)}
                            title={t['partner.rooms.deleteRoom']}
                            className="flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 w-7 h-7 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={multiHotel ? 12 : 11} className="px-6 py-12 text-center text-gray-400 text-sm">
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

      {/* Edit modal */}
      {editRoom && (
        <EditRoomModal
          room={editRoom}
          hotelName={hotelNames[editRoom.hotel_id] ?? 'Hotel'}
          onSave={handleSaveRoom}
          onClose={() => setEditRoom(null)}
          t={t}
        />
      )}

      {/* Rate calendar modal */}
      {rateRoom && (
        <RateCalendar
          roomId={rateRoom.id}
          roomName={rateRoom.name}
          basePrice={rateRoom.base_price}
          minPrice={rateRoom.min_price ?? 0}
          minPriceWeekend={rateRoom.min_price_weekend ?? 0}
          onClose={() => {
            // Refresh today's rate for this room so the table stays in sync
            const d = new Date();
            const ld = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            getTodayRoomRates([rateRoom.id], ld).then(r => setTodayRates(prev => ({ ...prev, ...r })));
            setRateRoom(null);
          }}
          onPricingUpdate={(newBase, newMin, newMinWeekend) => {
            setRooms(prev => prev.map(r =>
              r.id === rateRoom.id
                ? { ...r, base_price: newBase, min_price: newMin, min_price_weekend: newMinWeekend }
                : r
            ));
            setRateRoom(prev => prev ? { ...prev, base_price: newBase, min_price: newMin, min_price_weekend: newMinWeekend } : prev);
            const d = new Date();
            const ld = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            getTodayRoomRates([rateRoom.id], ld).then(r => setTodayRates(prev => ({ ...prev, ...r })));
          }}
        />
      )}

      {/* Add modal */}
      {addingRoom && (
        <AddRoomModal
          hotelIds={hotelIds}
          hotelNames={hotelNames}
          onAdd={handleAddRoom}
          onClose={() => setAddingRoom(false)}
          t={t}
        />
      )}
    </div>
  );
}
