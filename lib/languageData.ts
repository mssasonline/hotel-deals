import type { Language } from '@/store/appSettingsStore';

export interface LanguageInfo {
  code: Language;
  nativeName: string;
  englishName: string;
  countryCode: string; // ISO 3166-1 alpha-2 lowercase — used for flagcdn.com images
  rtl?: boolean;
  supported?: boolean; // true = fully translated; false = falls back to English
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'en',    nativeName: 'English (US)',     englishName: 'English (US)',          countryCode: 'us', supported: true },
  { code: 'ar',    nativeName: 'العربية',           englishName: 'Arabic',   rtl: true,  countryCode: 'sa', supported: true },
  { code: 'fr',    nativeName: 'Français',         englishName: 'French',               countryCode: 'fr', supported: true },
  { code: 'ru',    nativeName: 'Русский',          englishName: 'Russian',              countryCode: 'ru', supported: true },
  { code: 'de',    nativeName: 'Deutsch',          englishName: 'German',               countryCode: 'de', supported: true },
  { code: 'zh-cn', nativeName: '简体中文',          englishName: 'Chinese (Simplified)', countryCode: 'cn', supported: true },
  { code: 'tr',    nativeName: 'Türkçe',           englishName: 'Turkish',              countryCode: 'tr', supported: true },
  { code: 'es',    nativeName: 'Español',          englishName: 'Spanish',              countryCode: 'es' },
  { code: 'en-gb', nativeName: 'English (UK)',     englishName: 'English (UK)',         countryCode: 'gb' },
  { code: 'nl',    nativeName: 'Nederlands',       englishName: 'Dutch',                countryCode: 'nl' },
  { code: 'es-ar', nativeName: 'Español (AR)',     englishName: 'Spanish (Argentina)',  countryCode: 'ar' },
  { code: 'es-mx', nativeName: 'Español (MX)',     englishName: 'Spanish (Mexico)',     countryCode: 'mx' },
  { code: 'ca',    nativeName: 'Català',           englishName: 'Catalan',              countryCode: 'es' },
  { code: 'it',    nativeName: 'Italiano',         englishName: 'Italian',              countryCode: 'it' },
  { code: 'pt',    nativeName: 'Português (PT)',   englishName: 'Portuguese (Portugal)',countryCode: 'pt' },
  { code: 'pt-br', nativeName: 'Português (BR)',   englishName: 'Portuguese (Brazil)',  countryCode: 'br' },
  { code: 'nb',    nativeName: 'Norsk',            englishName: 'Norwegian',            countryCode: 'no' },
  { code: 'fi',    nativeName: 'Suomi',            englishName: 'Finnish',              countryCode: 'fi' },
  { code: 'sv',    nativeName: 'Svenska',          englishName: 'Swedish',              countryCode: 'se' },
  { code: 'da',    nativeName: 'Dansk',            englishName: 'Danish',               countryCode: 'dk' },
  { code: 'cs',    nativeName: 'Čeština',          englishName: 'Czech',                countryCode: 'cz' },
  { code: 'hu',    nativeName: 'Magyar',           englishName: 'Hungarian',            countryCode: 'hu' },
  { code: 'ro',    nativeName: 'Română',           englishName: 'Romanian',             countryCode: 'ro' },
  { code: 'ja',    nativeName: '日本語',            englishName: 'Japanese',             countryCode: 'jp' },
  { code: 'zh-tw', nativeName: '繁體中文',          englishName: 'Chinese (Traditional)',countryCode: 'tw' },
  { code: 'pl',    nativeName: 'Polski',           englishName: 'Polish',               countryCode: 'pl' },
  { code: 'el',    nativeName: 'Ελληνικά',         englishName: 'Greek',                countryCode: 'gr' },
  { code: 'bg',    nativeName: 'Български',        englishName: 'Bulgarian',            countryCode: 'bg' },
  { code: 'ko',    nativeName: '한국어',            englishName: 'Korean',               countryCode: 'kr' },
  { code: 'lv',    nativeName: 'Latviski',         englishName: 'Latvian',              countryCode: 'lv' },
  { code: 'uk',    nativeName: 'Українська',       englishName: 'Ukrainian',            countryCode: 'ua' },
  { code: 'id',    nativeName: 'Bahasa Indonesia', englishName: 'Indonesian',           countryCode: 'id' },
  { code: 'ms',    nativeName: 'Bahasa Malaysia',  englishName: 'Malay',                countryCode: 'my' },
  { code: 'th',    nativeName: 'ภาษาไทย',         englishName: 'Thai',                 countryCode: 'th' },
  { code: 'et',    nativeName: 'Eesti',            englishName: 'Estonian',             countryCode: 'ee' },
  { code: 'hr',    nativeName: 'Hrvatski',         englishName: 'Croatian',             countryCode: 'hr' },
  { code: 'lt',    nativeName: 'Lietuvių',         englishName: 'Lithuanian',           countryCode: 'lt' },
  { code: 'sk',    nativeName: 'Slovenčina',       englishName: 'Slovak',               countryCode: 'sk' },
  { code: 'sr',    nativeName: 'Srpski',           englishName: 'Serbian',              countryCode: 'rs' },
  { code: 'sl',    nativeName: 'Slovenščina',      englishName: 'Slovenian',            countryCode: 'si' },
  { code: 'vi',    nativeName: 'Tiếng Việt',       englishName: 'Vietnamese',           countryCode: 'vn' },
  { code: 'fil',   nativeName: 'Filipino',         englishName: 'Filipino',             countryCode: 'ph' },
  { code: 'is',    nativeName: 'Íslenska',         englishName: 'Icelandic',            countryCode: 'is' },
];

export const RTL_LANGUAGES = new Set<Language>(
  LANGUAGES.filter((l) => l.rtl).map((l) => l.code)
);
