export interface LastMinutePriceResult {
  displayPrice: number;
  originalPrice: number;
  discountPercent: number;
  isLastMinute: boolean;
  urgencyLabel: string;
  daysUntilCheckin: number;
}

export interface FinalPriceInput {
  basePrice: number;
  checkInDate: string;
  checkOutDate?: string;
  guests?: number;
  rooms?: number;
}

export interface FinalPriceResult extends LastMinutePriceResult {
  savings: number;
  nights: number;
  roomsCount: number;
  subtotal: number;
  taxes: number;
  total: number;
}

export function getDaysUntilCheckin(checkinDate: string): number {
  if (!checkinDate) return 0;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkin = new Date(checkinDate);
    if (isNaN(checkin.getTime())) return 0;
    checkin.setHours(0, 0, 0, 0);
    const diffMs = checkin.getTime() - today.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

/**
 * Returns discount factor and label for a given number of days until check-in.
 * urgencyFactor: 1.0 = no discount, 0.5 = 50% off
 */
function getCheckinUrgency(days: number): {
  factor: number;
  urgencyLabel: string;
  isLastMinute: boolean;
} {
  if (days === 0) return { factor: 0.5,  urgencyLabel: 'Tonight Only',   isLastMinute: true  };
  if (days === 1) return { factor: 0.70, urgencyLabel: 'Tomorrow Deal',  isLastMinute: true  };
  if (days <= 3)  return { factor: 0.85, urgencyLabel: 'Last Minute',    isLastMinute: true  };
  return              { factor: 1.0,  urgencyLabel: '',                isLastMinute: false };
}

/**
 * Calculates the displayed selling price based on how close the check-in date is.
 * Price NEVER goes below the hotel's floor (40% of original, min $30).
 * @param basePrice  - hotel rack rate (originalPrice from DB)
 * @param checkinDate - ISO date string "YYYY-MM-DD" or empty (= tonight)
 */
export function calcLastMinutePrice(
  basePrice: number,
  checkinDate: string,
): LastMinutePriceResult {
  const days = getDaysUntilCheckin(checkinDate);
  const { factor, urgencyLabel } = getCheckinUrgency(days);

  // Floor = 40% of rack rate, never below $30
  const floorPrice = Math.max(Math.round(basePrice * 0.4), 30);

  const rawPrice = Math.round(basePrice * factor);
  const displayPrice = Math.max(rawPrice, floorPrice);

  const discountPercent =
    basePrice > displayPrice
      ? Math.round((1 - displayPrice / basePrice) * 100)
      : 0;

  return {
    displayPrice,
    originalPrice: basePrice,
    discountPercent,
    isLastMinute: discountPercent > 0,
    urgencyLabel,
    daysUntilCheckin: days,
  };
}

/**
 * Returns the raw urgency discount factor (1.0 = no discount, 0.5 = 50% off)
 * for a given check-in date. Used to apply the same factor to room-level prices.
 */
export function getUrgencyFactor(checkInDate: string): number {
  const days = getDaysUntilCheckin(checkInDate);
  return getCheckinUrgency(days).factor;
}

/**
 * Applies a discount factor to a price while honouring the 40%-floor rule.
 * Use this to discount room prices with the same factor as the hotel base price.
 */
export function applyDiscount(price: number, factor: number): number {
  const floor = Math.max(Math.round(price * 0.4), 30);
  return Math.max(Math.round(price * factor), floor);
}

/**
 * Single entry-point for all pricing in the app.
 * Computes per-night price + full stay totals (subtotal, taxes, grand total).
 * All components should call this instead of rolling their own calculations.
 */
export function calcFinalPrice({
  basePrice,
  checkInDate,
  checkOutDate,
  rooms = 1,
}: FinalPriceInput): FinalPriceResult {
  const perNight = calcLastMinutePrice(basePrice, checkInDate);

  const nights =
    checkInDate && checkOutDate
      ? Math.max(
          1,
          Math.round(
            (new Date(checkOutDate + 'T12:00:00').getTime() -
              new Date(checkInDate + 'T12:00:00').getTime()) /
              86_400_000,
          ),
        )
      : 1;

  const subtotal = perNight.displayPrice * nights * rooms;
  const taxes = Math.round(subtotal * 0.15);

  return {
    ...perNight,
    savings: perNight.originalPrice - perNight.displayPrice,
    nights,
    roomsCount: rooms,
    subtotal,
    taxes,
    total: subtotal + taxes,
  };
}
