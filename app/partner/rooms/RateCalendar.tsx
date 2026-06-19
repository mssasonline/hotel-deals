'use client';

import { useState, useEffect, useCallback } from 'react';
import { getRoomRates, upsertRoomRates, deleteRoomRate, updateMyRoom, type RoomRate } from '../actions';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import { useAEDFormat } from '../components/AEDAmount';

// ── Helpers ────────────────────────────────────────────────────────────────

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayISO(): string {
  const d = new Date();
  return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function firstDow(y: number, m: number): number {
  return new Date(y, m - 1, 1).getDay(); // 0=Sun
}

function getMonthLabel(year: number, month: number, language: string): string {
  try {
    return new Date(year, month - 1, 1).toLocaleString(language, { month: 'long', year: 'numeric' });
  } catch {
    return new Date(year, month - 1, 1).toLocaleString('en', { month: 'long', year: 'numeric' });
  }
}

function getDayNames(language: string): string[] {
  try {
    return Array.from({ length: 7 }, (_, i) =>
      new Date(2024, 0, 7 + i).toLocaleString(language, { weekday: 'short' })
    );
  } catch {
    return Array.from({ length: 7 }, (_, i) =>
      new Date(2024, 0, 7 + i).toLocaleString('en', { weekday: 'short' })
    );
  }
}

function isWeekendDow(dow: number): boolean {
  return dow === 5 || dow === 6 || dow === 0; // Fri, Sat, Sun
}

// ── CalendarMonth ──────────────────────────────────────────────────────────

interface CalendarMonthProps {
  year: number;
  month: number;
  ratesMap: Record<string, number | null>;
  liveBasePrice: number;
  today: string;
  dayNames: string[];
  editCell: string | null;
  editVal: string;
  fmt: (v: number) => string;
  onCellClick: (iso: string) => void;
  onCommitEdit: (iso: string) => void;
  onResetCell: (iso: string) => void;
  onEditValChange: (v: string) => void;
  onEditCancel: () => void;
}

function CalendarMonth({
  year, month, ratesMap, liveBasePrice, today, dayNames,
  editCell, editVal, fmt,
  onCellClick, onCommitEdit, onResetCell, onEditValChange, onEditCancel,
}: CalendarMonthProps) {
  const totalDays = daysInMonth(year, month);
  const startDow  = firstDow(year, month);
  const cells: Array<number | null> = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  return (
    <>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`b-${i}`} />;
          const iso       = toISO(year, month, day);
          const isPast    = iso < today;
          const isToday   = iso === today;
          const dow       = new Date(year, month - 1, day).getDay();
          const weekend   = isWeekendDow(dow);
          const custom    = ratesMap[iso];
          const hasCustom = custom != null;
          const price     = hasCustom ? (custom as number) : liveBasePrice;
          const isEditing = editCell === iso;

          return (
            <div
              key={iso}
              className={`relative rounded-xl border transition-all ${
                isPast
                  ? 'bg-gray-50 border-gray-100 opacity-40'
                  : isToday
                  ? 'border-brand-blue ring-2 ring-brand-blue/20'
                  : hasCustom
                  ? weekend
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-blue-50 border-blue-200'
                  : weekend
                  ? 'bg-purple-50/30 border-purple-100 hover:border-purple-300'
                  : 'bg-white border-gray-100 hover:border-brand-blue/40'
              } ${isPast ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={() => !isPast && !isEditing && onCellClick(iso)}
            >
              {isEditing ? (
                <div className="p-1" onClick={e => e.stopPropagation()}>
                  <div className="text-[10px] font-bold text-gray-500 mb-0.5 text-center">{day}</div>
                  <input
                    type="number"
                    autoFocus
                    value={editVal}
                    onChange={e => onEditValChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') onCommitEdit(iso);
                      if (e.key === 'Escape') onEditCancel();
                    }}
                    className="w-full text-center text-xs font-mono border border-brand-blue rounded-lg px-1 py-0.5 focus:outline-none bg-white"
                  />
                  <div className="flex gap-0.5 mt-0.5">
                    <button type="button" onClick={() => onCommitEdit(iso)}
                      className="flex-1 text-[9px] bg-brand-blue text-white rounded py-0.5 font-semibold">✓</button>
                    <button type="button" onClick={() => onResetCell(iso)}
                      className="text-[9px] bg-red-50 text-red-500 border border-red-200 rounded px-1 py-0.5">✕</button>
                  </div>
                </div>
              ) : (
                <div className="p-1.5 text-center">
                  <div className={`text-[11px] font-bold mb-0.5 ${isToday ? 'text-brand-blue' : weekend ? 'text-purple-500' : 'text-gray-500'}`}>
                    {day}
                  </div>
                  <div className={`text-[10px] font-bold leading-tight ${
                    hasCustom
                      ? weekend ? 'text-purple-700' : 'text-blue-700'
                      : weekend ? 'text-purple-400' : 'text-gray-400'
                  }`}>
                    {fmt(price)}
                  </div>
                  {hasCustom && (
                    <div className={`w-1 h-1 rounded-full mx-auto mt-0.5 ${weekend ? 'bg-purple-500' : 'bg-brand-blue'}`} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Main RateCalendar ──────────────────────────────────────────────────────

interface Props {
  roomId: string;
  roomName: string;
  basePrice: number;
  minPrice: number;
  minPriceWeekend: number;
  onClose: () => void;
  onPricingUpdate: (newBase: number, newMin: number, newMinWeekend: number) => void;
}

export default function RateCalendar({
  roomId, roomName, basePrice, minPrice, minPriceWeekend, onClose, onPricingUpdate,
}: Props) {
  const language = useAppSettingsStore(s => s.language);
  const t        = getTranslations(language);
  const fmt      = useAEDFormat();

  const now  = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;
  const nextM = curM === 12 ? 1  : curM + 1;
  const nextY = curM === 12 ? curY + 1 : curY;

  const today    = todayISO();
  const dayNames = getDayNames(language);

  // ── Bulk fill state ────────────────────────────────────────────────────────
  const [bulkPrices,   setBulkPrices]   = useState({ weekday: '', weekend: '' });
  const [bulkApplying, setBulkApplying] = useState<'weekday' | 'weekend' | null>(null);
  const [bulkMsg,      setBulkMsg]      = useState<{ type: 'weekday' | 'weekend'; text: string; ok: boolean } | null>(null);

  // ── Calendar state ─────────────────────────────────────────────────────────
  const [ratesMap, setRatesMap] = useState<Record<string, number | null>>({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [dirty,    setDirty]    = useState(false);
  const [calMsg,   setCalMsg]   = useState<{ text: string; ok: boolean } | null>(null);
  const [editCell, setEditCell] = useState<string | null>(null);
  const [editVal,  setEditVal]  = useState('');

  // ── Pricing Settings state ─────────────────────────────────────────────────
  const [liveBasePrice,  setLiveBasePrice]  = useState(basePrice);
  const [pricingForm,    setPricingForm]    = useState({
    base_price:        String(basePrice),
    min_price:         String(minPrice),
    min_price_weekend: String(minPriceWeekend),
  });
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingMsg,    setPricingMsg]    = useState<{ text: string; ok: boolean } | null>(null);

  // Today's effective rate from the calendar (or base price as fallback)
  const todayRate = (ratesMap[today] != null ? ratesMap[today] : liveBasePrice) as number;

  // ── Load both months ───────────────────────────────────────────────────────
  const loadRates = useCallback(async () => {
    setLoading(true);
    const [cur, nxt] = await Promise.all([
      getRoomRates(roomId, curY, curM),
      getRoomRates(roomId, nextY, nextM),
    ]);
    const map: Record<string, number> = {};
    for (const r of [...cur, ...nxt]) map[r.date] = r.price;
    setRatesMap(map);

    // Sync Default Rate field to today's actual calendar rate
    const key = todayISO();
    if (map[key] != null) {
      setPricingForm(prev => ({ ...prev, base_price: String(map[key]) }));
      setLiveBasePrice(map[key] as number);
    }

    setLoading(false);
    setDirty(false);
  }, [roomId, curY, curM, nextY, nextM]);

  useEffect(() => { loadRates(); }, [loadRates]);

  // ── Cell edit ──────────────────────────────────────────────────────────────
  function openEdit(iso: string) {
    const cur = ratesMap[iso];
    setEditCell(iso);
    setEditVal(cur != null ? String(cur) : String(liveBasePrice));
  }

  function commitEdit(iso: string) {
    const v = Number(editVal);
    if (v > 0) {
      setRatesMap(prev => ({ ...prev, [iso]: v }));
      setDirty(true);
      // If the edited day is today, sync the Default Rate field
      if (iso === today) {
        setPricingForm(prev => ({ ...prev, base_price: String(v) }));
        setLiveBasePrice(v);
      }
    }
    setEditCell(null);
  }

  function resetCell(iso: string) {
    setRatesMap(prev => ({ ...prev, [iso]: null }));
    setDirty(true);
    setEditCell(null);
    // If clearing today, revert Default Rate to the stored base price
    if (iso === today) {
      setPricingForm(prev => ({ ...prev, base_price: String(basePrice) }));
      setLiveBasePrice(basePrice);
    }
  }

  // ── Bulk fill weekday / weekend across both months ────────────────────────
  async function applyBulk(type: 'weekday' | 'weekend') {
    const price = Number(bulkPrices[type]);
    if (!price || price <= 0) return;

    const isTarget = (dow: number) =>
      type === 'weekday' ? [1, 2, 3, 4].includes(dow) : [5, 6, 0].includes(dow);

    const rates: RoomRate[] = [];
    for (const [y, m] of [[curY, curM], [nextY, nextM]] as [number, number][]) {
      const total = daysInMonth(y, m);
      for (let d = 1; d <= total; d++) {
        const iso = toISO(y, m, d);
        if (iso < today) continue;
        const dow = new Date(y, m - 1, d).getDay();
        if (isTarget(dow)) rates.push({ date: iso, price });
      }
    }
    if (!rates.length) return;

    setBulkApplying(type);
    const { error } = await upsertRoomRates(roomId, rates);
    setBulkApplying(null);

    if (!error) {
      const patch: Record<string, number> = {};
      for (const r of rates) patch[r.date] = r.price;
      setRatesMap(prev => ({ ...prev, ...patch }));
      // Sync Default Rate if today was updated
      if (patch[today] != null) {
        setPricingForm(prev => ({ ...prev, base_price: String(patch[today]) }));
        setLiveBasePrice(patch[today]);
      }
      setBulkMsg({ type, text: `✓ ${rates.length} days updated`, ok: true });
    } else {
      setBulkMsg({ type, text: error, ok: false });
    }
    setTimeout(() => setBulkMsg(null), 3500);
  }

  // ── Save pricing settings ──────────────────────────────────────────────────
  async function savePricing() {
    const newMin        = parseFloat(pricingForm.min_price);
    const newMinWeekend = parseFloat(pricingForm.min_price_weekend);
    const currentBase   = liveBasePrice;

    if (!newMin  || newMin  <= 0)            { setPricingMsg({ text: 'Weekday min floor must be a positive number', ok: false }); setTimeout(() => setPricingMsg(null), 3000); return; }
    if (!newMinWeekend || newMinWeekend <= 0) { setPricingMsg({ text: 'Weekend min floor must be a positive number', ok: false }); setTimeout(() => setPricingMsg(null), 3000); return; }
    if (newMin > currentBase)                { setPricingMsg({ text: 'Weekday min cannot exceed today\'s rate', ok: false }); setTimeout(() => setPricingMsg(null), 3000); return; }
    if (newMinWeekend > currentBase)         { setPricingMsg({ text: 'Weekend min cannot exceed today\'s rate', ok: false }); setTimeout(() => setPricingMsg(null), 3000); return; }

    setPricingSaving(true);
    const { error } = await updateMyRoom(roomId, {
      min_price:         newMin,
      min_price_weekend: newMinWeekend,
    });
    setPricingSaving(false);

    if (!error) {
      onPricingUpdate(currentBase, newMin, newMinWeekend);
      setPricingMsg({ text: '✓ Pricing saved', ok: true });
    } else {
      setPricingMsg({ text: error, ok: false });
    }
    setTimeout(() => setPricingMsg(null), 3000);
  }

  // ── Save calendar rates ────────────────────────────────────────────────────
  async function saveRates() {
    setSaving(true);
    const toUpsert: RoomRate[] = [];
    const toDelete: string[]   = [];

    for (const [date, price] of Object.entries(ratesMap)) {
      if (price === null) toDelete.push(date);
      else toUpsert.push({ date, price });
    }

    const errors: string[] = [];
    if (toUpsert.length) {
      const { error } = await upsertRoomRates(roomId, toUpsert);
      if (error) errors.push(error);
    }
    for (const date of toDelete) {
      const { error } = await deleteRoomRate(roomId, date);
      if (error) errors.push(error);
    }

    setSaving(false);
    if (errors.length) {
      setCalMsg({ text: `Error: ${errors[0]}`, ok: false });
    } else {
      setCalMsg({ text: t['partner.cal.savedOk'], ok: true });
      setDirty(false);
    }
    setTimeout(() => setCalMsg(null), 3000);
  }

  const curMonthLabel  = getMonthLabel(curY,  curM,  language);
  const nextMonthLabel = getMonthLabel(nextY, nextM, language);

  // Derive placeholder hints from loaded calendar data
  const weekdayPlaceholder = (() => {
    for (const [date, price] of Object.entries(ratesMap)) {
      if (!price || date < today) continue;
      const dow = new Date(date + 'T12:00:00').getDay();
      if ([1, 2, 3, 4].includes(dow)) return String(price);
    }
    return String(liveBasePrice);
  })();
  const weekendPlaceholder = (() => {
    for (const [date, price] of Object.entries(ratesMap)) {
      if (!price || date < today) continue;
      const dow = new Date(date + 'T12:00:00').getDay();
      if ([5, 6, 0].includes(dow)) return String(price);
    }
    return String(liveBasePrice);
  })();

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-xl">{t['partner.cal.title']}</h2>
            <p className="text-gray-500 text-sm mt-0.5">{roomName}</p>
          </div>
          <button type="button" onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* ── Pricing Settings ── */}
          <div className="rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 to-orange-50/30 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">💰 Pricing Settings</p>
                {!loading && (
                  <p className="text-xs text-gray-400 mt-1">
                    Today&apos;s rate:&nbsp;
                    <strong className="text-gray-700">{fmt(todayRate)}</strong>
                    <span className="ml-1 text-[11px]">
                      {ratesMap[today] != null ? '(custom rate from calendar)' : '(default rate)'}
                    </span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={savePricing}
                disabled={pricingSaving}
                className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-all hover:-translate-y-0.5 shrink-0"
                style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
              >
                {pricingSaving
                  ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : 'Save Min Prices'
                }
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Default rate */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Default Rate <span className="text-gray-400 font-normal">(AED / night)</span>
                </label>
                <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono bg-gray-50 text-gray-700 select-none">
                  {pricingForm.base_price}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Edit via calendar below</p>
              </div>
              {/* Weekday min */}
              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1.5">
                  Min Floor · Weekdays
                  <span className="text-blue-400 font-normal ml-1">(Mon–Thu)</span>
                </label>
                <input
                  type="number" min="1"
                  value={pricingForm.min_price}
                  onChange={e => setPricingForm(p => ({ ...p, min_price: e.target.value }))}
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400 bg-white"
                />
                <p className="text-[11px] text-gray-400 mt-1">Lowest price after discounts</p>
              </div>
              {/* Weekend min */}
              <div>
                <label className="block text-xs font-semibold text-purple-700 mb-1.5">
                  Min Floor · Weekend
                  <span className="text-purple-400 font-normal ml-1">(Fri–Sun)</span>
                </label>
                <input
                  type="number" min="1"
                  value={pricingForm.min_price_weekend}
                  onChange={e => setPricingForm(p => ({ ...p, min_price_weekend: e.target.value }))}
                  className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-purple-400 bg-white"
                />
                <p className="text-[11px] text-gray-400 mt-1">Higher floor for Fri–Sun</p>
              </div>
            </div>

            {pricingMsg && (
              <p className={`text-[11px] mt-2 font-medium ${pricingMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                {pricingMsg.text}
              </p>
            )}
          </div>

          {/* ── Bulk Fill ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Weekdays */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3">
              <p className="text-xs font-bold text-blue-700 mb-2">Weekdays (Mon–Thu)</p>
              <div className="flex gap-2">
                <input
                  type="number" min="1"
                  value={bulkPrices.weekday}
                  onChange={e => setBulkPrices(p => ({ ...p, weekday: e.target.value }))}
                  placeholder={weekdayPlaceholder}
                  className="flex-1 min-w-0 border border-blue-200 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:border-blue-400 bg-white"
                />
                <button
                  type="button"
                  onClick={() => applyBulk('weekday')}
                  disabled={bulkApplying === 'weekday' || !Number(bulkPrices.weekday)}
                  className="shrink-0 text-xs font-semibold text-white px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1 transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
                >
                  {bulkApplying === 'weekday'
                    ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : 'Apply'
                  }
                </button>
              </div>
              {(() => {
                const rate = Number(bulkPrices.weekday);
                const min  = Number(pricingForm.min_price);
                if (!rate || !min || min >= rate) return null;
                const disc = Math.round((1 - min / rate) * 100);
                return (
                  <p className="text-[11px] text-blue-600 mt-1.5">
                    {fmt(min)} – {fmt(rate)} · max -{disc}%
                  </p>
                );
              })()}
              {bulkMsg?.type === 'weekday' && (
                <p className={`text-[11px] mt-1.5 font-medium ${bulkMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {bulkMsg.text}
                </p>
              )}
            </div>

            {/* Weekend */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3">
              <p className="text-xs font-bold text-purple-700 mb-2">Weekend (Fri–Sun)</p>
              <div className="flex gap-2">
                <input
                  type="number" min="1"
                  value={bulkPrices.weekend}
                  onChange={e => setBulkPrices(p => ({ ...p, weekend: e.target.value }))}
                  placeholder={weekendPlaceholder}
                  className="flex-1 min-w-0 border border-purple-200 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:border-purple-400 bg-white"
                />
                <button
                  type="button"
                  onClick={() => applyBulk('weekend')}
                  disabled={bulkApplying === 'weekend' || !Number(bulkPrices.weekend)}
                  className="shrink-0 text-xs font-semibold text-white px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1 transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #6B21A8 0%, #9333EA 100%)' }}
                >
                  {bulkApplying === 'weekend'
                    ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : 'Apply'
                  }
                </button>
              </div>
              {(() => {
                const rate = Number(bulkPrices.weekend);
                const min  = Number(pricingForm.min_price_weekend);
                if (!rate || !min || min >= rate) return null;
                const disc = Math.round((1 - min / rate) * 100);
                return (
                  <p className="text-[11px] text-purple-600 mt-1.5">
                    {fmt(min)} – {fmt(rate)} · max -{disc}%
                  </p>
                );
              })()}
              {bulkMsg?.type === 'weekend' && (
                <p className={`text-[11px] mt-1.5 font-medium ${bulkMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {bulkMsg.text}
                </p>
              )}
            </div>
          </div>

          {/* ── Calendars ── */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current month */}
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3 capitalize">{curMonthLabel}</p>
                <CalendarMonth
                  year={curY} month={curM}
                  ratesMap={ratesMap} liveBasePrice={liveBasePrice}
                  today={today} dayNames={dayNames}
                  editCell={editCell} editVal={editVal} fmt={fmt}
                  onCellClick={openEdit}
                  onCommitEdit={commitEdit}
                  onResetCell={resetCell}
                  onEditValChange={setEditVal}
                  onEditCancel={() => setEditCell(null)}
                />
              </div>

              {/* Next month */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm font-bold text-gray-700 mb-3 capitalize">{nextMonthLabel}</p>
                <CalendarMonth
                  year={nextY} month={nextM}
                  ratesMap={ratesMap} liveBasePrice={liveBasePrice}
                  today={today} dayNames={dayNames}
                  editCell={editCell} editVal={editVal} fmt={fmt}
                  onCellClick={openEdit}
                  onCommitEdit={commitEdit}
                  onResetCell={resetCell}
                  onEditValChange={setEditVal}
                  onEditCancel={() => setEditCell(null)}
                />
              </div>
            </div>
          )}

          {/* Legend */}
          {!loading && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-2">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-50 border border-blue-200" />
                Custom weekday rate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-purple-50 border border-purple-200" />
                Custom weekend rate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-white border border-gray-200" />
                {t['partner.cal.legendBase'].replace('{price}', fmt(liveBasePrice))}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-4">
          {calMsg ? (
            <span className={`text-sm font-semibold ${calMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
              {calMsg.text}
            </span>
          ) : (
            <span className="text-xs text-gray-400">
              {dirty ? t['partner.cal.unsavedChanges'] : t['partner.cal.clickToEdit']}
            </span>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="border border-gray-200 text-gray-600 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors">
              {t['partner.cal.close']}
            </button>
            <button type="button" onClick={saveRates} disabled={!dirty || saving}
              className="text-white font-semibold px-5 py-2 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}>
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              Save Calendar Rates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
