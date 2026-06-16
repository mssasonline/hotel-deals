'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import AutocompleteSearch from '@/app/components/AutocompleteSearch';

interface SearchBarProps {
  initialCity: string;
  initialCheckin: string;
  initialCheckout: string;
  initialGuests: string;
}

export default function SearchBar({
  initialCity,
  initialGuests,
}: SearchBarProps) {
  const t = useTranslation();
  const [city, setCity] = useState(initialCity);
  const [guests, setGuests] = useState(initialGuests);
  const router = useRouter();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (city.trim()) params.set('city', city.trim());
    params.set('guests', guests);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="sticky top-16 z-40 shadow-md" style={{ background: 'linear-gradient(135deg, #0F2260 0%, #1E3A8A 55%, #2563EB 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="bg-white rounded-xl flex flex-col sm:flex-row shadow-sm border border-gray-100">

          {/* City */}
          <AutocompleteSearch
            value={city}
            onChange={setCity}
            placeholder={t['search.placeholder']}
            wrapperClassName="flex-1 flex items-center gap-2 px-4 py-2.5 border-b sm:border-b-0 sm:border-r border-gray-100 cursor-text"
            inputClassName="flex-1 outline-none text-gray-800 placeholder-gray-400 text-sm bg-transparent min-w-0"
            iconSize="w-4 h-4"
            onEnter={handleSearch}
          />

          {/* Tonight label */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b sm:border-b-0 sm:border-r border-gray-100">
            <svg className="w-4 h-4 text-brand-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-gray-700 text-sm font-medium">
              Tonight · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>

          {/* Guests */}
          <label className="flex items-center gap-2 px-4 py-2.5 border-b sm:border-b-0 sm:border-r border-gray-100 cursor-pointer">
            <svg className="w-4 h-4 text-brand-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <select
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              aria-label={t['search.guestsLabel']}
              className="outline-none text-gray-800 text-sm bg-transparent cursor-pointer"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? t['search.guest'] : t['search.guests']}
                </option>
              ))}
            </select>
          </label>

          {/* Search button */}
          <button
            onClick={handleSearch}
            className="text-white font-semibold px-7 py-2.5 transition-all text-sm whitespace-nowrap flex items-center justify-center gap-2 sm:rounded-r-xl hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {t['search.searchBtn']}
          </button>

        </div>
      </div>
    </div>
  );
}
