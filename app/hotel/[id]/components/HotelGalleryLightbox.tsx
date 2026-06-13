'use client';

import { useState, useEffect, useCallback } from 'react';

interface Props {
  images: string[];
  hotelName: string;
}

const FALLBACK = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';

export default function HotelGalleryLightbox({ images, hotelName }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mobileIndex, setMobileIndex] = useState(0);

  const safeImages = images.length > 0 ? images : [FALLBACK];

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const prevLight = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i - 1 + safeImages.length) % safeImages.length : null));
  }, [safeImages.length]);

  const nextLight = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i + 1) % safeImages.length : null));
  }, [safeImages.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') prevLight();
      else if (e.key === 'ArrowRight') nextLight();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, closeLightbox, prevLight, nextLight]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightboxIndex]);

  const heroImage = safeImages[0];
  const thumbImages = safeImages.slice(1, 5);
  const totalCount = safeImages.length;

  return (
    <>
      {/* ── Desktop gallery: hero (left) + 2×2 thumbnails (right) ── */}
      <div className="hidden sm:block mb-4">
        <div
          className="rounded-2xl overflow-hidden grid gap-2"
          style={{ gridTemplateColumns: '2fr 1fr', height: '482px' }}
        >
          {/* Hero — fills full left column height */}
          <div
            className="relative overflow-hidden cursor-pointer group"
            onClick={() => setLightboxIndex(0)}
            role="button"
            aria-label={`View ${hotelName} main photo`}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setLightboxIndex(0)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={hotelName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => { e.currentTarget.src = FALLBACK; }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            <div className="absolute top-3 right-3 bg-black/40 text-white rounded-xl p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
          </div>

          {/* 2×2 thumbnails container — fills full right column height */}
          <div
            className="grid grid-cols-2 gap-2"
            style={{ gridTemplateRows: '1fr 1fr' }}
          >
            {Array.from({ length: 4 }).map((_, i) => {
              const url = thumbImages[i];
              const isLastSlot = i === 3 && totalCount > 5;
              if (!url) {
                return <div key={i} className="bg-gray-100 rounded-lg" />;
              }
              return (
                <div
                  key={i}
                  className="relative overflow-hidden cursor-pointer group rounded-lg"
                  onClick={() => setLightboxIndex(i + 1)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View photo ${i + 2}`}
                  onKeyDown={(e) => e.key === 'Enter' && setLightboxIndex(i + 1)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${hotelName} — photo ${i + 2}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.currentTarget.src = FALLBACK; }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300" />
                  {isLastSlot && (
                    <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-1 text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-semibold text-sm">+{totalCount - 5} more</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* View all photos button */}
        {totalCount > 1 && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setLightboxIndex(0)}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              View all {totalCount} photos
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile gallery: carousel ── */}
      <div className="sm:hidden mb-4">
        <div className="relative h-64 rounded-2xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={safeImages[mobileIndex] ?? heroImage}
            alt={`${hotelName} — photo ${mobileIndex + 1}`}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => setLightboxIndex(mobileIndex)}
            onError={(e) => { e.currentTarget.src = FALLBACK; }}
          />
          {/* Nav arrows */}
          {totalCount > 1 && (
            <>
              <button
                onClick={() => setMobileIndex((i) => (i - 1 + totalCount) % totalCount)}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-9 h-9 flex items-center justify-center text-xl leading-none"
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                onClick={() => setMobileIndex((i) => (i + 1) % totalCount)}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-9 h-9 flex items-center justify-center text-xl leading-none"
                aria-label="Next photo"
              >
                ›
              </button>
            </>
          )}
          {/* Counter badge */}
          <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
            {mobileIndex + 1} / {totalCount}
          </div>
          {/* View all button */}
          <button
            onClick={() => setLightboxIndex(mobileIndex)}
            className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-medium px-3 py-1.5 rounded-lg"
          >
            View all photos
          </button>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[9999] bg-black/96 flex flex-col"
          role="dialog"
          aria-modal
          aria-label="Photo gallery"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0">
            <span className="text-white/60 text-sm tabular-nums">
              {lightboxIndex + 1} / {totalCount}
            </span>
            <span className="text-white/80 font-medium text-sm truncate max-w-xs">{hotelName}</span>
            <button
              onClick={closeLightbox}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center transition-colors shrink-0"
              aria-label="Close gallery"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Image area */}
          <div className="flex-1 flex items-center justify-center relative px-14 min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={safeImages[lightboxIndex]}
              alt={`${hotelName} — photo ${lightboxIndex + 1}`}
              className="max-h-full max-w-full object-contain rounded-xl select-none"
              draggable={false}
              onError={(e) => { e.currentTarget.src = FALLBACK; }}
            />

            {/* Prev / Next arrows */}
            {totalCount > 1 && (
              <>
                <button
                  onClick={prevLight}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full w-12 h-12 flex items-center justify-center transition-colors"
                  aria-label="Previous photo"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextLight}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full w-12 h-12 flex items-center justify-center transition-colors"
                  aria-label="Next photo"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Thumbnail strip */}
          {totalCount > 1 && (
            <div className="flex gap-2 px-5 py-4 overflow-x-auto shrink-0 justify-center">
              {safeImages.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden transition-all duration-200 ${
                    i === lightboxIndex
                      ? 'ring-2 ring-brand-gold ring-offset-1 ring-offset-black scale-105'
                      : 'opacity-50 hover:opacity-80'
                  }`}
                  aria-label={`Go to photo ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
