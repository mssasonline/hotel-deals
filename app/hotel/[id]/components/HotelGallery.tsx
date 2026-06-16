'use client';

import { useState } from 'react';
import type { GalleryImage } from '../lib/hotelDetailData';

export default function HotelGallery({ images }: { images: GalleryImage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const main = images[activeIndex];

  return (
    <section className="mb-8">
      {/* Desktop gallery: large main + 2×2 thumbnails */}
      <div className="hidden lg:grid lg:grid-cols-[3fr_2fr] gap-2 h-[500px] rounded-2xl overflow-hidden">
        {/* Main image */}
        <div
          className="relative overflow-hidden"
          style={{ background: main.gradient }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 flex items-center gap-2">
            <span className="text-white/90 text-sm font-medium tracking-wide bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
              {main.label}
            </span>
          </div>
          <div className="absolute top-5 left-5 flex items-center gap-2">
            <span className="bg-brand-gold/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">
              SelectedRoom
            </span>
          </div>
          <button className="absolute bottom-5 right-5 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-2 hover:bg-white transition-colors shadow-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            All {images.length} Photos
          </button>
        </div>

        {/* 2×2 thumbnail grid */}
        <div className="grid grid-cols-2 gap-2">
          {images
            .filter((_, i) => i !== 0)
            .slice(0, 4)
            .map((img, i) => {
              const originalIndex = images.indexOf(img);
              return (
                <button
                  key={i}
                  onClick={() => setActiveIndex(originalIndex)}
                  className="relative overflow-hidden group focus:outline-none"
                  style={{ background: img.gradient }}
                  aria-label={`View ${img.label}`}
                >
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-200" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <span className="text-white/85 text-[11px] font-medium line-clamp-1">{img.label}</span>
                  </div>
                  <div className="absolute inset-0 ring-0 group-hover:ring-2 group-hover:ring-brand-gold ring-inset transition-all duration-200 rounded-sm" />
                </button>
              );
            })}
        </div>
      </div>

      {/* Mobile gallery: main + horizontal thumbnail strip */}
      <div className="lg:hidden">
        <div
          className="relative h-64 sm:h-80 rounded-2xl overflow-hidden"
          style={{ background: main.gradient }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <div className="absolute top-4 left-4">
            <span className="bg-brand-gold/90 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">
              SelectedRoom
            </span>
          </div>
          <div className="absolute bottom-4 left-4">
            <span className="text-white/90 text-xs font-medium bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
              {main.label}
            </span>
          </div>
          <div className="absolute bottom-4 right-4 text-white/70 text-xs">
            {activeIndex + 1} / {images.length}
          </div>
        </div>

        {/* Horizontal thumbnail strip */}
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden transition-all duration-200 ${
                i === activeIndex ? 'ring-2 ring-brand-blue scale-95' : 'opacity-70 hover:opacity-100'
              }`}
              style={{ background: img.gradient }}
              aria-label={`View ${img.label}`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <span className="absolute bottom-1 left-1 right-1 text-white text-[8px] font-medium leading-tight line-clamp-1">
                {img.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
