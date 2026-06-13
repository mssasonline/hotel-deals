'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import CountrySelect from '@/app/components/CountrySelect';
import type { Country } from '@/lib/countries';

export interface UserDetailsValues {
  fullName: string;
  phoneCountryCode: string;  // e.g. "+966"
  phoneCountryIso: string;   // e.g. "SA"
  phoneNumber: string;       // e.g. "501234567"
  countryIso: string;        // addr_country ISO-2, e.g. "SA"
}

interface UserDetailsFormProps {
  email: string;
  initialValues?: UserDetailsValues;
  onChange?: (data: UserDetailsValues) => void;
}

const INPUT_CLASS =
  'w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors';
const LABEL_CLASS = 'block text-sm font-semibold text-gray-700 mb-1.5';

export default function UserDetailsForm({ email, initialValues, onChange }: UserDetailsFormProps) {
  const t = useTranslation();
  const { language } = useAppSettingsStore();

  const [fullName,        setFullName]        = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+971');
  const [phoneCountryIso,  setPhoneCountryIso]  = useState('AE');
  const [phoneNumber,     setPhoneNumber]     = useState('');
  const [countryIso,      setCountryIso]      = useState('');
  const initialized = useRef(false);

  // One-time initialisation from profile data
  useEffect(() => {
    if (!initialized.current && initialValues) {
      setFullName(initialValues.fullName);
      setPhoneCountryCode(initialValues.phoneCountryCode || '+971');
      setPhoneCountryIso(initialValues.phoneCountryIso  || 'AE');
      setPhoneNumber(initialValues.phoneNumber);
      setCountryIso(initialValues.countryIso);
      onChange?.({ ...initialValues });
      initialized.current = true;
    }
  }, [initialValues, onChange]);

  function emit(patch: Partial<UserDetailsValues>) {
    const next: UserDetailsValues = {
      fullName, phoneCountryCode, phoneCountryIso, phoneNumber, countryIso,
      ...patch,
    };
    onChange?.(next);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-blue-light rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg leading-tight">{t['form.yourDetails']}</h2>
            <p className="text-gray-400 text-xs">{t['form.leadGuestInfo']}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Full Name */}
        <div>
          <label htmlFor="ud-fullName" className={LABEL_CLASS}>
            {t['form.fullName']} <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              id="ud-fullName"
              type="text"
              placeholder={t['form.namePlaceholder']}
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); emit({ fullName: e.target.value }); }}
              autoComplete="name"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
            />
          </div>
        </div>

        {/* Email — read-only */}
        <div>
          <label htmlFor="ud-email" className={LABEL_CLASS}>
            {t['form.emailAddress']} <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              id="ud-email"
              type="email"
              value={email}
              readOnly
              className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 text-sm cursor-not-allowed select-none"
            />
          </div>
          <p className="text-gray-400 text-xs mt-1 ml-1">{t['form.emailReadOnly']}</p>
        </div>

        {/* Phone — country code + number */}
        <div>
          <label className={LABEL_CLASS}>
            {t['form.phoneNumber']} <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">{t['account.countryCode']}</p>
              <CountrySelect
                value={phoneCountryIso}
                onChange={(c: Country) => {
                  setPhoneCountryCode(c.dialCode);
                  setPhoneCountryIso(c.code);
                  emit({ phoneCountryCode: c.dialCode, phoneCountryIso: c.code });
                }}
                language={language}
                placeholder={t['account.searchCountry']}
                searchPlaceholder={t['account.searchCountry']}
                showDialCode
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{t['account.phoneNumberLocal']}</p>
              <input
                id="ud-phone"
                type="tel"
                inputMode="numeric"
                placeholder={t['account.phoneNumberPlaceholder']}
                value={phoneNumber}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setPhoneNumber(v);
                  emit({ phoneNumber: v });
                }}
                autoComplete="tel-national"
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </div>

        {/* Country of residence */}
        <div>
          <label className={LABEL_CLASS}>
            {t['form.country']} <span className="text-red-400">*</span>
          </label>
          <CountrySelect
            value={countryIso}
            onChange={(c: Country) => {
              setCountryIso(c.code);
              emit({ countryIso: c.code });
            }}
            language={language}
            placeholder={t['form.selectCountry']}
            searchPlaceholder={t['form.selectCountry']}
          />
        </div>

        {/* Confirmation note */}
        <div className="bg-brand-blue-light rounded-xl px-4 py-3 flex items-start gap-2">
          <svg className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-brand-blue text-xs">{t['form.confirmationNote']}</p>
        </div>
      </div>
    </div>
  );
}
