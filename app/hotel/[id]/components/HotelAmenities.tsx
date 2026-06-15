'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import AmenityIcon from '@/app/components/AmenityIcon';

interface Props {
  amenities: string[];
}

// Keyword-based category detection — checked in order (food first, then room, then hotel)
const FOOD_KEYS = [
  'restaurant', 'bar', 'lounge', 'breakfast', 'room service', 'café', 'cafe',
  'coffee shop', 'dining', 'buffet', 'bbq', 'grill', 'cuisine', 'bistro',
  'terrace dining', 'meal', 'lunch', 'dinner', 'brunch',
];
const ROOM_KEYS = [
  'tv', 'television', 'safe', 'minibar', 'mini-bar', 'mini bar', 'refrigerator',
  'fridge', 'air conditioning', 'air-conditioning', 'coffee machine', 'iron',
  'bathtub', 'jacuzzi', 'in-room', 'bathroom', 'shower', 'balcony', 'terrace',
  'work desk', 'flat-screen', 'flat screen', 'sofa bed',
];

function categorize(amenities: string[]) {
  const food: string[] = [];
  const room: string[] = [];
  const hotel: string[] = [];

  for (const a of amenities) {
    const low = a.toLowerCase();
    if (FOOD_KEYS.some((k) => low.includes(k))) {
      food.push(a);
    } else if (ROOM_KEYS.some((k) => low.includes(k))) {
      room.push(a);
    } else {
      hotel.push(a);
    }
  }

  return { hotel, room, food };
}

function AmenityGroup({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
        <span className="flex-1 border-t border-gray-100" />
        {title}
        <span className="flex-1 border-t border-gray-100" />
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5 bg-gray-50 hover:bg-blue-50 rounded-xl px-3 py-2 transition-colors duration-150">
            <AmenityIcon label={item} className="w-5 h-5 text-brand-blue shrink-0" />
            <span className="text-gray-700 text-sm leading-snug">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HotelAmenities({ amenities }: Props) {
  const t = useTranslation();

  if (amenities.length === 0) return null;

  const { hotel, room, food } = categorize(amenities);
  const hasCategorized = room.length > 0 || food.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
      <h2 className="font-extrabold text-gray-900 text-xl mb-6 flex items-center gap-3">
        <svg className="w-5 h-5 text-brand-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        {t['hotel.amenities']}
      </h2>

      {hasCategorized ? (
        <div className="space-y-7">
          <AmenityGroup title={t['hotel.theHotel']} items={hotel} />
          <AmenityGroup title={t['hotel.theRoom']} items={room} />
          <AmenityGroup title={t['hotel.foodAndDrink']} items={food} />
        </div>
      ) : (
        /* Flat grid when keywords don't split cleanly */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
          {amenities.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-gray-50 hover:bg-blue-50 rounded-xl px-3 py-2 transition-colors duration-150">
              <AmenityIcon label={item} className="w-5 h-5 text-brand-blue shrink-0" />
              <span className="text-gray-700 text-sm leading-snug">{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
