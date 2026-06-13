import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/room-rates?room_id=X&check_in=YYYY-MM-DD&check_out=YYYY-MM-DD
 *
 * Returns a map of { "YYYY-MM-DD": price } for every date in the stay range
 * that has a custom rate in room_rates. Dates without a row are omitted —
 * the client falls back to rooms.base_price for those.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const roomId   = searchParams.get('room_id');
  const checkIn  = searchParams.get('check_in');
  const checkOut = searchParams.get('check_out');

  if (!roomId || !checkIn || !checkOut) {
    return NextResponse.json({ error: 'room_id, check_in, check_out required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('room_rates')
    .select('date, price')
    .eq('room_id', roomId)
    .gte('date', checkIn)
    .lt('date', checkOut)
    .order('date');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rates: Record<string, number> = {};
  for (const row of data ?? []) {
    rates[row.date] = Number(row.price);
  }

  return NextResponse.json(rates);
}
