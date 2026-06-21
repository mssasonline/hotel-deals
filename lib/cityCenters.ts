import { distanceKm } from './geo';

const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  // UAE Emirates
  'Dubai':          { lat: 25.1972, lng: 55.2744 }, // Downtown Dubai / Burj Khalifa
  'Abu Dhabi':      { lat: 24.4539, lng: 54.3773 }, // Abu Dhabi Corniche
  'Sharjah':        { lat: 25.3462, lng: 55.4209 }, // Al Majaz / Sharjah City Center
  'Ajman':          { lat: 25.4052, lng: 55.5136 }, // Ajman City Center
  'Umm Al Quwain':  { lat: 25.5651, lng: 55.5553 }, // UAQ City Center
  'Ras Al Khaimah': { lat: 25.7895, lng: 55.9432 }, // RAK City Center
  'Fujairah':       { lat: 25.1288, lng: 56.3265 }, // Fujairah City Center
  // UAE Cities
  'Al Ain':         { lat: 24.2075, lng: 55.7447 }, // Al Ain City Center
  // International
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
