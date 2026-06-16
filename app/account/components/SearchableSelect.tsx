'use client';

import { useState, useEffect, useRef } from 'react';
import type { SelectOption } from '../types';

export function SearchableSelect({
  options,
  value,
  onChange,
  searchPlaceholder,
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  searchPlaceholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const filtered = search
    ? options.filter(
        (o) =>
          o.primary.toLowerCase().includes(search.toLowerCase()) ||
          (o.secondary ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setSearch('');
        }}
        className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-left bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-gray-900 truncate">{selected?.primary}</span>
          {selected?.secondary && (
            <span className="text-gray-400 shrink-0 text-xs">{selected.secondary}</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-400 text-center">—</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 ${
                    opt.value === value ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={`font-medium truncate ${opt.value === value ? 'text-brand-blue' : 'text-gray-900'}`}
                    >
                      {opt.primary}
                    </span>
                    {opt.secondary && (
                      <span className="text-gray-400 text-xs shrink-0">{opt.secondary}</span>
                    )}
                  </span>
                  {opt.value === value && (
                    <svg
                      className="w-4 h-4 text-brand-blue shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
