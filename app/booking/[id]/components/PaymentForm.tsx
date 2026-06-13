'use client';

import { useState } from 'react';

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function getCardType(number: string): 'visa' | 'mastercard' | 'amex' | 'unknown' {
  const n = number.replace(/\s/g, '');
  if (n.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  return 'unknown';
}

function CardIcon({ type, active }: { type: string; active: boolean }) {
  const base = `px-2 py-1 rounded border text-[10px] font-extrabold transition-all ${
    active ? 'border-brand-blue bg-brand-blue text-white shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-400'
  }`;
  return <span className={base}>{type.toUpperCase()}</span>;
}

interface PaymentFormProps {
  onChange?: (data: { cardNumber: string; expiry: string; cvv: string; cardHolder: string }) => void;
}

export default function PaymentForm({ onChange }: PaymentFormProps) {
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cvvFocused, setCvvFocused] = useState(false);

  const cardType = getCardType(cardNumber);

  function update(field: string, value: string) {
    onChange?.({ cardHolder, cardNumber, expiry, cvv, [field]: value });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-blue-light rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg leading-tight">Payment Details</h2>
              <p className="text-gray-400 text-xs">Your info is encrypted and secure</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="text-green-600 text-xs font-semibold">SSL Secured</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Card type indicators */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs font-medium">Accepted:</span>
          <CardIcon type="Visa" active={cardType === 'visa'} />
          <CardIcon type="MC" active={cardType === 'mastercard'} />
          <CardIcon type="Amex" active={cardType === 'amex'} />
        </div>

        {/* Cardholder name */}
        <div>
          <label htmlFor="cardHolder" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Cardholder Name
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              id="cardHolder"
              type="text"
              placeholder="Name as it appears on card"
              value={cardHolder}
              onChange={(e) => { setCardHolder(e.target.value); update('cardHolder', e.target.value); }}
              autoComplete="cc-name"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
            />
          </div>
        </div>

        {/* Card number */}
        <div>
          <label htmlFor="cardNumber" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Card Number
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <input
              id="cardNumber"
              type="text"
              inputMode="numeric"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => {
                const fmt = formatCardNumber(e.target.value);
                setCardNumber(fmt);
                update('cardNumber', fmt);
              }}
              autoComplete="cc-number"
              className="w-full pl-10 pr-16 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
            />
            {cardType !== 'unknown' && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-brand-blue bg-brand-blue-light px-1.5 py-0.5 rounded">
                {cardType.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Expiry + CVV */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="expiry" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Expiry Date
            </label>
            <input
              id="expiry"
              type="text"
              inputMode="numeric"
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => {
                const fmt = formatExpiry(e.target.value);
                setExpiry(fmt);
                update('expiry', fmt);
              }}
              autoComplete="cc-exp"
              maxLength={5}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
            />
          </div>

          <div>
            <label htmlFor="cvv" className="block text-sm font-semibold text-gray-700 mb-1.5">
              CVV
              <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 bg-gray-200 text-gray-500 text-[9px] rounded-full cursor-help" title="3-digit code on the back of your card">?</span>
            </label>
            <div className="relative">
              <input
                id="cvv"
                type={cvvFocused ? 'tel' : 'password'}
                inputMode="numeric"
                placeholder="•••"
                value={cvv}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setCvv(val);
                  update('cvv', val);
                }}
                onFocus={() => setCvvFocused(true)}
                onBlur={() => setCvvFocused(false)}
                autoComplete="cc-csc"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Security note */}
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-gray-400 text-xs">
            Your card details are protected by 256-bit SSL encryption. We never store your CVV.
          </p>
        </div>
      </div>
    </div>
  );
}
