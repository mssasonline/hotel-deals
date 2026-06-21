'use client';

import { useState, useTransition } from 'react';
import { markPayoutAsPaid, createMonthlyPayout, type AdminMonthlyPayout } from '../actions';
import AEDAmount from '@/app/partner/components/AEDAmount';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function statusBadge(status: AdminMonthlyPayout['status']) {
  if (status === 'confirmed') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
      Confirmed
    </span>
  );
  if (status === 'paid') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      Paid — Awaiting Partner
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      Pending
    </span>
  );
}

function MarkPaidModal({
  payout,
  onClose,
  onDone,
}: {
  payout: AdminMonthlyPayout;
  onClose: () => void;
  onDone: (id: number, ref: string) => void;
}) {
  const [ref, setRef] = useState('');
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    if (!ref.trim()) { setErr('Transfer reference number is required.'); return; }
    setErr(null);
    startTransition(async () => {
      const { error } = await markPayoutAsPaid(payout.id, ref.trim());
      if (error) { setErr(error); return; }
      onDone(payout.id, ref.trim());
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,26,79,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 24px 64px rgba(10,26,79,0.18)' }}>
        {/* Header */}
        <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #1A3A8F 100%)' }}>
          <h2 className="text-white font-bold text-lg">Mark as Paid</h2>
          <p className="text-white/50 text-xs mt-0.5">
            {payout.partner_name} · {MONTH_NAMES[(payout.period_month ?? 1) - 1]} {payout.period_year}
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Hotel</span>
              <span className="font-medium text-gray-900">{payout.hotel_name ?? '—'}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Net Amount</span>
              <span className="font-bold text-emerald-700 text-base"><AEDAmount amount={payout.net_amount} /></span>
            </div>
            {payout.iban && (
              <div className="flex justify-between text-gray-600">
                <span>IBAN</span>
                <span className="font-mono text-xs text-gray-800">{payout.iban}</span>
              </div>
            )}
            {payout.bank_name && (
              <div className="flex justify-between text-gray-600">
                <span>Bank</span>
                <span className="text-gray-800">{payout.bank_name}</span>
              </div>
            )}
            {!payout.iban && !payout.bank_name && (
              <p className="text-xs text-amber-600">⚠ Partner has not filled in bank details yet.</p>
            )}
          </div>

          {/* Transfer ref */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Transfer Reference Number <span className="text-red-400">*</span>
            </label>
            <input
              value={ref}
              onChange={e => setRef(e.target.value)}
              placeholder="e.g. TRF-20260601-0042"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">This will be visible to the partner in their Earnings page.</p>
          </div>

          {err && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{err}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={isPending}
              className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #065F46 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}
            >
              {isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isPending ? 'Saving…' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type CreatePayoutFields = {
  partner_user_id: string;
  partner_name:    string;
  hotel_id:        number | null;
  hotel_name:      string | null;
  gross_amount:    number;
  commission:      number;
  net_amount:      number;
  period_year:     number;
  period_month:    number;
};

function CreatePayoutModal({
  fields,
  onClose,
  onDone,
}: {
  fields: CreatePayoutFields;
  onClose: () => void;
  onDone: (newRecord: AdminMonthlyPayout) => void;
}) {
  const [notes, setNotes]  = useState('');
  const [isPending, startTransition] = useTransition();
  const [err, setErr]       = useState<string | null>(null);

  function submit() {
    setErr(null);
    startTransition(async () => {
      const { id, error } = await createMonthlyPayout({
        partner_user_id: fields.partner_user_id,
        hotel_id:        fields.hotel_id,
        period_year:     fields.period_year,
        period_month:    fields.period_month,
        gross_amount:    fields.gross_amount,
        commission:      fields.commission,
        net_amount:      fields.net_amount,
        notes:           notes || undefined,
      });
      if (error || !id) { setErr(error ?? 'Failed to create'); return; }
      onDone({
        id,
        partner_user_id: fields.partner_user_id,
        partner_name:    fields.partner_name,
        partner_email:   '',
        hotel_id:        fields.hotel_id,
        hotel_name:      fields.hotel_name,
        period_year:     fields.period_year,
        period_month:    fields.period_month,
        gross_amount:    fields.gross_amount,
        commission:      fields.commission,
        net_amount:      fields.net_amount,
        status:          'pending',
        transfer_ref:    null,
        paid_at:         null,
        confirmed_at:    null,
        notes:           notes || null,
        bank_name:       null,
        account_holder:  null,
        iban:            null,
        swift_bic:       null,
        bank_country:    null,
      });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,26,79,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 24px 64px rgba(10,26,79,0.18)' }}>
        <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #1A3A8F 100%)' }}>
          <h2 className="text-white font-bold text-lg">Create Payout Record</h2>
          <p className="text-white/50 text-xs mt-0.5">
            {fields.partner_name} · {MONTH_NAMES[(fields.period_month ?? 1) - 1]} {fields.period_year}
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Hotel</span><span className="font-medium text-gray-900">{fields.hotel_name ?? '—'}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Gross Collected</span><span className="font-medium"><AEDAmount amount={fields.gross_amount} /></span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Platform Commission (10%)</span><span className="text-amber-600"><AEDAmount amount={fields.commission} /></span>
            </div>
            <div className="flex justify-between text-gray-900 font-bold border-t border-gray-200 pt-2 mt-2">
              <span>Net Payout</span><span className="text-emerald-700"><AEDAmount amount={fields.net_amount} /></span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue resize-none"
              placeholder="Any notes for the partner…"
            />
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
            <button
              onClick={submit}
              disabled={isPending}
              className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
            >
              {isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isPending ? 'Creating…' : 'Create Record'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayoutManager({
  initialPayouts,
  partnerSummaries,
}: {
  initialPayouts: AdminMonthlyPayout[];
  partnerSummaries: {
    partnerId:    string;
    partnerName:  string;
    hotelId:      number | null;
    hotelName:    string | null;
    periodYear:   number;
    periodMonth:  number;
    gross:        number;
    commission:   number;
    net:          number;
  }[];
}) {
  const [payouts, setPayouts]               = useState(initialPayouts);
  const [markingPayout, setMarkingPayout]   = useState<AdminMonthlyPayout | null>(null);
  const [creatingFields, setCreatingFields] = useState<CreatePayoutFields | null>(null);

  function handlePaid(id: number, ref: string) {
    setPayouts(p => p.map(r => r.id === id ? { ...r, status: 'paid', transfer_ref: ref, paid_at: new Date().toISOString() } : r));
  }

  function handleCreated(record: AdminMonthlyPayout) {
    setPayouts(p => [record, ...p]);
  }

  // Index existing payouts by partner+hotel+year+month
  const payoutIndex = new Map(
    payouts.map(p => [`${p.partner_user_id}|${p.hotel_id ?? ''}|${p.period_year}|${p.period_month}`, p])
  );

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Partner Payouts</p>
          <p className="text-xs text-gray-400 mt-0.5">Mark transfers as paid and track confirmation from partners</p>
        </div>
      </div>

      {partnerSummaries.length === 0 ? (
        <div className="p-12 text-center text-gray-400 text-sm">No partner payout data yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
                <th className="px-4 py-3 text-left">Partner / Hotel</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3 text-amber-600">Commission</th>
                <th className="px-4 py-3 text-emerald-700">Net Payout</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Transfer Ref</th>
                <th className="px-4 py-3 text-left">Partner Confirm</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {partnerSummaries.map((s) => {
                const key = `${s.partnerId}|${s.hotelId ?? ''}|${s.periodYear}|${s.periodMonth}`;
                const existing = payoutIndex.get(key);
                return (
                  <tr key={key} className="hover:bg-gray-50/50 transition-colors text-right">
                    <td className="px-4 py-3 text-left">
                      <p className="font-medium text-gray-900 truncate max-w-[160px]">{s.partnerName}</p>
                      <p className="text-xs text-gray-400">{s.hotelName ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {MONTH_NAMES[(s.periodMonth ?? 1) - 1]} {s.periodYear}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium tabular-nums"><AEDAmount amount={s.gross} /></td>
                    <td className="px-4 py-3 text-amber-600 tabular-nums"><AEDAmount amount={s.commission} /></td>
                    <td className="px-4 py-3 text-emerald-700 font-bold tabular-nums"><AEDAmount amount={s.net} /></td>
                    <td className="px-4 py-3 text-left">
                      {existing ? statusBadge(existing.status) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-left">
                      {existing?.transfer_ref ? (
                        <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">{existing.transfer_ref}</span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-left">
                      {existing?.confirmed_at ? (
                        <span className="text-xs text-green-600">
                          ✓ {new Date(existing.confirmed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      ) : existing?.status === 'paid' ? (
                        <span className="text-xs text-gray-400">Waiting…</span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-left">
                      {!existing ? (
                        <button
                          onClick={() => setCreatingFields({
                            partner_user_id: s.partnerId,
                            partner_name:    s.partnerName,
                            hotel_id:        s.hotelId,
                            hotel_name:      s.hotelName,
                            gross_amount:    s.gross,
                            commission:      s.commission,
                            net_amount:      s.net,
                            period_year:     s.periodYear,
                            period_month:    s.periodMonth,
                          })}
                          className="px-3 py-1.5 text-xs font-semibold text-brand-blue bg-brand-blue-light hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Create Record
                        </button>
                      ) : existing.status === 'pending' ? (
                        <button
                          onClick={() => setMarkingPayout(existing)}
                          className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors whitespace-nowrap"
                          style={{ background: 'linear-gradient(135deg, #065F46 0%, #059669 100%)' }}
                        >
                          Mark as Paid
                        </button>
                      ) : existing.status === 'paid' ? (
                        <span className="text-xs text-gray-400 italic">Awaiting confirm</span>
                      ) : (
                        <span className="text-xs text-green-600 font-medium">✓ Done</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {markingPayout && (
        <MarkPaidModal
          payout={markingPayout}
          onClose={() => setMarkingPayout(null)}
          onDone={handlePaid}
        />
      )}
      {creatingFields && (
        <CreatePayoutModal
          fields={creatingFields}
          onClose={() => setCreatingFields(null)}
          onDone={handleCreated}
        />
      )}
    </div>
  );
}
