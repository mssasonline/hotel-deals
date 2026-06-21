'use client';

import { useState, useTransition } from 'react';
import { confirmPayoutReceipt, type MonthlyPayout } from '../actions';
import AEDAmount from '../components/AEDAmount';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function StatusBadge({ status }: { status: MonthlyPayout['status'] }) {
  if (status === 'confirmed') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
      Received &amp; Confirmed
    </span>
  );
  if (status === 'paid') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
      Transferred — Confirm Receipt
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      Pending Transfer
    </span>
  );
}

function ConfirmModal({
  payout,
  onClose,
  onConfirmed,
}: {
  payout: MonthlyPayout;
  onClose: () => void;
  onConfirmed: (id: number) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function confirm() {
    setErr(null);
    startTransition(async () => {
      const { error } = await confirmPayoutReceipt(payout.id);
      if (error) { setErr(error); return; }
      onConfirmed(payout.id);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,26,79,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 24px 64px rgba(10,26,79,0.18)' }}>
        <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #065F46 0%, #059669 100%)' }}>
          <h2 className="text-white font-bold text-lg">Confirm Receipt</h2>
          <p className="text-white/60 text-xs mt-0.5">
            {MONTH_NAMES[(payout.period_month ?? 1) - 1]} {payout.period_year}
            {payout.hotel_name ? ` · ${payout.hotel_name}` : ''}
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Amount Received</span>
              <span className="font-bold text-emerald-700 text-base"><AEDAmount amount={payout.net_amount} /></span>
            </div>
            {payout.transfer_ref && (
              <div className="flex justify-between text-gray-600">
                <span>Transfer Ref</span>
                <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{payout.transfer_ref}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            By confirming, you acknowledge that you have received this payment in your bank account.
          </p>
          {err && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{err}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              onClick={confirm}
              disabled={isPending}
              className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #065F46 0%, #059669 100%)' }}
            >
              {isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isPending ? 'Confirming…' : 'Yes, I Received It'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayoutStatusPanel({ payouts }: { payouts: MonthlyPayout[] }) {
  const [records, setRecords]             = useState(payouts);
  const [confirmingId, setConfirmingId]   = useState<number | null>(null);

  if (!records.length) return null;

  const confirmingPayout = records.find(p => p.id === confirmingId) ?? null;

  function handleConfirmed(id: number) {
    setRecords(r => r.map(p => p.id === id ? { ...p, status: 'confirmed', confirmed_at: new Date().toISOString() } : p));
  }

  return (
    <>
      <div className="bg-white rounded-2xl overflow-hidden mt-6" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
        <div className="px-6 py-4 border-b border-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payout Records</p>
          <p className="text-xs text-gray-400 mt-0.5">Monthly transfers from the platform. Confirm receipt once you see the money in your bank.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-left">Hotel</th>
                <th className="px-4 py-3 text-emerald-700">Net Amount</th>
                <th className="px-4 py-3 text-left">Transfer Ref</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors text-right">
                  <td className="px-4 py-3 font-medium text-gray-900 text-left whitespace-nowrap">
                    {MONTH_NAMES[(p.period_month ?? 1) - 1]} {p.period_year}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-left">{p.hotel_name ?? '—'}</td>
                  <td className="px-4 py-3 text-emerald-700 font-bold tabular-nums"><AEDAmount amount={p.net_amount} /></td>
                  <td className="px-4 py-3 text-left">
                    {p.transfer_ref ? (
                      <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">{p.transfer_ref}</span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-left"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-left">
                    {p.status === 'paid' ? (
                      <button
                        onClick={() => setConfirmingId(p.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors whitespace-nowrap"
                        style={{ background: 'linear-gradient(135deg, #065F46 0%, #059669 100%)' }}
                      >
                        Confirm Receipt
                      </button>
                    ) : p.status === 'confirmed' ? (
                      <span className="text-xs text-gray-400">
                        {p.confirmed_at
                          ? new Date(p.confirmed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '✓'}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmingPayout && (
        <ConfirmModal
          payout={confirmingPayout}
          onClose={() => setConfirmingId(null)}
          onConfirmed={handleConfirmed}
        />
      )}
    </>
  );
}
