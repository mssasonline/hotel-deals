import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import AEDAmount from '@/app/partner/components/AEDAmount';
import { calcTaxBreakdown, UAE_FEE_DEFAULTS } from '@/lib/pricingEngine';

export const metadata: Metadata = { title: 'Financial Summary — Partner Portal' };
export const dynamic = 'force-dynamic';

type RawBooking = {
  id: string;
  check_in: string;
  check_out: string;
  subtotal: number;
  total_price: number;
  room_count: number;
  created_at: string;
  partner_amount: number;
  admin_amount: number;
};

type MonthSummary = {
  month: string;
  bookingCount: number;
  roomSubtotal: number;
  serviceCharge: number;
  municipalityFee: number;
  tourismDirham: number;
  vat: number;
  grossCollected: number;
  platformCommission: number;
  netPayout: number;
  isCurrent: boolean;
};

function calcNights(checkIn: string, checkOut: string): number {
  return Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000));
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default async function EarningsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: partnerData } = await supabase
    .from('hotel_partners')
    .select('hotel_id')
    .eq('user_id', user.id);

  const hotelIds = (partnerData ?? []).map((r: { hotel_id: number }) => r.hotel_id);
  const rawRows: RawBooking[] = [];

  if (hotelIds.length > 0) {
    const admin = createAdminClient();
    const { data: bookings } = await admin
      .from('bookings')
      .select('id, check_in, check_out, subtotal, total_price, room_count, created_at, booking_revenue(partner_amount, admin_amount)')
      .in('hotel_id', hotelIds)
      .eq('payment_status', 'paid')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    for (const b of (bookings ?? []) as Record<string, unknown>[]) {
      const rev = (Array.isArray(b.booking_revenue) ? b.booking_revenue[0] : b.booking_revenue) as
        { partner_amount: number; admin_amount: number } | null;
      const sub = Number(b.subtotal ?? 0);
      const total = Number(b.total_price ?? 0);
      rawRows.push({
        id: String(b.id),
        check_in: String(b.check_in),
        check_out: String(b.check_out),
        subtotal: sub,
        total_price: total,
        room_count: Number(b.room_count ?? 1),
        created_at: String(b.created_at),
        partner_amount: Number(rev?.partner_amount ?? total * 0.9),
        admin_amount: Number(rev?.admin_amount ?? total * 0.1),
      });
    }
  }

  // Group by YYYY-MM
  const currentMonth = new Date().toISOString().slice(0, 7);
  const byMonth = new Map<string, MonthSummary>();

  for (const b of rawRows) {
    const month = b.created_at.slice(0, 7);
    if (!byMonth.has(month)) {
      byMonth.set(month, {
        month,
        bookingCount: 0,
        roomSubtotal: 0,
        serviceCharge: 0,
        municipalityFee: 0,
        tourismDirham: 0,
        vat: 0,
        grossCollected: 0,
        platformCommission: 0,
        netPayout: 0,
        isCurrent: month === currentMonth,
      });
    }
    const entry = byMonth.get(month)!;
    const nights = calcNights(b.check_in, b.check_out);
    const fees = calcTaxBreakdown({ roomSubtotal: b.subtotal, nights, rooms: b.room_count, ...UAE_FEE_DEFAULTS });

    entry.bookingCount      += 1;
    entry.roomSubtotal      += b.subtotal;
    entry.serviceCharge     += fees.serviceCharge;
    entry.municipalityFee   += fees.municipalityFee;
    entry.tourismDirham     += fees.tourismDirham;
    entry.vat               += fees.vat;
    entry.grossCollected    += b.total_price;
    entry.platformCommission += b.admin_amount;
    entry.netPayout         += b.partner_amount;
  }

  const months = Array.from(byMonth.values()).sort((a, b) => b.month.localeCompare(a.month));
  const totals = months.reduce(
    (acc, m) => ({
      bookingCount:      acc.bookingCount      + m.bookingCount,
      roomSubtotal:      acc.roomSubtotal      + m.roomSubtotal,
      serviceCharge:     acc.serviceCharge     + m.serviceCharge,
      municipalityFee:   acc.municipalityFee   + m.municipalityFee,
      tourismDirham:     acc.tourismDirham     + m.tourismDirham,
      vat:               acc.vat               + m.vat,
      grossCollected:    acc.grossCollected    + m.grossCollected,
      platformCommission: acc.platformCommission + m.platformCommission,
      netPayout:         acc.netPayout         + m.netPayout,
    }),
    { bookingCount: 0, roomSubtotal: 0, serviceCharge: 0, municipalityFee: 0, tourismDirham: 0, vat: 0, grossCollected: 0, platformCommission: 0, netPayout: 0 },
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #D97706 0%, #B45309 100%)' }} />
            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>Financial Summary</h1>
          </div>
          <p className="text-white/45 text-xs pl-3">Monthly revenue, fee breakdown, and net payout across all your hotels</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        {([
          { label: 'Total Bookings',      value: String(totals.bookingCount),                                       isAmount: false },
          { label: 'Gross Collected',     value: totals.grossCollected,                                             isAmount: true  },
          { label: 'Govt Taxes',          value: totals.municipalityFee + totals.tourismDirham + totals.vat,        isAmount: true, red: true },
          { label: 'Platform Commission', value: totals.platformCommission,                                         isAmount: true, amber: true },
          { label: 'Your Net Payout',     value: totals.netPayout,                                                  isAmount: true, green: true },
        ] as const).map(({ label, value, isAmount, red, amber, green }: {
          label: string; value: string | number; isAmount: boolean; red?: boolean; amber?: boolean; green?: boolean
        }) => (
          <div key={label} className="bg-white rounded-2xl p-5" style={{ border: '1px solid rgba(30,58,138,0.09)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-2xl font-bold ${red ? 'text-red-500' : amber ? 'text-amber-600' : green ? 'text-emerald-600' : 'text-gray-900'}`}>
              {isAmount ? <AEDAmount amount={value as number} /> : value}
            </p>
          </div>
        ))}
      </div>

      {months.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center" style={{ border: '1px solid rgba(30,58,138,0.08)' }}>
          <p className="text-gray-400 text-sm">No paid bookings yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
          <div className="px-6 py-4 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Monthly Breakdown</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Service Charge stays with you · Muni / Tourism / VAT collected on behalf of authorities · Commission deducted by platform
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
                  <th className="px-4 py-3 text-left">Month</th>
                  <th className="px-4 py-3">Bookings</th>
                  <th className="px-4 py-3">Room Subtotal</th>
                  <th className="px-4 py-3 text-emerald-600">+ SC (10%)</th>
                  <th className="px-4 py-3 text-red-400">Muni (7%)</th>
                  <th className="px-4 py-3 text-red-400">Tourism</th>
                  <th className="px-4 py-3 text-red-400">VAT (5%)</th>
                  <th className="px-4 py-3">Gross</th>
                  <th className="px-4 py-3 text-amber-600">Commission</th>
                  <th className="px-4 py-3 text-emerald-700">Net Payout</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {months.map((m) => (
                  <tr key={m.month} className="hover:bg-gray-50/50 transition-colors text-right">
                    <td className="px-4 py-3 font-medium text-gray-900 text-left">{monthLabel(m.month)}</td>
                    <td className="px-4 py-3 text-gray-600">{m.bookingCount}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium tabular-nums"><AEDAmount amount={m.roomSubtotal} /></td>
                    <td className="px-4 py-3 text-emerald-600 font-medium tabular-nums">+<AEDAmount amount={m.serviceCharge} /></td>
                    <td className="px-4 py-3 text-red-400 tabular-nums"><AEDAmount amount={m.municipalityFee} /></td>
                    <td className="px-4 py-3 text-red-400 tabular-nums"><AEDAmount amount={m.tourismDirham} /></td>
                    <td className="px-4 py-3 text-red-400 tabular-nums"><AEDAmount amount={m.vat} /></td>
                    <td className="px-4 py-3 text-gray-900 font-semibold tabular-nums"><AEDAmount amount={m.grossCollected} /></td>
                    <td className="px-4 py-3 text-amber-600 tabular-nums">−<AEDAmount amount={m.platformCommission} /></td>
                    <td className="px-4 py-3 text-emerald-700 font-bold tabular-nums"><AEDAmount amount={m.netPayout} /></td>
                    <td className="px-4 py-3 text-left">
                      {m.isCurrent ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          In Progress
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
                          Pending Transfer
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 text-right font-bold">
                  <td className="px-4 py-3 text-left text-gray-900">All Time</td>
                  <td className="px-4 py-3 text-gray-900">{totals.bookingCount}</td>
                  <td className="px-4 py-3 text-gray-900 tabular-nums"><AEDAmount amount={totals.roomSubtotal} /></td>
                  <td className="px-4 py-3 text-emerald-600 tabular-nums">+<AEDAmount amount={totals.serviceCharge} /></td>
                  <td className="px-4 py-3 text-red-400 tabular-nums"><AEDAmount amount={totals.municipalityFee} /></td>
                  <td className="px-4 py-3 text-red-400 tabular-nums"><AEDAmount amount={totals.tourismDirham} /></td>
                  <td className="px-4 py-3 text-red-400 tabular-nums"><AEDAmount amount={totals.vat} /></td>
                  <td className="px-4 py-3 text-gray-900 tabular-nums"><AEDAmount amount={totals.grossCollected} /></td>
                  <td className="px-4 py-3 text-amber-600 tabular-nums">−<AEDAmount amount={totals.platformCommission} /></td>
                  <td className="px-4 py-3 text-emerald-700 tabular-nums text-base"><AEDAmount amount={totals.netPayout} /></td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Legend */}
          <div className="px-6 py-4 border-t border-gray-50 flex flex-wrap gap-5 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> Service Charge → stays with you (hotel income)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 shrink-0" /> Muni / Tourism / VAT → remitted to government authorities</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" /> Commission → 10% platform fee</span>
          </div>
        </div>
      )}
    </div>
  );
}
