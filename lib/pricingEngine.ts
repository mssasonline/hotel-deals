/**
 * SelectedRoom Pricing Engine
 *
 * Three-field pricing model (migration 033):
 *   rooms.base_price  = hotel's current price on their own website → shown as strikethrough (RED)
 *   rooms.min_price   = floor price the hotel will never go below → engine stops here
 *   price_per_night   = computed at runtime: MAX(min_price, base_price × (1 − tier%))
 *
 * Tier discounts applied to base_price, capped at min_price:
 *   12:00 PM – 03:59 PM  →  10% off
 *   04:00 PM – 07:59 PM  →  15% off
 *   08:00 PM – 11:59 PM  →  35% off
 *   12:00 AM – 11:59 AM  →  50% off
 *
 * Use getCurrentTier() → calcLivePrice() for any price shown to end-users.
 * The displayed discount badge = calcActualDiscount(basePrice, livePrice).
 */

// ── Time-of-day tier system ───────────────────────────────────────────────────

export interface PriceTier {
  discountPercent: number;
  label: string;
  nextTierTime: Date;
  nextDiscountPercent: number;
  tierIndex: number;
}

const TIERS: Array<{ hour: number; discount: number; label: string }> = [
  { hour: 0,  discount: 50, label: 'Midnight Deal' },   // 00:00 – 11:59
  { hour: 12, discount: 10, label: 'Early Bird' },       // 12:00 – 15:59
  { hour: 16, discount: 15, label: 'Afternoon Deal' },   // 16:00 – 19:59
  { hour: 20, discount: 35, label: 'Evening Rush' },     // 20:00 – 23:59
];

/** Returns the active price tier based on local time. */
export function getCurrentTier(now: Date = new Date()): PriceTier {
  const hour = now.getHours();

  let idx = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (hour >= TIERS[i].hour) { idx = i; break; }
  }

  const current = TIERS[idx];
  const nextIdx = (idx + 1) % TIERS.length;
  const next    = TIERS[nextIdx];

  const nextTierTime = new Date(now);
  if (nextIdx === 0) {
    nextTierTime.setDate(nextTierTime.getDate() + 1);
    nextTierTime.setHours(0, 0, 0, 0);
  } else {
    nextTierTime.setHours(next.hour, 0, 0, 0);
  }

  return {
    discountPercent:     current.discount,
    label:               current.label,
    nextTierTime,
    nextDiscountPercent: next.discount,
    tierIndex:           idx,
  };
}

/**
 * Compute the live price a customer sees right now.
 * Discounts base_price by the active tier percentage, but never goes below min_price.
 *
 * @param basePrice  rooms.base_price — hotel's website price (the strikethrough)
 * @param minPrice   rooms.min_price  — floor the hotel won't go below
 * @param tier       active time-of-day tier from getCurrentTier()
 */
export function calcLivePrice(basePrice: number, minPrice: number, tier: PriceTier): number {
  if (basePrice <= 0) return 0;
  const discounted = Math.round(basePrice * (1 - tier.discountPercent / 100));
  return minPrice > 0 ? Math.max(discounted, minPrice) : discounted;
}

/**
 * Returns the actual discount percentage shown to the customer.
 * When min_price acts as a floor, the real % is less than the tier %.
 *
 * @param basePrice  rooms.base_price (strikethrough)
 * @param livePrice  result of calcLivePrice()
 */
export function calcActualDiscount(basePrice: number, livePrice: number): number {
  if (basePrice <= 0 || livePrice >= basePrice) return 0;
  return Math.round((1 - livePrice / basePrice) * 100);
}

/** All four tiers with their prices, respecting the min_price floor. */
export function getAllTiers(basePrice: number, minPrice: number = 0) {
  return TIERS.map((t, i) => {
    const discounted = Math.round(basePrice * (1 - t.discount / 100));
    const price = minPrice > 0 ? Math.max(discounted, minPrice) : discounted;
    const actualDiscount = basePrice > 0 ? Math.round((1 - price / basePrice) * 100) : t.discount;
    return {
      label:           t.label,
      hour:            t.hour,
      discountPercent: actualDiscount,
      tierDiscount:    t.discount,
      price,
      tierIndex:       i,
    };
  });
}

export interface RoomPriceResult {
  currentPrice: number;
  basePrice: number;
  pricePerNight: number;
  discountPercent: number;
  savings: number;
}

export interface RoomStayPriceResult extends RoomPriceResult {
  nights: number;
  roomsCount: number;
  subtotal: number;
  taxes: number;
  total: number;
}

/**
 * Compute discount metrics from a live price + base price.
 * Use this for checkout where the live price is already known.
 *
 * @param basePrice   rooms.base_price — original price (strikethrough, RED)
 * @param livePrice   calcLivePrice() result — actual price to pay (GREEN)
 */
export function calcRoomPrice(
  basePrice: number,
  livePrice: number,
): RoomPriceResult {
  const currentPrice = Math.round(Math.max(0, livePrice));
  const discountPercent = calcActualDiscount(basePrice, currentPrice);

  return {
    currentPrice,
    basePrice,
    pricePerNight: currentPrice,
    discountPercent,
    savings: Math.max(0, basePrice - currentPrice),
  };
}

