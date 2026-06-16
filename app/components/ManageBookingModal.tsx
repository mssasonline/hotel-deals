'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface ManageableBooking {
  id: string;
  hotelName: string;
  bookingRef: string;
  checkInRaw: string;
  checkOutRaw: string;
  guests: number;
  status: string;
  paymentStatus: string;
  cancellationPolicy: 'free_cancelation' | 'non_refundable';
}

interface Props {
  booking: ManageableBooking;
  onClose: () => void;
  onUpdated: (updated: Partial<ManageableBooking>) => void;
}

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function ManageBookingModal({ booking, onClose, onUpdated }: Props) {
  const today = getTodayStr();
  const isNonRefundable = booking.cancellationPolicy === 'non_refundable';
  const isPaid = booking.paymentStatus === 'paid';
  const isUpcoming = booking.status === 'upcoming';
  const canEdit = isUpcoming && !isNonRefundable;
  const canCancel = !isNonRefundable && !isPaid;

  const [checkIn, setCheckIn] = useState(booking.checkInRaw);
  const [checkOut, setCheckOut] = useState(booking.checkOutRaw);
  const [guests, setGuests] = useState(booking.guests);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSave() {
    if (!canEdit) return;
    if (checkOut <= checkIn) { setErrorMsg('Check-out must be after check-in.'); return; }
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const { error } = await supabase
      .from('bookings')
      .update({ check_in: checkIn, check_out: checkOut, guests_count: guests })
      .eq('id', booking.id);

    setSaving(false);
    if (error) { setErrorMsg(error.message); return; }

    const nights = Math.max(
      1,
      Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    );
    setSuccessMsg('Booking updated successfully.');
    onUpdated({
      checkInRaw: checkIn,
      checkOutRaw: checkOut,
      guests,
    });
    void nights;
  }

  async function handleCancelConfirm() {
    if (!canCancel) return;
    setCancelling(true);
    setErrorMsg('');

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.id);

    setCancelling(false);
    if (error) { setConfirmingCancel(false); setErrorMsg(error.message); return; }

    setSuccessMsg('Booking cancelled.');
    onUpdated({ status: 'cancelled' });
    setTimeout(onClose, 1200);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !saving && !cancelling) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ background: 'linear-gradient(135deg, #0F2260 0%, #1E3A8A 55%, #2563EB 100%)' }}
        >
          <div>
            <h2 className="font-bold text-white text-lg">Manage Booking</h2>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {booking.hotelName} · {booking.bookingRef}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving || cancelling}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-40 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {isNonRefundable && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-3 items-start">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-red-700 text-sm font-medium">
                This booking is <strong>non-refundable</strong> and cannot be modified or cancelled.
              </p>
            </div>
          )}

          {!isNonRefundable && !isUpcoming && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3 items-start">
              <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-amber-700 text-sm font-medium">
                Check-in has begun. Dates and guest count cannot be modified.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Check-in</label>
              <input
                type="date"
                value={checkIn}
                min={today}
                disabled={!canEdit}
                onChange={(e) => { setCheckIn(e.target.value); setSuccessMsg(''); setErrorMsg(''); }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Check-out</label>
              <input
                type="date"
                value={checkOut}
                min={checkIn || today}
                disabled={!canEdit}
                onChange={(e) => { setCheckOut(e.target.value); setSuccessMsg(''); setErrorMsg(''); }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Guests</label>
            <input
              type="number"
              min={1}
              max={10}
              value={guests}
              disabled={!canEdit}
              onChange={(e) => { setGuests(Math.max(1, parseInt(e.target.value, 10) || 1)); setSuccessMsg(''); setErrorMsg(''); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
          </div>

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-emerald-700 text-sm font-medium">{successMsg}</p>
            </div>
          )}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-700 text-sm font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Cancel section */}
          {canCancel && (
            <div className="pt-2 border-t border-gray-100">
              {!confirmingCancel ? (
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(true)}
                  className="text-red-500 hover:text-red-700 text-sm font-semibold transition-colors"
                >
                  Cancel this booking
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-3">
                  <p className="text-red-700 text-sm font-medium">
                    Are you sure you want to cancel your stay at <strong>{booking.hotelName}</strong>?
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCancelConfirm}
                      disabled={cancelling}
                      className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                    >
                      {cancelling && <Spinner />}
                      Yes, cancel it
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingCancel(false)}
                      className="text-gray-500 hover:text-gray-700 text-sm font-semibold transition-colors"
                    >
                      Keep booking
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving || cancelling}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-40 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canEdit || saving || !!successMsg}
            className="inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 12px rgba(30,58,138,0.3)' }}
          >
            {saving && <Spinner />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
