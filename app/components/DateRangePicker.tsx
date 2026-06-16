'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function displayDate(iso: string): string {
  if (!iso) return '—';
  return parseISO(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── MonthGrid ───────────────────────────────────────────────────────────────

interface MonthGridProps {
  month: Date;
  todayISO: string;
  checkIn: string;
  checkOut: string;
  hoveredISO: string | null;
  selectionPhase: 'checkIn' | 'checkOut';
  onDayClick: (iso: string) => void;
  onDayHover: (iso: string | null) => void;
}

function MonthGrid({
  month,
  todayISO,
  checkIn,
  checkOut,
  hoveredISO,
  selectionPhase,
  onDayClick,
  onDayHover,
}: MonthGridProps) {
  const year = month.getFullYear();
  const mon  = month.getMonth();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const firstDow = new Date(year, mon, 1).getDay();

  const hoverEnd = selectionPhase === 'checkOut' && hoveredISO ? hoveredISO : checkOut;

  const cells: Array<string | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toLocalISO(new Date(year, mon, d)));
  }

  return (
    <div className="w-full min-w-[238px]">
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((iso, i) => {
          if (!iso) return <div key={`blank-${i}`} className="h-[34px]" />;

          const isPast = iso < todayISO;
          const isToday = iso === todayISO;
          const isCheckIn = iso === checkIn;
          const isCheckOut = iso === checkOut;

          const rangeEnd = hoverEnd && hoverEnd > checkIn ? hoverEnd : checkOut;
          const inRange  = !!(checkIn && rangeEnd && iso > checkIn && iso < rangeEnd);
          const isStartEnd = isCheckIn || isCheckOut;

          // Wrapper bg for range strip
          let wrapBg = '';
          if (inRange) wrapBg = 'bg-[#EBF3FF]';
          if (isCheckIn && rangeEnd && rangeEnd > checkIn)
            wrapBg = 'bg-[linear-gradient(to_right,transparent_50%,#EBF3FF_50%)]';
          if (isCheckOut && checkIn && checkIn < checkOut)
            wrapBg = 'bg-[linear-gradient(to_left,transparent_50%,#EBF3FF_50%)]';
          if (isCheckIn && isCheckOut) wrapBg = '';

          let btn =
            'relative flex items-center justify-center w-[34px] h-[34px] text-sm rounded-full transition-colors duration-75 ';
          if (isPast) {
            btn += 'text-gray-300 cursor-default';
          } else if (isStartEnd) {
            btn += 'bg-brand-blue text-white font-semibold cursor-pointer shadow-sm';
          } else if (inRange) {
            btn += 'text-brand-blue cursor-pointer hover:bg-brand-blue hover:text-white';
          } else {
            btn += 'text-gray-700 cursor-pointer hover:bg-brand-blue hover:text-white';
          }
          if (isToday && !isStartEnd) btn += ' ring-2 ring-brand-blue ring-offset-1';

          return (
            <div
              key={iso}
              className={`w-[34px] h-[34px] flex items-center justify-center ${wrapBg}`}
            >
              <button
                type="button"
                disabled={isPast}
                onClick={() => !isPast && onDayClick(iso)}
                onMouseEnter={() => !isPast && onDayHover(iso)}
                onMouseLeave={() => onDayHover(null)}
                className={btn}
                aria-label={parseISO(iso).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
                aria-pressed={isStartEnd}
              >
                {Number(iso.split('-')[2])}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DateRangePicker ─────────────────────────────────────────────────────────

export interface DateRangePickerProps {
  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD
  onChange: (checkIn: string, checkOut: string) => void;
  checkInLabel?: string;
  checkOutLabel?: string;
  /** 'portal'  = compact trigger + double-month floating calendar (default)
   *  'inline'  = two-button trigger + single-month dropdown */
  mode?: 'portal' | 'inline';
  className?: string;
}

export default function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
  checkInLabel = 'Check-in',
  checkOutLabel = 'Check-out',
  mode = 'portal',
  className = '',
}: DateRangePickerProps) {
  const todayStr = toLocalISO(new Date());

  const [open, setOpen] = useState(false);
  const [selectionPhase, setSelectionPhase] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [hoveredISO, setHoveredISO] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [viewMonth, setViewMonth] = useState<Date>(() =>
    startOfMonth(checkIn ? parseISO(checkIn) : new Date()),
  );

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });

  useEffect(() => { setMounted(true); }, []);

  const nights = checkIn && checkOut ? diffDays(parseISO(checkIn), parseISO(checkOut)) : null;

  const rightMonth =
    viewMonth.getMonth() === 11
      ? new Date(viewMonth.getFullYear() + 1, 0, 1)
      : new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);

  // Portal position tracking
  function updateDropPos() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const calWidth = window.innerWidth >= 768 ? 544 : 270;
    const left = Math.min(rect.left, window.innerWidth - calWidth - 8);
    setDropPos({ top: rect.bottom + 8, left: Math.max(8, left) });
  }

  useEffect(() => {
    if (!open || mode !== 'portal') return;
    updateDropPos();
    const opts = { passive: true } as const;
    window.addEventListener('scroll', updateDropPos, opts);
    window.addEventListener('resize', updateDropPos, opts);
    return () => {
      window.removeEventListener('scroll', updateDropPos);
      window.removeEventListener('resize', updateDropPos);
    };
  }, [open, mode]);

  // Outside-click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Day selection logic
  const handleDayClick = useCallback((iso: string) => {
    if (selectionPhase === 'checkIn') {
      onChange(iso, iso >= checkOut ? '' : checkOut);
      setSelectionPhase('checkOut');
    } else {
      if (iso <= checkIn) {
        onChange(iso, '');
        setSelectionPhase('checkOut');
      } else {
        onChange(checkIn, iso);
        setSelectionPhase('checkIn');
        if (mode === 'portal') {
          setTimeout(() => setOpen(false), 160);
        } else {
          setOpen(false);
        }
      }
    }
  }, [selectionPhase, checkIn, checkOut, onChange, mode]);

  // Portal toggle
  function handlePortalToggle() {
    if (open) { setOpen(false); return; }
    setSelectionPhase(checkIn && !checkOut ? 'checkOut' : 'checkIn');
    setViewMonth(startOfMonth(checkIn ? parseISO(checkIn) : new Date()));
    setOpen(true);
  }

  // Inline open helpers
  function openForCheckIn() {
    setSelectionPhase('checkIn');
    setViewMonth(startOfMonth(checkIn ? parseISO(checkIn) : new Date()));
    setOpen(true);
  }
  function openForCheckOut() {
    setSelectionPhase('checkOut');
    setViewMonth(startOfMonth(checkOut ? parseISO(checkOut) : checkIn ? parseISO(checkIn) : new Date()));
    setOpen(true);
  }

  // ── Calendar panel ────────────────────────────────────────────────────────

  const calendarPanel = (
    <div
      ref={dropdownRef}
      className={`bg-white rounded-2xl border border-gray-200 shadow-2xl p-4 md:p-5 select-none ${
        mode === 'portal' ? 'w-[270px] md:w-[544px]' : 'w-full'
      }`}
      onClick={(e) => e.stopPropagation()}
      onMouseLeave={() => setHoveredISO(null)}
    >
      {/* Instruction chip — inline only */}
      {mode === 'inline' && (
        <div className="flex items-center justify-center mb-3">
          <span className="text-xs font-semibold text-brand-blue bg-brand-blue/10 px-3 py-1 rounded-full">
            {selectionPhase === 'checkIn' ? 'Select check-in date' : 'Select check-out date'}
          </span>
        </div>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          disabled={viewMonth <= startOfMonth(new Date())}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className={`flex ${mode === 'portal' ? 'gap-0' : 'justify-center'}`}>
          <span className={`text-center text-sm font-semibold text-gray-900 ${mode === 'portal' ? 'w-[238px]' : ''}`}>
            {MONTHS_LONG[viewMonth.getMonth()]} {viewMonth.getFullYear()}
          </span>
          {mode === 'portal' && (
            <span className="hidden md:block w-[238px] text-center text-sm font-semibold text-gray-900">
              {MONTHS_LONG[rightMonth.getMonth()]} {rightMonth.getFullYear()}
            </span>
          )}
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

      {/* Month grid(s) */}
      <div className={`flex items-start ${mode === 'portal' ? 'gap-6' : ''}`}>
        <MonthGrid
          month={viewMonth}
          todayISO={todayStr}
          checkIn={checkIn}
          checkOut={checkOut}
          hoveredISO={hoveredISO}
          selectionPhase={selectionPhase}
          onDayClick={handleDayClick}
          onDayHover={setHoveredISO}
        />
        {mode === 'portal' && (
          <>
            <div className="hidden md:block w-px self-stretch bg-gray-100" />
            <div className="hidden md:block">
              <MonthGrid
                month={rightMonth}
                todayISO={todayStr}
                checkIn={checkIn}
                checkOut={checkOut}
                hoveredISO={hoveredISO}
                selectionPhase={selectionPhase}
                onDayClick={handleDayClick}
                onDayHover={setHoveredISO}
              />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3 min-h-[32px]">
        {mode === 'portal' ? (
          <>
            <span className="text-xs text-gray-500">
              {!checkIn && 'Select check-in date'}
              {checkIn && !checkOut && (
                <>
                  <span className="font-semibold text-brand-blue">{displayDate(checkIn)}</span>
                  {' → Select check-out date'}
                </>
              )}
              {checkIn && checkOut && (
                <>
                  <span className="font-semibold text-brand-blue">{displayDate(checkIn)}</span>
                  {' — '}
                  <span className="font-semibold text-brand-blue">{displayDate(checkOut)}</span>
                </>
              )}
            </span>
            {nights != null && nights > 0 && (
              <span className="bg-brand-blue text-white text-xs font-semibold px-3 py-1 rounded-full shrink-0">
                {nights} {nights === 1 ? 'night' : 'nights'}
              </span>
            )}
          </>
        ) : (
          <>
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{checkIn ? displayDate(checkIn) : '—'}</span>
              <span className="mx-2 text-gray-300">→</span>
              <span className="font-semibold text-gray-900">{checkOut ? displayDate(checkOut) : '—'}</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-white px-4 py-1.5 rounded-xl transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );

  // ── Portal mode ───────────────────────────────────────────────────────────

  if (mode === 'portal') {
    const dropdown =
      open && mounted
        ? createPortal(
            <div style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999 }}>
              {calendarPanel}
            </div>,
            document.body,
          )
        : null;

    return (
      <>
        <div
          ref={triggerRef}
          className={`flex items-center gap-2.5 cursor-pointer ${className}`}
          onClick={handlePortalToggle}
        >
          <svg className="w-4 h-4 text-brand-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>

          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-brand-blue font-semibold leading-none mb-0.5">{checkInLabel}</span>
              <span className={`text-sm leading-tight ${checkIn ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                {checkIn ? displayDate(checkIn) : '—'}
              </span>
            </div>

            <span className="text-gray-300 text-lg leading-none">—</span>

            <div className="flex flex-col">
              <span className="text-xs text-brand-blue font-semibold leading-none mb-0.5">{checkOutLabel}</span>
              <span className={`text-sm leading-tight ${checkOut ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                {checkOut ? displayDate(checkOut) : '—'}
              </span>
            </div>

            {nights != null && nights > 0 && (
              <span className="hidden sm:inline-flex items-center text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-1 whitespace-nowrap">
                {nights} {nights === 1 ? 'night' : 'nights'}
              </span>
            )}
          </div>
        </div>
        {dropdown}
      </>
    );
  }

  // ── Inline mode ───────────────────────────────────────────────────────────

  return (
    <div ref={triggerRef} className={`relative ${className}`}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {checkInLabel}
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
              {checkIn ? displayDate(checkIn) : '—'}
            </span>
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {checkOutLabel}
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
              {checkOut ? displayDate(checkOut) : '—'}
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2">
          {calendarPanel}
        </div>
      )}
    </div>
  );
}
