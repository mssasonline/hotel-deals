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

  const [trendRes, hotelsRes, citiesRes, bookingsRes, dashRes, partnerRevRes, commissionRate] = await Promise.all([
    supabase.rpc('get_monthly_trend'),
    supabase.rpc('get_top_hotels'),
    supabase.rpc('get_top_cities'),
    supabase.from('bookings').select('status, total_price'),
    supabase.rpc('get_dashboard_stats'),
    supabase.rpc('get_admin_revenue_summary'),
    getCommissionRate(),
  ]);

  // ── Trend ────────────────────────────────────────────────────
  const trend: TrendPoint[] = ((trendRes.data ?? []) as TrendPoint[]).map((r) => ({
    month:         r.month,
    revenue:       Number(r.revenue),
    booking_count: Number(r.booking_count),
  }));

  // ── Top Hotels ───────────────────────────────────────────────
  const topHotels: TopHotel[] = ((hotelsRes.data ?? []) as TopHotel[]).map((h) => ({
    id:            h.id,
    name:          h.name,
    city:          h.city,
    booking_count: Number(h.booking_count),
    revenue:       Number(h.revenue),
  }));

  // ── Top Cities ───────────────────────────────────────────────
  const topCities: TopCity[] = ((citiesRes.data ?? []) as TopCity[]).map((c) => ({
    city:          c.city,
    booking_count: Number(c.booking_count),
    revenue:       Number(c.revenue),
  }));

  // ── Booking stats (inline) ───────────────────────────────────
  const allBookings = bookingsRes.data ?? [];
  const totalBookings = allBookings.length;
  const cancelled = allBookings.filter((b) => b.status === 'cancelled').length;
  const cancelRate = totalBookings > 0
    ? Number(((cancelled / totalBookings) * 100).toFixed(1))
    : 0;

  const active = allBookings.filter((b) => b.status !== 'cancelled');
  const avgBookingValue = active.length > 0
    ? Math.round(active.reduce((s, b) => s + Number(b.total_price ?? 0), 0) / active.length)
    : 0;

  const statusCounts: Record<string, number> = {};
  for (const b of allBookings) {
    statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1;
  }

  // ── Dashboard KPIs ───────────────────────────────────────────
  const dash = (dashRes.data as { total_revenue: number; growth_pct: number }[] | null)?.[0];

  const stats: ReportStats = {
    total_revenue:     Number(dash?.total_revenue ?? 0),
    growth_pct:        Number(dash?.growth_pct    ?? 0),
    cancel_rate:       cancelRate,
    avg_booking_value: avgBookingValue,
    total_bookings:    totalBookings,
    status_counts:     statusCounts,
  };

  const partnerRevenue: PartnerRevenueSummary[] = ((partnerRevRes.data ?? []) as PartnerRevenueSummary[]).map(r => ({
    partner_id:       String(r.partner_id),
    partner_name:     String(r.partner_name),
    partner_email:    String(r.partner_email),
    hotel_count:      Number(r.hotel_count),
    booking_count:    Number(r.booking_count),
    gross_revenue:    Number(r.gross_revenue),
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
