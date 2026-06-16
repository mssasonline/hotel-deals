'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { SearchHotel } from '@/app/lib/searchData';
import { filterHotelsByCity, sortHotelsByPriority } from '@/lib/geoFilter';
import { calcLivePrice, calcActualDiscount, getCurrentTier } from '@/lib/pricingEngine';
import { distanceKm } from '@/lib/geo';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useBookingStore } from '@/store/bookingStore';
import FilterSidebar, { type FilterState, DEFAULT_FILTERS } from './FilterSidebar';
import HotelListingCard from './HotelListingCard';

type SortOption = 'recommended' | 'discount' | 'price' | 'expiry' | 'distance';

const GPS_INITIAL_COUNT = 10;
const GPS_LOAD_MORE_STEP = 5;

interface SearchResultsClientProps {
  city: string;
  checkin: string;
  checkout: string;
  guests: string;
  hotels: SearchHotel[];
  userLat?: number;
  userLng?: number;
}

export default function SearchResultsClient({
  city,
  checkin,
  checkout,
  guests,
  hotels,
  userLat,
  userLng,
}: SearchResultsClientProps) {
  const t = useTranslation();
  const setStoreGuests = useBookingStore((s) => s.setGuests);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortOption>(
    userLat && userLng ? 'distance' : 'recommended',
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(GPS_INITIAL_COUNT);

  const isGpsMode = !!(userLat && userLng);

  // ── Inline hotel-name search (debounced 350ms) ─────────────────────────
  const [nameInput, setNameInput] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNameInput = useCallback((val: string) => {
    setNameInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setNameQuery(val.trim()), 350);
  }, []);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // Reset visible count when filters change (GPS mode)
  useEffect(() => {
    if (isGpsMode) setVisibleCount(GPS_INITIAL_COUNT);
  }, [filters, nameQuery, isGpsMode]);

  // ── GPS distances — computed once per hotel list ───────────────────────
  const gpsDistances = useMemo<Map<number, number>>(() => {
    if (!isGpsMode) return new Map();
    const map = new Map<number, number>();
    for (const h of hotels) {
      map.set(
        h.id,
        h.latitude != null && h.longitude != null
          ? distanceKm(userLat!, userLng!, h.latitude, h.longitude)
          : Infinity,
      );
    }
    return map;
  }, [hotels, isGpsMode, userLat, userLng]);

  // ── Available cities for sidebar filter ───────────────────────────────
  const availableCities = useMemo(() => {
    return [...new Set(hotels.map(h => h.city).filter(Boolean))].sort();
  }, [hotels]);

  const sortOptions: { value: SortOption; label: string }[] = [
    ...(isGpsMode
      ? [{ value: 'distance' as SortOption, label: t['search.sortDistance'] }]
      : [{ value: 'recommended' as SortOption, label: t['search.sortRecommended'] }]),
    { value: 'discount', label: t['search.sortDiscount'] },
    { value: 'price', label: t['search.sortPrice'] },
    { value: 'expiry', label: t['search.sortExpiry'] },
  ];

  // ── Step 1: Base pool (GPS = all hotels; normal = city-filtered) ───────
  const baseHotels = useMemo(() => {
    if (isGpsMode) return hotels;
    if (filters.selectedCities.length > 0) {
      return hotels.filter(h => filters.selectedCities.includes(h.city));
    }
    return filterHotelsByCity(hotels, city);
  }, [hotels, city, filters.selectedCities, isGpsMode]);

  // ── Step 2: Inline name search ─────────────────────────────────────────
  const nameFilteredHotels = useMemo(() => {
    if (!nameQuery) return baseHotels;
    const q = nameQuery.toLowerCase();
    return baseHotels.filter(
      h =>
        h.name.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q) ||
        h.location.toLowerCase().includes(q) ||
        h.country.toLowerCase().includes(q),
    );
  }, [baseHotels, nameQuery]);

  // ── Step 3: Sidebar filters ────────────────────────────────────────────
  const filteredHotels = useMemo(() => {
    const tier = getCurrentTier();
    return nameFilteredHotels.filter(h => {
      const livePrice = h.basePrice > 0 ? calcLivePrice(h.basePrice, h.minPrice, tier) : 0;
      if (livePrice > filters.maxPrice) return false;
      if (Math.floor(h.stars) < filters.minStars) return false;
      if (filters.dealsOnly && calcActualDiscount(h.basePrice, livePrice) === 0) return false;
      return true;
    });
  }, [nameFilteredHotels, filters]);

  // ── Step 4: Sort ───────────────────────────────────────────────────────
  const sortedHotels = useMemo(() => {
    return [...filteredHotels].sort((a, b) => {
      switch (sortBy) {
        case 'distance': {
          const aDist = gpsDistances.get(a.id) ?? Infinity;
          const bDist = gpsDistances.get(b.id) ?? Infinity;
          return aDist - bDist;
        }
        case 'discount': {
          const tier = getCurrentTier();
          const aLive = calcLivePrice(a.basePrice, a.minPrice, tier);
          const bLive = calcLivePrice(b.basePrice, b.minPrice, tier);
          const aDisc = calcActualDiscount(a.basePrice, aLive);
          const bDisc = calcActualDiscount(b.basePrice, bLive);
          return bDisc - aDisc;
        }
        case 'price': {
          const tier = getCurrentTier();
          const aPrice = calcLivePrice(a.basePrice, a.minPrice, tier);
          const bPrice = calcLivePrice(b.basePrice, b.minPrice, tier);
          return aPrice - bPrice;
        }
        case 'expiry': {
          const aMin = a.countdownHours * 60 + a.countdownMinutes;
          const bMin = b.countdownHours * 60 + b.countdownMinutes;
          return aMin - bMin;
        }
        default:
          return b.rating - a.rating;
      }
    });
  }, [filteredHotels, sortBy, gpsDistances]);

  // ── Step 5: Slice for GPS pagination ──────────────────────────────────
  const visibleHotels = isGpsMode ? sortedHotels.slice(0, visibleCount) : sortedHotels;
  const canLoadMore = isGpsMode && visibleCount < sortedHotels.length;

  // ── Fallback hotels (other cities) — only in normal mode ──────────────
  const fallbackHotels = useMemo(() => {
    if (isGpsMode) return [];
    const others = hotels.filter(
      h => h.city.toLowerCase() !== city.trim().toLowerCase(),
    );
    return sortHotelsByPriority(others).slice(0, 3);
  }, [hotels, city, isGpsMode]);

  const noCityResults = !isGpsMode && baseHotels.length === 0 && filters.selectedCities.length === 0;
  const noFilterResults = !noCityResults && sortedHotels.length === 0;

  const activeFilterCount = [
    filters.maxPrice < 99999,
    filters.minStars > 0,
    filters.dealsOnly,
    filters.selectedCities.length > 0,
  ].filter(Boolean).length;

  const guestsNum = parseInt(guests, 10) || 2;

  useEffect(() => {
    setStoreGuests(guestsNum);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestsNum]);

  const displayCity = city.trim() || t['search.allCities'];
  const guestLabel = guestsNum === 1 ? t['search.guest'] : t['search.guests'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* ── Page heading ───────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {isGpsMode ? t['search.nearMe'] : 'Search For Deals'}
          </h1>

          {isGpsMode ? (
            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-200">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t['search.sortedByDistance']}
            </span>
          ) : city.trim() ? (
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-brand-blue text-xs font-semibold px-3 py-1 rounded-full border border-blue-100">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t['search.basedOnSearch']}
            </span>
          ) : null}
        </div>
        <p className="text-gray-500 text-sm mt-0.5">
          {checkin && checkout
            ? `${checkin} → ${checkout} · ${guestsNum} ${guestLabel}`
            : `${t['search.tonight']} · ${guestsNum} ${guestLabel}`}
        </p>
      </div>

      <div className="flex gap-6 items-start">

        {/* ── Desktop sidebar ─────────────────────────────────── */}
        {!noCityResults && (
          <aside className="hidden lg:block w-72 shrink-0 sticky top-36">
            <div
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 overflow-y-auto overscroll-contain scroll-smooth
                         [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-track]:bg-transparent"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              <FilterSidebar
                filters={filters}
                onFiltersChange={setFilters}
                availableCities={isGpsMode ? [] : availableCities}
              />
            </div>
          </aside>
        )}

        {/* ── Results column ──────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {noCityResults ? (
            /* ── No hotels in this city ──────────────────────── */
            <div
              className="overflow-y-auto overscroll-contain scroll-smooth pr-1
                         [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-track]:bg-transparent"
              style={{ maxHeight: 'calc(100vh - 290px)' }}
            >
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-1">
                  {t['search.noHotelsIn']} {displayCity}
                </h3>
                <p className="text-gray-500 text-sm">
                  {t['search.noListingsYet'].replace('{city}', displayCity)}
                </p>
              </div>

              {fallbackHotels.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-base font-bold text-gray-900">{t['search.exploreNearby']}</h2>
                    <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                      {t['search.featured']}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {fallbackHotels.map(hotel => (
                      <HotelListingCard key={hotel.id} hotel={hotel} checkinDate={checkin || undefined} />
                    ))}
                  </div>
                </div>
              )}
              <div className="h-4" />
            </div>
          ) : (
            /* ── Normal / GPS results view ────────────────────── */
            <>
              {/* ── Inline hotel-name search ──────────────────── */}
              <div className="relative mb-3">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => handleNameInput(e.target.value)}
                  placeholder={t['search.refinePlaceholder']}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
                />
                {nameInput && (
                  <button
                    type="button"
                    onClick={() => { setNameInput(''); setNameQuery(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Sort bar + filter button */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">

                <div className="flex gap-1.5 flex-wrap">
                  {sortOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSortBy(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        sortBy === opt.value
                          ? 'text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                      style={sortBy === opt.value ? { background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' } : {}}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-gray-500 text-sm">
                    <span className="font-bold text-gray-900">{sortedHotels.length}</span> {t['search.hotelsFound']}
                  </span>

                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(true)}
                    className="lg:hidden flex items-center gap-1.5 border border-gray-200 hover:border-brand-blue text-gray-700 hover:text-brand-blue text-sm font-medium px-3 py-1.5 rounded-lg transition-colors bg-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    {t['search.filtersMobile']}
                    {activeFilterCount > 0 && (
                      <span className="bg-brand-blue text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full leading-none">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Hotel list or empty state — independently scrollable */}
              <div
                className="overflow-y-auto overscroll-contain scroll-smooth pr-1
                           [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-track]:bg-transparent"
                style={{ maxHeight: 'calc(100vh - 430px)' }}
              >
              {noFilterResults ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center shadow-sm">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{t['search.noMatchFilters']}</h3>
                  <p className="text-gray-500 text-sm mb-5">{t['search.tryBroadening']}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFilters(DEFAULT_FILTERS);
                      setNameInput('');
                      setNameQuery('');
                    }}
                    className="text-white font-semibold px-6 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 text-sm"
                    style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
                  >
                    {t['search.clearAllFilters']}
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {visibleHotels.map(hotel => (
                      <HotelListingCard
                        key={hotel.id}
                        hotel={hotel}
                        checkinDate={checkin || undefined}
                        gpsDistanceKm={isGpsMode ? gpsDistances.get(hotel.id) : undefined}
                      />
                    ))}
                  </div>

                  {/* ── Load More button (GPS mode only) ──────── */}
                  {canLoadMore && (
                    <div className="mt-6 text-center">
                      <button
                        type="button"
                        onClick={() => setVisibleCount(c => c + GPS_LOAD_MORE_STEP)}
                        className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-brand-blue text-gray-700 hover:text-brand-blue font-semibold px-8 py-3 rounded-xl transition-colors text-sm shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        {t['search.loadMore']}
                        <span className="text-gray-400 font-normal">
                          {t['search.hotelsRemaining'].replace('{n}', String(sortedHotels.length - visibleCount))}
                        </span>
                      </button>
                    </div>
                  )}
                </>
              )}
              <div className="h-4" />
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── Mobile filter drawer ────────────────────────────────── */}
      {mobileFiltersOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            aria-hidden="true"
            onClick={() => setMobileFiltersOpen(false)}
          />

          <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white rounded-t-2xl shadow-2xl max-h-[88vh] flex flex-col">

            <div className="flex items-center justify-center pt-3 pb-1 relative shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="absolute right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 pb-4">
              <FilterSidebar
                filters={filters}
                onFiltersChange={setFilters}
                availableCities={isGpsMode ? [] : availableCities}
              />
            </div>

            <div className="shrink-0 border-t border-gray-100 bg-white p-4">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full text-white font-semibold py-3 rounded-xl transition-all hover:-translate-y-0.5 text-sm"
                style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
              >
                {sortedHotels.length === 1
                  ? t['search.showHotel'].replace('{n}', String(sortedHotels.length))
                  : t['search.showHotels'].replace('{n}', String(sortedHotels.length))}
              </button>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
