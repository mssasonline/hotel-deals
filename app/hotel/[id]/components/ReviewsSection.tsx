'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  guest_name: string;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-4 h-4 fill-current ${i < rating ? 'text-brand-gold' : 'text-gray-200'}`} viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="ml-1.5 text-xs font-semibold text-gray-700">{rating}.0</span>
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewItem }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <StarRow rating={review.rating} />
        <span className="text-xs text-gray-400 shrink-0">
          {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </span>
      </div>
      {review.comment && (
        <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
      )}
      <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-50">
        <div className="w-7 h-7 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-brand-blue">
            {review.guest_name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-700">{review.guest_name}</p>
          <p className="text-xs text-gray-400">Verified Stay</p>
        </div>
      </div>
    </div>
  );
}

function ReviewListItem({ review }: { review: ReviewItem }) {
  return (
    <div className="pb-5 mb-5 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
      <div className="flex items-start justify-between gap-2 mb-2">
        <StarRow rating={review.rating} />
        <span className="text-xs text-gray-400 shrink-0">
          {new Date(review.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
      {review.comment && (
        <p className="text-gray-600 text-sm leading-relaxed mb-3">{review.comment}</p>
      )}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-brand-blue">
            {review.guest_name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-700">{review.guest_name}</p>
          <p className="text-xs text-gray-400">Verified Stay</p>
        </div>
      </div>
    </div>
  );
}

interface ReviewsSectionProps {
  reviews: ReviewItem[];
  avgRating: number | null;
}

export default function ReviewsSection({ reviews, avgRating }: ReviewsSectionProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, close]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const preview = reviews.slice(0, 3);

  return (
    <section className="mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-gray-900 text-xl sm:text-2xl">Guest Reviews</h2>
          {avgRating !== null && (
            <div className="flex items-center gap-1.5 bg-brand-gold/10 border border-brand-gold/20 px-3 py-1 rounded-full">
              <svg className="w-4 h-4 text-brand-gold fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="font-bold text-sm text-gray-800">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-gray-500">({reviews.length})</span>
            </div>
          )}
        </div>
        {reviews.length > 3 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline cursor-pointer"
          >
            More Reviews
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Preview: 3 cards */}
      {reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-gray-400 text-sm">No reviews yet — be the first to stay and share your experience.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {preview.map(review => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {/* Modal — all reviews */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={close}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-gray-900 text-lg">All Reviews</h3>
                {avgRating !== null && (
                  <div className="flex items-center gap-1 bg-brand-gold/10 px-2.5 py-0.5 rounded-full">
                    <svg className="w-3.5 h-3.5 text-brand-gold fill-current" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="font-bold text-sm text-gray-800">{avgRating.toFixed(1)}</span>
                    <span className="text-xs text-gray-500">· {reviews.length} reviews</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close reviews"
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable list */}
            <div className="overflow-y-auto p-6">
              {reviews.map(review => (
                <ReviewListItem key={review.id} review={review} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
