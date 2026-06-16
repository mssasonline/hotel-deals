/**
 * Shared canonical types for Supabase booking/room queries.
 * Import from here instead of defining local booking/room types per file.
 */

export interface DestinationCity {
  id: number;
  name: string;
  country: string;
  deals_count: number;
  gradient: string;
  emoji: string;
  sort_order: number;
  active: boolean;
}

export type Room = {
  id: number;
  name: string;
};

export type Booking = {
  id: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  status: string;
  payment_status: string;
  /** Always in AED — the platform's base currency. */
  total_price: number;
  subtotal: number | null;
  /** Partner's share of total_price in AED (set when payment is settled). */
  partner_amount?: number | null;
  /** Platform's commission share in AED (set when payment is settled). */
  admin_amount?: number | null;
  /** ISO currency code the guest paid in (e.g. 'eur', 'usd'). Defaults to 'aed'. */
  charged_currency: string;
  /** AED → charged_currency rate locked at booking time. charged_amount = total_price × this. */
  locked_exchange_rate: number;
  created_at: string;
  rooms: { name: string } | null;
};

/**
 * Raw shape Supabase returns for a booking row with a rooms join.
 * Supabase infers the join as an array; use normalizeBooking() to convert.
 */
export type RawBookingRow = Omit<Booking, 'rooms'> & {
  rooms: { name: string }[] | { name: string } | null;
};

/** Collapse Supabase's array-or-object rooms join into the canonical single-object shape. */
export function normalizeBooking(row: RawBookingRow): Booking {
  const r = row.rooms;
  return {
    ...row,
    rooms: Array.isArray(r) ? (r[0] ?? null) : (r ?? null),
  };
}
