'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import HotelCard, { type Hotel } from '@/app/components/HotelCard';
import { saveLoginRedirect } from '@/lib/auth';
import { useAuth } from '@/lib/authContext';
import { fetchMyFavorites } from '@/app/user-actions';
import { getDealStatus } from '@/lib/dealsEngine';

const DEFAULT_GRADIENTS = [
  'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
  'linear-gradient(135deg, #373b44 0%, #4286f4 100%)',
  'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
  'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  'linear-gradient(135deg, #c79832 0%, #f7971e 60%, #ffd200 100%)',
  'linear-gradient(135deg, #1a3a4a 0%, #2d6986 100%)',
];

interface SupabaseHotel {
  id: number;
  name: string;
  city: string;
  image_url: string | null;
  rating: number;
  [key: string]: unknown;
}

type RawHotelImage = { image_url: string; sort_order: number };

// Supabase returns joined rows as an array; normalize to single object before use
interface RawFavoriteRow {
  hotel_id: number;
  hotels: SupabaseHotel | SupabaseHotel[] | null;
}

interface FavoriteRow {
  hotel_id: number;
  hotels: SupabaseHotel | null;
}

function normalizeRow(raw: RawFavoriteRow): FavoriteRow {
  const hotel = Array.isArray(raw.hotels) ? (raw.hotels[0] ?? null) : raw.hotels;
  return { hotel_id: raw.hotel_id, hotels: hotel };
}

function resolveImageUrl(row: SupabaseHotel): string | null {
  const rawImages = Array.isArray(row.hotel_images)
    ? (row.hotel_images as RawHotelImage[])
    : [];
  const sorted = rawImages.slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  if (sorted.length > 0 && sorted[0].image_url) return String(sorted[0].image_url);
  if (row.image_url) return String(row.image_url);
  return null;
}

function mapToHotel(row: SupabaseHotel, index: number): Hotel {
  const countdownHours = Number(row.countdown_hours ?? 8);
  const status = getDealStatus(countdownHours);

  // Room-based pricing: pick cheapest room by base_price
  type RawRoom = { base_price?: number; min_price?: number; quantity_available?: number; quantity_total?: number };
  const rawRooms = Array.isArray(row.rooms) ? (row.rooms as RawRoom[]) : [];
  const cheapestRoom = rawRooms.length > 0
    ? rawRooms.reduce((best, r) => {
        const a = Number(r.base_price ?? 0);
        const b = Number(best.base_price ?? 0);
        return a > 0 && (b === 0 || a < b) ? r : best;
      }, rawRooms[0])
    : null;
  const basePrice = cheapestRoom ? Number(cheapestRoom.base_price ?? 0) : 0;
  const minPrice  = cheapestRoom ? Number(cheapestRoom.min_price ?? Math.round(basePrice * 0.6)) : 0;
  const roomsLeft = cheapestRoom
    ? Number(cheapestRoom.quantity_available ?? cheapestRoom.quantity_total ?? row.rooms_left ?? 5)
    : Number(row.rooms_left ?? 5);

  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    location: String(row.city ?? row.location ?? ''),
    gradient: String(row.gradient ?? DEFAULT_GRADIENTS[index % DEFAULT_GRADIENTS.length]),
    category: String(row.category ?? 'Hotel'),
    stars: Number(row.stars ?? row.star_rating ?? Math.round(Number(row.rating ?? 4))),
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    basePrice,
    minPrice,
    tonightOnly: status === 'HIGH_DEMAND' || status === 'CRITICAL',
    roomsLeft,
    countdownHours,
    imageUrl: resolveImageUrl(row),
  };
}

function Spinner() {
  return (
    <svg className="animate-spin w-8 h-8 text-brand-blue" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function MyFavoritesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      saveLoginRedirect('/my-favorites');
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    async function doFetch() {
      setFetching(true);
      try {
        const raw = await fetchMyFavorites();
        const rows = raw
          .map(r => normalizeRow(r as RawFavoriteRow))
          .filter((r): r is FavoriteRow & { hotels: SupabaseHotel } => r.hotels != null)
          .map((r, i) => mapToHotel(r.hotels, i));
        setHotels(rows);
      } catch (err) {
        console.error('[my-favorites] doFetch error:', err);
      } finally {
        setFetching(false);
      }
    }

    doFetch();

    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) doFetch();
    }
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [user?.id]);

  const handleUnfavorite = useCallback((hotelId: number) => {
    setHotels((prev) => prev.filter((h) => h.id !== hotelId));
  }, []);

  if (loading || !user) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFC' }}>
          <Spinner />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen" style={{ background: '#F8FAFC' }}>
        {/* Page header */}
        <div style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)', boxShadow: '0 4px 12px rgba(180,83,9,0.4)' }}>
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #D97706 0%, #B45309 100%)' }} />
                  <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>
                    My Favorites
                  </h1>
                </div>
                <p className="text-white/45 text-xs pl-3">
                  {fetching
                    ? 'Loading your saved hotels…'
                    : hotels.length > 0
                    ? `${hotels.length} saved hotel${hotels.length !== 1 ? 's' : ''}`
                    : 'Hotels you save will appear here'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {fetching ? (
            <div className="flex justify-center py-20">
              <Spinner />
            </div>
          ) : hotels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-5">
                <svg className="w-10 h-10 text-red-200" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <h3 className="font-extrabold text-gray-900 text-xl mb-2">No saved hotels yet</h3>
              <p className="text-gray-500 text-sm mb-7 max-w-xs">
                Tap the heart icon on any hotel card to save it here.
              </p>
              <Link
                href="/search?city=Dubai"
                className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Explore Last Minute Deals
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotels.map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  initialFavorited
                  onUnfavorite={() => handleUnfavorite(hotel.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
