'use client';

import { useTranslation, type TranslationKey } from '@/lib/i18n/useTranslation';

interface HotelClientLabelProps {
  translationKey: TranslationKey;
  fallback: string;
}

export function HotelClientLabel({ translationKey, fallback }: HotelClientLabelProps) {
  const t = useTranslation();
  return <>{t[translationKey] ?? fallback}</>;
}

export function HotelRatingLabel({ rating }: { rating: number }) {
  const t = useTranslation();
  let label: string;
  if (rating >= 4.8) label = t['hotel.ratingExceptional'];
  else if (rating >= 4.5) label = t['hotel.ratingSuperb'];
  else if (rating >= 4.0) label = t['hotel.ratingVeryGood'];
  else label = t['hotel.ratingGood'];
  return <span className="font-bold text-gray-900 text-sm">{label}</span>;
}
