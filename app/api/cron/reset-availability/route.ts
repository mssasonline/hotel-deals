import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Protect with a secret so only authorized callers can trigger the reset.
// Set CRON_SECRET in .env.local and pass it as ?secret=xxx or Authorization: Bearer xxx
const CRON_SECRET = process.env.CRON_SECRET;

async function handler(req: NextRequest) {
  const secret =
    req.nextUrl.searchParams.get('secret') ??
    req.headers.get('authorization')?.replace('Bearer ', '');

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc('reset_daily_room_availability');

  if (error) {
    console.error('[reset-availability]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, resetAt: new Date().toISOString() });
}

// Vercel Cron Jobs send GET requests; POST is kept for manual/external triggers
export { handler as GET, handler as POST };
