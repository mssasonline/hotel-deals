import type { Language } from '@/store/appSettingsStore';

export interface Country {
  code: string;
  dialCode: string;
  flag: string;
  en: string;
  ar: string;
  fr: string;
}

export const COUNTRIES: Country[] = [
  { code: 'AE', dialCode: '+971', flag: '🇦🇪', en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة', fr: 'Émirats arabes unis' },
  { code: 'SA', dialCode: '+966', flag: '🇸🇦', en: 'Saudi Arabia', ar: 'المملكة العربية السعودية', fr: 'Arabie saoudite' },
  { code: 'KW', dialCode: '+965', flag: '🇰🇼', en: 'Kuwait', ar: 'الكويت', fr: 'Koweït' },
  { code: 'QA', dialCode: '+974', flag: '🇶🇦', en: 'Qatar', ar: 'قطر', fr: 'Qatar' },
  { code: 'BH', dialCode: '+973', flag: '🇧🇭', en: 'Bahrain', ar: 'البحرين', fr: 'Bahreïn' },
  { code: 'OM', dialCode: '+968', flag: '🇴🇲', en: 'Oman', ar: 'عُمان', fr: 'Oman' },
  { code: 'JO', dialCode: '+962', flag: '🇯🇴', en: 'Jordan', ar: 'الأردن', fr: 'Jordanie' },
  { code: 'EG', dialCode: '+20', flag: '🇪🇬', en: 'Egypt', ar: 'مصر', fr: 'Égypte' },
  { code: 'LB', dialCode: '+961', flag: '🇱🇧', en: 'Lebanon', ar: 'لبنان', fr: 'Liban' },
  { code: 'IQ', dialCode: '+964', flag: '🇮🇶', en: 'Iraq', ar: 'العراق', fr: 'Irak' },
  { code: 'SY', dialCode: '+963', flag: '🇸🇾', en: 'Syria', ar: 'سوريا', fr: 'Syrie' },
  { code: 'YE', dialCode: '+967', flag: '🇾🇪', en: 'Yemen', ar: 'اليمن', fr: 'Yémen' },
  { code: 'LY', dialCode: '+218', flag: '🇱🇾', en: 'Libya', ar: 'ليبيا', fr: 'Libye' },
  { code: 'TN', dialCode: '+216', flag: '🇹🇳', en: 'Tunisia', ar: 'تونس', fr: 'Tunisie' },
  { code: 'MA', dialCode: '+212', flag: '🇲🇦', en: 'Morocco', ar: 'المغرب', fr: 'Maroc' },
  { code: 'DZ', dialCode: '+213', flag: '🇩🇿', en: 'Algeria', ar: 'الجزائر', fr: 'Algérie' },
  { code: 'SD', dialCode: '+249', flag: '🇸🇩', en: 'Sudan', ar: 'السودان', fr: 'Soudan' },
  { code: 'PS', dialCode: '+970', flag: '🇵🇸', en: 'Palestine', ar: 'فلسطين', fr: 'Palestine' },
  { code: 'TR', dialCode: '+90', flag: '🇹🇷', en: 'Turkey', ar: 'تركيا', fr: 'Turquie' },
  { code: 'IR', dialCode: '+98', flag: '🇮🇷', en: 'Iran', ar: 'إيران', fr: 'Iran' },
  { code: 'PK', dialCode: '+92', flag: '🇵🇰', en: 'Pakistan', ar: 'باكستان', fr: 'Pakistan' },
  { code: 'IN', dialCode: '+91', flag: '🇮🇳', en: 'India', ar: 'الهند', fr: 'Inde' },
  { code: 'BD', dialCode: '+880', flag: '🇧🇩', en: 'Bangladesh', ar: 'بنغلاديش', fr: 'Bangladesh' },
  { code: 'PH', dialCode: '+63', flag: '🇵🇭', en: 'Philippines', ar: 'الفلبين', fr: 'Philippines' },
  { code: 'ID', dialCode: '+62', flag: '🇮🇩', en: 'Indonesia', ar: 'إندونيسيا', fr: 'Indonésie' },
  { code: 'MY', dialCode: '+60', flag: '🇲🇾', en: 'Malaysia', ar: 'ماليزيا', fr: 'Malaisie' },
  { code: 'SG', dialCode: '+65', flag: '🇸🇬', en: 'Singapore', ar: 'سنغافورة', fr: 'Singapour' },
  { code: 'TH', dialCode: '+66', flag: '🇹🇭', en: 'Thailand', ar: 'تايلاند', fr: 'Thaïlande' },
  { code: 'CN', dialCode: '+86', flag: '🇨🇳', en: 'China', ar: 'الصين', fr: 'Chine' },
  { code: 'JP', dialCode: '+81', flag: '🇯🇵', en: 'Japan', ar: 'اليابان', fr: 'Japon' },
  { code: 'KR', dialCode: '+82', flag: '🇰🇷', en: 'South Korea', ar: 'كوريا الجنوبية', fr: 'Corée du Sud' },
  { code: 'VN', dialCode: '+84', flag: '🇻🇳', en: 'Vietnam', ar: 'فيتنام', fr: 'Vietnam' },
  { code: 'MM', dialCode: '+95', flag: '🇲🇲', en: 'Myanmar', ar: 'ميانمار', fr: 'Myanmar' },
  { code: 'NP', dialCode: '+977', flag: '🇳🇵', en: 'Nepal', ar: 'نيبال', fr: 'Népal' },
  { code: 'LK', dialCode: '+94', flag: '🇱🇰', en: 'Sri Lanka', ar: 'سريلانكا', fr: 'Sri Lanka' },
  { code: 'AF', dialCode: '+93', flag: '🇦🇫', en: 'Afghanistan', ar: 'أفغانستان', fr: 'Afghanistan' },
  { code: 'AZ', dialCode: '+994', flag: '🇦🇿', en: 'Azerbaijan', ar: 'أذربيجان', fr: 'Azerbaïdjan' },
  { code: 'KZ', dialCode: '+7', flag: '🇰🇿', en: 'Kazakhstan', ar: 'كازاخستان', fr: 'Kazakhstan' },
  { code: 'UZ', dialCode: '+998', flag: '🇺🇿', en: 'Uzbekistan', ar: 'أوزبكستان', fr: 'Ouzbékistan' },
  { code: 'GB', dialCode: '+44', flag: '🇬🇧', en: 'United Kingdom', ar: 'المملكة المتحدة', fr: 'Royaume-Uni' },
  { code: 'US', dialCode: '+1', flag: '🇺🇸', en: 'United States', ar: 'الولايات المتحدة', fr: 'États-Unis' },
  { code: 'CA', dialCode: '+1', flag: '🇨🇦', en: 'Canada', ar: 'كندا', fr: 'Canada' },
  { code: 'AU', dialCode: '+61', flag: '🇦🇺', en: 'Australia', ar: 'أستراليا', fr: 'Australie' },
  { code: 'NZ', dialCode: '+64', flag: '🇳🇿', en: 'New Zealand', ar: 'نيوزيلندا', fr: 'Nouvelle-Zélande' },
  { code: 'DE', dialCode: '+49', flag: '🇩🇪', en: 'Germany', ar: 'ألمانيا', fr: 'Allemagne' },
  { code: 'FR', dialCode: '+33', flag: '🇫🇷', en: 'France', ar: 'فرنسا', fr: 'France' },
  { code: 'ES', dialCode: '+34', flag: '🇪🇸', en: 'Spain', ar: 'إسبانيا', fr: 'Espagne' },
  { code: 'IT', dialCode: '+39', flag: '🇮🇹', en: 'Italy', ar: 'إيطاليا', fr: 'Italie' },
  { code: 'NL', dialCode: '+31', flag: '🇳🇱', en: 'Netherlands', ar: 'هولندا', fr: 'Pays-Bas' },
  { code: 'BE', dialCode: '+32', flag: '🇧🇪', en: 'Belgium', ar: 'بلجيكا', fr: 'Belgique' },
  { code: 'CH', dialCode: '+41', flag: '🇨🇭', en: 'Switzerland', ar: 'سويسرا', fr: 'Suisse' },
  { code: 'AT', dialCode: '+43', flag: '🇦🇹', en: 'Austria', ar: 'النمسا', fr: 'Autriche' },
  { code: 'SE', dialCode: '+46', flag: '🇸🇪', en: 'Sweden', ar: 'السويد', fr: 'Suède' },
  { code: 'NO', dialCode: '+47', flag: '🇳🇴', en: 'Norway', ar: 'النرويج', fr: 'Norvège' },
  { code: 'DK', dialCode: '+45', flag: '🇩🇰', en: 'Denmark', ar: 'الدنمارك', fr: 'Danemark' },
  { code: 'FI', dialCode: '+358', flag: '🇫🇮', en: 'Finland', ar: 'فنلندا', fr: 'Finlande' },
  { code: 'PL', dialCode: '+48', flag: '🇵🇱', en: 'Poland', ar: 'بولندا', fr: 'Pologne' },
  { code: 'RU', dialCode: '+7', flag: '🇷🇺', en: 'Russia', ar: 'روسيا', fr: 'Russie' },
  { code: 'UA', dialCode: '+380', flag: '🇺🇦', en: 'Ukraine', ar: 'أوكرانيا', fr: 'Ukraine' },
  { code: 'GR', dialCode: '+30', flag: '🇬🇷', en: 'Greece', ar: 'اليونان', fr: 'Grèce' },
  { code: 'PT', dialCode: '+351', flag: '🇵🇹', en: 'Portugal', ar: 'البرتغال', fr: 'Portugal' },
  { code: 'CZ', dialCode: '+420', flag: '🇨🇿', en: 'Czech Republic', ar: 'جمهورية التشيك', fr: 'République tchèque' },
  { code: 'HU', dialCode: '+36', flag: '🇭🇺', en: 'Hungary', ar: 'المجر', fr: 'Hongrie' },
  { code: 'RO', dialCode: '+40', flag: '🇷🇴', en: 'Romania', ar: 'رومانيا', fr: 'Roumanie' },
  { code: 'IL', dialCode: '+972', flag: '🇮🇱', en: 'Israel', ar: 'إسرائيل', fr: 'Israël' },
  { code: 'ZA', dialCode: '+27', flag: '🇿🇦', en: 'South Africa', ar: 'جنوب أفريقيا', fr: 'Afrique du Sud' },
  { code: 'NG', dialCode: '+234', flag: '🇳🇬', en: 'Nigeria', ar: 'نيجيريا', fr: 'Nigéria' },
  { code: 'KE', dialCode: '+254', flag: '🇰🇪', en: 'Kenya', ar: 'كينيا', fr: 'Kenya' },
  { code: 'GH', dialCode: '+233', flag: '🇬🇭', en: 'Ghana', ar: 'غانا', fr: 'Ghana' },
  { code: 'ET', dialCode: '+251', flag: '🇪🇹', en: 'Ethiopia', ar: 'إثيوبيا', fr: 'Éthiopie' },
  { code: 'TZ', dialCode: '+255', flag: '🇹🇿', en: 'Tanzania', ar: 'تنزانيا', fr: 'Tanzanie' },
  { code: 'BR', dialCode: '+55', flag: '🇧🇷', en: 'Brazil', ar: 'البرازيل', fr: 'Brésil' },
  { code: 'AR', dialCode: '+54', flag: '🇦🇷', en: 'Argentina', ar: 'الأرجنتين', fr: 'Argentine' },
  { code: 'MX', dialCode: '+52', flag: '🇲🇽', en: 'Mexico', ar: 'المكسيك', fr: 'Mexique' },
  { code: 'CO', dialCode: '+57', flag: '🇨🇴', en: 'Colombia', ar: 'كولومبيا', fr: 'Colombie' },
  { code: 'CL', dialCode: '+56', flag: '🇨🇱', en: 'Chile', ar: 'تشيلي', fr: 'Chili' },
];

export function getCountryName(country: Country, language: Language): string {
  if (language === 'ar') return country.ar;
  if (language === 'fr') return country.fr;
  return country.en;
}

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}
