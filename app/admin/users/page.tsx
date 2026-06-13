import { createAdminClient } from '@/lib/supabase-admin';
import UsersClient, { type AdminUser } from './UsersClient';

export const dynamic = 'force-dynamic';

type StatRow = {
  user_id: string;
  booking_count: number;
  total_spent: number;
  last_booking: string | null;
};

export default async function UsersPage() {
  const supabase = createAdminClient();

  const [profilesRes, statsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, status, created_at')
      .or('role.eq.user,role.is.null')
      .order('created_at', { ascending: false }),
    supabase.rpc('get_user_stats'),
  ]);

  if (profilesRes.error) {
    console.error('[admin/users] profiles query failed:', profilesRes.error.message);
  }
  if (statsRes.error) {
    console.error('[admin/users] get_user_stats failed:', statsRes.error.message);
  }

  const statsMap = new Map<string, StatRow>(
    ((statsRes.data ?? []) as StatRow[]).map((s) => [s.user_id, s]),
  );

  const users: AdminUser[] = (profilesRes.data ?? []).map((p) => {
    const stats = statsMap.get(p.id);
    return {
      id: p.id,
      name: p.full_name || p.email?.split('@')[0] || 'Unknown',
      email: p.email ?? '',
      country: '',
      totalBookings: Number(stats?.booking_count ?? 0),
      totalSpent: Number(stats?.total_spent ?? 0),
      lastBooking: stats?.last_booking ?? null,
      joinedAt: p.created_at,
      status: (p.status ?? 'active') as 'active' | 'suspended',
    };
  });

  return <UsersClient initialUsers={users} />;
}