/**
 * Full stay price calculation with country-specific taxes.
 *
 * @param basePrice      rooms.base_price (strikethrough)
 * @param pricePerNight  calcLivePrice() result (the actual nightly price)
 * @param taxVatPct      VAT % from tax_rates table (default 15 for backwards compat)
 * @param fixedFeePerNight  Fixed fee per room per night (e.g. Tourism Dirham)
 */
export function calcRoomStayPrice({
  basePrice,
  pricePerNight,
  nights = 1,
  rooms = 1,
  taxVatPct = 15,
  fixedFeePerNight = 0,
}: {
  basePrice: number;
  pricePerNight: number;
  nights?: number;
  rooms?: number;
  taxVatPct?: number;
  fixedFeePerNight?: number;
}): RoomStayPriceResult {
  const perNight = calcRoomPrice(basePrice, pricePerNight);
  const subtotal = perNight.currentPrice * nights * rooms;
  const vatAmount = Math.round(subtotal * (taxVatPct / 100));
  const fixedFees = Math.round(fixedFeePerNight * nights * rooms);
  const taxes = vatAmount + fixedFees;

  return {
    ...perNight,
    nights,
    roomsCount: rooms,
    subtotal,
    taxes,
    total: subtotal + taxes,
  };
}

/** Count nights between two ISO date strings "YYYY-MM-DD". Minimum 1. */
export function countNightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + 'T12:00:00').getTime();
  const b = new Date(checkOut + 'T12:00:00').getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

// ── Per-night rate calendar ───────────────────────────────────────────────────

export interface NightRate {
  date: string;           // YYYY-MM-DD
  publishedPrice: number; // rate from room_rates table, or base_price fallback
  finalPrice: number;     // publishedPrice after tier discount if tonight, else same
  isTonight: boolean;
  discountPercent: number; // 0 for future nights
}

export interface NightlyStayResult {
  nights: NightRate[];
  subtotal: number;   // sum of finalPrice × roomsCount
  taxes: number;      // 15% of subtotal
  total: number;
  avgPerNight: number;
}

/**
 * Build a per-night rate array for the stay.
 * - ratesMap: { "YYYY-MM-DD": price } — from the room_rates table
 * - basePrice: fallback when a date has no entry in ratesMap
 * - Tonight's rate gets the tier discount (capped at minPrice)
 * - Future nights use the published rate as-is
 */
export function calcNightlyRates(
  checkIn: string,
  checkOut: string,
  basePrice: number,
  minPrice: number,
  tier: PriceTier,
  ratesMap: Record<string, number>,
): NightRate[] {
  const today  = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  const nights: NightRate[] = [];
  const current = new Date(checkIn + 'T12:00:00');
  const end     = new Date(checkOut + 'T12:00:00');

  while (current < end) {
    const dateISO = (() => {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    })();

    const publishedPrice = ratesMap[dateISO] ?? basePrice;
    const isTonight      = dateISO === today;

    let finalPrice      = publishedPrice;
    let discountPercent = 0;

    if (isTonight && publishedPrice > 0) {
      finalPrice      = calcLivePrice(publishedPrice, minPrice, tier);
      discountPercent = calcActualDiscount(publishedPrice, finalPrice);
    }

    nights.push({ date: dateISO, publishedPrice, finalPrice, isTonight, discountPercent });
    current.setDate(current.getDate() + 1);
  }

  return nights.length > 0 ? nights : [{
    date: checkIn,
    publishedPrice: basePrice,
    finalPrice: calcLivePrice(basePrice, minPrice, tier),
    isTonight: checkIn === today,
    discountPercent: calcActualDiscount(basePrice, calcLivePrice(basePrice, minPrice, tier)),
  }];
}

/** Sum up a nightly rate array into subtotal / taxes / total. */
export function calcNightlyStayPrice(
  nights: NightRate[],
  roomsCount: number,
  taxVatPct = 15,
  fixedFeePerNight = 0,
): NightlyStayResult {
  const nightsTotal = nights.reduce((sum, n) => sum + n.finalPrice, 0);
  const subtotal    = Math.round(nightsTotal * roomsCount);
  const vatAmount   = Math.round(subtotal * (taxVatPct / 100));
  const fixedFees   = Math.round(fixedFeePerNight * nights.length * roomsCount);
  const taxes       = vatAmount + fixedFees;
  const total       = subtotal + taxes;
  const avgPerNight = nights.length > 0 ? Math.round(nightsTotal / nights.length) : 0;
  return { nights, subtotal, taxes, total, avgPerNight };
}

// ── Booking window ────────────────────────────────────────────────────────────
// Open:   12:00 PM → 5:59 AM (next day)
// Closed:  6:00 AM → 11:59 AM

/** Returns true when tonight's bookings are open. */
export function isBookingOpen(now: Date = new Date()): boolean {
  const h = now.getHours();
  return h >= 12 || h < 6;
}

/** Minutes until bookings reopen at 12:00 PM. Returns 0 if already open. */
export function minutesUntilOpen(now: Date = new Date()): number {
  if (isBookingOpen(now)) return 0;
  const h = now.getHours();
  const m = now.getMinutes();
  return (12 - h) * 60 - m;
}
