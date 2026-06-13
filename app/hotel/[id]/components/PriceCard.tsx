'use client';

import CurrencyAmount from '@/app/components/CurrencyAmount';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import type { HotelDetail } from '../lib/hotelDetailData';
import { calcRoomPrice } from '@/lib/pricingEngine';

export default function PriceCard({ hotel }: { hotel: HotelDetail }) {
  const cheapestRoom = hotel.rooms[0];
  const pricing = cheapestRoom ? calcRoomPrice(cheapestRoom.basePrice, cheapestRoom.pricePerNight) : null;
  const currentPrice = pricing?.currentPrice ?? 0;
  const basePrice = pricing?.basePrice ?? 0;
  const discountPercent = pricing?.discountPercent ?? 0;
  const savings = basePrice - currentPrice;
  const { urgency } = hotel;

  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);

  const urgencyMessage =
    urgency.status === 'CRITICAL' ? t['urgency.critical']
    : urgency.status === 'HIGH_DEMAND' ? t['urgency.high']
    : urgency.status === 'MEDIUM_DEMAND' ? t['urgency.medium']
    : t['urgency.low'];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="bg-red-500 text-white text-xs font-extrabold px-3 py-1 rounded-full">
          -{discountPercent}% OFF
        </span>
        <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${urgency.badgeBg} ${urgency.badgeText}`}>
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${urgency.dotColor}`} />
          {urgency.dealBadge}
        </span>
        {hotel.tonightOnly && (
          <span className="bg-brand-blue-light text-brand-blue text-xs font-semibold px-3 py-1 rounded-full border border-brand-blue/20">
            {t['hotel.tonightOnly']}
          </span>
        )}
      </div>

      {/* Demand status row */}
      <div className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg mb-4 ${urgency.urgencyBg} ${urgency.urgencyBorder} ${urgency.urgencyText} border`}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        {urgencyMessage}
      </div>

      {/* Pricing */}
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          {discountPercent > 0 && (
            <div className="text-red-500 text-sm line-through leading-none mb-1">
              <CurrencyAmount amount={basePrice} /><span className="text-xs">{t['price.perNight']}</span>
            </div>
          )}
          <div className="flex items-baseline gap-1">
            <span className="text-green-600 font-extrabold text-5xl leading-none">
              <CurrencyAmount amount={currentPrice} />
            </span>
            <span className="text-gray-400 text-base">{t['price.perNight']}</span>
          </div>
        </div>

        <div className="mb-1">
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
            <div className="text-green-700 font-extrabold text-lg leading-none">
              {t['price.save']} <CurrencyAmount amount={savings} />
            </div>
            <div className="text-green-600 text-xs mt-0.5">{t['price.tonightOnly']}</div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 my-4" />

      {/* Trust signals */}
      <div className="flex flex-col sm:flex-row gap-3">
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
