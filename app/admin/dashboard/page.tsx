import { createAdminClient } from '@/lib/supabase-admin';
import DashboardClient, {
  type DashboardStats,
  type RevenueTrendPoint,
  type TopCity,
  type RecentBookingRow,
} from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  const [statsRes, trendRes, citiesRes, recentRes, lastMinRes, hotelDealsRes] = await Promise.all([
    supabase.rpc('get_dashboard_stats'),
    supabase.rpc('get_revenue_trend'),
    supabase.rpc('get_top_cities'),
    supabase
      .from('bookings')
      .select('id, guest_name, status, total_price, created_at, hotels(name)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('rooms')
      .select('id', { count: 'exact', head: true })
      .gt('base_price', 0),
    supabase
      .from('partner_deals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString().split('T')[0]),
  ]);

  const statsRow = (statsRes.data as DashboardStats[] | null)?.[0];
  const stats: DashboardStats = statsRow ?? {
    total_hotels: 0, total_partners: 0, total_users: 0, total_bookings: 0,
    total_revenue: 0, revenue_today: 0, active_deals: 0, growth_pct: 0,
  };

  const revenueTrend: RevenueTrendPoint[] = ((trendRes.data ?? []) as RevenueTrendPoint[]).map((r) => ({
    month: r.month,
    revenue: Number(r.revenue),
  }));

  const topCities: TopCity[] = ((citiesRes.data ?? []) as TopCity[]).map((c) => ({
    city: c.city,
    booking_count: Number(c.booking_count),
    revenue: Number(c.revenue),
  }));

  const recentBookings    = (recentRes.data ?? []) as RecentBookingRow[];
  const lastMinRoomsCount = lastMinRes.count ?? 0;
  const hotelDealsCount   = hotelDealsRes.count ?? 0;

  return (
    <DashboardClient
      stats={stats}
      revenueTrend={revenueTrend}
      topCities={topCities}
      recentBookings={recentBookings}
      lastMinRoomsCount={lastMinRoomsCount}
      hotelDealsCount={hotelDealsCount}
    />
  );
}
