'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getRoomRates, upsertRoomRates, deleteRoomRate, type RoomRate } from '../actions';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import { useAEDFormat } from '../components/AEDAmount';

type T = ReturnType<typeof getTranslations>;

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
  // Jan 7 2024 is a Sunday — iterate Sun→Sat
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

// ── CSV import helpers ─────────────────────────────────────────────────────

interface CsvRow {
  date: string;
  price: number;
  valid: boolean;
  error?: string;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseCSV(text: string, t: T): CsvRow[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (!lines.length) return [];

  const firstLow = lines[0].toLowerCase();
  const start = (firstLow.includes('date') || firstLow.includes('تاريخ')) ? 1 : 0;

  return lines.slice(start).map(line => {
    const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 2) return { date: line, price: 0, valid: false, error: t['partner.cal.csvBadFormat'] };

    const dateRaw  = parts[0];
    const priceRaw = parts[1];

    if (!ISO_RE.test(dateRaw)) {
      return { date: dateRaw, price: 0, valid: false, error: t['partner.cal.csvBadDate'] };
    }
    const d = new Date(dateRaw + 'T12:00:00');
    if (isNaN(d.getTime())) {
      return { date: dateRaw, price: 0, valid: false, error: t['partner.cal.csvInvalidDate'] };
    }
    const price = Number(priceRaw);
    if (!price || price <= 0) {
      return { date: dateRaw, price: 0, valid: false, error: t['partner.cal.csvBadPrice'] };
    }
    return { date: dateRaw, price, valid: true };
  }).filter(r => r.date);
}

