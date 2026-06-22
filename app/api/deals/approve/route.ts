import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendNewDealNotification, type NewDealNotificationData } from '@/lib/emailService';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const dealId    = searchParams.get('id');
  const partnerId = searchParams.get('pid');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://selectedroom.com';
  const dealsPage = `${siteUrl}/partner/deals`;

  if (!dealId || !partnerId) {
    return NextResponse.redirect(`${dealsPage}?deal_error=invalid_link`);
  }

  const admin = createAdminClient();

  // Fetch the deal — verify it belongs to this partner and is still pending
  const { data: deal, error } = await admin
    .from('partner_deals')
    .select('id, partner_id, hotel_id, room_id, deal_price, start_date, end_date, status, rooms(name, base_price), hotels(name)')
    .eq('id', dealId)
    .eq('partner_id', partnerId)
    .maybeSingle();

  if (error || !deal) {
    return NextResponse.redirect(`${dealsPage}?deal_error=not_found`);
  }

  if (deal.status !== 'pending_approval') {
    // Already approved or cancelled — redirect gracefully
    return NextResponse.redirect(`${dealsPage}?deal_approved=already`);
  }

  // Activate the deal
  const { error: updateError } = await admin
    .from('partner_deals')
    .update({ status: 'active' })
    .eq('id', dealId);

  if (updateError) {
    return NextResponse.redirect(`${dealsPage}?deal_error=update_failed`);
  }

  // Fire-and-forget: notify subscribers
  void (async () => {
    try {
      const { data: subs } = await admin
        .from('newsletter_subscribers')
        .select('email')
        .eq('is_active', true);

      if (!subs || subs.length === 0) return;

      const room  = Array.isArray(deal.rooms)  ? deal.rooms[0]  : deal.rooms;
      const hotel = Array.isArray(deal.hotels) ? deal.hotels[0] : deal.hotels;
      if (!room || !hotel) return;

      const basePrice   = Number((room as Record<string, unknown>).base_price ?? 0);
      const dealPrice   = Number(deal.deal_price);
      const discountPct = basePrice > 0
        ? Math.round(((basePrice - dealPrice) / basePrice) * 100)
        : 0;

      const notifications: NewDealNotificationData[] = subs.map((s) => ({
        subscriberEmail: s.email,
        hotelName:       String((hotel as Record<string, unknown>).name ?? ''),
        hotelId:         Number(deal.hotel_id),
        roomName:        String((room as Record<string, unknown>).name ?? ''),
        dealPrice,
        basePrice,
        discountPct,
        endDate:         String(deal.end_date),
      }));

      await sendNewDealNotification(notifications);
    } catch (err) {
      console.error('[deals/approve] subscriber notification error:', err);
    }
  })();

  return NextResponse.redirect(`${dealsPage}?deal_approved=1`);
}
