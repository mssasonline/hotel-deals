'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ── Helpers ────────────────────────────────────────────────────────────────

function toLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Month grid ─────────────────────────────────────────────────────────────

interface MonthGridProps {
  month: Date;        // first day of the month to render
  today: string;      // ISO today
  checkIn: string;
  checkOut: string;
  hoveredDate: string | null;
  selectionPhase: 'checkIn' | 'checkOut';
  onDayClick: (iso: string) => void;
  onDayHover: (iso: string | null) => void;
}

function MonthGrid({
  month,
  today,
  checkIn,
  checkOut,
  hoveredDate,
  selectionPhase,
  onDayClick,
  onDayHover,
}: MonthGridProps) {
  const year = month.getFullYear();
  const mon  = month.getMonth();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const firstDow = new Date(year, mon, 1).getDay(); // 0=Sun

  const hoverEnd = selectionPhase === 'checkOut' && hoveredDate ? hoveredDate : checkOut;

  const cells: Array<{ iso: string | null }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ iso: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: toLocalISO(new Date(year, mon, d)) });
  }

  return (
    <div className="w-full min-w-[280px]">
      {/* Month/year header */}
      <div className="text-center font-bold text-gray-800 mb-3 text-sm">
        {MONTHS_LONG[mon]} {year}
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          if (!cell.iso) {
            return <div key={`blank-${i}`} />;
          }

          const iso = cell.iso;
          const isPast = iso < today;
          const isToday = iso === today;
          const isCheckIn = iso === checkIn;
          const isCheckOut = iso === checkOut;

          const rangeStart = checkIn;
          const rangeEnd   = hoverEnd && hoverEnd > checkIn ? hoverEnd : checkOut;
          const inRange    = checkIn && rangeEnd && iso > rangeStart && iso < rangeEnd;

          const isStartEnd = isCheckIn || isCheckOut;

          let bgClass = '';
          let textClass = 'text-gray-800';
          let rounded = 'rounded-full';

          if (isPast) {
            textClass = 'text-gray-300 cursor-not-allowed';
          } else if (isStartEnd) {
            bgClass = 'bg-brand-blue';
            textClass = 'text-white font-bold';
            if (isCheckIn && rangeEnd && rangeEnd > checkIn) rounded = 'rounded-l-full';
            if (isCheckOut) rounded = 'rounded-r-full';
            if (isCheckIn && isCheckOut) rounded = 'rounded-full';
          } else if (inRange) {
            bgClass = 'bg-brand-blue/10';
            textClass = 'text-brand-blue font-medium';
            rounded = 'rounded-none';
          } else if (isToday) {
            textClass = 'text-brand-blue font-bold';
          }

          return (
            <div
              key={iso}
              className={`relative flex items-center justify-center ${rounded} ${bgClass}`}
            >
              <button
                type="button"
                disabled={isPast}
                onClick={() => !isPast && onDayClick(iso)}
                onMouseEnter={() => !isPast && onDayHover(iso)}
                onMouseLeave={() => onDayHover(null)}
                className={`
                  w-9 h-9 flex items-center justify-center text-sm leading-none select-none
                  transition-colors duration-100
                  ${isPast ? 'cursor-not-allowed' : 'cursor-pointer hover:rounded-full hover:bg-brand-blue/20'}
                  ${isStartEnd ? 'rounded-full bg-brand-blue text-white hover:bg-brand-blue' : ''}
                  ${textClass}
                `}
                aria-label={iso}
                aria-pressed={isStartEnd}
              >
                {new Date(year, mon, Number(iso.split('-')[2])).getDate()}
                {isToday && !isStartEnd && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-blue" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main DateRangePicker ───────────────────────────────────────────────────

interface Props {
  checkIn: string;
  checkOut: string;
  onCheckInChange: (iso: string) => void;
  onCheckOutChange: (iso: string) => void;
  labelCheckIn?: string;
  labelCheckOut?: string;
}

export default function DateRangePicker({
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  labelCheckIn = 'Check-in',
  labelCheckOut = 'Check-out',
}: Props) {
  const today = toLocalISO(new Date());

  const [open, setOpen] = useState(false);
  const [selectionPhase, setSelectionPhase] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(parseISO(checkIn || today)));

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openForCheckIn = useCallback(() => {
    setSelectionPhase('checkIn');
    setViewMonth(startOfMonth(parseISO(checkIn || today)));
    setOpen(true);
  }, [checkIn, today]);

  const openForCheckOut = useCallback(() => {
    setSelectionPhase('checkOut');
    setViewMonth(startOfMonth(parseISO(checkOut || checkIn || today)));
    setOpen(true);
  }, [checkOut, checkIn, today]);

  const handleDayClick = useCallback((iso: string) => {
    if (selectionPhase === 'checkIn') {
      onCheckInChange(iso);
      // If selected check-in is strictly after current check-out, reset check-out
      if (iso > checkOut) {
        const next = new Date(iso + 'T12:00:00');
        next.setDate(next.getDate() + 1);
        onCheckOutChange(toLocalISO(next));
      }
      setSelectionPhase('checkOut');
    } else {
      if (iso < checkIn) {
        // Selected before check-in: flip — new check-in, reset check-out
        onCheckInChange(iso);
        const next = new Date(iso + 'T12:00:00');
        next.setDate(next.getDate() + 1);
        onCheckOutChange(toLocalISO(next));
        setSelectionPhase('checkOut');
      } else {
        onCheckOutChange(iso);
        setOpen(false);
        setSelectionPhase('checkIn');
      }
    }
  }, [selectionPhase, checkIn, checkOut, onCheckInChange, onCheckOutChange]);

  function fmt(iso: string): string {
    if (!iso) return '—';
    const d = parseISO(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger: two date fields side-by-side */}
      <div className="grid grid-cols-2 gap-2">
        {/* Check-in button */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {labelCheckIn}
          </label>
          <button
            type="button"
            onClick={openForCheckIn}
            className={`w-full text-left bg-gray-50 border rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
              open && selectionPhase === 'checkIn'
                ? 'border-brand-blue ring-2 ring-brand-blue/20 text-brand-blue'
                : 'border-gray-200 text-gray-900 hover:border-brand-blue/40'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {fmt(checkIn)}
            </span>
          </button>
        </div>

        {/* Check-out button */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {labelCheckOut}
          </label>
          <button
            type="button"
            onClick={openForCheckOut}
            className={`w-full text-left bg-gray-50 border rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
              open && selectionPhase === 'checkOut'
                ? 'border-brand-blue ring-2 ring-brand-blue/20 text-brand-blue'
                : 'border-gray-200 text-gray-900 hover:border-brand-blue/40'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {fmt(checkOut)}
            </span>
          </button>
        </div>
      </div>

      {/* Calendar dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-full">

            {/* Instruction row */}
            <div className="flex items-center justify-center mb-3">
              <span className="text-xs font-semibold text-brand-blue bg-brand-blue/10 px-3 py-1 rounded-full">
                {selectionPhase === 'checkIn' ? '📅 Select check-in date' : '📅 Select check-out date'}
              </span>
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4 px-1">
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, -1))}
                disabled={viewMonth <= startOfMonth(parseISO(today))}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous month"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="text-sm font-bold text-gray-700">
                {MONTHS_LONG[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </div>

              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="Next month"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Single-month grid */}
            <div>
              <MonthGrid
                month={viewMonth}
                today={today}
                checkIn={checkIn}
                checkOut={checkOut}
                hoveredDate={hoveredDate}
                selectionPhase={selectionPhase}
                onDayClick={handleDayClick}
                onDayHover={setHoveredDate}
              />
            </div>

            {/* Footer: selected range summary + close */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{fmt(checkIn)}</span>
                <span className="mx-2 text-gray-300">→</span>
                <span className="font-semibold text-gray-900">{fmt(checkOut)}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue-dark px-4 py-1.5 rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
