import { createAdminClient } from '@/lib/supabase-admin';
import PartnersClient, { type Partner, type PartnerHotel } from './PartnersClient';

export const dynamic = 'force-dynamic';

export default async function PartnersPage() {
  const supabase = createAdminClient();

  // 1. Partner profiles (no nested join — avoids missing FK between hotel_partners and profiles)
  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, status, created_at')
    .eq('role', 'partner')
    .order('created_at', { ascending: false });

  // 2. All hotels (for the assign-hotel dropdown)
  const { data: hotelsRaw } = await supabase
    .from('hotels')
    .select('id, name, city')
    .order('name');

  // 3. Hotel assignments for these partners
  const partnerIds = (profilesRaw ?? []).map((p: { id: string }) => p.id);
  const { data: hpRaw } = partnerIds.length > 0
    ? await supabase
        .from('hotel_partners')
        .select('user_id, hotel_id, hotels(id, name, city)')
        .in('user_id', partnerIds)
    : { data: [] };

  // 4. Partner stats
  const { data: statsRaw } = await supabase.rpc('get_partner_stats');

  // ── Build lookups ──────────────────────────────────────────────────────────

  type StatRow = { user_id: string; hotel_count: number; booking_count: number; total_revenue: number };
  const statsMap = new Map<string, StatRow>(
    ((statsRaw ?? []) as StatRow[]).map((s) => [s.user_id, s])
  );

  type HpRow = {
    user_id: string;
    hotel_id: number;
    hotels: { id: number; name: string; city: string } | null;
  };
  const hotelsByPartner = new Map<string, PartnerHotel[]>();
  for (const row of (hpRaw ?? []) as unknown as HpRow[]) {
    if (!row.hotels) continue;
    const list = hotelsByPartner.get(row.user_id) ?? [];
    list.push({ id: row.hotels.id, name: row.hotels.name, city: row.hotels.city });
    hotelsByPartner.set(row.user_id, list);
  }

  // ── Normalise ──────────────────────────────────────────────────────────────

  type ProfileRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    status: string | null;
    created_at: string;
  };

  const partners: Partner[] = ((profilesRaw ?? []) as ProfileRow[]).map((p) => {
    const stats = statsMap.get(p.id);
    return {
      id:            p.id,
      full_name:     p.full_name ?? 'Unnamed Partner',
      email:         p.email ?? '',
      avatar_url:    p.avatar_url,
      status:        p.status === 'suspended' ? 'suspended' : 'active',
      created_at:    p.created_at,
      hotels:        hotelsByPartner.get(p.id) ?? [],
      booking_count: Number(stats?.booking_count ?? 0),
      total_revenue: Number(stats?.total_revenue ?? 0),
    };
  });

  const allHotels: PartnerHotel[] = ((hotelsRaw ?? []) as { id: number; name: string; city: string }[]).map((h) => ({
    id:   h.id,
    name: h.name,
    city: h.city,
  }));

  return <PartnersClient initialPartners={partners} allHotels={allHotels} />;
}
