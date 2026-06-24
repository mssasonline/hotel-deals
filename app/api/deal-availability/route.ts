import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp, rateLimitHeaders } from '@/lib/rateLimit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LIMIT  = 30;
const WINDOW = 60_000;

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`deal-avail:${ip}`, LIMIT, WINDOW);
  if (!rl.allowed) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: rateLimitHeaders(rl, LIMIT) },
    );
  }

  const { searchParams } = new URL(request.url);
  const dealId   = searchParams.get('deal_id');
  const checkIn  = searchParams.get('check_in');
  const checkOut = searchParams.get('check_out');

  if (!dealId || !checkIn || !checkOut) {
    return Response.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('get_deal_availability', {
    p_deal_id:   dealId,
    p_check_in:  checkIn,
    p_check_out: checkOut,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ available: data as number });
}
