'use client';

import CurrencyAmount from '@/app/components/CurrencyAmount';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { useBookingStore } from '@/store/bookingStore';
import { getTranslations } from '@/lib/i18n/translations';
import { calcRoomStayPrice, calcTaxBreakdown } from '@/lib/pricingEngine';
import type { HotelDetail, RoomType } from '@/app/hotel/[id]/lib/hotelDetailData';

interface PriceBreakdownCardProps {
  hotel: HotelDetail;
  room: RoomType;
  taxVatPct?: number;
  fixedFeePerNight?: number;
  taxCountryCode?: string;
  serviceChargePct?: number;
  municipalityFeePct?: number;
}

function parseToISO(dateStr: string): string {
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const match = dateStr.match(/\w{3},\s+(\w{3})\s+(\d{1,2}),\s+(\d{4})/);
  if (!match) return dateStr;
  const [, mon, day, year] = match;
  const mm = months[mon] ?? '01';
  return `${year}-${mm}-${day.padStart(2, '0')}`;
}

export default function PriceBreakdownCard({
  hotel,
  room,
  taxVatPct = 5,
  fixedFeePerNight = 15,
  taxCountryCode = 'AE',
  serviceChargePct = 10,
  municipalityFeePct = 7,
}: PriceBreakdownCardProps) {
  const { checkInDate, checkOutDate, guests, breakfastIncluded, breakfastPricePerPerson } = useBookingStore();
  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);

  void hotel;

  const checkInISO = parseToISO(checkInDate);
  const checkOutISO = parseToISO(checkOutDate);
  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(checkOutISO).getTime() - new Date(checkInISO).getTime()) / 86400000
    )
  );

  const roomsCount = Math.max(1, room.quantity ?? 1);
  const { currentPrice, basePrice, discountPercent, subtotal } =
    calcRoomStayPrice({
      basePrice: room.basePrice,
      pricePerNight: room.pricePerNight,
      nights,
      rooms: roomsCount,
      taxVatPct,
      fixedFeePerNight,
    });

  const hasBreakfast   = breakfastIncluded && breakfastPricePerPerson > 0;
  const breakfastTotal = hasBreakfast ? breakfastPricePerPerson * Math.max(1, guests) * nights : 0;

  const taxBreakdown = calcTaxBreakdown({
    roomSubtotal: subtotal,
    breakfastSubtotal: breakfastTotal,
    nights,
    rooms: roomsCount,
    serviceChargePct,
    municipalityFeePct,
    tourismDirhamPerNight: fixedFeePerNight,
    vatPct: taxVatPct,
  });

  const taxes = taxBreakdown.total;
  const total = subtotal + breakfastTotal + taxes;

  const totalBasePrice = basePrice * nights * roomsCount;
  const savings = totalBasePrice - subtotal;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <span className="w-1 h-5 bg-brand-gold rounded-full" />
          {t['price.breakdown']}
        </h3>
      </div>

      <div className="p-5 space-y-3">
        {/* Line items */}
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">
              {nights === 1
                ? t['hotel.breakdown.night']
                : t['hotel.breakdown.nights'].replace('{n}', String(nights))}
            </span>
            <span className="font-medium text-gray-900"><CurrencyAmount amount={currentPrice * nights} /></span>
          </div>
          {roomsCount > 1 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500">
                {t['hotel.breakdown.rooms'].replace('{n}', String(roomsCount))}
              </span>
              <span className="font-medium text-gray-900"><CurrencyAmount amount={subtotal} /></span>
            </div>
          )}

          {/* Breakfast */}
          {hasBreakfast && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-1.5">
                🍳 Breakfast
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full font-medium">
                  ×{Math.max(1, guests)} guest{guests !== 1 ? 's' : ''}{nights > 1 ? ` · ${nights}n` : ''}
                </span>
              </span>
              <span className="font-medium text-gray-900"><CurrencyAmount amount={breakfastTotal} /></span>
            </div>
          )}

          {/* Taxes & fees — single line for guests */}
          <div className="flex justify-between items-center">
            <span className="text-gray-500 flex items-center gap-1.5">
              {t['price.taxes']}
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full font-medium">
                {taxCountryCode}
              </span>
            </span>
            <span className="font-medium text-gray-900"><CurrencyAmount amount={taxes} /></span>
          </div>
        </div>

        {/* Divider + total */}
        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-900">{t['price.total']}</span>
            <span className="font-extrabold text-brand-blue text-xl"><CurrencyAmount amount={total} /></span>
          </div>
          <p className="text-gray-400 text-xs mt-0.5 text-right">{t['price.dueAtCheckIn']}</p>
        </div>

        {/* Savings highlight */}
        {savings > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <p className="text-green-700 font-bold text-sm leading-none">{t['price.tonightSaving']}</p>
                <p className="text-green-600 text-xs mt-0.5">{t['price.vsRegular']}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-green-700 font-extrabold text-lg leading-none">-<CurrencyAmount amount={savings} /></p>
              <p className="text-green-600 text-xs font-semibold mt-0.5">{discountPercent}% off</p>
            </div>
          </div>
        )}

        {/* Original price (strikethrough, RED) */}
        {totalBasePrice > subtotal && (
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-gray-400">{t['price.regularPrice']}</span>
            <span className="line-through text-red-500"><CurrencyAmount amount={totalBasePrice} /></span>
          </div>
        )}

        {/* Non-refundable notice */}
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-amber-700 text-xs font-semibold">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Non-refundable booking
        </div>
      </div>
    </div>
  );
}
