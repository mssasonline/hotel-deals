import type { Language } from '@/store/appSettingsStore';

export interface LanguageInfo {
  code: Language;
  nativeName: string;
  englishName: string;
  flag: string;
  rtl?: boolean;
  supported?: boolean; // true = fully translated; false = falls back to English
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'en',    nativeName: 'English (US)',     englishName: 'English (US)',          flag: '🇺🇸', supported: true },
  { code: 'ar',    nativeName: 'العربية',           englishName: 'Arabic',   rtl: true,  flag: '🇸🇦', supported: true },
  { code: 'fr',    nativeName: 'Français',         englishName: 'French',               flag: '🇫🇷', supported: true },
  { code: 'ru',    nativeName: 'Русский',          englishName: 'Russian',              flag: '🇷🇺', supported: true },
  { code: 'de',    nativeName: 'Deutsch',          englishName: 'German',               flag: '🇩🇪', supported: true },
  { code: 'zh-cn', nativeName: '简体中文',          englishName: 'Chinese (Simplified)', flag: '🇨🇳', supported: true },
  { code: 'tr',    nativeName: 'Türkçe',           englishName: 'Turkish',              flag: '🇹🇷', supported: true },
  { code: 'es',    nativeName: 'Español',          englishName: 'Spanish',              flag: '🇪🇸' },
  { code: 'en-gb', nativeName: 'English (UK)',     englishName: 'English (UK)',         flag: '🇬🇧' },
  { code: 'nl',    nativeName: 'Nederlands',       englishName: 'Dutch',                flag: '🇳🇱' },
  { code: 'es-ar', nativeName: 'Español (AR)',     englishName: 'Spanish (Argentina)',  flag: '🇦🇷' },
  { code: 'es-mx', nativeName: 'Español (MX)',     englishName: 'Spanish (Mexico)',     flag: '🇲🇽' },
  { code: 'ca',    nativeName: 'Català',           englishName: 'Catalan',              flag: '🇪🇸' },
  { code: 'it',    nativeName: 'Italiano',         englishName: 'Italian',              flag: '🇮🇹' },
  { code: 'pt',    nativeName: 'Português (PT)',   englishName: 'Portuguese (Portugal)',flag: '🇵🇹' },
  { code: 'pt-br', nativeName: 'Português (BR)',   englishName: 'Portuguese (Brazil)',  flag: '🇧🇷' },
  { code: 'nb',    nativeName: 'Norsk',            englishName: 'Norwegian',            flag: '🇳🇴' },
  { code: 'fi',    nativeName: 'Suomi',            englishName: 'Finnish',              flag: '🇫🇮' },
  { code: 'sv',    nativeName: 'Svenska',          englishName: 'Swedish',              flag: '🇸🇪' },
  { code: 'da',    nativeName: 'Dansk',            englishName: 'Danish',               flag: '🇩🇰' },
  { code: 'cs',    nativeName: 'Čeština',          englishName: 'Czech',                flag: '🇨🇿' },
  { code: 'hu',    nativeName: 'Magyar',           englishName: 'Hungarian',            flag: '🇭🇺' },
  { code: 'ro',    nativeName: 'Română',           englishName: 'Romanian',             flag: '🇷🇴' },
  { code: 'ja',    nativeName: '日本語',            englishName: 'Japanese',             flag: '🇯🇵' },
  { code: 'zh-tw', nativeName: '繁體中文',          englishName: 'Chinese (Traditional)',flag: '🇹🇼' },
  { code: 'pl',    nativeName: 'Polski',           englishName: 'Polish',               flag: '🇵🇱' },
  { code: 'el',    nativeName: 'Ελληνικά',         englishName: 'Greek',                flag: '🇬🇷' },
  { code: 'bg',    nativeName: 'Български',        englishName: 'Bulgarian',            flag: '🇧🇬' },
  { code: 'ko',    nativeName: '한국어',            englishName: 'Korean',               flag: '🇰🇷' },
  { code: 'lv',    nativeName: 'Latviski',         englishName: 'Latvian',              flag: '🇱🇻' },
  { code: 'uk',    nativeName: 'Українська',       englishName: 'Ukrainian',            flag: '🇺🇦' },
  { code: 'id',    nativeName: 'Bahasa Indonesia', englishName: 'Indonesian',           flag: '🇮🇩' },
  { code: 'ms',    nativeName: 'Bahasa Malaysia',  englishName: 'Malay',                flag: '🇲🇾' },
  { code: 'th',    nativeName: 'ภาษาไทย',         englishName: 'Thai',                 flag: '🇹🇭' },
  { code: 'et',    nativeName: 'Eesti',            englishName: 'Estonian',             flag: '🇪🇪' },
  { code: 'hr',    nativeName: 'Hrvatski',         englishName: 'Croatian',             flag: '🇭🇷' },
  { code: 'lt',    nativeName: 'Lietuvių',         englishName: 'Lithuanian',           flag: '🇱🇹' },
  { code: 'sk',    nativeName: 'Slovenčina',       englishName: 'Slovak',               flag: '🇸🇰' },
  { code: 'sr',    nativeName: 'Srpski',           englishName: 'Serbian',              flag: '🇷🇸' },
  { code: 'sl',    nativeName: 'Slovenščina',      englishName: 'Slovenian',            flag: '🇸🇮' },
  { code: 'vi',    nativeName: 'Tiếng Việt',       englishName: 'Vietnamese',           flag: '🇻🇳' },
  { code: 'fil',   nativeName: 'Filipino',         englishName: 'Filipino',             flag: '🇵🇭' },
  { code: 'is',    nativeName: 'Íslenska',         englishName: 'Icelandic',            flag: '🇮🇸' },
];

export const RTL_LANGUAGES = new Set<Language>(
  LANGUAGES.filter((l) => l.rtl).map((l) => l.code)
);
