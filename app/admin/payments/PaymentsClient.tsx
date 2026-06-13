'use client';

import { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import AEDAmount, { useAEDFormat } from '../../partner/components/AEDAmount';
import { useAdminDateFormat } from '../components/useAdminFormat';

export type PaymentRow = {
  id: string;
  guest_name: string;
  guest_email: string;
  hotel_name: string;
  payment_method: string | null;
  created_at: string;
  payment_status: string;
  total_price: number;
  admin_amount: number;
  partner_amount: number;
};

type StatusFilter = 'all' | 'paid' | 'pending' | 'failed';

const METHOD_LABELS: Record<string, string> = {
  apple_pay:   'Apple Pay',
  google_pay:  'Google Pay',
  credit_card: 'Credit Card',
  debit_card:  'Debit Card',
};

const STATUS_FILTERS: Array<{ label: string; value: StatusFilter }> = [
  { label: 'All',     value: 'all'     },
  { label: 'Paid',    value: 'paid'    },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed',  value: 'failed'  },
];

function PaymentMethodIcon({ method }: { method: string | null }) {
  if (method === 'apple_pay') {
    return (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    );
  }
  if (method === 'google_pay') {
    return (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
        <path d="M20 12.2c0-.6-.1-1.2-.2-1.8H12v3.5h4.5c-.2 1-.8 1.9-1.6 2.4v2h2.6c1.5-1.4 2.5-3.5 2.5-6.1z" fill="#4285F4"/>
        <path d="M12 21c2.2 0 4.1-.7 5.5-2l-2.6-2c-.7.5-1.7.8-2.9.8-2.2 0-4.1-1.5-4.8-3.5H4.5v2c1.4 2.8 4.3 4.7 7.5 4.7z" fill="#34A853"/>
        <path d="M7.2 14.3c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V8.7H4.5C3.5 10 3 11.4 3 13s.5 3 1.5 4.3l2.7-3z" fill="#FBBC05"/>
        <path d="M12 6.7c1.2 0 2.3.4 3.2 1.2l2.4-2.4C16.1 4.2 14.2 3.5 12 3.5 8.8 3.5 5.9 5.4 4.5 8.2l2.7 2.1c.7-2 2.6-3.6 4.8-3.6z" fill="#EA4335"/>
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

export default function PaymentsClient({ payments, commissionRate }: { payments: PaymentRow[]; commissionRate: number }) {
  const partnerRate = 100 - commissionRate;
  const [filter, setFilter]   = useState<StatusFilter>('all');
  const [search, setSearch]   = useState('');
  const fmt = useAEDFormat();
  const { fmtDate } = useAdminDateFormat();

  const filtered = payments.filter(p => {
    const matchStatus = filter === 'all' || p.payment_status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.id.toLowerCase().includes(q) ||
      p.guest_name.toLowerCase().includes(q) ||
      p.hotel_name.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalGross     = payments.filter(p => p.payment_status === 'paid').reduce((s, p) => s + p.total_price,   0);
  const totalAdmin     = payments.filter(p => p.payment_status === 'paid').reduce((s, p) => s + p.admin_amount,  0);
  const totalPartner   = payments.filter(p => p.payment_status === 'paid').reduce((s, p) => s + p.partner_amount, 0);
  const pendingCount   = payments.filter(p => p.payment_status === 'pending').length;

  const counts: Record<StatusFilter, number> = {
    all:     payments.length,
    paid:    payments.filter(p => p.payment_status === 'paid').length,
    pending: pendingCount,
    failed:  payments.filter(p => p.payment_status === 'failed').length,
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {payments.length} transactions · Total collected: {fmt(totalGross)}
        </p>
      </div>

      {/* Revenue split summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">Total Payments</p>
          <p className="text-2xl font-bold text-gray-900"><AEDAmount amount={totalGross} /></p>
          <p className="text-xs text-gray-400 mt-1">from {counts.paid} paid bookings</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm p-5">
          <p className="text-xs text-emerald-600 mb-1">Partner Share ({partnerRate}%)</p>
          <p className="text-2xl font-bold text-emerald-700"><AEDAmount amount={totalPartner} /></p>
          <p className="text-xs text-emerald-500 mt-1">Due to partners</p>
        </div>
        <div className="bg-brand-blue/5 rounded-2xl border border-brand-blue/10 shadow-sm p-5">
          <p className="text-xs text-brand-blue mb-1">Platform Commission ({commissionRate}%)</p>
          <p className="text-2xl font-bold text-brand-blue"><AEDAmount amount={totalAdmin} /></p>
          <p className="text-xs text-brand-blue/60 mt-1">Admin revenue</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 w-fit shadow-sm">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === value
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {label}
              <span className={`ml-1.5 text-xs ${filter === value ? 'text-white/70' : 'text-gray-400'}`}>
                {counts[value]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or hotel…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue w-64 bg-white"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Booking ID</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Hotel</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Payment Method</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-emerald-600 uppercase tracking-wide">Partner ({partnerRate}%)</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-brand-blue uppercase tracking-wide">Platform ({commissionRate}%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center text-gray-400">No transactions.</td>
              </tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4 font-mono text-xs text-gray-500">
                  {p.id.slice(0, 8)}&hellip;
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium text-gray-900">{p.guest_name}</p>
                  <p className="text-xs text-gray-400">{p.guest_email}</p>
                </td>
                <td className="px-5 py-4 text-gray-600 max-w-[160px] truncate">{p.hotel_name}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <PaymentMethodIcon method={p.payment_method} />
                    <span>{METHOD_LABELS[p.payment_method ?? ''] ?? p.payment_method ?? '—'}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-xs text-gray-400">
                  {fmtDate(p.created_at)}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={p.payment_status} variant="payment" />
                </td>
                <td className="px-5 py-4 text-right font-semibold text-gray-900">
                  {p.payment_status === 'paid' ? <AEDAmount amount={p.total_price} /> : '—'}
                </td>
                <td className="px-5 py-4 text-right font-semibold text-emerald-600">
                  {p.payment_status === 'paid' ? <AEDAmount amount={p.partner_amount} /> : '—'}
                </td>
                <td className="px-5 py-4 text-right font-semibold text-brand-blue">
                  {p.payment_status === 'paid' ? <AEDAmount amount={p.admin_amount} /> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