function downloadTemplate(roomName: string) {
  const today = new Date();
  const rows = ['date,price'];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    rows.push(`${iso},`);
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `room-rates-${roomName.replace(/\s+/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── CSV Import modal ───────────────────────────────────────────────────────

interface CsvImportModalProps {
  rows: CsvRow[];
  fmt: (v: number) => string;
  t: T;
  onApply: (rates: RoomRate[]) => void;
  onClose: () => void;
}

function CsvImportModal({ rows, fmt, t, onApply, onClose }: CsvImportModalProps) {
  const valid   = rows.filter(r => r.valid);
  const invalid = rows.filter(r => !r.valid);
  const [page, setPage] = useState<'preview' | 'errors'>('preview');

  function apply() {
    onApply(valid.map(r => ({ date: r.date, price: r.price })));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-base">{t['partner.cal.importTitle']}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {t['partner.cal.validRecords'].replace('{n}', String(valid.length))}
              {invalid.length > 0 && ` · ${t['partner.cal.errorRecords'].replace('{n}', String(invalid.length))}`}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {invalid.length > 0 && (
          <div className="flex border-b border-gray-100 px-6">
            <button type="button" onClick={() => setPage('preview')}
              className={`text-xs font-semibold py-2.5 border-b-2 mr-4 transition-colors ${page === 'preview' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {t['partner.cal.validTab'].replace('{n}', String(valid.length))}
            </button>
            <button type="button" onClick={() => setPage('errors')}
              className={`text-xs font-semibold py-2.5 border-b-2 transition-colors ${page === 'errors' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {t['partner.cal.errorsTab'].replace('{n}', String(invalid.length))}
            </button>
          </div>
        )}

        <div className="max-h-72 overflow-y-auto">
          {page === 'preview' ? (
            valid.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">{t['partner.cal.noValidRecords']}</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left font-semibold text-gray-500 text-xs px-6 py-2">{t['partner.cal.colDate']}</th>
                    <th className="text-left font-semibold text-gray-500 text-xs px-6 py-2">{t['partner.cal.colPrice']}</th>
                  </tr>
                </thead>
                <tbody>
                  {valid.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-2 font-mono text-gray-700">{r.date}</td>
                      <td className="px-6 py-2 font-bold text-brand-blue">{fmt(r.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left font-semibold text-gray-500 text-xs px-6 py-2">{t['partner.cal.colLine']}</th>
                  <th className="text-left font-semibold text-gray-500 text-xs px-6 py-2">{t['partner.cal.colError']}</th>
                </tr>
              </thead>
              <tbody>
                {invalid.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-6 py-2 font-mono text-gray-500 text-xs max-w-[180px] truncate">{r.date}</td>
                    <td className="px-6 py-2 text-red-600 text-xs">{r.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="border border-gray-200 text-gray-600 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors">
            {t['partner.cancel']}
          </button>
          <button type="button" onClick={apply} disabled={valid.length === 0}
            className="text-white font-semibold px-5 py-2 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}>
            {t['partner.cal.apply']} {valid.length > 0 && `(${valid.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk-set modal ─────────────────────────────────────────────────────────

interface BulkModalProps {
  type: 'weekday' | 'weekend' | 'range';
  year: number;
  month: number;
  basePrice: number;
  fmt: (v: number) => string;
  t: T;
  onApply: (rates: RoomRate[]) => void;
  onClose: () => void;
}

function BulkModal({ type, year, month, basePrice, fmt, t, onApply, onClose }: BulkModalProps) {
  const [price, setPrice] = useState(String(basePrice));
  const [rangeFrom, setRangeFrom] = useState(toISO(year, month, 1));
  const [rangeTo,   setRangeTo]   = useState(toISO(year, month, daysInMonth(year, month)));

  const title = type === 'weekday' ? t['partner.cal.bulkWeekdayTitle']
              : type === 'weekend' ? t['partner.cal.bulkWeekendTitle']
              : t['partner.cal.bulkRangeTitle'];

  function build(): RoomRate[] {
    const p = Number(price);
    if (!p || p <= 0) return [];
    const total = daysInMonth(year, month);
    const rates: RoomRate[] = [];

    if (type === 'range') {
      const start = new Date(rangeFrom + 'T12:00:00');
      const end   = new Date(rangeTo   + 'T12:00:00');
      const cur   = new Date(start);
      while (cur <= end) {
        const iso = toISO(cur.getFullYear(), cur.getMonth() + 1, cur.getDate());
        rates.push({ date: iso, price: p });
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      for (let d = 1; d <= total; d++) {
        const dow = new Date(year, month - 1, d).getDay();
        const isWeekend = dow === 5 || dow === 6 || dow === 0;
        if ((type === 'weekend' && isWeekend) || (type === 'weekday' && !isWeekend)) {
          rates.push({ date: toISO(year, month, d), price: p });
        }
      }
    }
    return rates;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-bold text-gray-900 text-lg mb-4">{title}</h3>

        {type === 'range' && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{t['partner.cal.from']}</label>
              <input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-blue" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{t['partner.cal.to']}</label>
              <input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-blue" />
            </div>
          </div>
        )}

        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 mb-1">{t['partner.cal.priceLabel']}</label>
          <input
            type="number"
            min="1"
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-blue font-mono"
            placeholder={String(basePrice)}
          />
          <p className="text-xs text-gray-400 mt-1">
            {t['partner.cal.basePrice'].replace('{price}', fmt(basePrice))}
          </p>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
            {t['partner.cancel']}
          </button>
          <button type="button" onClick={() => { const r = build(); if (r.length) onApply(r); onClose(); }}
            className="flex-1 text-white font-semibold py-2.5 rounded-xl text-sm transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}>
            {t['partner.cal.apply']}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main RateCalendar ──────────────────────────────────────────────────────

interface Props {
  roomId: string;
  roomName: string;
  basePrice: number;
  onClose: () => void;
}

export default function RateCalendar({ roomId, roomName, basePrice, onClose }: Props) {
  const language = useAppSettingsStore(s => s.language);
  const t        = getTranslations(language);
  const fmt      = useAEDFormat();

  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [ratesMap,  setRatesMap]  = useState<Record<string, number | null>>({});
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [dirty,     setDirty]     = useState(false);
  const [editCell,  setEditCell]  = useState<string | null>(null);
  const [editVal,   setEditVal]   = useState('');
  const [bulkType,  setBulkType]  = useState<'weekday' | 'weekend' | 'range' | null>(null);
  const [csvRows,   setCsvRows]   = useState<CsvRow[] | null>(null);
  const [msg,       setMsg]       = useState<{ text: string; ok: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Quick monthly rate setup ──────────────────────────────────────────────
  const curY  = now.getFullYear();
  const curM  = now.getMonth() + 1;
  const nextM = curM === 12 ? 1  : curM + 1;
  const nextY = curM === 12 ? curY + 1 : curY;

  const [quickPrices,   setQuickPrices]   = useState({ current: String(basePrice), next: String(basePrice) });
  const [quickApplying, setQuickApplying] = useState<'current' | 'next' | null>(null);
  const [quickMsg,      setQuickMsg]      = useState<{ which: 'current' | 'next'; text: string; ok: boolean } | null>(null);

  async function quickFillMonth(which: 'current' | 'next') {
    const targetYear  = which === 'current' ? curY  : nextY;
    const targetMonth = which === 'current' ? curM  : nextM;
    const price = Number(quickPrices[which]);
    if (!price || price <= 0) return;

    const todayStr = todayISO();
    const total    = daysInMonth(targetYear, targetMonth);
    const rates: RoomRate[] = [];
    for (let d = 1; d <= total; d++) {
      const iso = toISO(targetYear, targetMonth, d);
      if (iso >= todayStr) rates.push({ date: iso, price });
    }
    if (!rates.length) return;

    setQuickApplying(which);
    const { error } = await upsertRoomRates(roomId, rates);
    setQuickApplying(null);

    if (!error) {
      // Reflect in the calendar grid if viewing that month
      if (targetYear === year && targetMonth === month) {
        const patch: Record<string, number> = {};
        for (const r of rates) patch[r.date] = r.price;
        setRatesMap(prev => ({ ...prev, ...patch }));
        setDirty(false);
      }
      setQuickMsg({ which, text: `✓ ${rates.length} days set to ${fmt(price)}`, ok: true });
    } else {
      setQuickMsg({ which, text: error, ok: false });
    }
    setTimeout(() => setQuickMsg(null), 3500);
  }

  const dayNames   = getDayNames(language);
  const monthLabel = getMonthLabel(year, month, language);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setCsvRows(parseCSV(text, t));
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }

  function applyImport(rates: RoomRate[]) {
    const patch: Record<string, number> = {};
    for (const r of rates) patch[r.date] = r.price;
    setRatesMap(prev => ({ ...prev, ...patch }));
    setDirty(true);
    setMsg({ text: t['partner.cal.importedOk'].replace('{n}', String(rates.length)), ok: true });
    setTimeout(() => setMsg(null), 3000);
  }

  const today = todayISO();

  const loadRates = useCallback(async () => {
    setLoading(true);
    const rates = await getRoomRates(roomId, year, month);
    const map: Record<string, number> = {};
    for (const r of rates) map[r.date] = r.price;
    setRatesMap(map);
    setLoading(false);
    setDirty(false);
  }, [roomId, year, month]);

  useEffect(() => { loadRates(); }, [loadRates]);

  function navMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    setMonth(m); setYear(y);
  }

  function openEdit(iso: string) {
    const cur = ratesMap[iso];
    setEditCell(iso);
    setEditVal(cur != null ? String(cur) : String(basePrice));
  }

  function commitEdit(iso: string) {
    const v = Number(editVal);
    if (v > 0) {
      setRatesMap(prev => ({ ...prev, [iso]: v }));
      setDirty(true);
    }
    setEditCell(null);
  }

  function resetCell(iso: string) {
    setRatesMap(prev => ({ ...prev, [iso]: null }));
    setDirty(true);
    setEditCell(null);
  }

  function applyBulk(rates: RoomRate[]) {
    const patch: Record<string, number> = {};
    for (const r of rates) patch[r.date] = r.price;
    setRatesMap(prev => ({ ...prev, ...patch }));
    setDirty(true);
  }

  async function save() {
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
      setMsg({ text: t['partner.cal.errorPrefix'].replace('{msg}', errors[0]), ok: false });
    } else {
      setMsg({ text: t['partner.cal.savedOk'], ok: true });
      setDirty(false);
    }
    setTimeout(() => setMsg(null), 3000);
  }

  const totalDays = daysInMonth(year, month);
  const startDow  = firstDow(year, month);
  const cells: Array<number | null> = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

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

        <div className="p-6">

          {/* ── Quick Monthly Rate Setup ── */}
          <div className="mb-5 rounded-xl border border-brand-blue/10 bg-blue-50/40 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Monthly Rate Setup
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(['current', 'next'] as const).map(which => {
                const y     = which === 'current' ? curY  : nextY;
                const m     = which === 'current' ? curM  : nextM;
                const label = getMonthLabel(y, m, language);
                const isApp = quickApplying === which;
                const qMsg  = quickMsg?.which === which ? quickMsg : null;
                return (
                  <div key={which} className="bg-white rounded-xl p-3 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2 capitalize">{label}</p>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min="1"
                        value={quickPrices[which]}
                        onChange={e => setQuickPrices(p => ({ ...p, [which]: e.target.value }))}
                        className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-brand-blue bg-white"
                        placeholder={String(basePrice)}
                      />
                      <button
                        type="button"
                        onClick={() => quickFillMonth(which)}
                        disabled={isApp || !Number(quickPrices[which])}
                        className="shrink-0 text-xs font-semibold text-white px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1 transition-all hover:-translate-y-0.5"
                        style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
                      >
                        {isApp
                          ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : t['partner.cal.apply']
                        }
                      </button>
                    </div>
                    {qMsg && (
                      <p className={`text-[11px] mt-1.5 font-medium ${qMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                        {qMsg.text}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Sets all remaining days in the month. Saves immediately — no need to press Save Rates.
            </p>
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button type="button" onClick={() => navMonth(-1)}
              disabled={year === now.getFullYear() && month === now.getMonth() + 1}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-bold text-gray-800 text-lg capitalize">{monthLabel}</span>
            <button type="button" onClick={() => navMonth(1)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Bulk actions */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button type="button" onClick={() => setBulkType('weekday')}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">
              {t['partner.cal.weekdays']}
            </button>
            <button type="button" onClick={() => setBulkType('weekend')}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors">
              {t['partner.cal.weekend']}
            </button>
            <button type="button" onClick={() => setBulkType('range')}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
              {t['partner.cal.dateRange']}
            </button>
            <button type="button" onClick={() => { setRatesMap({}); setDirty(true); }}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">
              {t['partner.cal.resetAll']}
            </button>
          </div>

          {/* CSV import row */}
          <div className="flex flex-wrap items-center gap-2 mb-5 pt-3 border-t border-gray-100">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {t['partner.cal.importCsv']}
            </button>
            <button
              type="button"
              onClick={() => downloadTemplate(roomName)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t['partner.cal.downloadTemplate']}
            </button>
            <span className="flex-1" />
            <span className="text-xs text-gray-400">
              {t['partner.cal.basePrice'].replace('{price}', fmt(basePrice))}
            </span>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {dayNames.map((d, i) => (
              <div key={i} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div className="flex items-center justify-center h-52">
              <div className="w-7 h-7 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={`b-${i}`} />;
                const iso       = toISO(year, month, day);
                const isPast    = iso < today;
                const isToday   = iso === today;
                const custom    = ratesMap[iso];
                const hasCustom = custom != null && custom !== null;
                const price     = hasCustom ? (custom as number) : basePrice;
                const isWeekend = [5, 6, 0].includes(new Date(year, month - 1, day).getDay());
                const isEditing = editCell === iso;

                return (
                  <div
                    key={iso}
                    className={`relative rounded-xl border transition-all ${
                      isPast
                        ? 'bg-gray-50 border-gray-100 opacity-50'
                        : isToday
                        ? 'border-brand-blue ring-2 ring-brand-blue/20'
                        : hasCustom
                        ? isWeekend
                          ? 'bg-purple-50 border-purple-200'
                          : 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-100 hover:border-brand-blue/40'
                    } ${isPast ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={() => !isPast && !isEditing && openEdit(iso)}
                  >
                    {isEditing ? (
                      <div className="p-1" onClick={e => e.stopPropagation()}>
                        <div className="text-[10px] font-bold text-gray-500 mb-0.5 text-center">{day}</div>
                        <input
                          type="number"
                          autoFocus
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit(iso);
                            if (e.key === 'Escape') setEditCell(null);
                          }}
                          className="w-full text-center text-xs font-mono border border-brand-blue rounded-lg px-1 py-0.5 focus:outline-none bg-white"
                        />
                        <div className="flex gap-0.5 mt-0.5">
                          <button type="button" onClick={() => commitEdit(iso)}
                            className="flex-1 text-[9px] bg-brand-blue text-white rounded py-0.5 font-semibold">
                            ✓
                          </button>
                          <button type="button" onClick={() => resetCell(iso)}
                            className="text-[9px] bg-red-50 text-red-500 border border-red-200 rounded px-1 py-0.5">
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-1.5 text-center">
                        <div className={`text-[11px] font-bold mb-0.5 ${isToday ? 'text-brand-blue' : 'text-gray-500'}`}>
                          {day}
                        </div>
                        <div className={`text-[10px] font-bold leading-tight ${
                          hasCustom
                            ? isWeekend ? 'text-purple-700' : 'text-blue-700'
                            : 'text-gray-400'
                        }`}>
                          {fmt(price)}
                        </div>
                        {hasCustom && (
                          <div className="w-1 h-1 rounded-full bg-brand-blue mx-auto mt-0.5" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-50 border border-blue-200" />
              {t['partner.cal.legendCustomWeek']}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-purple-50 border border-purple-200" />
              {t['partner.cal.legendCustomEnd']}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-white border border-gray-200" />
              {t['partner.cal.legendBase'].replace('{price}', fmt(basePrice))}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-4">
          {msg ? (
            <span className={`text-sm font-semibold ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>
              {msg.text}
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
            <button type="button" onClick={save} disabled={!dirty || saving}
              className="text-white font-semibold px-5 py-2 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}>
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {t['partner.cal.saveRates']}
            </button>
          </div>
        </div>
      </div>

      {bulkType && (
        <BulkModal
          type={bulkType}
          year={year}
          month={month}
          basePrice={basePrice}
          fmt={fmt}
          t={t}
          onApply={applyBulk}
          onClose={() => setBulkType(null)}
        />
      )}

      {csvRows && (
        <CsvImportModal
          rows={csvRows}
          fmt={fmt}
          t={t}
          onApply={applyImport}
          onClose={() => setCsvRows(null)}
        />
      )}
    </div>
  );
}
