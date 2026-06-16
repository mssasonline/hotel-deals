import type { Metadata } from 'next';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import SearchBar from './components/SearchBar';
import SearchResultsClient from './components/SearchResultsClient';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { mapRowToSearchHotel } from '@/app/lib/searchData';
import type { SearchHotel } from '@/app/lib/searchData';

export const metadata: Metadata = {
  title: 'Search For Deals — SelectedRoom',
  description:
    'Find last-minute luxury hotel deals with up to 70% off. Filter by price, stars, and discount.',
};

async function fetchSearchHotels(): Promise<SearchHotel[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('hotels')
    .select('*, hotel_images(image_url, sort_order), rooms(base_price, min_price, quantity_available, quantity_total)')
    .order('id');

  if (error || !data) return [];
  return data.map((row, i) =>
    mapRowToSearchHotel(row as Record<string, unknown>, i),
  );
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
