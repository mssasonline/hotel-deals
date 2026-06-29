import { createAdminClient } from '@/lib/supabase-admin';
import DashboardClient, {
  type DashboardStats,
  type RevenueTrendPoint,
  type RecentBookingRow,
} from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const [
    statsRes, trendRes, recentRes,
    lastMinRes, hotelDealsRes,
    checkinsRes, checkoutsRes, pendingRes,
  ] = await Promise.all([
    supabase.rpc('get_dashboard_stats'),
    supabase.rpc('get_revenue_trend'),
    supabase
      .from('bookings')
      .select('id, guest_name, status, check_in, check_out, total_price, created_at, hotels(name)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('rooms')
      .select('id', { count: 'exact', head: true })
      .gt('base_price', 0),
    supabase
      .from('partner_deals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('end_date', today),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('check_in', today)
      .neq('status', 'cancelled'),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('check_out', today)
      .neq('status', 'cancelled'),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('payment_status', 'pending'),
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

  return (
    <DashboardClient
      stats={stats}
      revenueTrend={revenueTrend}
      recentBookings={(recentRes.data ?? []) as RecentBookingRow[]}
      lastMinRoomsCount={lastMinRes.count ?? 0}
      hotelDealsCount={hotelDealsRes.count ?? 0}
      checkinsToday={checkinsRes.count ?? 0}
      checkoutsToday={checkoutsRes.count ?? 0}
      pendingCount={pendingRes.count ?? 0}
    />
  );
}
