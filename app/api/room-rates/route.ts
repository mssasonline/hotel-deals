import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rateLimit, getClientIp, rateLimitHeaders } from '@/lib/rateLimit';

const LIMIT = 30;       // requests
const WINDOW = 60_000;  // per minute

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`room-rates:${ip}`, LIMIT, WINDOW);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: rateLimitHeaders(rl, LIMIT) },
    );
  }

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
