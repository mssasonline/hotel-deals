import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import AEDAmount from '@/app/partner/components/AEDAmount';

export const metadata: Metadata = { title: 'Earnings — Partner Portal' };

interface EarningRow {
  month: string;
  bookings: number;
  gross_aed: number;
  commission_aed: number;
  net_aed: number;
}

export default async function PartnerEarningsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch partner's hotel IDs
  const { data: hotels } = await supabase
    .from('hotels')
    .select('id')
    .eq('partner_id', user.id);

  const hotelIds = (hotels ?? []).map((h: { id: number }) => h.id);

  // Aggregate bookings by calendar month
  const { data: bookings } = hotelIds.length
    ? await supabase
        .from('bookings')
        .select('total_price, created_at')
        .in('hotel_id', hotelIds)
        .eq('status', 'upcoming')
    : { data: [] };

  const COMMISSION = 0.12; // 12% platform fee

  const byMonth: Record<string, { bookings: number; gross: number }> = {};
  for (const b of bookings ?? []) {
    const key = b.created_at.slice(0, 7); // YYYY-MM
    if (!byMonth[key]) byMonth[key] = { bookings: 0, gross: 0 };
    byMonth[key].bookings += 1;
    byMonth[key].gross += Number(b.total_price ?? 0);
  }

  const rows: EarningRow[] = Object.entries(byMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, { bookings, gross }]) => ({
      month,
      bookings,
      gross_aed: gross,
      commission_aed: gross * COMMISSION,
      net_aed: gross * (1 - COMMISSION),
    }));

  const totals = rows.reduce(
    (acc, r) => ({ bookings: acc.bookings + r.bookings, gross: acc.gross + r.gross_aed, net: acc.net + r.net_aed }),
    { bookings: 0, gross: 0, net: 0 },
  );

  function monthLabel(ym: string) {
    const [y, m] = ym.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #D97706 0%, #B45309 100%)' }} />
            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>Earnings</h1>
          </div>
          <p className="text-white/45 text-xs pl-3">Revenue summary across all your hotels (12% commission deducted)</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Bookings', value: totals.bookings.toString(), isAmount: false },
          { label: 'Gross Revenue',  value: totals.gross,  isAmount: true },
          { label: 'Net Earnings',   value: totals.net,    isAmount: true },
        ].map(({ label, value, isAmount }) => (
          <div key={label} className="bg-white rounded-2xl p-5" style={{ border: '1px solid rgba(30,58,138,0.09)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-900">
              {isAmount ? <AEDAmount amount={value as number} /> : value}
            </p>
          </div>
        ))}
      </div>

      {/* Monthly table */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center" style={{ border: '1px solid rgba(30,58,138,0.08)' }}>
          <p className="text-gray-400 text-sm">No confirmed bookings yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Month', 'Bookings', 'Gross (AED)', 'Commission (12%)', 'Net Earnings'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.month} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{monthLabel(r.month)}</td>
                  <td className="px-4 py-3 text-gray-600">{r.bookings}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    <AEDAmount amount={r.gross_aed} />
                  </td>
                  <td className="px-4 py-3 text-red-500">
                    −<AEDAmount amount={r.commission_aed} />
                  </td>
                  <td className="px-4 py-3 text-emerald-600 font-semibold">
                    <AEDAmount amount={r.net_aed} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
