import { getDealStatus, getUrgencyConfig } from '@/lib/dealsEngine';
import type { DealStatus, UrgencyConfig } from '@/lib/dealsEngine';

export interface BaseHotel {
  id: number;
  name: string;
  city: string;
  location: string;
  address: string;
  lat?: number;
  lng?: number;
  gradient: string;
  category: string;
  stars: number;
  rating: number;
  reviewCount: number;
  /** Lowest room rack rate — use with pricingEngine.calcRoomPrice() */
  basePrice: number;
  checkInHours: number;
  roomsLeft: number;
  amenities: string[];
  distanceKm: number;
}

export interface DynamicHotel extends BaseHotel {
  dealStatus: DealStatus;
  urgency: UrgencyConfig;
  tonightOnly: boolean;
}

export function applyDynamicPricing(hotel: BaseHotel): DynamicHotel {
  const { checkInHours } = hotel;
  const status = getDealStatus(checkInHours);
  return {
    ...hotel,
    dealStatus: status,
    urgency: getUrgencyConfig(checkInHours),
    tonightOnly: status === 'HIGH_DEMAND' || status === 'CRITICAL',
  };
}

export const BASE_HOTELS: BaseHotel[] = [
  {
    id: 1,
    name: 'Atlantis Tower Suites',
    city: 'Dubai',
    location: 'Palm Jumeirah, Dubai',
    address: 'The Palm Jumeirah, Crescent Road, Dubai, UAE',
    lat: 25.1304,
    lng: 55.1173,
    gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    category: 'Ultra Luxury',
    stars: 5,
    rating: 4.9,
    reviewCount: 3421,
    basePrice: 500,
    checkInHours: 1.917,
    roomsLeft: 2,
    amenities: ['Infinity Pool', 'Private Beach', 'Fine Dining', 'WiFi'],
    distanceKm: 12.0,
  },
  {
    id: 2,
    name: 'Skyline Resort & Spa',
    city: 'Dubai',
    location: 'Downtown Dubai',
    address: 'Mohammed Bin Rashid Blvd, Downtown Dubai, UAE',
    lat: 25.1972,
    lng: 55.2744,
    gradient: 'linear-gradient(135deg, #373b44 0%, #4286f4 100%)',
    category: 'Urban Luxury',
    stars: 5,
    rating: 4.7,
    reviewCount: 1876,
    basePrice: 300,
    checkInHours: 2.783,
    roomsLeft: 1,
    amenities: ['Rooftop Pool', 'Gym', 'Breakfast', 'WiFi'],
    distanceKm: 0.3,
  },
  {
    id: 3,
    name: 'The Grand Palace Hotel',
    city: 'Dubai',
    location: 'DIFC, Dubai',
    address: 'Gate District, DIFC, Dubai, UAE',
    lat: 25.2185,
    lng: 55.2796,
    gradient: 'linear-gradient(135deg, #1a3a4a 0%, #2d6986 100%)',
    category: 'Business Luxury',
    stars: 5,
    rating: 4.8,
    reviewCount: 2089,
    basePrice: 380,
    checkInHours: 4.383,
    roomsLeft: 3,
    amenities: ['Business Center', 'Pool', 'Restaurant', 'WiFi'],
    distanceKm: 0.8,
  },
  {
    id: 4,
    name: 'Desert Oasis Retreat',
    city: 'Dubai',
    location: 'Al Barsha, Dubai',
    address: 'Al Barsha South, Dubai, UAE',
    lat: 25.1099,
    lng: 55.1868,
    gradient: 'linear-gradient(135deg, #c79832 0%, #f7971e 60%, #ffd200 100%)',
    category: 'Desert Resort',
    stars: 5,
    rating: 4.5,
    reviewCount: 876,
    basePrice: 260,
    checkInHours: 6.2,
    roomsLeft: 4,
    amenities: ['Desert Tours', 'Pool', 'Spa', 'WiFi'],
    distanceKm: 15.0,
  },
  {
    id: 5,
    name: 'Burj Al Suites',
    city: 'Dubai',
    location: 'Business Bay, Dubai',
    address: 'Al Asayel St, Business Bay, Dubai, UAE',
    lat: 25.1848,
    lng: 55.2603,
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    category: 'Ultra Luxury',
    stars: 5,
    rating: 4.9,
    reviewCount: 3102,
    basePrice: 450,
    checkInHours: 5.633,
    roomsLeft: 2,
    amenities: ['Infinity Pool', 'Gym', 'Spa', 'WiFi', 'Valet Parking'],
    distanceKm: 1.2,
  },
  {
    id: 6,
    name: 'Ocean View Stay',
    city: 'Dubai',
    location: 'JBR Beach, Dubai',
    address: 'Jumeirah Beach Residence, The Walk, Dubai, UAE',
    lat: 25.0777,
    lng: 55.1334,
    gradient: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
    category: 'Beachfront',
    stars: 4,
    rating: 4.6,
    reviewCount: 1203,
    basePrice: 180,
    checkInHours: 8.917,
    roomsLeft: 5,
    amenities: ['Private Beach', 'Pool', 'Restaurant', 'WiFi'],
    distanceKm: 0.5,
  },
  {
    id: 7,
    name: 'Royal Palm Hotel',
    city: 'Dubai',
    location: 'Dubai Marina',
    address: 'Marina Walk, Dubai Marina, UAE',
    lat: 25.0819,
    lng: 55.1367,
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
    category: 'Luxury Waterfront',
    stars: 5,
    rating: 4.8,
    reviewCount: 2341,
    basePrice: 220,
    checkInHours: 11.333,
    roomsLeft: 3,
    amenities: ['Marina View Pool', 'Gym', 'Breakfast', 'WiFi'],
    distanceKm: 2.1,
  },
  {
    id: 8,
    name: 'Marina Bay Suites',
    city: 'Dubai',
    location: 'Dubai Marina',
    address: 'Al Marsa St, Dubai Marina, UAE',
    lat: 25.0820,
    lng: 55.1370,
    gradient: 'linear-gradient(135deg, #2980b9 0%, #2c3e50 100%)',
    category: 'Marina View',
    stars: 4,
    rating: 4.4,
    reviewCount: 987,
    basePrice: 150,
    checkInHours: 14.083,
    roomsLeft: 7,
    amenities: ['Pool', 'Restaurant', 'WiFi', 'Parking'],
    distanceKm: 2.0,
  },
  {
    id: 9,
    name: 'Heritage House Hotel',
    city: 'Dubai',
    location: 'Deira, Dubai',
    address: 'Al Fahidi Historical Neighbourhood, Deira, Dubai, UAE',
    lat: 25.2644,
    lng: 55.2989,
    gradient: 'linear-gradient(135deg, #614385 0%, #516395 100%)',
    category: 'Boutique',
    stars: 3,
    rating: 4.2,
    reviewCount: 654,
    basePrice: 120,
    checkInHours: 18.5,
    roomsLeft: 9,
    amenities: ['Restaurant', 'WiFi', 'Business Center'],
    distanceKm: 3.5,
  },
  {
    id: 10,
    name: 'Palm Garden Resort',
    city: 'Dubai',
    location: 'Jumeirah, Dubai',
    address: 'Jumeirah Beach Road, Jumeirah, Dubai, UAE',
    lat: 25.2082,
    lng: 55.2392,
    gradient: 'linear-gradient(135deg, #1d6348 0%, #57b87a 100%)',
    category: 'Garden Resort',
    stars: 4,
    rating: 4.5,
    reviewCount: 1456,
    basePrice: 200,
    checkInHours: 10.7,
    roomsLeft: 6,
    amenities: ['Garden Pool', 'Spa', 'Breakfast', 'WiFi'],
    distanceKm: 4.2,
  },
];

export const DYNAMIC_HOTELS: DynamicHotel[] = BASE_HOTELS.map(applyDynamicPricing);
