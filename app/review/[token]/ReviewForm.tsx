'use client';

import { useState } from 'react';
import { submitReview } from '@/app/actions/submitReview';

interface Props {
  bookingId: string;
  hotelId: number;
  hotelName: string;
}

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <div className="flex items-center gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
          aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
        >
          <svg
            className={`w-12 h-12 fill-current transition-colors ${active >= i ? 'text-brand-gold' : 'text-gray-200'}`}
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function ReviewForm({ bookingId, hotelId, hotelName }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (rating === 0) { setErrorMsg('Please select a star rating.'); return; }
    setSubmitting(true);
    setErrorMsg('');

    const result = await submitReview(
      Number(bookingId),
      hotelId,
      rating,
      comment.trim() || null,
    );

    setSubmitting(false);
    if (!result.success) {
      setErrorMsg(result.error ?? 'Failed to submit review. Please try again.');
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Review Submitted!</h2>
        <p className="text-gray-500 text-sm max-w-xs">
          Thank you for sharing your experience at {hotelName}. Your review helps other travellers.
        </p>
        <a
          href="/my-trips"
          className="mt-2 inline-flex items-center gap-2 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
        >
          View My Trips
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
          Your Rating
        </p>
        <StarSelector value={rating} onChange={(v) => { setRating(v); setErrorMsg(''); }} />
        {rating > 0 && (
          <p className="text-center text-sm text-gray-500 mt-3 font-medium">{RATING_LABELS[rating]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Comment <span className="text-gray-400 font-normal normal-case">(optional)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={`Share your experience at ${hotelName}...`}
          rows={5}
          maxLength={1000}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
        />
        <p className="text-gray-400 text-xs mt-1 text-right">{comment.length}/1000</p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-red-700 text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        className="w-full inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5"
        style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
      >
        {submitting && <Spinner />}
        Submit Review
      </button>
    </div>
  );
}
