'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { SpecialDealHotel } from './page';
import AEDAmount from '@/app/partner/components/AEDAmount';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';

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
        <svg
          key={i}
          className={`w-3 h-3 ${i < stars ? 'text-brand-gold' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function HotelDealCard({ hotel, index }: { hotel: SpecialDealHotel; index: number }) {
  const gradient = DEFAULT_GRADIENTS[index % DEFAULT_GRADIENTS.length];
  const image    = hotel.imageUrl ?? FALLBACK_IMAGE;
  const upcoming = hotel.isUpcoming;

  return (
    <Link
      href={`/hotel/${hotel.id}`}
      className={`group bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col ${
        upcoming ? 'border-amber-100 opacity-90 hover:opacity-100' : 'border-gray-100'
      }`}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <div className="absolute inset-0" style={{ background: gradient }} />
        <img
          src={image}
          alt={hotel.name}
          className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${upcoming ? 'opacity-50' : ''}`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />

        {/* Status badge */}
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

        {/* Deal count */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-brand-blue font-semibold text-xs px-2.5 py-1 rounded-full">
          {hotel.dealCount} deal{hotel.dealCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Content */}
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

        {/* Price */}
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
          <span className="text-xs text-brand-blue font-semibold group-hover:underline shrink-0">
            View Hotel →
          </span>
        </div>

        {/* Deal list (first 2) */}
        {hotel.deals.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
            {hotel.deals.slice(0, 2).map((deal) => (
              <div key={deal.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate max-w-[60%]">
                  {deal.title ?? deal.room_name}
                </span>
                <span className="text-gray-400 shrink-0 ml-2">
                  {fmtDate(deal.start_date)} – {fmtDate(deal.end_date)}
                </span>
              </div>
            ))}
            {hotel.deals.length > 2 && (
              <p className="text-xs text-brand-blue/70">+{hotel.deals.length - 2} more deal{hotel.deals.length - 2 !== 1 ? 's' : ''}</p>
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
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) { params.set('q', query); }
    else { params.delete('q'); }
    router.replace(`/special-deals?${params.toString()}`, { scroll: false });
  }, [query]);

  const filtered = query.trim()
    ? hotels.filter((h) =>
        h.name.toLowerCase().includes(query.toLowerCase()) ||
        h.city.toLowerCase().includes(query.toLowerCase()) ||
        h.country.toLowerCase().includes(query.toLowerCase()),
      )
    : hotels;

  const activeNow = filtered.filter((h) => !h.isUpcoming);
  const upcoming  = filtered.filter((h) =>  h.isUpcoming);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Search bar */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by hotel or city…"
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {query && (
          <p className="mt-2 text-sm text-gray-400">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <svg className="w-14 h-14 mx-auto mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <h3 className="font-bold text-gray-700 text-lg mb-1">No special deals right now</h3>
          <p className="text-gray-400 text-sm">
            {query ? 'Try a different search term.' : 'Check back soon — partners add new offers regularly.'}
          </p>
        </div>
      ) : (
        <div className="space-y-10">

          {/* ── Active now ── */}
          {activeNow.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  Active Now
                </span>
                <span className="text-xs text-gray-400">{activeNow.length} hotel{activeNow.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeNow.map((hotel, i) => (
                  <HotelDealCard key={hotel.id} hotel={hotel} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* ── Coming soon ── */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcoming.map((hotel, i) => (
                  <HotelDealCard key={hotel.id} hotel={hotel} index={activeNow.length + i} />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
