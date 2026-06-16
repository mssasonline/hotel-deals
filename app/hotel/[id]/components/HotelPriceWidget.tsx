'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CurrencyAmount from '@/app/components/CurrencyAmount';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import { isBookingOpen } from '@/lib/pricingEngine';
import type { DealStatus } from '@/lib/dealsEngine';

type UrgencyStatus = DealStatus;

interface Props {
  originalPrice: number;
  currentPrice: number;
  discountPercent: number;
  savings: number;
  hotelId: string;
  urgencyStatus: UrgencyStatus;
  urgencyBg: string;
  urgencyBorder: string;
  urgencyText: string;
  dealBadge: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
}

export default function HotelPriceWidget({
  originalPrice,
  currentPrice,
  discountPercent,
  savings,
  hotelId,
  urgencyStatus,
  urgencyBg,
  urgencyBorder,
  urgencyText,
  dealBadge,
  badgeBg,
  badgeText,
  dotColor,
}: Props) {
  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);
  const [bookingOpen, setBookingOpen] = useState(() => isBookingOpen());
  useEffect(() => {
    const id = setInterval(() => setBookingOpen(isBookingOpen()), 60_000);
    return () => clearInterval(id);
  }, []);

  const urgencyLabel =
    urgencyStatus === 'CRITICAL' ? t['urgency.critical']
    : urgencyStatus === 'HIGH_DEMAND' ? t['urgency.high']
    : urgencyStatus === 'MEDIUM_DEMAND' ? t['urgency.medium']
    : t['urgency.low'];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {discountPercent > 0 && (
          <span className="bg-red-500 text-white text-xs font-extrabold px-3 py-1 rounded-full">
            -{discountPercent}% OFF
          </span>
        )}
        <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${badgeBg} ${badgeText}`}>
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`} />
          {dealBadge}
        </span>
      </div>

      {/* Demand status */}
      <div className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg mb-5 ${urgencyBg} ${urgencyBorder} ${urgencyText} border`}>
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        {urgencyLabel}
      </div>

      {/* Price */}
      <div className="flex items-end gap-4 flex-wrap mb-5">
        <div>
          {discountPercent > 0 && (
            <div className="text-gray-400 text-sm line-through leading-none mb-1">
              <CurrencyAmount amount={originalPrice} /><span className="text-xs">{t['price.perNight']}</span>
            </div>
          )}
          <div className="flex items-baseline gap-1">
            <span className="text-brand-blue font-extrabold text-5xl leading-none">
              <CurrencyAmount amount={currentPrice} />
            </span>
            <span className="text-gray-400 text-base">{t['price.perNight']}</span>
          </div>
        </div>
        {savings > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center mb-1">
            <div className="text-green-700 font-extrabold text-lg leading-none">
              {t['price.save']} <CurrencyAmount amount={savings} />
            </div>
            <div className="text-green-600 text-xs mt-0.5">{t['price.tonightOnly']}</div>
          </div>
        )}
      </div>

      {/* CTA */}
      {bookingOpen ? (
        <Link
          href={`/booking/${hotelId}`}
          className="block w-full text-white font-bold text-center py-4 rounded-xl transition-all text-lg mb-4 hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
        >
          {t['hotel.bookNow']}
        </Link>
      ) : (
        <button
          disabled
          className="block w-full bg-gray-200 text-gray-400 cursor-not-allowed font-bold text-center py-4 rounded-xl text-lg mb-4"
        >
          تفتح الساعة 12:00 PM
        </button>
      )}

      {/* Trust signals */}
      <div className="border-t border-gray-100 pt-4 space-y-2">
        {[
          t['hotel.freeCancellation'],
          t['hotel.noHiddenFees'],
          t['hotel.reserveNowPayLater'],
        ].map((label) => (
          <div key={label} className="flex items-center gap-2 text-gray-600 text-sm">
            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
