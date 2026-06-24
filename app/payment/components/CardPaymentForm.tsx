'use client';

import { useState } from 'react';
import type { PaymentMethod, CardDetails, CardNetworkType } from '../lib/types';
import CurrencyAmount from '@/app/components/CurrencyAmount';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';

interface Props {
  method: PaymentMethod;
  onSubmit: (card: CardDetails) => void;
  isProcessing: boolean;
  totalPrice: number;
}

type FieldKey = keyof CardDetails;
type FieldErrors = Partial<Record<FieldKey, string>>;
type FieldTouched = Partial<Record<FieldKey, boolean>>;

function detectCardType(number: string): CardNetworkType {
  const n = number.replace(/\s/g, '');
  if (!n) return null;
  if (n.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  return null;
}

function formatCardNumber(value: string, isAmex: boolean): string {
  const digits = value.replace(/\D/g, '');
  if (isAmex) {
    const d = digits.slice(0, 15);
    if (d.length <= 4) return d;
    if (d.length <= 10) return `${d.slice(0, 4)} ${d.slice(4)}`;
    return `${d.slice(0, 4)} ${d.slice(4, 10)} ${d.slice(10)}`;
  }
  return digits.slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function CardNetworkBadge({ type, active }: { type: string; active: boolean }) {
  return (
    <span
      className={`px-2 py-1 rounded border text-[10px] font-extrabold transition-all duration-150 ${
        active
          ? 'border-brand-blue bg-brand-blue text-white shadow-sm'
          : 'border-gray-200 bg-gray-50 text-gray-400'
      }`}
    >
      {type}
    </span>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  );
}

export default function CardPaymentForm({ method, onSubmit, isProcessing, totalPrice }: Props) {
  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);
  const [form, setForm] = useState<CardDetails>({
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<FieldTouched>({});
  const [showCvv, setShowCvv] = useState(false);

  const cardType = detectCardType(form.cardNumber);
  const isAmex = cardType === 'amex';
  const maxCvvLen = isAmex ? 4 : 3;
  const maxCardDigits = isAmex ? 15 : 16;

  function validateField(field: FieldKey, value: string): string | undefined {
    switch (field) {
      case 'cardholderName':
        if (!value.trim()) return t['payment.err.nameRequired'];
        if (value.trim().length < 2) return t['payment.err.nameMin'];
        break;
      case 'cardNumber': {
        const digits = value.replace(/\s/g, '');
        if (!digits) return t['payment.err.cardRequired'];
        if (digits.length !== maxCardDigits) return t['payment.err.mustBeDigits'].replace('{n}', String(maxCardDigits));
        break;
      }
      case 'expiryDate': {
        if (!value || value.length < 5) return t['payment.err.expiryFormat'];
        const [m, y] = value.split('/');
        const month = parseInt(m);
        const year = 2000 + parseInt(y || '0');
        const now = new Date();
        if (month < 1 || month > 12) return t['payment.err.invalidMonth'];
        if (
          year < now.getFullYear() ||
          (year === now.getFullYear() && month < now.getMonth() + 1)
        )
          return t['payment.err.cardExpired'];
        break;
      }
      case 'cvv':
        if (!value) return t['payment.err.cvvRequired'];
        if (value.length !== maxCvvLen) return t['payment.err.mustBeDigits'].replace('{n}', String(maxCvvLen));
        break;
    }
    return undefined;
  }

  function handleBlur(field: FieldKey) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, form[field]);
    setErrors((prev) => ({ ...prev, [field]: error }));
  }

  function handleChange(field: FieldKey, raw: string) {
    let value = raw;
    if (field === 'cardNumber') value = formatCardNumber(raw, isAmex);
    if (field === 'expiryDate') value = formatExpiry(raw);
    if (field === 'cvv') value = raw.replace(/\D/g, '').slice(0, maxCvvLen);
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  }

  function inputClass(field: FieldKey, extra = ''): string {
    const base = `w-full py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 rounded-xl border transition-colors ${extra}`;
    const err = errors[field];
    const valid = touched[field] && form[field] && !err;
    if (err) return `${base} border-red-400 bg-red-50 focus:ring-red-200/50 focus:border-red-400`;
    if (valid) return `${base} border-green-400 bg-green-50/40 focus:ring-green-200/50 focus:border-green-400`;
    return `${base} border-gray-200 bg-gray-50 focus:ring-brand-blue/30 focus:border-brand-blue`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fields: FieldKey[] = ['cardholderName', 'cardNumber', 'expiryDate', 'cvv'];
    const newErrors: FieldErrors = {};
    const newTouched: FieldTouched = {};
    fields.forEach((f) => {
      newTouched[f] = true;
      const err = validateField(f, form[f]);
      if (err) newErrors[f] = err;
    });
    setTouched(newTouched);
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) onSubmit(form);
  }

  const isDebit = method === 'debit-card';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-blue-light rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg leading-tight">
                {isDebit ? t['payment.debitCardTitle'] : t['payment.creditCardTitle']}
              </h2>
              <p className="text-gray-400 text-xs">{t['payment.encryptedNote']}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="text-green-600 text-xs font-semibold">{t['payment.sslSecured']}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="px-6 py-5 space-y-4">
          {/* Accepted card networks */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs font-medium">{t['payment.accepted']}</span>
            <CardNetworkBadge type="VISA" active={cardType === 'visa'} />
            <CardNetworkBadge type="MC" active={cardType === 'mastercard'} />
            <CardNetworkBadge type="AMEX" active={cardType === 'amex'} />
          </div>

          {/* Cardholder name */}
          <div>
            <label htmlFor="cardholderName" className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t['payment.cardHolder']}
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              {touched.cardholderName && form.cardholderName && !errors.cardholderName && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <input
                id="cardholderName"
                type="text"
                placeholder={t['payment.cardNamePlaceholder']}
                value={form.cardholderName}
                onChange={(e) => handleChange('cardholderName', e.target.value)}
                onBlur={() => handleBlur('cardholderName')}
                autoComplete="cc-name"
                className={inputClass('cardholderName', 'pl-10 pr-10')}
              />
            </div>
            <FieldError message={errors.cardholderName} />
          </div>

          {/* Card number */}
          <div>
            <label htmlFor="cardNumber" className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t['payment.cardNumber']}
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              {cardType && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-brand-blue bg-brand-blue-light px-1.5 py-0.5 rounded pointer-events-none">
                  {cardType === 'visa' ? 'VISA' : cardType === 'mastercard' ? 'MC' : 'AMEX'}
                </div>
              )}
              <input
                id="cardNumber"
                type="text"
                inputMode="numeric"
                placeholder={isAmex ? '3782 822463 10005' : '1234 5678 9012 3456'}
                value={form.cardNumber}
                onChange={(e) => handleChange('cardNumber', e.target.value)}
                onBlur={() => handleBlur('cardNumber')}
                autoComplete="cc-number"
                className={inputClass('cardNumber', 'pl-10 pr-16 font-mono tracking-wider')}
              />
            </div>
            <FieldError message={errors.cardNumber} />
          </div>

          {/* Expiry + CVV */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="expiryDate" className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t['payment.expiry']}
              </label>
              <input
                id="expiryDate"
                type="text"
                inputMode="numeric"
                placeholder="MM/YY"
                value={form.expiryDate}
                onChange={(e) => handleChange('expiryDate', e.target.value)}
                onBlur={() => handleBlur('expiryDate')}
                autoComplete="cc-exp"
                maxLength={5}
                className={inputClass('expiryDate', 'px-4 font-mono text-center')}
              />
              <FieldError message={errors.expiryDate} />
            </div>

            <div>
              <label htmlFor="cvv" className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                {t['payment.cvv']}
                <span
                  className="inline-flex items-center justify-center w-3.5 h-3.5 bg-gray-200 text-gray-500 text-[9px] rounded-full cursor-help"
                  title={`${maxCvvLen}-digit code on the ${isAmex ? 'front' : 'back'} of your card`}
                >
                  ?
                </span>
              </label>
              <div className="relative">
                <input
                  id="cvv"
                  type={showCvv ? 'text' : 'password'}
                  inputMode="numeric"
                  placeholder={isAmex ? '••••' : '•••'}
                  value={form.cvv}
                  onChange={(e) => handleChange('cvv', e.target.value)}
                  onBlur={() => { handleBlur('cvv'); setShowCvv(false); }}
                  onFocus={() => setShowCvv(true)}
                  autoComplete="cc-csc"
                  className={inputClass('cvv', 'px-4 pr-10 font-mono text-center')}
                />
                <button
                  type="button"
                  onClick={() => setShowCvv((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showCvv ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <FieldError message={errors.cvv} />
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-gray-400 text-xs">
              {t['payment.securityNote']}
            </p>
          </div>

          {/* Pay button */}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full text-white font-extrabold py-4 rounded-2xl text-lg transition-all duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t['payment.processing']}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {t['payment.paySecurely']} — <CurrencyAmount amount={totalPrice} />
              </>
            )}
          </button>

          <p className="text-center text-gray-400 text-xs flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {t['payment.reserveGuarantee']}
          </p>
        </div>
      </form>
    </div>
  );
}
