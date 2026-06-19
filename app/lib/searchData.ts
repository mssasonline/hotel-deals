import { getUrgencyConfig } from '@/lib/dealsEngine';

export interface SearchHotel {
  id: number;
  name: string;
  city: string;
  country: string;
  location: string;
  gradient: string;
  category: string;
  stars: number;
  rating: number;
  reviewCount: number;
  /** Cheapest room base_price — hotel's own website price, shown as strikethrough */
  basePrice: number;
  /** Cheapest room min_price — floor the engine won't go below */
  minPrice: number;
  tonightOnly: boolean;
  roomsLeft: number;
  amenities: string[];
  distanceKm: number;
  /** GPS coordinates for distance-based search */
  latitude: number | null;
  longitude: number | null;
  countdownHours: number;
  countdownMinutes: number;
  dealBadge: string;
  imageUrl: string | null;
}

export const FALLBACK_HOTEL_IMAGE =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';

const DEFAULT_GRADIENTS = [
  'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
  'linear-gradient(135deg, #373b44 0%, #4286f4 100%)',
  'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
  'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  'linear-gradient(135deg, #c79832 0%, #f7971e 60%, #ffd200 100%)',
  'linear-gradient(135deg, #1a3a4a 0%, #2d6986 100%)',
];

type RawHotelImage = { image_url: string; sort_order: number };

export type SearchRawRoom = { id?: string; base_price?: number; min_price?: number; min_price_weekend?: number; quantity_available?: number; quantity_total?: number };

export function mapRowToSearchHotel(
  row: Record<string, unknown>,
  index: number,
  todayRate?: number,
  isTodayWeekend?: boolean,
): SearchHotel {
  const countdownHours = Number(row.countdown_hours ?? 8);
  const countdownMinutes = Number(row.countdown_minutes ?? 0);
  const timeLeft = countdownHours + countdownMinutes / 60;
  const urgency = getUrgencyConfig(timeLeft);

  // ── Room-based pricing: pick cheapest room by base_price ─────────────────────
  const rawRooms = Array.isArray(row.rooms) ? (row.rooms as SearchRawRoom[]) : [];
  const cheapestRoom = rawRooms.length > 0
    ? rawRooms.reduce((best, r) => {
        const a = Number(r.base_price ?? 0);
        const b = Number(best.base_price ?? 0);
        return a > 0 && (b === 0 || a < b) ? r : best;
      }, rawRooms[0])
    : null;
  const staticBase = cheapestRoom ? Number(cheapestRoom.base_price ?? 0) : 0;
  const basePrice  = todayRate ?? staticBase;
  const minPrice   = (() => {
    if (!cheapestRoom) return 0;
    if (isTodayWeekend && Number(cheapestRoom.min_price_weekend) > 0) {
      return Number(cheapestRoom.min_price_weekend);
    }
    return Number(cheapestRoom.min_price ?? Math.round(staticBase * 0.6));
  })();
  const roomsLeft = cheapestRoom
    ? Number(cheapestRoom.quantity_available ?? cheapestRoom.quantity_total ?? row.rooms_left ?? 5)
    : Number(row.rooms_left ?? 5);

  const rawImages = Array.isArray(row.hotel_images)
    ? (row.hotel_images as RawHotelImage[])
    : [];
  const sorted = rawImages
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const imageUrl =
    sorted.length > 0 && sorted[0].image_url
      ? String(sorted[0].image_url)
      : row.image_url
      ? String(row.image_url)
      : null;

  const amenities = Array.isArray(row.amenities)
    ? (row.amenities as unknown[]).map(String)
    : [];

  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    city: String(row.city ?? ''),
    country: String(row.country ?? ''),
    location: String(row.location ?? row.city ?? row.address ?? ''),
    gradient: String(
      row.gradient ?? DEFAULT_GRADIENTS[index % DEFAULT_GRADIENTS.length],
    ),
    category: String(row.category ?? 'Hotel'),
    stars: Number(
      row.stars ?? row.star_rating ?? Math.round(Number(row.rating ?? 4)),
    ),
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    basePrice,
    minPrice,
    tonightOnly: true,
    roomsLeft,
    amenities,
    distanceKm: Number(row.distance_km ?? 0),
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    countdownHours,
    countdownMinutes,
    dealBadge: urgency.dealBadge,
    imageUrl,
  };
}
