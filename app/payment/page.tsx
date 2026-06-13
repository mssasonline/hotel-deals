'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { useBookingStore } from '@/store/bookingStore';
import { saveLoginRedirect } from '@/lib/auth';
import { useAuth } from '@/lib/authContext';
import BookingSummaryCard from './components/BookingSummaryCard';
import PaymentMethodSelector from './components/PaymentMethodSelector';
import ApplePaySection from './components/ApplePaySection';
import GooglePaySection from './components/GooglePaySection';
import CardPaymentForm from './components/CardPaymentForm';
import SecureCheckoutBanner from './components/SecureCheckoutBanner';
import type { PaymentMethod, CardDetails } from './lib/types';
import { processPayment } from './lib/paymentService';
import { supabase } from '@/lib/supabase';
import { calcRoomPrice } from '@/lib/pricingEngine';

function parseToISO(dateStr: string): string {
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const match = dateStr.match(/\w{3},\s+(\w{3})\s+(\d{1,2}),\s+(\d{4})/);
  if (!match) return dateStr;
  const [, mon, day, year] = match;
  return `${year}-${months[mon] ?? '01'}-${day.padStart(2, '0')}`;
}

function ChevronIcon() {
  return (
    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function PaymentProgressSteps() {
  const steps = [
    { label: 'Search', done: true },
    { label: 'Hotel', done: true },
    { label: 'Booking', done: true },
    { label: 'Payment', done: false, active: true },
    { label: 'Confirmation', done: false, active: false },
  ];

  return (
    <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-1">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div
            className={`flex items-center gap-2 text-sm font-medium ${
              step.active ? 'text-brand-blue' : step.done ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step.done
                  ? 'bg-green-500 text-white'
                  : step.active
                  ? 'bg-brand-blue text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {step.done ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className="hidden sm:inline whitespace-nowrap">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 w-6 sm:w-12 mx-2 shrink-0 ${step.done ? 'bg-green-300' : 'bg-gray-200'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin w-8 h-8 text-brand-blue" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

export default function PaymentPage() {
  const router = useRouter();
  const { selectedHotel, selectedRoom, checkInDate, checkOutDate, guests, confirmBooking, calculateTotalPrice } =
    useBookingStore();

  const { user, loading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('credit-card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      saveLoginRedirect('/payment');
      router.replace('/login');
      return;
    }
    setAuthChecked(true);
  }, [user, loading, router]);

  if (!authChecked) return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">
        <LoadingSpinner />
      </main>
      <Footer />
    </>
  );

  const totalPrice = calculateTotalPrice();

  async function handlePayment(cardDetails?: CardDetails) {
    if (!user || !selectedHotel || !selectedRoom) {
      setPaymentError('Missing booking details. Please start from the hotel page.');
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    const result = await processPayment({
      method: selectedMethod,
      amount: totalPrice,
      currency: 'USD',
      cardDetails,
    });

    if (!result.success) {
      setPaymentError(result.error ?? 'Payment failed. Please try again.');
      setIsProcessing(false);
      return;
    }

    // Save booking to Supabase
    const checkInISO = parseToISO(checkInDate);
    const checkOutISO = parseToISO(checkOutDate);
    const nights = Math.max(1, Math.ceil(
      (new Date(checkOutISO).getTime() - new Date(checkInISO).getTime()) / 86_400_000
    ));
    const pricePerNight = calcRoomPrice(selectedRoom.basePrice, selectedRoom.pricePerNight).currentPrice;
    const roomsCount = Math.max(1, selectedRoom.quantity ?? 1);
    const subtotal = nights * pricePerNight * roomsCount;
    const taxes = Math.round(subtotal * 0.15);
    const computedTotal = subtotal + taxes;
    const guestName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email?.split('@')[0] ||
      '';

    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        hotel_id: selectedHotel.id,
        room_id: selectedRoom.id,
        user_id: user.id,
        guest_name: guestName,
        guest_email: user.email!,
        check_in: checkInISO,
        check_out: checkOutISO,
        total_price: computedTotal,
        locked_price: pricePerNight,
        room_count: roomsCount,
        status: 'upcoming',
        payment_status: 'paid',
        guests_count: guests,
      })
      .select('id')
      .single();

    if (bookingError || !newBooking) {
      setPaymentError(`Booking save failed: ${bookingError?.message ?? 'Unknown error'}`);
      setIsProcessing(false);
      return;
    }

    confirmBooking(); // sync local Zustand state
    router.push(`/booking/success/${newBooking.id}`);
  }

  return (
    <>
      <Header />

      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
            <Link href="/" className="hover:text-brand-blue transition-colors">Home</Link>
            <ChevronIcon />
            <Link href="/search?city=Dubai" className="hover:text-brand-blue transition-colors">Search</Link>
            <ChevronIcon />
            {selectedHotel && (
              <>
                <Link href={`/hotel/${selectedHotel.id}`} className="hover:text-brand-blue transition-colors truncate max-w-[140px]">
                  {selectedHotel.name}
                </Link>
                <ChevronIcon />
              </>
            )}
            <span className="text-gray-700 font-medium">Payment</span>
          </nav>

          {/* Progress steps */}
          <PaymentProgressSteps />

          {/* Page title */}
          <div className="mb-6">
            <h1 className="font-extrabold text-gray-900 text-2xl sm:text-3xl leading-tight">
              Secure Payment
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Complete your reservation for{' '}
              <span className="font-semibold text-gray-700">
                {selectedHotel?.name ?? 'your selected hotel'}
              </span>
            </p>
          </div>

          {/* Secure checkout banner — full width */}
          <SecureCheckoutBanner />

          {/* Two-column layout */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6 lg:items-start">

            {/* LEFT — Booking Summary */}
            <div>
              <BookingSummaryCard
                hotel={selectedHotel}
                room={selectedRoom}
                checkIn={checkInDate}
                checkOut={checkOutDate}
                guests={guests}
              />

              {/* Reserve with confidence block */}
              <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
                <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Reserve with Confidence
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      icon: (
                        <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ),
                      title: 'Instant Confirmation',
                      sub: 'Receive your booking reference immediately',
                    },
                    {
                      icon: (
                        <svg className="w-4 h-4 text-brand-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      ),
                      title: 'No Card Fees',
                      sub: 'We never charge hidden processing fees',
                    },
                    {
                      icon: (
                        <svg className="w-4 h-4 text-brand-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      ),
                      title: 'Encrypted Payment',
                      sub: '256-bit SSL protects every transaction',
                    },
                    {
                      icon: (
                        <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      ),
                      title: 'Free Cancellation',
                      sub: 'Cancel anytime before check-in',
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="mt-0.5">{item.icon}</div>
                      <div>
                        <p className="text-gray-800 text-sm font-semibold">{item.title}</p>
                        <p className="text-gray-400 text-xs">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — Payment area */}
            <div className="space-y-5">

              {/* Payment method selector */}
              <PaymentMethodSelector selected={selectedMethod} onChange={(m) => { setSelectedMethod(m); setPaymentError(null); }} />

              {/* Payment form based on method */}
              {selectedMethod === 'apple-pay' && (
                <ApplePaySection
                  onPay={() => handlePayment()}
                  isProcessing={isProcessing}
                  totalPrice={totalPrice}
                />
              )}
              {selectedMethod === 'google-pay' && (
                <GooglePaySection
                  onPay={() => handlePayment()}
                  isProcessing={isProcessing}
                  totalPrice={totalPrice}
                />
              )}
              {(selectedMethod === 'credit-card' || selectedMethod === 'debit-card') && (
                <CardPaymentForm
                  method={selectedMethod}
                  onSubmit={(card) => handlePayment(card)}
                  isProcessing={isProcessing}
                  totalPrice={totalPrice}
                />
              )}

              {/* Payment error */}
              {paymentError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-red-700 font-semibold text-sm">Payment failed</p>
                    <p className="text-red-600 text-xs mt-0.5">{paymentError}</p>
                  </div>
                </div>
              )}

              {/* Bottom trust badges */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    icon: (
                      <svg className="w-6 h-6 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    ),
                    label: 'Secure Booking',
                    sub: '256-bit SSL',
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                    label: 'Free Cancel',
                    sub: 'Until check-in',
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    ),
                    label: 'No Card Fees',
                    sub: 'Price guaranteed',
                  },
                ].map((badge) => (
                  <div
                    key={badge.label}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm py-4 px-3 text-center"
                  >
                    <div className="flex justify-center mb-2">{badge.icon}</div>
                    <p className="text-gray-800 text-xs font-bold leading-tight">{badge.label}</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">{badge.sub}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
