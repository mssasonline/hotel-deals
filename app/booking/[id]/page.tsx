import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { supabase } from '@/lib/supabase';
import { getDealStatus, getUrgencyConfig } from '@/lib/dealsEngine';
import { getCurrentTier, calcLivePrice } from '@/lib/pricingEngine';
import { getTaxRateForHotel } from '@/lib/taxUtils';
import type { RoomCategory } from '@/lib/roomImages';
import type { HotelDetail, RoomType } from '@/app/hotel/[id]/lib/hotelDetailData';
import BookingPageClient from './components/BookingPageClient';
import BookingProgressSteps from './components/BookingProgressSteps';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabase
    .from('hotels')
    .select('name')
    .eq('id', Number(id))
    .single();
  if (!data) return { title: 'Book — SelectedRoom' };
  const name = String(data.name ?? '');
  return {
    title: `Book ${name} | SelectedRoom`,
    description: `Complete your reservation for ${name}. Reserve now, pay at check-in. No credit card fees.`,
  };
}

function ChevronIcon() {
  return (
    <svg className="w-3 h-3 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default async function BookingPage({ params }: Props) {
  const { id } = await params;
  const hotelId = Number(id);

  const [{ data: row }, { data: rooms }, taxRate] = await Promise.all([
    supabase.from('hotels').select('*').eq('id', hotelId).single(),
    supabase
      .from('rooms')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('base_price', { ascending: true, nullsFirst: false }),
    getTaxRateForHotel(hotelId),
  ]);

  if (!row) notFound();

  const countdownHours = Number(row.countdown_hours ?? 8);
  const countdownMinutes = Number(row.countdown_minutes ?? 0);
  const dealStatus = getDealStatus(countdownHours + countdownMinutes / 60);
  const urgencyConfig = getUrgencyConfig(countdownHours + countdownMinutes / 60);

  const mappedRooms: RoomType[] = (rooms ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ''),
    room_type: (r.room_type as RoomCategory) ?? 'standard',
    image_url: r.image_url ?? undefined,
    bedType: '1 King Bed',
    sizeM2: 30,
    maxGuests: Number(r.capacity ?? 2),
    basePrice: Number(r.base_price ?? 0),
    pricePerNight: calcLivePrice(
      Number(r.base_price ?? 0),
      Number(r.min_price ?? 0),
      getCurrentTier(),
    ),
    features: [],
    quantity: Number(r.quantity_available ?? r.quantity_total ?? 1),
  }));

  const hotel: HotelDetail = {
    id: hotelId,
    name: String(row.name ?? ''),
    location: String(row.location ?? row.city ?? ''),
    address: String(row.address ?? ''),
    category: String(row.category ?? 'Hotel'),
    stars: Number(row.stars ?? row.star_rating ?? Math.round(Number(row.rating ?? 4))),
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    tonightOnly: dealStatus === 'HIGH_DEMAND' || dealStatus === 'CRITICAL',
    roomsLeft: 5,
    countdownHours,
    countdownMinutes,
    dealBadge: urgencyConfig.dealBadge,
    dealStatus,
    urgency: urgencyConfig,
    description: String(row.description ?? ''),
    gallery: [],
    amenities: [],
    rooms: mappedRooms,
    policies: {
      checkIn: '3:00 PM',
      checkOut: '12:00 PM',
    },
  };

  return (
    <>
      <Header />

      <main className="min-h-screen" style={{ background: '#F8FAFC' }}>

        {/* ── Premium banner ── */}
        <div style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
            <nav className="flex items-center gap-2 text-xs text-white/40 mb-4">
              <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
              <ChevronIcon />
              <Link href="/search?city=Dubai" className="hover:text-white/70 transition-colors">Search</Link>
              <ChevronIcon />
              <Link href={`/hotel/${hotelId}`} className="hover:text-white/70 transition-colors truncate max-w-[160px] text-white/50">{hotel.name}</Link>
              <ChevronIcon />
              <span className="text-white/60">Booking</span>
            </nav>
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full shrink-0" style={{ background: 'linear-gradient(180deg, #D97706 0%, #B45309 100%)' }} />
              <div>
                <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>
                  Complete Your Booking
                </h1>
                <p className="text-white/45 text-xs mt-0.5">{hotel.name} · Step 3 of 4</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Progress steps */}
          <BookingProgressSteps />

          <BookingPageClient
            hotel={hotel}
            taxVatPct={taxRate.vat_pct}
            fixedFeePerNight={taxRate.fixed_fee_per_night}
            taxCountryCode={taxRate.country_code}
            serviceChargePct={taxRate.service_charge_pct}
            municipalityFeePct={taxRate.municipality_fee_pct}
          />
        </div>
      </main>

      <Footer />
    </>
  );
}
