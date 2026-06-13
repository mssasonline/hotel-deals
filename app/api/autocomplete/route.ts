import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface AutocompleteItem {
  type: 'city' | 'hotel' | 'country';
  name: string;
  subtitle?: string;
  searchValue: string;
  hotelId?: number;
}

type Row = { id: number; name: string; city: string | null; country: string | null };

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() ?? '';
  if (!q) return NextResponse.json([]);

  const { data, error } = await supabase
    .from('hotels')
    .select('id, name, city, country')
    .order('id');

  if (error || !data) return NextResponse.json([]);

  const rows = data as Row[];

  // ── Unique countries matching the query ─────────────────────────────
  const seenCountries = new Set<string>();
  const countries: AutocompleteItem[] = [];
  for (const row of rows) {
    const country = row.country?.trim() ?? '';
    if (!country || seenCountries.has(country)) continue;
    if (country.toLowerCase().includes(q)) {
      seenCountries.add(country);
      countries.push({
        type: 'country',
        name: country,
        subtitle: 'All hotels in this country',
        searchValue: country,
      });
    }
  }

  // ── Unique cities matching the query ────────────────────────────────
  const seenCities = new Set<string>();
  const cities: AutocompleteItem[] = [];
  for (const row of rows) {
    const city = row.city?.trim() ?? '';
    if (!city || seenCities.has(city)) continue;
    if (city.toLowerCase().includes(q)) {
      seenCities.add(city);
      cities.push({
        type: 'city',
        name: city,
        subtitle: row.country?.trim() || undefined,
        searchValue: city,
      });
    }
  }

  // ── Hotels whose name matches — link directly by id ─────────────────
  const hotels: AutocompleteItem[] = rows
    .filter((r) => r.name.toLowerCase().includes(q))
    .map((r) => ({
      type: 'hotel' as const,
      name: r.name,
      subtitle: [r.city, r.country].filter(Boolean).join(', '),
      searchValue: r.name,
      hotelId: r.id,
    }));

  // ── Sort: starts-with = highest priority ────────────────────────────
  const score = (item: AutocompleteItem): number => {
    const n = item.name.toLowerCase();
    if (n.startsWith(q)) {
      if (item.type === 'city')    return 0;
      if (item.type === 'country') return 1;
      return 2;
    }
    if (item.type === 'city')    return 3;
    if (item.type === 'country') return 4;
    return 5;
  };

  const results = [...cities, ...countries, ...hotels].sort((a, b) => score(a) - score(b));
  return NextResponse.json(results.slice(0, 12));
}
