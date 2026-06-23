import type { Metadata } from 'next';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import SearchBar from './components/SearchBar';
import SearchResultsClient from './components/SearchResultsClient';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { mapRowToSearchHotel, type SearchRawRoom } from '@/app/lib/searchData';
import type { SearchHotel } from '@/app/lib/searchData';

export const metadata: Metadata = {
  title: 'Search for Hotel — SelectedRoom',
  description:
    'Find last-minute luxury hotel deals with up to 50% off. Filter by price, stars, and discount.',
};

async function fetchSearchHotels(): Promise<SearchHotel[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('hotels')
    .select('*, hotel_images(image_url, sort_order), rooms(id, base_price, min_price, min_price_weekend, quantity_available, quantity_total)')
    .eq('is_active', true)
    .order('id');

  if (error || !data) return [];

  // Collect cheapest room IDs for today's calendar rate lookup
  const cheapestRoomIds: string[] = [];
  const hotelCheapestRoom = new Map<number, string>();
  for (const row of data) {
    const rawRooms = Array.isArray(row.rooms) ? (row.rooms as SearchRawRoom[]) : [];
    const cheapest = rawRooms.reduce<SearchRawRoom | null>((best, r) => {
      const a = Number(r.base_price ?? 0);
      const b = Number(best?.base_price ?? 0);
      return a > 0 && (b === 0 || a < b) ? r : best;
    }, null);
    if (cheapest?.id) {
      cheapestRoomIds.push(cheapest.id);
      hotelCheapestRoom.set(Number(row.id), cheapest.id);
    }
  }

  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayRates: Record<string, number> = {};
  if (cheapestRoomIds.length > 0) {
    const { data: rates } = await supabase
      .from('room_rates')
      .select('room_id, price')
      .eq('date', today)
      .in('room_id', cheapestRoomIds);
    for (const r of rates ?? []) todayRates[String(r.room_id)] = Number(r.price);
  }

  const todayDow = new Date().getDay();
  const isTodayWeekend = todayDow === 5 || todayDow === 6 || todayDow === 0;

  return data.map((row, i) => {
    const roomId    = hotelCheapestRoom.get(Number(row.id));
    const todayRate = roomId ? todayRates[roomId] : undefined;
    return mapRowToSearchHotel(row as Record<string, unknown>, i, todayRate, isTodayWeekend);
  });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const city     = typeof params.city    === 'string' ? params.city    : '';
  const checkin  = typeof params.checkin === 'string' ? params.checkin : '';
  const checkout = typeof params.checkout === 'string' ? params.checkout : '';
  const guests   = typeof params.guests  === 'string' ? params.guests  : '2';

  const rawLat = typeof params.lat === 'string' ? parseFloat(params.lat) : NaN;
  const rawLng = typeof params.lng === 'string' ? parseFloat(params.lng) : NaN;
  const userLat = isNaN(rawLat) ? undefined : rawLat;
  const userLng = isNaN(rawLng) ? undefined : rawLng;

  const hotels = await fetchSearchHotels();

  return (
    <>
      <Header />
      <SearchBar
        initialCity={city}
        initialCheckin={checkin}
        initialCheckout={checkout}
        initialGuests={guests}
      />
      <main className="flex-1 min-h-[calc(100vh-128px)]" style={{ background: '#F8FAFC' }}>
        <SearchResultsClient
          city={city}
          checkin={checkin}
          checkout={checkout}
          guests={guests}
          hotels={hotels}
          userLat={userLat}
          userLng={userLng}
        />
      </main>
      <Footer />
    </>
  );
}
