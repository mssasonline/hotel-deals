import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rateLimit, getClientIp, rateLimitHeaders } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const LIMIT = 30;
const WINDOW = 60_000;

interface AutocompleteItem {
  type: 'city' | 'hotel' | 'country';
  name: string;
  subtitle?: string;
  searchValue: string;
  hotelId?: number;
}

type Row = { id: number; name: string; city: string | null; country: string | null };

const AR_EN: Record<string, string> = {
  'دبي': 'dubai', 'أبوظبي': 'abu dhabi', 'أبو ظبي': 'abu dhabi',
  'الشارقة': 'sharjah', 'شارقة': 'sharjah',
  'عجمان': 'ajman', 'الفجيرة': 'fujairah', 'فجيرة': 'fujairah',
  'رأس الخيمة': 'ras al khaimah', 'راس الخيمة': 'ras al khaimah',
  'رأس الخيمه': 'ras al khaimah', 'راس الخيمه': 'ras al khaimah',
  'أم القيوين': 'umm al quwain', 'ام القيوين': 'umm al quwain',
  'الإمارات': 'united arab emirates', 'إمارات': 'emirates',
  'باريس': 'paris', 'فرنسا': 'france', 'لندن': 'london',
  'المالديف': 'maldives', 'مالديف': 'maldives',
  'طوكيو': 'tokyo', 'نيويورك': 'new york', 'بانكوك': 'bangkok',
  'سنغافورة': 'singapore', 'إسطنبول': 'istanbul', 'اسطنبول': 'istanbul',
  'القاهرة': 'cairo', 'مصر': 'egypt', 'الرياض': 'riyadh',
  'السعودية': 'saudi arabia', 'الكويت': 'kuwait', 'الدوحة': 'doha',
  'قطر': 'qatar', 'مسقط': 'muscat', 'عمان': 'oman', 'عُمان': 'oman',
  'المنامة': 'manama', 'البحرين': 'bahrain',
};

const EN_AR: Record<string, string> = {
  'dubai': 'دبي', 'abu dhabi': 'أبوظبي', 'sharjah': 'الشارقة',
  'ajman': 'عجمان', 'fujairah': 'الفجيرة',
  'ras al khaimah': 'رأس الخيمة', 'umm al quwain': 'أم القيوين',
  'united arab emirates': 'الإمارات', 'uae': 'الإمارات',
  'france': 'فرنسا', 'paris': 'باريس', 'london': 'لندن',
  'united kingdom': 'المملكة المتحدة', 'uk': 'المملكة المتحدة',
  'maldives': 'المالديف', 'tokyo': 'طوكيو', 'japan': 'اليابان',
  'new york': 'نيويورك', 'usa': 'الولايات المتحدة',
  'united states': 'الولايات المتحدة', 'bangkok': 'بانكوك',
  'thailand': 'تايلاند', 'singapore': 'سنغافورة',
  'istanbul': 'إسطنبول', 'turkey': 'تركيا',
  'cairo': 'القاهرة', 'egypt': 'مصر',
  'riyadh': 'الرياض', 'saudi arabia': 'السعودية',
  'kuwait city': 'الكويت', 'kuwait': 'الكويت',
  'doha': 'الدوحة', 'qatar': 'قطر',
  'muscat': 'مسقط', 'oman': 'عُمان',
  'manama': 'المنامة', 'bahrain': 'البحرين',
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isArabic(s: string): boolean {
  return /[؀-ۿ]/.test(s);
}

function resolveEn(q: string): string {
  return AR_EN[q] ?? q;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`autocomplete:${ip}`, LIMIT, WINDOW);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: rateLimitHeaders(rl, LIMIT) },
    );
  }

  const raw  = norm(req.nextUrl.searchParams.get('q')?.trim() ?? '');
  if (!raw) return NextResponse.json([]);

  const qEn  = resolveEn(raw);   // English equivalent (or raw if no translation)
  const arabic = isArabic(raw);

  const { data, error } = await supabase
    .from('hotels')
    .select('id, name, city, country')
    .order('id');

  if (error || !data) return NextResponse.json([]);

  const rows = data as Row[];

  // ── Unique cities matching the query ────────────────────────────────
  const seenCities = new Set<string>();
  const cities: AutocompleteItem[] = [];
  for (const row of rows) {
    const city = row.city?.trim() ?? '';
    if (!city || seenCities.has(city)) continue;
    const cityNorm = norm(city);
    const cityAR   = norm(EN_AR[cityNorm] ?? '');
    const matched  = cityNorm.startsWith(qEn) || (arabic && cityAR.startsWith(raw));
    if (!matched) continue;
    seenCities.add(city);
    const displayName    = arabic && cityAR ? EN_AR[cityNorm] ?? city : city;
    const displayCountry = arabic ? (EN_AR[norm(row.country?.trim() ?? '')] ?? row.country?.trim() ?? '') : (row.country?.trim() ?? '');
    cities.push({
      type: 'city',
      name: displayName,
      subtitle: displayCountry || undefined,
      searchValue: city,
    });
  }

  // ── Unique countries matching the query ─────────────────────────────
  const seenCountries = new Set<string>();
  const countries: AutocompleteItem[] = [];
  for (const row of rows) {
    const country = row.country?.trim() ?? '';
    if (!country || seenCountries.has(country)) continue;
    const countryNorm = norm(country);
    const countryAR   = norm(EN_AR[countryNorm] ?? '');
    const matched     = countryNorm.startsWith(qEn) || (arabic && countryAR.startsWith(raw));
    if (!matched) continue;
    seenCountries.add(country);
    const displayName = arabic && countryAR ? EN_AR[countryNorm] ?? country : country;
    countries.push({
      type: 'country',
      name: displayName,
      subtitle: arabic ? 'كل الفنادق في هذا البلد' : 'All hotels in this country',
      searchValue: country,
    });
  }

  // ── Hotels whose name matches — prefix on name, includes on full query ─
  const hotels: AutocompleteItem[] = rows
    .filter((r) => norm(r.name).startsWith(qEn) || norm(r.name).startsWith(raw))
    .map((r) => ({
      type: 'hotel' as const,
      name: r.name,
      subtitle: [
        arabic ? (EN_AR[norm(r.city ?? '')] ?? r.city) : r.city,
        arabic ? (EN_AR[norm(r.country ?? '')] ?? r.country) : r.country,
      ].filter(Boolean).join(', '),
      searchValue: r.name,
      hotelId: r.id,
    }));

  // ── Sort: starts-with wins; city > country > hotel ──────────────────
  const score = (item: AutocompleteItem): number => {
    if (item.type === 'city')    return 0;
    if (item.type === 'country') return 1;
    return 2;
  };

  const results = [...cities, ...countries, ...hotels].sort((a, b) => score(a) - score(b));
  return NextResponse.json(results.slice(0, 12));
}
