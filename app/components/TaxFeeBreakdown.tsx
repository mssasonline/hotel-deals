'use client';

import { calcTaxBreakdown, UAE_FEE_DEFAULTS, type HotelFeeConfig } from '@/lib/pricingEngine';

interface Props {
  roomSubtotal: number;
  breakfastSubtotal?: number;
  nights?: number;
  rooms?: number;
  feeConfig?: HotelFeeConfig;
  currency?: string;
  compact?: boolean;
  grandTotal?: number;
}

function fmt(n: number, currency = 'AED') {
  return `${currency} ${n.toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function TaxFeeBreakdown({
  roomSubtotal,
  breakfastSubtotal = 0,
  nights = 1,
  rooms = 1,
  feeConfig = UAE_FEE_DEFAULTS,
  currency = 'AED',
  compact = false,
  grandTotal,
}: Props) {
  const { serviceChargePct, municipalityFeePct, tourismDirhamPerNight, vatPct } = feeConfig;
  const bd = calcTaxBreakdown({ roomSubtotal, breakfastSubtotal, nights, rooms, ...feeConfig });

  const rows = [
    {
      label: `Service charge (${serviceChargePct}%)`,
      sub: 'On room rate',
      amount: bd.serviceCharge,
    },
    {
      label: `Municipality fee (${municipalityFeePct}%)`,
      sub: 'On room rate',
      amount: bd.municipalityFee,
    },
    {
      label: `Tourism Dirham`,
      sub: `${fmt(tourismDirhamPerNight, currency)} × ${nights} night${nights !== 1 ? 's' : ''}${rooms > 1 ? ` × ${rooms} rooms` : ''}`,
      amount: bd.tourismDirham,
    },
    {
      label: `VAT (${vatPct}%)`,
      sub: 'On room' + (breakfastSubtotal > 0 ? ' + breakfast' : ''),
      amount: bd.vat,
    },
  ];

  if (compact) {
    return (
      <div className="text-xs text-gray-500 space-y-0.5">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-4">
            <span>{r.label}</span>
            <span className="font-medium text-gray-700 tabular-nums">{fmt(r.amount, currency)}</span>
          </div>
        ))}
        <div className="border-t border-gray-200 pt-1 flex justify-between gap-4 font-semibold text-gray-800">
          <span>Total taxes & fees</span>
          <span className="tabular-nums">{fmt(bd.total, currency)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden text-sm">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
        <p className="font-semibold text-gray-700 text-xs uppercase tracking-wider">Taxes & Fees Breakdown</p>
      </div>

      {/* Base amounts */}
      <div className="divide-y divide-gray-100">
        <div className="flex justify-between items-center px-4 py-2.5 bg-white">
          <div>
            <p className="text-gray-600 font-medium">Room subtotal</p>
            {breakfastSubtotal > 0 && (
              <p className="text-gray-400 text-xs">+ Breakfast {fmt(breakfastSubtotal, currency)}</p>
            )}
          </div>
          <span className="font-semibold text-gray-900 tabular-nums">{fmt(roomSubtotal + breakfastSubtotal, currency)}</span>
        </div>

        {rows.map((r) => (
          <div key={r.label} className="flex justify-between items-center px-4 py-2.5 bg-white">
            <div>
              <p className="text-gray-600">{r.label}</p>
              <p className="text-gray-400 text-xs">{r.sub}</p>
            </div>
            <span className="font-medium text-gray-800 tabular-nums">{fmt(r.amount, currency)}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-t border-gray-200">
        <p className="font-bold text-gray-900">Grand Total</p>
        <span className="font-extrabold text-brand-blue text-base tabular-nums">
          {fmt(grandTotal ?? (roomSubtotal + breakfastSubtotal + bd.total), currency)}
        </span>
      </div>
    </div>
  );
}
