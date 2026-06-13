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
  total_price: number;
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
