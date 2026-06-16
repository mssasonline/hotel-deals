'use client';

import type { Language, CurrencyCode } from '@/store/appSettingsStore';
import type { getTranslations } from '@/lib/i18n/translations';
import { CURRENCY_OPTIONS, LANGUAGE_OPTIONS } from '../utils';
import { SearchableSelect } from './SearchableSelect';

type Translations = ReturnType<typeof getTranslations>;

interface PreferencesSectionProps {
  currency: CurrencyCode;
  language: Language;
  onCurrencyChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  t: Translations;
}

export function PreferencesSection({
  currency,
  language,
  onCurrencyChange,
  onLanguageChange,
  t,
}: PreferencesSectionProps) {
  return (
    <section className="mb-6">
      <div className="mb-3 px-1">
        <h2 className="text-base font-bold text-gray-900">{t['account.customisationPreferences']}</h2>
        <p className="text-sm text-gray-500 mt-1">{t['account.customisationSubtitle']}</p>
      </div>
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>

        <div className="px-6 py-5 border-b border-gray-50">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                {t['account.currencyLabel']}
              </p>
              <SearchableSelect
                options={CURRENCY_OPTIONS}
                value={currency}
                onChange={onCurrencyChange}
                searchPlaceholder={t['account.searchCurrency']}
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                {t['account.languageLabel']}
              </p>
              <SearchableSelect
                options={LANGUAGE_OPTIONS}
                value={language}
                onChange={onLanguageChange}
                searchPlaceholder={t['account.searchLanguage']}
              />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
