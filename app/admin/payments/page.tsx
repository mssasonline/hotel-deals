import { createAdminClient } from '@/lib/supabase-admin';
import { getCommissionRate } from '@/lib/platformSettings';
import PaymentsClient, { type PaymentRow } from './PaymentsClient';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const supabase = createAdminClient();
  const commissionRate = await getCommissionRate();

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      guest_name,
      guest_email,
      payment_status,
      payment_method,
      total_price,
      created_at,
      hotels ( name ),
      booking_revenue ( partner_amount, admin_amount )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-red-500 text-sm">
        خطأ في تحميل البيانات: {error.message}
      </div>
    );
  }

  const payments: PaymentRow[] = (data ?? []).map((row: Record<string, unknown>) => {
    const hotel   = (Array.isArray(row.hotels) ? row.hotels[0] : row.hotels) as { name: string } | null;
    const revenue = (Array.isArray(row.booking_revenue) ? row.booking_revenue[0] : row.booking_revenue) as
      { partner_amount: number; admin_amount: number } | null;

    const total   = Number(row.total_price ?? 0);
    const partner = Number(revenue?.partner_amount ?? (total * (1 - commissionRate / 100)));
    const admin   = Number(revenue?.admin_amount  ?? (total * (commissionRate / 100)));

    return {
      id:             String(row.id),
      guest_name:     String(row.guest_name ?? '—'),
      guest_email:    String(row.guest_email ?? '—'),
      hotel_name:     hotel?.name ?? '—',
      payment_method: row.payment_method as string | null,
      created_at:     String(row.created_at),
      payment_status: String(row.payment_status ?? 'pending'),
      total_price:    total,
      partner_amount: Math.round(partner * 100) / 100,
      admin_amount:   Math.round(admin   * 100) / 100,
    };
  });

  return <PaymentsClient payments={payments} commissionRate={commissionRate} />;
}
