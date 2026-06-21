'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

async function assertAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('Access denied');
  return user;
}

// ─── Payout management (admin only) ──────────────────────────────────────────

export type AdminMonthlyPayout = {
  id:              number;
  partner_user_id: string;
  partner_name:    string;
  partner_email:   string;
  hotel_id:        number | null;
  hotel_name:      string | null;
  period_year:     number;
  period_month:    number;
  gross_amount:    number;
  commission:      number;
  net_amount:      number;
  status:          'pending' | 'paid' | 'confirmed';
  transfer_ref:    string | null;
  paid_at:         string | null;
  confirmed_at:    string | null;
  notes:           string | null;
  // bank details
  bank_name:       string | null;
  account_holder:  string | null;
  iban:            string | null;
  swift_bic:       string | null;
  bank_country:    string | null;
};

export async function getAdminPayouts(): Promise<AdminMonthlyPayout[]> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data } = await admin
    .from('monthly_payouts')
    .select(`
      id, partner_user_id, hotel_id, period_year, period_month,
      gross_amount, commission, net_amount,
      status, transfer_ref, paid_at, confirmed_at, notes,
      hotels ( name )
    `)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });

  if (!data?.length) return [];

  // Fetch profiles + payout bank details
  const userIds = [...new Set(data.map((r: Record<string, unknown>) => r.partner_user_id as string))];
  const [{ data: profiles }, { data: bankRows }] = await Promise.all([
    admin.from('profiles').select('id, full_name, email').in('id', userIds),
    admin.from('partner_payout_details')
      .select('user_id, bank_name, account_holder, iban, swift_bic, bank_country')
      .in('user_id', userIds),
  ]);

  const profileMap = new Map<string, { name: string; email: string }>();
  for (const p of (profiles ?? []) as { id: string; full_name: string | null; email: string | null }[]) {
    profileMap.set(p.id, { name: p.full_name || p.email || p.id, email: p.email || '' });
  }

  const bankMap = new Map<string, { bank_name: string | null; account_holder: string | null; iban: string | null; swift_bic: string | null; bank_country: string | null }>();
  for (const b of (bankRows ?? []) as { user_id: string; bank_name: string | null; account_holder: string | null; iban: string | null; swift_bic: string | null; bank_country: string | null }[]) {
    bankMap.set(b.user_id, b);
  }

  return (data as Record<string, unknown>[]).map((r) => {
    const uid = r.partner_user_id as string;
    const prof = profileMap.get(uid);
    const bank = bankMap.get(uid);
    const hotel = (Array.isArray(r.hotels) ? r.hotels[0] : r.hotels) as { name: string } | null;
    return {
      id:              r.id as number,
      partner_user_id: uid,
      partner_name:    prof?.name ?? uid,
      partner_email:   prof?.email ?? '',
      hotel_id:        r.hotel_id as number | null,
      hotel_name:      hotel?.name ?? null,
      period_year:     r.period_year as number,
      period_month:    r.period_month as number,
      gross_amount:    Number(r.gross_amount),
      commission:      Number(r.commission),
      net_amount:      Number(r.net_amount),
      status:          r.status as AdminMonthlyPayout['status'],
      transfer_ref:    r.transfer_ref as string | null,
      paid_at:         r.paid_at as string | null,
      confirmed_at:    r.confirmed_at as string | null,
      notes:           r.notes as string | null,
      bank_name:       bank?.bank_name ?? null,
      account_holder:  bank?.account_holder ?? null,
      iban:            bank?.iban ?? null,
      swift_bic:       bank?.swift_bic ?? null,
      bank_country:    bank?.bank_country ?? null,
    };
  });
}

export async function createMonthlyPayout(fields: {
  partner_user_id: string;
  hotel_id:        number | null;
  period_year:     number;
  period_month:    number;
  gross_amount:    number;
  commission:      number;
  net_amount:      number;
  notes?:          string;
}): Promise<{ id: number | null; error: string | null }> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('monthly_payouts')
    .insert({
      partner_user_id: fields.partner_user_id,
      hotel_id:        fields.hotel_id,
      period_year:     fields.period_year,
      period_month:    fields.period_month,
      gross_amount:    fields.gross_amount,
      commission:      fields.commission,
      net_amount:      fields.net_amount,
      notes:           fields.notes ?? null,
      status:          'pending',
    })
    .select('id')
    .single();

  return { id: data?.id ?? null, error: error?.message ?? null };
}

export async function markPayoutAsPaid(
  payoutId: number,
  transferRef: string,
): Promise<{ error: string | null }> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data: adminUser } = await (await createSupabaseServerClient()).auth.getUser();

  const { error } = await admin
    .from('monthly_payouts')
    .update({
      status:       'paid',
      transfer_ref: transferRef.trim(),
      paid_at:      new Date().toISOString(),
      paid_by:      adminUser?.user?.id ?? null,
    })
    .eq('id', payoutId)
    .in('status', ['pending']);

  return { error: error?.message ?? null };
}
