'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';

interface Review {
  id: string;
  booking_id: string | null;
  hotel_id: number;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

function ReviewStars({ count }: { count: number }) {
  const clamped = Math.min(Math.max(Math.round(count), 0), 5);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 fill-current ${i < clamped ? 'text-brand-gold' : 'text-gray-200'}`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewerAvatar({ userId }: { userId: string }) {
  const initials = userId.replace(/-/g, '').slice(0, 2).toUpperCase();
  const hue = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ backgroundColor: `hsl(${hue}, 50%, 45%)` }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

function getRatingLabel(r: number, t: Record<string, string>): string {
  if (r >= 4.8) return t['hotel.ratingExceptional'];
  if (r >= 4.5) return t['hotel.ratingSuperb'];
  if (r >= 4.0) return t['hotel.ratingVeryGood'];
  return t['hotel.ratingGood'];
}

interface ReviewsSectionProps {
  reviews: Review[];
  error: string | null;
  hotelRating: number;
  hotelReviewCount: number;
}

export default function ReviewsSection({
  reviews,
  error,
  hotelRating,
  hotelReviewCount,
}: ReviewsSectionProps) {
  const t = useTranslation();

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-gray-500 text-sm">{t['hotel.unableToLoadReviews']}</p>
      </div>
    );
  }

  if (hotelReviewCount === 0 && reviews.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-gray-500 text-sm">{t['hotel.noReviewsYet']}</p>
      </div>
    );
  }

  const displayRating = hotelRating > 0 ? hotelRating : reviews.reduce((s, r) => s + r.rating, 0) / (reviews.length || 1);
  const displayCount = hotelReviewCount > 0 ? hotelReviewCount : reviews.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
        <div className="text-white font-extrabold text-3xl px-4 py-2 rounded-2xl leading-none" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}>
          {displayRating.toFixed(1)}
        </div>
        <div>
          <div className="font-bold text-gray-900 text-lg">{getRatingLabel(displayRating, t)}</div>
          <div className="text-gray-500 text-sm">
            {displayCount.toLocaleString()} {displayCount === 1 ? t['hotel.review'] : t['hotel.reviews']}
          </div>
        </div>
      </div>

      {reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-50 last:border-0 pb-6 last:pb-0">
              <div className="flex items-start gap-3 mb-3">
                <ReviewerAvatar userId={review.user_id} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{t['hotel.verifiedGuest']}</span>
                    <time className="text-gray-400 text-xs shrink-0">
                      {new Date(review.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  </div>
                  <ReviewStars count={review.rating} />
                </div>
              </div>
              {review.comment && (
                <p className="text-gray-600 text-sm leading-relaxed pl-12">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-sm">{t['hotel.reviewDetailsUnavailable']}</p>
      )}
    </div>
  );
}
