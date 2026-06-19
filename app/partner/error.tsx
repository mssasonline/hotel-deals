'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function PartnerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Partner]', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-[#F8FAFC]">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          This page failed to load. Try again or return to your dashboard.
          {error.digest && (
            <span className="block mt-2 text-xs text-gray-400 font-mono">ref: {error.digest}</span>
          )}
        </p>

        <div className="space-y-3">
          <button
            onClick={reset}
            className="block w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-colors"
            style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #1E3A8A 100%)' }}
          >
            Try Again
          </button>
          <Link
            href="/partner/dashboard"
            className="block w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
