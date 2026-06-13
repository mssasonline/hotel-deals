'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { COUNTRIES, getCountryName, type Country } from '@/lib/countries';
import type { Language } from '@/store/appSettingsStore';

interface CountrySelectProps {
  value: string;
  onChange: (country: Country) => void;
  language: Language;
  placeholder?: string;
  searchPlaceholder?: string;
  showDialCode?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function CountrySelect({
  value,
  onChange,
  language,
  placeholder = 'Select country',
  searchPlaceholder = 'Search...',
  showDialCode = false,
  disabled = false,
  className = '',
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(() => COUNTRIES.find(c => c.code === value) ?? null, [value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return COUNTRIES;
    const q = query.toLowerCase();
    return COUNTRIES.filter(c => {
      const name = getCountryName(c, language).toLowerCase();
      return (
        name.includes(q) ||
        c.en.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q)
      );
    });
  }, [query, language]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(-1);
      setTimeout(() => searchRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  function handleSelect(country: Country) {
    onChange(country);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
        className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:opacity-50 cursor-pointer hover:border-gray-400 transition-colors"
      >
        {selected ? (
          <>
            <span className="text-base leading-none shrink-0">{selected.flag}</span>
            <span className="flex-1 text-left text-gray-900 truncate">
              {getCountryName(selected, language)}
              {showDialCode && (
                <span className="text-gray-400 ml-1.5">({selected.dialCode})</span>
              )}
            </span>
          </>
        ) : (
          <span className="flex-1 text-left text-gray-400 truncate">{placeholder}</span>
        )}
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden" style={{ minWidth: '220px' }}>
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIndex(-1); }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="flex-1 text-sm outline-none text-gray-900 placeholder-gray-400 bg-transparent"
            />
          </div>

          <ul ref={listRef} className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-gray-400 text-center">No results</li>
            ) : (
              filtered.map((country, idx) => (
                <li key={country.code}>
                  <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); handleSelect(country); }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors text-sm ${
                      idx === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                    } ${country.code === value ? 'font-semibold text-brand-blue' : 'text-gray-900'}`}
                  >
                    <span className="text-base leading-none shrink-0">{country.flag}</span>
                    <span className="flex-1 truncate">{getCountryName(country, language)}</span>
                    {showDialCode && (
                      <span className="text-gray-400 text-xs shrink-0 font-mono">{country.dialCode}</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
