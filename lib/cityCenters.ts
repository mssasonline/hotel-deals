import { distanceKm } from './geo';

const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  'Dubai':          { lat: 25.1972, lng: 55.2744 }, // Downtown Dubai / Burj Khalifa
  'Abu Dhabi':      { lat: 24.4539, lng: 54.3773 }, // Abu Dhabi Corniche
  'Ras Al Khaimah': { lat: 25.7895, lng: 55.9432 }, // RAK City Center
  'Paris':          { lat: 48.8534, lng:  2.3488 }, // Notre-Dame de Paris
};

export function distanceFromCityCenter(
  city: string,
  hotelLat: number | null,
  hotelLng: number | null,
): number | null {
  const center = CITY_CENTERS[city];
  if (!center || hotelLat == null || hotelLng == null) return null;
  return distanceKm(center.lat, center.lng, hotelLat, hotelLng);
}
