export function filterHotelsByCity<T extends { city: string; name?: string; country?: string }>(
  hotels: T[],
  city: string,
): T[] {
  const q = city.trim().toLowerCase();
  if (!q) return hotels;
  return hotels.filter(
    h =>
      h.city.toLowerCase().includes(q) ||
      (h.country ?? '').toLowerCase().includes(q) ||
      (h.name ?? '').toLowerCase().includes(q),
  );
}

export function sortHotelsByPriority<
  T extends {
    basePrice: number;
    minPrice: number;
    rating: number;
    countdownHours?: number;
    countdownMinutes?: number;
  },
>(hotels: T[]): T[] {
  return [...hotels].sort((a, b) => {
    const aDiscount = a.basePrice > 0 ? Math.round((1 - a.minPrice / a.basePrice) * 100) : 0;
    const bDiscount = b.basePrice > 0 ? Math.round((1 - b.minPrice / b.basePrice) * 100) : 0;
    if (bDiscount !== aDiscount) return bDiscount - aDiscount;
    const aMin = (a.countdownHours ?? 0) * 60 + (a.countdownMinutes ?? 0);
    const bMin = (b.countdownHours ?? 0) * 60 + (b.countdownMinutes ?? 0);
    if (aMin !== bMin) return aMin - bMin;
    return b.rating - a.rating;
  });
}

// Stub for future geo-distance sorting — not implemented yet.
// Requires navigator.geolocation + lat/lng on hotel objects.
export type GeoCoords = { lat: number; lng: number };
export function sortHotelsByDistance<T extends { lat?: number; lng?: number }>(
  hotels: T[],
  _userCoords: GeoCoords,
): T[] {
  return hotels;
}
