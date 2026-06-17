'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { SpecialDealHotel } from './page';
import AEDAmount from '@/app/partner/components/AEDAmount';
import FilterSidebar, { type FilterState, DEFAULT_FILTERS } from '@/app/search/components/FilterSidebar';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';
const NO_PRICE_LIMIT = 99999;

const DEFAULT_GRADIENTS = [
  'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
  'linear-gradient(135deg, #373b44 0%, #4286f4 100%)',
  'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
  'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  'linear-gradient(135deg, #c79832 0%, #f7971e 60%, #ffd200 100%)',
  'linear-gradient(135deg, #1a3a4a 0%, #2d6986 100%)',
];

function StarRow({ stars }: { stars: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3 h-3 ${i < stars ? 'text-brand-gold' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Returns true if deal overlaps with [checkIn, checkOut] */
function dealOverlaps(deal: { start_date: string; end_date: string }, checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return true;
  return deal.start_date <= checkOut && deal.end_date >= checkIn;
}

function HotelDealCard({ hotel, index, checkIn, checkOut }: { hotel: SpecialDealHotel; index: number; checkIn: string; checkOut: string }) {
  const gradient = DEFAULT_GRADIENTS[index % DEFAULT_GRADIENTS.length];
  const image    = hotel.imageUrl ?? FALLBACK_IMAGE;
  const upcoming = hotel.isUpcoming;

  // Show only deals that overlap with selected dates
  const visibleDeals = (checkIn && checkOut)
    ? hotel.deals.filter(d => dealOverlaps(d, checkIn, checkOut))
    : hotel.deals;

  return (
    <Link
      href={`/hotel/${hotel.id}`}
      className={`group bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col ${
        upcoming ? 'border-amber-100 opacity-90 hover:opacity-100' : 'border-gray-100'
      }`}
    >
      <div className="relative h-48 overflow-hidden">
        <div className="absolute inset-0" style={{ background: gradient }} />
        <Image
          src={image}
          alt={hotel.name}
          fill
          className={`object-cover transition-transform duration-500 group-hover:scale-105 ${upcoming ? 'opacity-50' : ''}`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {upcoming ? (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            From {fmtDate(hotel.deals[0].start_date)}
          </div>
        ) : (
          hotel.discountPct > 0 && (
            <div className="absolute top-3 left-3 bg-brand-gold text-white font-bold text-sm px-3 py-1 rounded-full shadow-md">
              -{hotel.discountPct}% OFF
            </div>
          )
        )}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-brand-blue font-semibold text-xs px-2.5 py-1 rounded-full">
          {visibleDeals.length} deal{visibleDeals.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-base truncate group-hover:text-brand-blue transition-colors">
              {hotel.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{hotel.city}, {hotel.country}</p>
          </div>
          <div className="shrink-0 flex items-center gap-1 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5 text-brand-gold" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {hotel.rating > 0 ? hotel.rating.toFixed(1) : '—'}
          </div>
        </div>

        <StarRow stars={hotel.stars} />

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-400">{upcoming ? 'Deal price from' : 'Special deal from'}</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-xl font-extrabold ${upcoming ? 'text-amber-600' : 'text-brand-blue'}`}>
                <AEDAmount amount={hotel.bestDealPrice} />
              </span>
              <span className="text-xs text-gray-400">/night</span>
            </div>
            {hotel.bestBasePrice > 0 && (
              <p className="text-xs text-red-400 line-through">
                <AEDAmount amount={hotel.bestBasePrice} />
              </p>
            )}
          </div>
          <span className="text-xs text-brand-blue font-semibold group-hover:underline shrink-0">View Hotel →</span>
        </div>

        {visibleDeals.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
            {visibleDeals.slice(0, 2).map((deal) => (
              <div key={deal.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate max-w-[60%]">{deal.title ?? deal.room_name}</span>
                <span className="text-gray-400 shrink-0 ml-2">{fmtDate(deal.start_date)} – {fmtDate(deal.end_date)}</span>
              </div>
            ))}
            {visibleDeals.length > 2 && (
              <p className="text-xs text-brand-blue/70">+{visibleDeals.length - 2} more deal{visibleDeals.length - 2 !== 1 ? 's' : ''}</p>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

interface Props {
  hotels: SpecialDealHotel[];
  initialQuery: string;
}

export default function SpecialDealsClient({ hotels, initialQuery }: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [query,    setQuery]    = useState(initialQuery);
  const [checkIn,  setCheckIn]  = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests,   setGuests]   = useState(1);
  const [filters, setFilters]   = useState<FilterState>(DEFAULT_FILTERS);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) { params.set('q', query); } else { params.delete('q'); }
    router.replace(`/special-deals?${params.toString()}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Ensure check-out is never before check-in
  const handleCheckIn = (val: string) => {
    setCheckIn(val);
    if (checkOut && val > checkOut) setCheckOut('');
  };

  const availableCities = useMemo(
    () => [...new Set(hotels.map(h => h.city).filter(Boolean))].sort(),
    [hotels],
  );

  const filtered = useMemo(() => {
    return hotels.filter(h => {
      // Text search
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!h.name.toLowerCase().includes(q) && !h.city.toLowerCase().includes(q) && !h.country.toLowerCase().includes(q)) return false;
      }
      // Date: hotel must have at least one deal overlapping the range
      if (checkIn && checkOut) {
        const hasOverlap = h.deals.some(d => dealOverlaps(d, checkIn, checkOut));
        if (!hasOverlap) return false;
      }
      // Sidebar filters
      if (filters.maxPrice < NO_PRICE_LIMIT && h.bestDealPrice > filters.maxPrice) return false;
      if (Math.floor(h.stars) < filters.minStars) return false;
      if (filters.minGuestRating > 0 && h.rating < filters.minGuestRating) return false;
      if (filters.selectedAmenities.length > 0 && !filters.selectedAmenities.every(a => h.amenities.includes(a))) return false;
      if (filters.selectedCities.length > 0 && !filters.selectedCities.includes(h.city)) return false;
      return true;
    });
  }, [hotels, query, checkIn, checkOut, filters]);

  const activeFiltersCount = [
    filters.maxPrice < NO_PRICE_LIMIT,
    filters.minStars > 0,
    filters.minGuestRating > 0,
    filters.selectedAmenities.length > 0,
    filters.selectedCities.length > 0,
  ].filter(Boolean).length;

  const activeNow = filtered.filter(h => !h.isUpcoming);
  const upcoming  = filtered.filter(h =>  h.isUpcoming);

  const hasDateFilter = !!(checkIn && checkOut);

  return (
    <>
      {/* ── Sticky search bar ── */}
      <div className="sticky top-[66px] z-40 shadow-md" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="bg-white rounded-xl flex flex-col sm:flex-row shadow-sm border border-gray-100 overflow-hidden">

            {/* Hotel / city search */}
            <div className="flex items-center gap-2 px-4 py-3 flex-1 border-b sm:border-b-0 sm:border-r border-gray-100">
              <svg className="w-4 h-4 text-brand-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Hotel or city…"
                className="flex-1 outline-none text-gray-800 placeholder-gray-400 text-sm bg-transparent min-w-0"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Check-in */}
            <label className="flex items-center gap-2 px-4 py-3 border-b sm:border-b-0 sm:border-r border-gray-100 cursor-pointer min-w-[150px]">
              <svg className="w-4 h-4 text-brand-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">Check-in</span>
                <input
                  type="date"
                  value={checkIn}
                  min={today}
                  onChange={(e) => handleCheckIn(e.target.value)}
                  className="outline-none text-gray-800 text-sm bg-transparent cursor-pointer"
                />
              </div>
            </label>

            {/* Check-out */}
            <label className="flex items-center gap-2 px-4 py-3 border-b sm:border-b-0 sm:border-r border-gray-100 cursor-pointer min-w-[150px]">
              <svg className="w-4 h-4 text-brand-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">Check-out</span>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn || today}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="outline-none text-gray-800 text-sm bg-transparent cursor-pointer"
                />
              </div>
            </label>

            {/* Guests */}
            <div className="flex items-center gap-2 px-4 py-3 border-b sm:border-b-0 sm:border-r border-gray-100">
              <svg className="w-4 h-4 text-brand-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-1">Guests</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGuests(g => Math.max(1, g - 1))}
                    className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-brand-blue hover:text-brand-blue transition-colors text-xs font-bold leading-none"
                  >−</button>
                  <span className="text-sm font-semibold text-gray-800 w-4 text-center">{guests}</span>
                  <button
                    type="button"
                    onClick={() => setGuests(g => Math.min(8, g + 1))}
                    className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-brand-blue hover:text-brand-blue transition-colors text-xs font-bold leading-none"
                  >+</button>
                </div>
              </div>
            </div>

            {/* Clear dates */}
            {hasDateFilter && (
              <button
                onClick={() => { setCheckIn(''); setCheckOut(''); }}
                className="flex items-center gap-1.5 px-4 py-3 text-sm text-gray-400 hover:text-brand-blue border-b sm:border-b-0 sm:border-r border-gray-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}

            {/* Search indicator */}
            <div className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white sm:rounded-r-xl" style={{ background: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="whitespace-nowrap">
                {filtered.length} offer{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">

          {/* Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-36 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <FilterSidebar
                filters={filters}
                onFiltersChange={setFilters}
                availableCities={availableCities}
              />
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">

            {/* Active filters row */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {hasDateFilter && (
                  <span className="flex items-center gap-1.5 bg-brand-blue/8 border border-brand-blue/20 text-brand-blue text-xs font-semibold px-3 py-1.5 rounded-full">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {fmtDate(checkIn)} → {fmtDate(checkOut)}
                  </span>
                )}
                {activeFiltersCount > 0 && (
                  <span className="text-xs text-gray-400">{activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active</span>
                )}
              </div>

              {/* Mobile filter button */}
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                Filters
                {activeFiltersCount > 0 && (
                  <span className="bg-brand-blue text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{activeFiltersCount}</span>
                )}
              </button>
            </div>

            {/* Hotel grid */}
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <svg className="w-14 h-14 mx-auto mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="font-bold text-gray-700 text-lg mb-1">No offers for these dates</h3>
                <p className="text-gray-400 text-sm">Try different dates or clear the filters.</p>
                {(hasDateFilter || activeFiltersCount > 0) && (
                  <button
                    onClick={() => { setCheckIn(''); setCheckOut(''); setFilters(DEFAULT_FILTERS); }}
                    className="mt-4 text-brand-blue text-sm font-medium hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-10">
                {activeNow.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                        Active Now
                      </span>
                      <span className="text-xs text-gray-400">{activeNow.length} hotel{activeNow.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {activeNow.map((hotel, i) => (
                        <HotelDealCard key={hotel.id} hotel={hotel} index={i} checkIn={checkIn} checkOut={checkOut} />
                      ))}
                    </div>
                  </div>
                )}

                {upcoming.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Coming Soon
                      </span>
                      <span className="text-xs text-gray-400">{upcoming.length} hotel{upcoming.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {upcoming.map((hotel, i) => (
                        <HotelDealCard key={hotel.id} hotel={hotel} index={activeNow.length + i} checkIn={checkIn} checkOut={checkOut} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filters drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-base">Filters</h2>
              <button onClick={() => setMobileFiltersOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FilterSidebar
              filters={filters}
              onFiltersChange={(f) => { setFilters(f); setMobileFiltersOpen(false); }}
              availableCities={availableCities}
            />
          </div>
        </div>
      )}
    </>
  );
}
