import { createAdminClient } from '@/lib/supabase-admin';
import { getCommissionRate } from '@/lib/platformSettings';
import ReportsClient, {
  type TrendPoint,
  type TopHotel,
  type TopCity,
  type ReportStats,
  type PartnerRevenueSummary,
} from './ReportsClient';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const supabase = createAdminClient();

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const [rawBookingsRes, hotelsRes, citiesRes, bookingsRes, dashRes, partnerRevRes, commissionRate] = await Promise.all([
    // 12-month paid bookings for trend data
    supabase
      .from('bookings')
      .select('created_at, total_price, booking_revenue(partner_amount, admin_amount)')
      .eq('payment_status', 'paid')
      .neq('status', 'cancelled')
      .gte('created_at', twelveMonthsAgo.toISOString()),
    supabase.rpc('get_top_hotels'),
    supabase.rpc('get_top_cities'),
    supabase.from('bookings').select('status, total_price'),
    supabase.rpc('get_dashboard_stats'),
    supabase.rpc('get_admin_revenue_summary'),
    getCommissionRate(),
  ]);

  // Build 12-month trend from raw bookings
  const trendMap = new Map<string, { revenue: number; booking_count: number; platform_rev: number; partner_payout: number }>();
  for (const b of (rawBookingsRes.data ?? []) as Record<string, unknown>[]) {
    const month = String(b.created_at).slice(0, 7);
    if (!trendMap.has(month)) {
      trendMap.set(month, { revenue: 0, booking_count: 0, platform_rev: 0, partner_payout: 0 });
    }
    const entry = trendMap.get(month)!;
    const total = Number(b.total_price ?? 0);
    const rev = (Array.isArray(b.booking_revenue) ? b.booking_revenue[0] : b.booking_revenue) as
      { partner_amount: number; admin_amount: number } | null;
    entry.revenue        += total;
    entry.booking_count  += 1;
    entry.platform_rev   += Number(rev?.admin_amount   ?? total * 0.1);
    entry.partner_payout += Number(rev?.partner_amount ?? total * 0.9);
  }

  // Fill all 12 months (zero-fill empty months)
  const trend: TrendPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const ym = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const data = trendMap.get(ym) ?? { revenue: 0, booking_count: 0, platform_rev: 0, partner_payout: 0 };
    trend.push({
      month:          label,
      revenue:        Math.round(data.revenue),
      booking_count:  data.booking_count,
      platform_rev:   Math.round(data.platform_rev),
      partner_payout: Math.round(data.partner_payout),
    });
  }

  const topHotels: TopHotel[] = ((hotelsRes.data ?? []) as TopHotel[]).map((h) => ({
    id: h.id, name: h.name, city: h.city,
    booking_count: Number(h.booking_count),
    revenue:       Number(h.revenue),
  }));

  const topCities: TopCity[] = ((citiesRes.data ?? []) as TopCity[]).map((c) => ({
    city: c.city,
    booking_count: Number(c.booking_count),
    revenue:       Number(c.revenue),
  }));

  const allBookings = bookingsRes.data ?? [];
  const totalBookings = allBookings.length;
  const cancelled = allBookings.filter((b) => b.status === 'cancelled').length;
  const cancelRate = totalBookings > 0
    ? Number(((cancelled / totalBookings) * 100).toFixed(1))
    : 0;

  const dash = (dashRes.data as { total_revenue: number; growth_pct: number }[] | null)?.[0];

  const stats: ReportStats = {
    total_revenue:     Number(dash?.total_revenue ?? 0),
    growth_pct:        Number(dash?.growth_pct    ?? 0),
    cancel_rate:       cancelRate,
    total_bookings:    totalBookings,
  };

  const partnerRevenue: PartnerRevenueSummary[] = ((partnerRevRes.data ?? []) as PartnerRevenueSummary[]).map(r => ({
    partner_id:       String(r.partner_id),
    partner_name:     String(r.partner_name),
    partner_email:    String(r.partner_email),
    hotel_count:      Number(r.hotel_count),
    booking_count:    Number(r.booking_count),
    gross_revenue:    Number(r.gross_revenue),
    subtotal:         Number(r.subtotal      ?? 0),
    tax_collected:    Number(r.tax_collected ?? 0),
    partner_payout:   Number(r.partner_payout),
    admin_commission: Number(r.admin_commission),
  }));

  return (
    <ReportsClient
      stats={stats}
      trend={trend}
      topHotels={topHotels}
      topCities={topCities}
      partnerRevenue={partnerRevenue}
      commissionRate={commissionRate}
    />
  );
}
