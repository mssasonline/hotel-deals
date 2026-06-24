import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CurrencyCode } from '@/lib/currencyData';

export type { CurrencyCode };

export type Language =
  | 'en'     // English (US)
  | 'ar'     // العربية
  | 'fr'     // Français
  | 'ru'     // Русский
  | 'es'     // Español
  | 'en-gb'  // English (UK)
  | 'de'     // Deutsch
  | 'nl'     // Nederlands
  | 'es-ar'  // Español (AR)
  | 'es-mx'  // Español (MX)
  | 'ca'     // Català
  | 'it'     // Italiano
  | 'pt'     // Português (PT)
  | 'pt-br'  // Português (BR)
  | 'nb'     // Norsk
  | 'fi'     // Suomi
  | 'sv'     // Svenska
  | 'da'     // Dansk
  | 'cs'     // Čeština
  | 'hu'     // Magyar
  | 'ro'     // Română
  | 'ja'     // 日本語
  | 'zh-cn'  // 简体中文
  | 'zh-tw'  // 繁體中文
  | 'pl'     // Polski
  | 'el'     // Ελληνικά
  | 'tr'     // Türkçe
  | 'bg'     // Български
  | 'ko'     // 한국어
  | 'lv'     // Latviski
  | 'uk'     // Українська
  | 'id'     // Bahasa Indonesia
  | 'ms'     // Bahasa Malaysia
  | 'th'     // ภาษาไทย
  | 'et'     // Eesti
  | 'hr'     // Hrvatski
  | 'lt'     // Lietuvių
  | 'sk'     // Slovenčina
  | 'sr'     // Srpski
  | 'sl'     // Slovenščina
  | 'vi'     // Tiếng Việt
  | 'fil'    // Filipino
  | 'is';    // Íslenska

interface AppSettingsState {
  language: Language;
  currency: CurrencyCode;
  timezone: string;
  setLanguage: (lang: Language) => void;
  setCurrency: (currency: CurrencyCode) => void;
  setTimezone: (tz: string) => void;
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      language: 'en',
      currency: 'usd',
      timezone: '',
      setLanguage: (language) => set({ language }),
      setCurrency: (currency) => set({ currency }),
      setTimezone: (timezone) => set({ timezone }),
    }),
    { name: 'sr-app-settings' }
  )
);
