import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp, rateLimitHeaders } from '@/lib/rateLimit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LIMIT = 30;       // requests
const WINDOW = 60_000;  // per minute

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`availability:${ip}`, LIMIT, WINDOW);
  if (!rl.allowed) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: rateLimitHeaders(rl, LIMIT) },
    );
  }

  const { searchParams } = new URL(request.url);
  const roomId    = searchParams.get('room_id');
  const checkIn   = searchParams.get('check_in');
  const checkOut  = searchParams.get('check_out');

  if (!roomId || !checkIn || !checkOut) {
    return Response.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('get_room_availability', {
    p_room_id:   roomId,
    p_check_in:  checkIn,
    p_check_out: checkOut,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ available: data as number });
}
