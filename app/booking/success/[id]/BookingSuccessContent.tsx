'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import CurrencyAmount from '@/app/components/CurrencyAmount';

export interface BookingSuccessData {
  shortId: string;
  hotelName: string;
  hotelCity: string;
  roomName: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  roomCount: number;
  totalPrice: number;
  guestName: string;
  status: string;
  breakfastIncluded: boolean;
  breakfastPricePerPerson: number;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

const STATUS_UI: Record<string, { label: string; badgeBg: string; badgeText: string; dot: string }> = {
  confirmed: { label: 'Confirmed',  badgeBg: 'bg-green-400',  badgeText: 'text-green-900', dot: 'bg-green-700' },
  pending:   { label: 'Pending',    badgeBg: 'bg-amber-400',  badgeText: 'text-amber-900', dot: 'bg-amber-700' },
  completed: { label: 'Completed',  badgeBg: 'bg-brand-blue-light', badgeText: 'text-brand-blue', dot: 'bg-brand-blue' },
  cancelled: { label: 'Cancelled',  badgeBg: 'bg-red-100',    badgeText: 'text-red-700',   dot: 'bg-red-500'   },
};

export default function BookingSuccessContent({ data }: { data: BookingSuccessData }) {
  const t = useTranslation();
  const { shortId, hotelName, hotelCity, roomName, roomType, checkIn, checkOut, nights, guestsCount, roomCount, totalPrice, guestName, status, breakfastIncluded, breakfastPricePerPerson } = data;

  const isFresh = status === 'confirmed' || status === 'pending';
  const statusUi = STATUS_UI[status] ?? STATUS_UI['confirmed'];
  const breakfastCount = breakfastIncluded && breakfastPricePerPerson > 0 ? guestsCount * nights : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6">

      {/* ── Header Banner ─────────────────────────── */}
      <div className="text-center mb-8">
        <div className="relative inline-flex mb-5">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center ${isFresh ? 'bg-green-100' : 'bg-brand-blue-light'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${isFresh ? 'bg-green-500 shadow-green-500/30' : 'bg-brand-blue shadow-brand-blue/30'}`}>
              {isFresh ? (
                <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              )}
            </div>
          </div>
          {isFresh && (
            <div className="absolute inset-0 rounded-full border-2 border-brand-gold/40 animate-ping" style={{ animationDuration: '2.5s' }} />
          )}
        </div>
        <h1 className="font-extrabold text-gray-900 text-3xl sm:text-4xl mb-2 leading-tight">
          {isFresh ? t['success.bookingConfirmed'] : 'Booking Details'}
        </h1>
        <p className="text-gray-500 text-base">
          {isFresh ? t['success.roomReserved'] : `${hotelName} · SR-${shortId}`}
        </p>
      </div>

      {/* ── Booking ID + Status ────────────────────── */}
      <div className="rounded-2xl px-6 py-5 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ background: 'linear-gradient(135deg, #0F2260 0%, #1E3A8A 55%, #2563EB 100%)' }}>
        <div>
          <p className="text-white/55 text-[11px] font-medium uppercase tracking-widest mb-1">
            {t['success.bookingId']}
          </p>
          <p className="text-white font-extrabold text-xl tracking-widest font-mono">SR-{shortId}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-white/55 text-[11px] font-medium uppercase tracking-widest mb-1">
            {t['success.status']}
          </p>
          <span className={`inline-flex items-center gap-1.5 ${statusUi.badgeBg} ${statusUi.badgeText} text-sm font-bold px-3 py-1.5 rounded-full capitalize`}>
            <span className={`w-2 h-2 rounded-full ${statusUi.dot} inline-block`} />
            {statusUi.label}
          </span>
        </div>
      </div>

      {/* ── QR Code ────────────────────────────────── */}
      <div className="bg-white rounded-2xl overflow-hidden mb-5" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-blue-light rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <div>
            <h2 className="font-extrabold text-gray-900 text-base">{t['success.qrTitle']}</h2>
            <p className="text-gray-400 text-xs">{t['success.qrSubtitle']}</p>
          </div>
        </div>
        <div className="flex flex-col items-center py-6 px-6 gap-4">
          <div className="p-3 bg-white border-2 border-gray-100 rounded-2xl shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=SR-${shortId}&bgcolor=ffffff&color=1a3a6b&margin=4`}
              alt={`QR Code for booking SR-${shortId}`}
              width={180}
              height={180}
              className="rounded-lg"
            />
          </div>
          <div className="text-center">
            <p className="font-mono font-extrabold text-2xl text-gray-900 tracking-widest">SR-{shortId}</p>
            <p className="text-gray-400 text-xs mt-1">{hotelName}</p>
          </div>
          <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 text-sm text-green-700 font-medium w-full justify-center">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t['success.paymentConfirmed']}
          </div>
        </div>
      </div>

      {/* ── Booking Details Card ───────────────────── */}
      <div className="bg-white rounded-2xl overflow-hidden mb-5" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-blue-light rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h2 className="font-extrabold text-gray-900 text-base">{t['success.bookingSummary']}</h2>
            <p className="text-gray-400 text-xs">{t['success.reservationDetails']}</p>
          </div>
        </div>

        {/* Hotel + Room */}
        <div className="px-6 py-5 border-b border-gray-50 bg-brand-blue-light/25">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-brand-blue rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 22V12h6v10" />
              </svg>
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-lg leading-tight">{hotelName}</h3>
              {hotelCity && (
                <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-brand-gold shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  {hotelCity}
                </p>
              )}
              <span className="inline-block mt-1.5 bg-brand-gold-light text-brand-gold text-xs font-semibold px-2.5 py-1 rounded-lg">
                {roomName}
              </span>
            </div>
          </div>
        </div>

        {/* Stay Details */}
        <div className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-gray-50">
          <div>
            <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wide mb-1">{t['success.checkIn']}</p>
            <p className="font-bold text-gray-900 text-sm">{formatDate(checkIn)}</p>
            <p className="text-gray-400 text-xs mt-0.5">{t['success.checkInTime']}</p>
          </div>
          <div>
            <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wide mb-1">{t['success.checkOut']}</p>
            <p className="font-bold text-gray-900 text-sm">{formatDate(checkOut)}</p>
            <p className="text-gray-400 text-xs mt-0.5">{t['success.checkOutTime']}</p>
          </div>
          <div>
            <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wide mb-1">{t['success.duration']}</p>
            <p className="font-bold text-gray-900 text-sm">{nights} {nights === 1 ? t['success.night'] : t['success.nights']}</p>
          </div>
          <div>
            <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wide mb-1">{t['success.guestsLabel']}</p>
            <p className="font-bold text-gray-900 text-sm">
              {guestsCount} {guestsCount === 1 ? t['success.guestLabel'] : t['success.guestsLabel']}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wide mb-1">{t['success.roomsLabel']}</p>
            <p className="font-bold text-gray-900 text-sm">
              {roomCount} {roomCount === 1 ? t['success.roomLabel'] : t['success.roomsLabel']}
            </p>
          </div>
          {roomType && (
            <div>
              <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wide mb-1">{t['success.roomType']}</p>
              <p className="font-bold text-gray-900 text-sm">{roomType}</p>
            </div>
          )}
          <div>
            <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wide mb-1">{t['success.guestName']}</p>
            <p className="font-bold text-gray-900 text-sm truncate">{guestName || '—'}</p>
          </div>
        </div>

        {/* Breakfast */}
        {breakfastCount > 0 && (
          <div className="px-6 py-4 border-b border-gray-50">
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <span className="text-2xl shrink-0">🍳</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-800 text-sm leading-none">Breakfast included</p>
                <p className="text-amber-600 text-xs mt-0.5">
                  {guestsCount} {guestsCount === 1 ? 'guest' : 'guests'} × {nights} {nights === 1 ? 'night' : 'nights'}
                </p>
              </div>
              <span className="shrink-0 font-bold text-amber-700 text-sm bg-amber-100 px-2.5 py-1 rounded-lg">
                ×{breakfastCount}
              </span>
            </div>
          </div>
        )}

        {/* Price */}
        <div className="px-6 py-5">
          <div className="bg-gray-50 rounded-xl px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-gray-900">{t['success.totalPrice']}</span>
              <span className="font-extrabold text-brand-blue text-2xl">
                <CurrencyAmount amount={totalPrice} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Actions ────────────────────────────────── */}
      <div className="bg-white rounded-2xl overflow-hidden p-6 mb-6 space-y-3" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
        <Link
          href="/my-trips"
          className="flex items-center justify-between w-full border border-gray-200 hover:border-brand-blue text-gray-700 hover:text-brand-blue font-semibold py-3.5 px-5 rounded-2xl transition-all duration-150 group"
        >
          <span className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {t['success.viewMyBookings']}
          </span>
          <svg className="w-4 h-4 text-gray-300 group-hover:text-brand-blue/40 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 w-full text-white font-extrabold py-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
          style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {t['success.backToHome']}
        </Link>
      </div>

      {/* ── Trust Badges ───────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            icon: (
              <svg className="w-6 h-6 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            ),
            label: t['success.secureBooking'],
            sub: t['success.sslEncrypted'],
          },
          {
            icon: (
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ),
            label: t['success.nonRefundable'],
            sub: t['success.sameDayDeal'],
          },
          {
            icon: (
              <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            ),
            label: t['success.instantConfirm'],
            sub: t['success.emailSentConfirm'],
          },
        ].map((badge) => (
          <div key={badge.label} className="bg-white rounded-2xl overflow-hidden py-4 px-3 text-center" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
            <div className="flex justify-center mb-2">{badge.icon}</div>
            <p className="text-gray-800 text-xs font-bold leading-tight">{badge.label}</p>
            <p className="text-gray-400 text-[11px] mt-0.5">{badge.sub}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
