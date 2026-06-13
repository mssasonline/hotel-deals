'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// ─── helpers ────────────────────────────────────────────────────────────────

function toDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function displayDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ─── MonthGrid ───────────────────────────────────────────────────────────────

interface MonthGridProps {
  year: number;
  month: number;
  today: Date;
  startDate: Date | null;
  endDate: Date | null;
  hovered: Date | null;
  selectingEnd: boolean;
  onDayClick: (d: Date) => void;
  onDayHover: (d: Date | null) => void;
}

function MonthGrid({
  year,
  month,
  today,
  startDate,
  endDate,
  hovered,
  selectingEnd,
  onDayClick,
  onDayHover,
}: MonthGridProps) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const previewEnd = !endDate && selectingEnd && hovered ? hovered : null;
  const rangeEnd = endDate ?? previewEnd;

  const cells: (Date | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="w-[238px] shrink-0">
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="w-[34px] text-center text-xs font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="w-[34px] h-[34px]" />;

          const isPast = day < today;
          const isToday = sameDay(day, today);
          const isStart = startDate ? sameDay(day, startDate) : false;
          const isEnd = endDate ? sameDay(day, endDate) : false;
          const hasRange =
            startDate && rangeEnd && !sameDay(startDate, rangeEnd);
          const inRange =
            hasRange && day > startDate! && day < rangeEnd!;

          // Cell wrapper background for range strip
          let wrapBg = '';
          if (inRange) wrapBg = 'bg-[#EBF3FF]';
          if (isStart && hasRange)
            wrapBg =
              'bg-[linear-gradient(to_right,transparent_50%,#EBF3FF_50%)]';
          if (isEnd && hasRange)
            wrapBg =
              'bg-[linear-gradient(to_left,transparent_50%,#EBF3FF_50%)]';

          // Button classes
          let btn =
            'relative flex items-center justify-center w-8 h-8 text-sm rounded-full transition-colors duration-75 ';
          if (isPast) {
            btn += 'text-gray-300 cursor-default';
          } else if (isStart || isEnd) {
            btn += 'bg-brand-blue text-white font-semibold cursor-pointer shadow-sm';
          } else if (inRange) {
            btn += 'text-brand-blue cursor-pointer hover:bg-brand-blue hover:text-white';
          } else {
            btn +=
              'text-gray-700 cursor-pointer hover:bg-brand-blue hover:text-white';
          }
          if (isToday && !isStart && !isEnd) {
            btn += ' ring-2 ring-brand-blue ring-offset-1';
          }

          return (
            <div
              key={`${year}-${month}-${day.getDate()}`}
              className={`w-[34px] h-[34px] flex items-center justify-center ${wrapBg}`}
            >
              <button
                type="button"
                disabled={isPast}
                onClick={() => onDayClick(day)}
                onMouseEnter={() => onDayHover(day)}
                onMouseLeave={() => onDayHover(null)}
                className={btn}
                aria-label={day.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
                aria-pressed={isStart || isEnd}
              >
                {day.getDate()}
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
  checkIn: string;  // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  onChange: (checkIn: string, checkOut: string) => void;
  checkInLabel?: string;
  checkOutLabel?: string;
  /** extra className on the trigger wrapper */
  className?: string;
}

export default function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
  checkInLabel = 'Check-in',
  checkOutLabel = 'Check-out',
  className = '',
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<Date | null>(null);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });

  const today = stripTime(new Date());

  const [leftMonth, setLeftMonth] = useState(() => {
    const ci = toDate(checkIn);
    return ci
      ? { year: ci.getFullYear(), month: ci.getMonth() }
      : { year: today.getFullYear(), month: today.getMonth() };
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const checkInDate = toDate(checkIn);
  const checkOutDate = toDate(checkOut);
  const nights =
    checkInDate && checkOutDate ? diffDays(checkInDate, checkOutDate) : null;

  const rightMonth =
    leftMonth.month === 11
      ? { year: leftMonth.year + 1, month: 0 }
      : { year: leftMonth.year, month: leftMonth.month + 1 };

  function updateDropPos() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // Clamp left so calendar doesn't overflow right edge
    const calWidth = window.innerWidth >= 768 ? 544 : 270;
    const rawLeft = rect.left;
    const left = Math.min(rawLeft, window.innerWidth - calWidth - 8);
    setDropPos({ top: rect.bottom + 8, left: Math.max(8, left) });
  }

  useEffect(() => {
    if (!open) return;
    updateDropPos();
    const opts = { passive: true } as const;
    window.addEventListener('scroll', updateDropPos, opts);
    window.addEventListener('resize', updateDropPos, opts);
    return () => {
      window.removeEventListener('scroll', updateDropPos);
      window.removeEventListener('resize', updateDropPos);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setSelectingEnd(!!checkInDate && !checkOutDate);
    const ci = toDate(checkIn);
    if (ci) {
      setLeftMonth({ year: ci.getFullYear(), month: ci.getMonth() });
    } else {
      setLeftMonth({ year: today.getFullYear(), month: today.getMonth() });
    }
    setOpen(true);
  }

  function handleDayClick(day: Date) {
    if (!selectingEnd || !checkInDate) {
      onChange(toYMD(day), '');
      setSelectingEnd(true);
    } else {
      if (day <= checkInDate) {
        onChange(toYMD(day), '');
        setSelectingEnd(true);
      } else {
        onChange(checkIn, toYMD(day));
        setSelectingEnd(false);
        setTimeout(() => setOpen(false), 160);
      }
    }
  }

  function prevMonth() {
    setLeftMonth((p) =>
      p.month === 0
        ? { year: p.year - 1, month: 11 }
        : { year: p.year, month: p.month - 1 },
    );
  }

  function nextMonth() {
    setLeftMonth((p) =>
      p.month === 11
        ? { year: p.year + 1, month: 0 }
        : { year: p.year, month: p.month + 1 },
    );
  }

  const monthLabel = (y: number, m: number) =>
    new Date(y, m, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

  const dropdown =
    open && mounted
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 select-none"
            onClick={(e) => e.stopPropagation()}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Month navigation header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevMonth}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
                aria-label="Previous month"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-0">
                <span className="w-[238px] text-center text-sm font-semibold text-gray-900">
                  {monthLabel(leftMonth.year, leftMonth.month)}
                </span>
                <span className="hidden md:block w-[238px] text-center text-sm font-semibold text-gray-900">
                  {monthLabel(rightMonth.year, rightMonth.month)}
                </span>
              </div>

              <button
                type="button"
                onClick={nextMonth}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
                aria-label="Next month"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-start gap-6">
              <MonthGrid
                year={leftMonth.year}
                month={leftMonth.month}
                today={today}
                startDate={checkInDate}
                endDate={checkOutDate}
                hovered={hovered}
                selectingEnd={selectingEnd}
                onDayClick={handleDayClick}
                onDayHover={setHovered}
              />
              <div className="hidden md:block w-px self-stretch bg-gray-100" />
              <div className="hidden md:block">
                <MonthGrid
                  year={rightMonth.year}
                  month={rightMonth.month}
                  today={today}
                  startDate={checkInDate}
                  endDate={checkOutDate}
                  hovered={hovered}
                  selectingEnd={selectingEnd}
                  onDayClick={handleDayClick}
                  onDayHover={setHovered}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between min-h-[32px]">
              <span className="text-xs text-gray-500">
                {!checkInDate && 'Select check-in date'}
                {checkInDate && !checkOutDate && (
                  <>
                    <span className="font-semibold text-brand-blue">
                      {displayDate(checkInDate)}
                    </span>
                    {' → Select check-out date'}
                  </>
                )}
                {checkInDate && checkOutDate && (
                  <>
                    <span className="font-semibold text-brand-blue">
                      {displayDate(checkInDate)}
                    </span>
                    {' — '}
                    <span className="font-semibold text-brand-blue">
                      {displayDate(checkOutDate)}
                    </span>
                  </>
                )}
              </span>
              {nights != null && nights > 0 && (
                <span className="bg-brand-blue text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {nights} {nights === 1 ? 'night' : 'nights'}
                </span>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        ref={triggerRef}
        className={`flex items-center gap-2.5 cursor-pointer ${className}`}
        onClick={handleToggle}
      >
        {/* Calendar icon */}
        <svg
          className="w-4 h-4 text-brand-blue shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>

        {/* Date display */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs text-brand-blue font-semibold leading-none mb-0.5">
              {checkInLabel}
            </span>
            <span
              className={`text-sm leading-tight ${
                checkInDate ? 'text-gray-800 font-medium' : 'text-gray-400'
              }`}
            >
              {checkInDate ? displayDate(checkInDate) : '—'}
            </span>
          </div>

          <span className="text-gray-300 text-lg leading-none">—</span>

          <div className="flex flex-col">
            <span className="text-xs text-brand-blue font-semibold leading-none mb-0.5">
              {checkOutLabel}
            </span>
            <span
              className={`text-sm leading-tight ${
                checkOutDate ? 'text-gray-800 font-medium' : 'text-gray-400'
              }`}
            >
              {checkOutDate ? displayDate(checkOutDate) : '—'}
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
