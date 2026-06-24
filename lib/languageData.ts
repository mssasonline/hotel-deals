import type { Language } from '@/store/appSettingsStore';

export interface LanguageInfo {
  code: Language;
  nativeName: string;
  englishName: string;
  rtl?: boolean;
  supported?: boolean; // true = fully translated; false = falls back to English
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'en',    nativeName: 'English (US)',     englishName: 'English (US)',          supported: true },
  { code: 'ar',    nativeName: 'العربية',           englishName: 'Arabic',   rtl: true,  supported: true },
  { code: 'fr',    nativeName: 'Français',         englishName: 'French',               supported: true },
  { code: 'ru',    nativeName: 'Русский',          englishName: 'Russian',              supported: true },
  { code: 'hi',    nativeName: 'हिन्दी',           englishName: 'Hindi',                supported: true },
  { code: 'es',    nativeName: 'Español',          englishName: 'Spanish' },
  { code: 'en-gb', nativeName: 'English (UK)',     englishName: 'English (UK)' },
  { code: 'de',    nativeName: 'Deutsch',          englishName: 'German' },
  { code: 'nl',    nativeName: 'Nederlands',       englishName: 'Dutch' },
  { code: 'es-ar', nativeName: 'Español (AR)',     englishName: 'Spanish (Argentina)' },
  { code: 'es-mx', nativeName: 'Español (MX)',     englishName: 'Spanish (Mexico)' },
  { code: 'ca',    nativeName: 'Català',           englishName: 'Catalan' },
  { code: 'it',    nativeName: 'Italiano',         englishName: 'Italian' },
  { code: 'pt',    nativeName: 'Português (PT)',   englishName: 'Portuguese (Portugal)' },
  { code: 'pt-br', nativeName: 'Português (BR)',   englishName: 'Portuguese (Brazil)' },
  { code: 'nb',    nativeName: 'Norsk',            englishName: 'Norwegian' },
  { code: 'fi',    nativeName: 'Suomi',            englishName: 'Finnish' },
  { code: 'sv',    nativeName: 'Svenska',          englishName: 'Swedish' },
  { code: 'da',    nativeName: 'Dansk',            englishName: 'Danish' },
  { code: 'cs',    nativeName: 'Čeština',          englishName: 'Czech' },
  { code: 'hu',    nativeName: 'Magyar',           englishName: 'Hungarian' },
  { code: 'ro',    nativeName: 'Română',           englishName: 'Romanian' },
  { code: 'ja',    nativeName: '日本語',            englishName: 'Japanese' },
  { code: 'zh-cn', nativeName: '简体中文',          englishName: 'Chinese (Simplified)' },
  { code: 'zh-tw', nativeName: '繁體中文',          englishName: 'Chinese (Traditional)' },
  { code: 'pl',    nativeName: 'Polski',           englishName: 'Polish' },
  { code: 'el',    nativeName: 'Ελληνικά',         englishName: 'Greek' },
  { code: 'tr',    nativeName: 'Türkçe',           englishName: 'Turkish' },
  { code: 'bg',    nativeName: 'Български',        englishName: 'Bulgarian' },
  { code: 'ko',    nativeName: '한국어',            englishName: 'Korean' },
  { code: 'lv',    nativeName: 'Latviski',         englishName: 'Latvian' },
  { code: 'uk',    nativeName: 'Українська',       englishName: 'Ukrainian' },
  { code: 'id',    nativeName: 'Bahasa Indonesia', englishName: 'Indonesian' },
  { code: 'ms',    nativeName: 'Bahasa Malaysia',  englishName: 'Malay' },
  { code: 'th',    nativeName: 'ภาษาไทย',         englishName: 'Thai' },
  { code: 'et',    nativeName: 'Eesti',            englishName: 'Estonian' },
  { code: 'hr',    nativeName: 'Hrvatski',         englishName: 'Croatian' },
  { code: 'lt',    nativeName: 'Lietuvių',         englishName: 'Lithuanian' },
  { code: 'sk',    nativeName: 'Slovenčina',       englishName: 'Slovak' },
  { code: 'sr',    nativeName: 'Srpski',           englishName: 'Serbian' },
  { code: 'sl',    nativeName: 'Slovenščina',      englishName: 'Slovenian' },
  { code: 'vi',    nativeName: 'Tiếng Việt',       englishName: 'Vietnamese' },
  { code: 'fil',   nativeName: 'Filipino',         englishName: 'Filipino' },
  { code: 'is',    nativeName: 'Íslenska',         englishName: 'Icelandic' },
];

export const RTL_LANGUAGES = new Set<Language>(
  LANGUAGES.filter((l) => l.rtl).map((l) => l.code)
);
