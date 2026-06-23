import Header from "./components/Header";
import HeroSection from "./components/HeroSection";
import StatsBar from "./components/StatsBar";
import DualTrackNav from "./components/DualTrackNav";
import LiveDealsSection from "./components/LiveDealsSection";
import SpecialDealsPreview, { type SpecialDealPreviewItem } from "./components/SpecialDealsPreview";
import HowItWorks from "./components/HowItWorks";
import WhyChooseUs from "./components/WhyChooseUs";
import Footer from "./components/Footer";
import HashScroller from "./components/HashScroller";
import type { Hotel } from "./components/HotelCard";
import { supabase } from "@/lib/supabase";
import { getDealStatus } from "@/lib/dealsEngine";

export const dynamic = "force-dynamic";

const DEFAULT_GRADIENTS = [
  "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
  "linear-gradient(135deg, #373b44 0%, #4286f4 100%)",
  "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
  "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
  "linear-gradient(135deg, #c79832 0%, #f7971e 60%, #ffd200 100%)",
  "linear-gradient(135deg, #1a3a4a 0%, #2d6986 100%)",
];

type SupabaseHotel = Record<string, unknown>;
type RawHotelImage = { image_url: string; sort_order: number };

function resolveImageUrl(row: SupabaseHotel): string | null {
  const rawImages = Array.isArray(row.hotel_images)
    ? (row.hotel_images as RawHotelImage[])
    : [];
  const sorted = rawImages
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  if (sorted.length > 0 && sorted[0].image_url) return String(sorted[0].image_url);
  if (row.image_url) return String(row.image_url);
  return null;
}

type RawRoom = { id?: string; base_price?: number; min_price?: number; min_price_weekend?: number; quantity_available?: number; quantity_total?: number };

function mapToHotel(row: SupabaseHotel, index: number, todayRate?: number, isTodayWeekend?: boolean): Hotel {
  const countdownHours = Number(row.countdown_hours ?? 8);
  const status = getDealStatus(countdownHours);

  const rawRooms = Array.isArray(row.rooms) ? (row.rooms as RawRoom[]) : [];
  const cheapestRoom = rawRooms.length > 0
    ? rawRooms.reduce((best, r) => {
        const a = Number(r.base_price ?? 0);
        const b = Number(best.base_price ?? 0);
        return a > 0 && (b === 0 || a < b) ? r : best;
      }, rawRooms[0])
    : null;
  const staticBase = cheapestRoom ? Number(cheapestRoom.base_price ?? 0) : 0;
  const basePrice  = todayRate ?? staticBase;
  const minPrice   = (() => {
    if (!cheapestRoom) return 0;
    if (isTodayWeekend && Number(cheapestRoom.min_price_weekend) > 0) {
      return Number(cheapestRoom.min_price_weekend);
    }
    return Number(cheapestRoom.min_price ?? Math.round(staticBase * 0.6));
  })();
  const roomsLeft = cheapestRoom
    ? Number(cheapestRoom.quantity_available ?? cheapestRoom.quantity_total ?? row.rooms_left ?? 5)
    : Number(row.rooms_left ?? 5);

  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    location: String(row.city ?? row.location ?? ""),
    gradient: String(row.gradient ?? DEFAULT_GRADIENTS[index % DEFAULT_GRADIENTS.length]),
    category: String(row.category ?? "Hotel"),
    stars: Number(row.stars ?? row.star_rating ?? Math.round(Number(row.rating ?? 4))),
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    basePrice,
    minPrice,
    tonightOnly: status === "HIGH_DEMAND" || status === "CRITICAL",
    roomsLeft,
    countdownHours,
    imageUrl: resolveImageUrl(row),
  };
}

function localDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function fetchHotels(): Promise<Hotel[]> {
  const { data, error } = await supabase
    .from("hotels")
    .select("*, hotel_images(image_url, sort_order), rooms(id, base_price, min_price, min_price_weekend, quantity_available, quantity_total)")
    .eq("is_active", true)
    .order("id");

  if (error || !data) return [];

  // Collect cheapest room IDs to look up today's calendar rates
  const cheapestRoomIds: string[] = [];
  const hotelCheapestRoom = new Map<number, string>();
  for (const row of data) {
    const rawRooms = Array.isArray(row.rooms) ? (row.rooms as RawRoom[]) : [];
    const cheapest = rawRooms.reduce<RawRoom | null>((best, r) => {
      const a = Number(r.base_price ?? 0);
      const b = Number(best?.base_price ?? 0);
      return a > 0 && (b === 0 || a < b) ? r : best;
    }, null);
    if (cheapest?.id) {
      cheapestRoomIds.push(cheapest.id);
      hotelCheapestRoom.set(Number(row.id), cheapest.id);
    }
  }

  const today = localDateStr();
  const todayRates: Record<string, number> = {};
  if (cheapestRoomIds.length > 0) {
    const { data: rates } = await supabase
      .from("room_rates")
      .select("room_id, price")
      .eq("date", today)
      .in("room_id", cheapestRoomIds);
    for (const r of rates ?? []) todayRates[String(r.room_id)] = Number(r.price);
  }

  const todayDow = new Date().getDay();
  const isTodayWeekend = todayDow === 5 || todayDow === 6 || todayDow === 0;

  return data.map((row: SupabaseHotel, i: number) => {
    const roomId    = hotelCheapestRoom.get(Number(row.id));
    const todayRate = roomId ? todayRates[roomId] : undefined;
    return mapToHotel(row, i, todayRate, isTodayWeekend);
  });
}

async function fetchSpecialDealsPreview(): Promise<SpecialDealPreviewItem[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("partner_deals")
    .select("deal_price, end_date, hotels!inner(id, name, city, star_rating, rating, hotel_images(image_url, sort_order)), rooms(base_price)")
    .eq("status", "active")
    .gte("end_date", today)
    .limit(6);

  if (error || !data) return [];

  // Group by hotel, pick best deal
  const map = new Map<number, SpecialDealPreviewItem>();

  for (const row of data) {
    const hotel = Array.isArray(row.hotels) ? row.hotels[0] : row.hotels;
    const room  = Array.isArray(row.rooms)  ? row.rooms[0]  : row.rooms;
    if (!hotel || !room) continue;

    const hotelId   = Number(hotel.id);
    const dealPrice = Number(row.deal_price);
    const basePrice = Number(room.base_price ?? 0);
    const discPct   = basePrice > 0 ? Math.round((1 - dealPrice / basePrice) * 100) : 0;

    const rawImages = Array.isArray(hotel.hotel_images) ? hotel.hotel_images : [];
    const sorted = (rawImages as RawHotelImage[]).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const imageUrl = sorted.length > 0 ? String(sorted[0].image_url ?? "") : null;

    if (map.has(hotelId)) {
      const ex = map.get(hotelId)!;
      ex.dealCount++;
      if (dealPrice < ex.dealPrice) {
        ex.dealPrice    = dealPrice;
        ex.basePrice    = basePrice;
        ex.discountPct  = discPct;
      }
    } else {
      map.set(hotelId, {
        hotelId,
        hotelName:   String(hotel.name ?? ""),
        city:        String(hotel.city ?? ""),
        imageUrl,
        dealPrice,
        basePrice,
        discountPct: discPct,
        dealCount:   1,
        endDate:     String(row.end_date),
        stars:       Number((hotel as Record<string, unknown>).star_rating ?? 0),
        rating:      Number((hotel as Record<string, unknown>).rating ?? 0),
      });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.discountPct - a.discountPct)
    .slice(0, 3);
}

export default async function Home() {
  const [hotels, specialDeals] = await Promise.all([
    fetchHotels(),
    fetchSpecialDealsPreview(),
  ]);

  return (
    <>
      <Header />
      <HashScroller />
      <main className="flex-1">
        {/* 1. Hero — search always visible */}
        <HeroSection />

        {/* 2. Trust signals */}
        <StatsBar />

        {/* 3. Two-track navigation — makes the two systems immediately clear */}
        <DualTrackNav />

        {/* 4. MAIN TRACK: live time-based pricing with tier timeline + carousel */}
        <LiveDealsSection hotels={hotels} />

        {/* 5. SECONDARY TRACK: partner special deals */}
        <SpecialDealsPreview deals={specialDeals} />

        {/* 6. How it works (moved after deals so users see value first) */}
        <HowItWorks />

        {/* 7. Why choose us */}
        <WhyChooseUs />
      </main>
      <Footer />
    </>
  );
}
