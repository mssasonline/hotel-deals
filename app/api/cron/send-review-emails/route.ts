import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendReviewRequestEmail } from '@/lib/emailService';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://selectedroom.com';

export async function POST(req: NextRequest) {
  const secret =
    req.nextUrl.searchParams.get('secret') ??
    req.headers.get('authorization')?.replace('Bearer ', '');

  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Yesterday's date in YYYY-MM-DD format
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Find completed bookings checked out yesterday with no review yet
  const { data: bookings, error: bookingsError } = await admin
    .from('bookings')
    .select(`
      id,
      user_id,
      hotel_id,
      check_out,
      hotels ( name ),
      reviews ( id )
    `)
    .eq('check_out', yesterdayStr)
    .neq('status', 'cancelled')
    .is('reviews.id', null);

  if (bookingsError) {
    console.error('[send-review-emails] bookings query failed:', bookingsError.message);
    return NextResponse.json({ error: bookingsError.message }, { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, date: yesterdayStr });
  }

  // Collect unique user IDs
  const userIds = [...new Set(bookings.map((b) => b.user_id).filter(Boolean))] as string[];

  // Fetch guest emails + names from auth.users via admin API
  const userMap = new Map<string, { email: string; name: string }>();
  for (const uid of userIds) {
    const { data: authUser } = await admin.auth.admin.getUserById(uid);
    if (authUser?.user) {
      const email = authUser.user.email ?? '';
      const name =
        (authUser.user.user_metadata?.full_name as string | undefined) ??
        email.split('@')[0] ??
        'Guest';
      userMap.set(uid, { email, name });
    }
  }

  let sent = 0;
  const errors: string[] = [];

  for (const booking of bookings) {
    const guest = booking.user_id ? userMap.get(booking.user_id) : null;
    if (!guest?.email) continue;

    const hotelName =
      (booking.hotels as { name?: string } | null)?.name ?? 'your hotel';

    try {
      await sendReviewRequestEmail({
        guestName:  guest.name,
        guestEmail: guest.email,
        hotelName,
        checkOut:   yesterdayStr,
        reviewUrl:  `${APP_URL}/review/${booking.id}`,
      });
      sent++;
    } catch (err) {
      errors.push(`booking ${booking.id}: ${String(err)}`);
    }
  }

  console.log(`[send-review-emails] date=${yesterdayStr} sent=${sent} errors=${errors.length}`);
  return NextResponse.json({ ok: true, sent, errors, date: yesterdayStr });
}
