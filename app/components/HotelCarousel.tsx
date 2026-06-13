'use client';

import { useRef, useState, useEffect } from 'react';
import HotelCard, { type Hotel } from './HotelCard';

interface Props {
  hotels: Hotel[];
  viewAllHref?: string;
  viewAllLabel?: string;
}

export default function HotelCarousel({ hotels, viewAllHref = '/search', viewAllLabel = 'View All' }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }

  useEffect(() => {
    updateScrollState();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [hotels]);

  function scrollBy(dir: 'left' | 'right') {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('article')?.clientWidth ?? 300;
    el.scrollBy({ left: dir === 'right' ? cardWidth + 24 : -(cardWidth + 24), behavior: 'smooth' });
  }

  if (hotels.length === 0) return null;

  return (
    <div className="relative">
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scrollBy('left')}
          aria-label="Scroll left"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-10 h-10 bg-white shadow-lg border border-gray-200 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scrollBy('right')}
          aria-label="Scroll right"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-10 h-10 bg-white shadow-lg border border-gray-200 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Scrollable track */}
      <div
        ref={trackRef}
        className="flex gap-6 overflow-x-auto scroll-smooth pb-4 -mx-2 px-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {hotels.map((hotel) => (
          <div key={hotel.id} className="flex-none w-[300px] sm:w-[320px]">
            <HotelCard hotel={hotel} />
          </div>
        ))}

        {/* "View All" card at end */}
        <div className="flex-none w-[200px] flex items-center justify-center">
          <a
            href={viewAllHref}
            className="flex flex-col items-center justify-center gap-3 w-full h-full min-h-[240px] bg-brand-blue-light border-2 border-dashed border-brand-blue/20 rounded-2xl text-brand-blue hover:bg-brand-blue hover:text-white hover:border-brand-blue transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-brand-blue/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <span className="font-bold text-sm text-center px-4 leading-snug">{viewAllLabel}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
