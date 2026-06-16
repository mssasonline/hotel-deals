'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface AutocompleteItem {
  type: 'city' | 'hotel' | 'country';
  name: string;
  subtitle?: string;
  searchValue: string;
  hotelId?: number;
}

interface AutocompleteSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** name attribute on the <input> — required for HTML form GET submission */
  inputName?: string;
  /** classes applied to the outer wrapper div (should include flex, padding, border) */
  wrapperClassName?: string;
  /** classes applied to the <input> element */
  inputClassName?: string;
  /** icon size class, defaults to "w-5 h-5" */
  iconSize?: string;
  /** called when Enter is pressed without an active dropdown selection */
  onEnter?: () => void;
}

/** Renders text with the matched portion bolded/highlighted */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const lower = text.toLowerCase();
  const lowerQ = query.trim().toLowerCase();
  const start = lower.indexOf(lowerQ);

  if (start === -1) return <>{text}</>;

  const end = start + lowerQ.length;
  return (
    <>
      {text.slice(0, start)}
      <mark className="bg-yellow-100 text-yellow-800 font-semibold rounded-sm px-0.5 not-italic">
        {text.slice(start, end)}
      </mark>
      {text.slice(end)}
    </>
  );
}

export default function AutocompleteSearch({
  value,
  onChange,
  placeholder,
  inputName,
  wrapperClassName = '',
  inputClassName = '',
  iconSize = 'w-5 h-5',
  onEnter,
}: AutocompleteSearchProps) {
  const router = useRouter();
  const t = useTranslation();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<AutocompleteItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keep display in sync if parent resets value externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      abortRef.current?.abort();
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(q)}`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error('autocomplete fetch failed');
      const matches: AutocompleteItem[] = await res.json();
      setResults(matches);
      setIsOpen(matches.length > 0);
      setActiveIndex(-1);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setResults([]);
      setIsOpen(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!val.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    debounceTimer.current = setTimeout(() => runSearch(val), 300);
  };

  const handleSelect = (item: AutocompleteItem) => {
    if (item.type === 'hotel' && item.hotelId) {
      router.push(`/hotel/${item.hotelId}`);
      setIsOpen(false);
      return;
    }
    setQuery(item.searchValue);
    onChange(item.searchValue);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isOpen && results.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, -1));
        return;
      }
      if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setActiveIndex(-1);
        return;
      }
    }
    if (e.key === 'Enter') {
      onEnter?.();
    }
  };

  const handleFocus = () => {
    if (query.trim() && results.length > 0) setIsOpen(true);
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${wrapperClassName}`}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Location pin icon */}
      <svg
        className={`${iconSize} text-brand-blue shrink-0`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>

      <input
        ref={inputRef}
        type="text"
        name={inputName}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls="autocomplete-listbox"
        role="combobox"
        className={inputClassName}
      />

      {isOpen && results.length > 0 && (
        <ul
          id="autocomplete-listbox"
          role="listbox"
          className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden"
          style={{ minWidth: '280px' }}
        >
          {(['city', 'country', 'hotel'] as const).map((type) => {
            const group = results.filter(r => r.type === type);
            if (group.length === 0) return null;
            const prevTypes = (['city', 'country', 'hotel'] as const).slice(0, ['city', 'country', 'hotel'].indexOf(type));
            const hasPrev = prevTypes.some(t => results.some(r => r.type === t));
            const label = type === 'city' ? t['search.citiesLabel'] : type === 'country' ? t['search.countriesLabel'] : t['search.hotelsLabel'];
            const icon  = type === 'city'
              ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              : type === 'country'
              ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-4a3 3 0 016 0v4"/></svg>;
            const badge = type === 'city'
              ? 'bg-blue-100 text-blue-700'
              : type === 'country'
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700';

            return (
              <li key={type}>
                <div className={`px-4 pb-1 ${hasPrev ? 'pt-3 border-t border-gray-100 mt-1' : 'pt-2.5'}`}>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
                </div>
                <ul>
                  {group.map((item) => {
                    const globalIdx = results.indexOf(item);
                    return (
                      <li key={`${type}-${item.name}`} role="option" aria-selected={globalIdx === activeIndex}>
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                            globalIdx === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <span className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 ${
                            type === 'city' ? 'bg-blue-100 text-blue-600' : type === 'country' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                          }`}>
                            {icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              <HighlightedText text={item.name} query={query} />
                            </div>
                            {item.subtitle && (
                              <div className="text-xs text-gray-500 truncate">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${badge}`}>
                            {type === 'city' ? t['search.cityLabel'] : type === 'country' ? t['search.countryLabel'] : t['search.hotelLabel']}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
