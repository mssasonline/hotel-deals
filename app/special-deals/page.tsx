import { createSupabaseServerClient } from '@/lib/supabase-server';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import SpecialDealsClient from './SpecialDealsClient';

export const dynamic = 'force-dynamic';

export type SpecialDealHotel = {
  id: number;
  name: string;
  city: string;
  country: string;
  imageUrl: string | null;
  rating: number;
  stars: number;
  amenities: string[];
  bestDealPrice: number;
  bestBasePrice: number;
  discountPct: number;
  dealCount: number;
  isUpcoming: boolean;
  deals: Array<{
    id: string;
    room_name: string;
    deal_price: number;
    base_price: number;
    start_date: string;
    end_date: string;
    title: string | null;
  }>;
};

async function fetchSpecialDeals(): Promise<SpecialDealHotel[]> {
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('partner_deals')
    .select('id, deal_price, title, start_date, end_date, rooms(name, base_price), hotels(id, name, city, country, rating, star_rating, amenities, hotel_images(image_url, sort_order))')
    .eq('status', 'active')
    .gte('end_date', today)
    .order('start_date', { ascending: true });

  if (error || !data) return [];

  // Group by hotel
  const hotelMap = new Map<number, SpecialDealHotel>();

  for (const row of data) {
    const room    = Array.isArray(row.rooms)  ? row.rooms[0]  : row.rooms;
    const hotel   = Array.isArray(row.hotels) ? row.hotels[0] : row.hotels;
    if (!hotel || !room) continue;

    const hotelId  = Number(hotel.id);
    const dealPrice = Number(row.deal_price);
    const basePrice = Number(room.base_price ?? 0);

    // Resolve first hotel image
    let imageUrl: string | null = null;
    const rawImages = Array.isArray(hotel.hotel_images) ? hotel.hotel_images : [];
    const sorted = rawImages.slice().sort((a: { sort_order?: number }, b: { sort_order?: number }) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    if (sorted.length > 0) imageUrl = String(sorted[0].image_url ?? '');

    const dealEntry = {
      id:         String(row.id),
      room_name:  String(room.name ?? ''),
      deal_price: dealPrice,
      base_price: basePrice,
      start_date: String(row.start_date),
      end_date:   String(row.end_date),
      title:      row.title ? String(row.title) : null,
    };

    const dealIsUpcoming = String(row.start_date) > today;

    if (hotelMap.has(hotelId)) {
      const existing = hotelMap.get(hotelId)!;
      existing.deals.push(dealEntry);
      // Hotel is "active" if ANY deal is currently active
      if (!dealIsUpcoming) existing.isUpcoming = false;
      if (dealPrice < existing.bestDealPrice) {
        existing.bestDealPrice = dealPrice;
        existing.bestBasePrice = basePrice;
        existing.discountPct   = basePrice > 0 ? Math.round((1 - dealPrice / basePrice) * 100) : 0;
      }
      existing.dealCount++;
    } else {
      hotelMap.set(hotelId, {
        id:            hotelId,
        name:          String(hotel.name ?? ''),
        city:          String(hotel.city ?? ''),
        country:       String(hotel.country ?? ''),
        imageUrl,
        rating:        Number(hotel.rating ?? 0),
        stars:         Number(hotel.star_rating ?? 0),
        amenities:     Array.isArray(hotel.amenities) ? (hotel.amenities as unknown[]).map(String) : [],
        bestDealPrice: dealPrice,
        bestBasePrice: basePrice,
        discountPct:   basePrice > 0 ? Math.round((1 - dealPrice / basePrice) * 100) : 0,
        dealCount:     1,
        isUpcoming:    dealIsUpcoming,
        deals:         [dealEntry],
      });
    }
  }

  // Active-now first, then upcoming; within each group sort by discount
  const all = Array.from(hotelMap.values());
  return [
    ...all.filter((h) => !h.isUpcoming).sort((a, b) => b.discountPct - a.discountPct),
    ...all.filter((h) =>  h.isUpcoming).sort((a, b) => a.deals[0].start_date.localeCompare(b.deals[0].start_date)),
  ];
}

export default async function SpecialDealsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const hotels = await fetchSpecialDeals();

  return (
    <>
      <Header />
      <main className="min-h-screen" style={{ background: '#F8FAFC' }}>
        {/* Banner */}
        <div style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
                <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#D97706' }}>Partner Exclusive</span>
                </div>
                <h1 className="font-extrabold text-2xl sm:text-3xl leading-tight" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>Exclusive Hotel Offers</h1>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>Fixed discounts handpicked by hotels — valid for specific date ranges</p>
              </div>
            </div>
            <div className="mt-4 h-0.5 w-14 rounded-full" style={{ background: 'linear-gradient(90deg, #B45309, #FCD34D)' }} />
          </div>
        </div>

        <SpecialDealsClient hotels={hotels} initialQuery={q ?? ''} />
      </main>
      <Footer />
    </>
  );
}
