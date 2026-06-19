import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getDealStatus } from '@/lib/dealsEngine';
import { getTaxRateForHotel } from '@/lib/taxUtils';
import { type HotelFeeConfig } from '@/lib/pricingEngine';
import RoomsGrid from './components/RoomsGrid';
import { HotelClientLabel, HotelRatingLabel } from './components/HotelClientLabel';
import HotelGalleryLightbox from './components/HotelGalleryLightbox';
import HotelAmenities from './components/HotelAmenities';
import HotelTierBanner from './components/HotelTierBanner';
import FavoriteButton from '@/app/components/FavoriteButton';
import PartnerDealsSection, { type PartnerDeal } from './components/PartnerDealsSection';
import ReviewsSection from './components/ReviewsSection';

interface Props {
  params: Promise<{ id: string }>;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('hotels')
    .select('name, description, city, country, stars, image_url')
    .eq('id', Number(id))
    .single();
  if (!data) return { title: 'Hotel Not Found' };

  const name    = String(data.name        ?? '');
  const desc    = String(data.description ?? '');
  const city    = String(data.city        ?? '');
  const country = String(data.country     ?? '');
  const image   = String(data.image_url   ?? FALLBACK_IMAGE);
  const loc     = [city, country].filter(Boolean).join(', ');

  const title       = name;
  const description = desc.slice(0, 155) || `Book ${name} in ${loc} tonight at exclusive last-minute prices.`;
  const canonical   = `/hotel/${id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      images: [{ url: image, width: 1200, height: 800, alt: name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

function StarRating({ count }: { count: number }) {
  const n = Math.min(Math.max(Math.round(count), 0), 5);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} className="w-4 h-4 text-brand-gold fill-current" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

interface HotelImage {
  id: string;
  hotel_id: number;
  image_url: string;
  sort_order: number;
}

interface Room {
  id: string;
  name: string;
  base_price: number;
  min_price: number | null;
  capacity: number;
  image_url: string | null;
  room_type: string | null;
  quantity_available?: number | null;
  area_sqm?: number | null;
  bed_type?: string | null;
  features?: string[] | null;
}

function parseAmenities(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === 'string');
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((x: unknown) => typeof x === 'string');
    } catch {
      // Not JSON — fall through to comma-split
    }
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

const AMENITY_DISPLAY: Record<string, string> = {
  pool:            'Swimming Pool',
  gym:             'Gym & Fitness Center',
  spa:             'Spa & Wellness',
  restaurant:      'Restaurant',
  free_parking:    'Free Parking',
  airport_shuttle: 'Airport Shuttle',
  business_center: 'Business Center',
  conference:      'Conference Room',
  free_wifi:       'Free Wi-Fi',
  room_service:    'Room Service',
  pet_friendly:    'Pet Friendly',
  kids_club:       'Kids Club',
  beach_access:    'Beach Access',
  golf:            'Golf Course',
  bar_lounge:      'Bar & Lounge',
  rooftop:         'Rooftop',
  valet_parking:   'Valet Parking',
  casino:          'Casino',
};

export default async function HotelPage({ params }: Props) {
  const { id } = await params;
  const hotelId = Number(id);

  const today = new Date().toISOString().split('T')[0];
  const supabase = await createSupabaseServerClient();

  const [
    { data: row, error },
    { data: rooms, error: roomsError },
    hotelTaxRate,
    { data: rawReviews },
    { data: hotelImages },
    { data: rawDeals },
  ] = await Promise.all([
    supabase.from('hotels').select('*').eq('id', hotelId).single(),
    supabase
      .from('rooms')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('base_price', { ascending: true, nullsFirst: false }),
    getTaxRateForHotel(hotelId),
    supabase
      .from('reviews')
      .select('id, booking_id, hotel_id, user_id, rating, comment, created_at, bookings(guest_name)')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false }),
    supabase
      .from('hotel_images')
      .select('id, hotel_id, image_url, sort_order')
      .eq('hotel_id', hotelId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('partner_deals')
      .select('id, room_id, deal_price, title, start_date, end_date, rooms(id, name, base_price, capacity, room_type)')
      .eq('hotel_id', hotelId)
      .eq('status', 'active')
      .gte('end_date', today)
      .order('start_date', { ascending: true }),
  ]);

  if (roomsError) console.error('[rooms] Supabase error:', roomsError.message);
  if (error || !row) notFound();

  // ── Hotel data ──────────────────────────────────────────────
  const name = String(row.name ?? '');
  const city = String(row.city ?? row.location ?? '');
  const country = String(row.country ?? '');
  const address = String(row.address ?? '');
  const description = String(row.description ?? '');
  const imageUrl = row.image_url ? String(row.image_url) : null;
  const category = String(row.category ?? 'Hotel');
  const stars = Number(row.stars ?? row.star_rating ?? Math.round(Number(row.rating ?? 4)));
  const rating = Number(row.rating ?? 0);
  const reviewCount = Number(row.review_count ?? 0);
  const countdownHours = Number(row.countdown_hours ?? 8);
  const status = getDealStatus(countdownHours);
  const tonightOnly = status === 'HIGH_DEMAND' || status === 'CRITICAL';
  const amenities = parseAmenities(row.amenities).map(a => AMENITY_DISPLAY[a] ?? a);
  const breakfastPricePerPerson: number | null = row.breakfast_price_per_person != null
    ? Number(row.breakfast_price_per_person)
    : null;

  const feeConfig: HotelFeeConfig = {
    serviceChargePct:      hotelTaxRate.service_charge_pct,
    municipalityFeePct:    hotelTaxRate.municipality_fee_pct,
    tourismDirhamPerNight: hotelTaxRate.fixed_fee_per_night,
    vatPct:                hotelTaxRate.vat_pct,
  };

  // ── Gallery images ───────────────────────────────────────────
  const rawImages = (hotelImages ?? []) as HotelImage[];
  const galleryImages: string[] = (() => {
    const valid = rawImages
      .map((img) => (img.image_url ? String(img.image_url).trim() : ''))
      .filter(Boolean);
    return valid.length > 0 ? valid : imageUrl ? [imageUrl] : [FALLBACK_IMAGE];
  })();

  // ── Location display ─────────────────────────────────────────
  const locationParts = [address || null, city || null, country || null].filter(Boolean);
  const locationDisplay = locationParts.join(', ');

  // ── Map coordinates — set by partner in /partner/hotels ──────
  const geoLat = row.latitude  != null ? Number(row.latitude)  : null;
  const geoLon = row.longitude != null ? Number(row.longitude) : null;
  const geoCoords = geoLat != null && geoLon != null && !isNaN(geoLat) && !isNaN(geoLon)
    ? { lat: geoLat, lon: geoLon }
    : null;

  // ── Cheapest room base_price (for tier banner) ───────────────
  const cheapestRoomBase = (() => {
    const valid = (rooms ?? []).map(r => Number((r as Room).base_price)).filter(p => p > 0);
    return valid.length > 0 ? Math.min(...valid) : 0;
  })();
  const cheapestRoomMin = (() => {
    const cheapest = (rooms ?? []).reduce<Room | null>((best, r) => {
      const bp = Number((r as Room).base_price);
      if (!best || (bp > 0 && bp < Number(best.base_price))) return r as Room;
      return best;
    }, null);
    if (!cheapest) return 0;
    return Number(cheapest.min_price ?? Math.round(cheapestRoomBase * 0.6));
  })();

  // ── Reviews ──────────────────────────────────────────────────
  const reviews = (rawReviews ?? []).map(r => ({
    id:         String(r.id),
    rating:     Number(r.rating),
    comment:    r.comment ? String(r.comment) : null,
    created_at: String(r.created_at),
    guest_name: (() => {
      const b = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
      return b?.guest_name ? String(b.guest_name) : 'Verified Guest';
    })(),
  }));
  const avgReviewRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  // ── Partner deals ────────────────────────────────────────────
  const partnerDeals: PartnerDeal[] = (rawDeals ?? []).flatMap((row) => {
    const room = Array.isArray(row.rooms) ? row.rooms[0] : row.rooms;
    if (!room) return [];
    return [{
      id:         String(row.id),
      room_id:    Number(row.room_id),
      room_name:  String(room.name ?? ''),
      room_type:  room.room_type ? String(room.room_type) : null,
      base_price: Number(room.base_price ?? 0),
      capacity:   Number(room.capacity ?? 2),
      deal_price: Number(row.deal_price),
      title:      row.title ? String(row.title) : null,
      start_date: String(row.start_date),
      end_date:   String(row.end_date),
    }];
  });

  const hotelBaseProps = {
    hotelId,
    hotelName: name,
    city,
    location: String(row.location ?? city),
    address,
    stars,
    rating,
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://selectedroom.com';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name,
    description: String(row.description ?? ''),
    image: galleryImages[0] ?? FALLBACK_IMAGE,
    url: `${siteUrl}/hotel/${hotelId}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address || undefined,
      addressLocality: city || undefined,
      addressCountry: country || undefined,
    },
    ...(stars > 0 && {
      starRating: { '@type': 'Rating', ratingValue: String(stars) },
    }),
    ...(avgReviewRating != null && reviews.length > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: avgReviewRating.toFixed(1),
        reviewCount: String(reviews.length),
        bestRating: '5',
        worstRating: '1',
      },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      <main className="min-h-screen pb-16" style={{ background: '#F8FAFC' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* ── Breadcrumb ── */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
            <Link href="/" className="hover:text-brand-blue transition-colors">
              <HotelClientLabel translationKey="hotel.breadcrumbHome" fallback="Home" />
            </Link>
            <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <a href={`/search?city=${encodeURIComponent(city)}`} className="hover:text-brand-blue transition-colors">
              {city || <HotelClientLabel translationKey="hotel.hotels" fallback="Hotels" />}
            </a>
            <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-700 font-medium truncate">{name}</span>
          </nav>

          {/* ── Hotel Header ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="bg-brand-blue-light text-brand-blue text-xs font-semibold px-2.5 py-1 rounded-full border border-brand-blue/15">
                {category}
              </span>
              {tonightOnly && (
                <span className="bg-brand-gold text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  <HotelClientLabel translationKey="hotel.tonightOnlyBadge" fallback="Tonight Only" />
                </span>
              )}
            </div>

            {/* Name + Favorite */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="font-bold text-gray-900 text-2xl sm:text-3xl">
                {name}
              </h1>
              <div className="shrink-0 mt-1">
                <FavoriteButton hotelId={hotelId} />
              </div>
            </div>

            {/* Stars + rating + reviews */}
            <div className="flex flex-wrap items-center gap-4 mb-3">
              {stars > 0 && (
                <div className="flex items-center gap-2">
                  <StarRating count={stars} />
                  <span className="text-gray-500 text-sm font-medium">
                    {stars}-<HotelClientLabel translationKey="hotel.hotels" fallback="Star Hotel" />
                  </span>
                </div>
              )}

              {rating > 0 && (
                <div className="flex items-center gap-2">
                  <div className="text-white font-extrabold text-base px-2.5 py-1 rounded-xl leading-none" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}>
                    {rating.toFixed(1)}
                  </div>
                  <div>
                    <HotelRatingLabel rating={rating} />
                    {reviewCount > 0 && (
                      <span className="text-gray-500 text-sm ml-1.5">
                        · {reviewCount.toLocaleString()}{' '}
                        <HotelClientLabel translationKey="hotel.reviews" fallback="reviews" />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Location */}
            {locationDisplay && (
              <div className="flex items-start gap-1.5 text-sm text-gray-500">
                <svg className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium text-gray-700">{locationDisplay}</span>
              </div>
            )}
          </div>

          {/* ── Gallery with lightbox ── */}
          <HotelGalleryLightbox images={galleryImages} hotelName={name} />

          {/* ── Live tier discount banner ── */}
          <HotelTierBanner baseNightPrice={cheapestRoomBase} minNightPrice={cheapestRoomMin} />

          {/* ── Full-width content ── */}
          <div className="mt-2">

            {/* Description + Map */}
            {(description || true) && (
              <div className="flex flex-col lg:flex-row gap-4 mb-6 items-stretch">

                {/* Description box */}
                {description && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex-1">
                    <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                      {description}
                    </p>
                  </div>
                )}

                {/* Map box — small, fixed width */}
                <div className="lg:w-72 shrink-0 min-h-[200px] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
                  {geoCoords ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${geoCoords.lat},${geoCoords.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block group w-full h-full min-h-[200px]"
                      aria-label="Open hotel location in Google Maps"
                    >
                      <iframe
                        title="Hotel location"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${geoCoords.lon - 0.012},${geoCoords.lat - 0.008},${geoCoords.lon + 0.012},${geoCoords.lat + 0.008}&layer=mapnik&marker=${geoCoords.lat},${geoCoords.lon}`}
                        width="100%"
                        height="100%"
                        style={{ minHeight: '200px', border: 0, pointerEvents: 'none' }}
                        loading="lazy"
                        tabIndex={-1}
                      />
                      <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-colors" />
                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white text-gray-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-md border border-gray-100 group-hover:shadow-lg transition-shadow">
                        <svg className="w-3.5 h-3.5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Maps
                      </div>
                    </a>
                  ) : (
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(`${name} ${city}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center w-full h-full min-h-[200px] bg-gray-50 hover:bg-gray-100 transition-colors gap-3"
                    >
                      <svg className="w-9 h-9 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-xs font-medium text-brand-blue">Open in Google Maps</span>
                    </a>
                  )}
                </div>

              </div>
            )}

            {/* Amenities */}
            <HotelAmenities amenities={amenities} />

            {/* Tonight's Deals — live hourly pricing — blue track */}
            <section className="mt-8 bg-blue-50 rounded-2xl border border-blue-100 p-5">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <div className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <HotelClientLabel translationKey="sections.live" fallback="LIVE" />
                </div>
                <h2 className="font-bold text-gray-900 text-xl sm:text-2xl">
                  <HotelClientLabel translationKey="nav.lastMinute" fallback="Tonight's Deals" />
                </h2>
                <span className="text-xs text-blue-500 bg-white border border-blue-100 px-2.5 py-1 rounded-full font-semibold">
                  <HotelClientLabel translationKey="sections.trackAutomatic" fallback="Track 1 · Automatic" />
                </span>
              </div>
              <RoomsGrid
                rooms={(rooms ?? []) as Room[]}
                breakfastPricePerPerson={breakfastPricePerPerson}
                feeConfig={feeConfig}
                {...hotelBaseProps}
              />
            </section>

            {/* Partner special deals — fixed price, gold track */}
            {partnerDeals.length > 0 && (
              <PartnerDealsSection
                deals={partnerDeals}
                breakfastPricePerPerson={breakfastPricePerPerson}
                feeConfig={feeConfig}
                {...hotelBaseProps}
              />
            )}

            {/* Guest Reviews */}
            <ReviewsSection reviews={reviews} avgRating={avgReviewRating} />

          </div>


        </div>
      </main>

      <Footer />
    </>
  );
}
