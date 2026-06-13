export interface AutocompleteItem {
  type: 'city' | 'hotel';
  name: string;
  subtitle?: string;
  searchValue: string; // the city name submitted to /search?city=
}

const CITIES: AutocompleteItem[] = [
  { type: 'city', name: 'Dubai', subtitle: 'United Arab Emirates', searchValue: 'Dubai' },
  { type: 'city', name: 'Abu Dhabi', subtitle: 'United Arab Emirates', searchValue: 'Abu Dhabi' },
  { type: 'city', name: 'Sharjah', subtitle: 'United Arab Emirates', searchValue: 'Sharjah' },
  { type: 'city', name: 'London', subtitle: 'United Kingdom', searchValue: 'London' },
  { type: 'city', name: 'Paris', subtitle: 'France', searchValue: 'Paris' },
  { type: 'city', name: 'New York', subtitle: 'United States', searchValue: 'New York' },
  { type: 'city', name: 'Los Angeles', subtitle: 'United States', searchValue: 'Los Angeles' },
  { type: 'city', name: 'Miami', subtitle: 'United States', searchValue: 'Miami' },
  { type: 'city', name: 'Tokyo', subtitle: 'Japan', searchValue: 'Tokyo' },
  { type: 'city', name: 'Singapore', subtitle: 'Singapore', searchValue: 'Singapore' },
  { type: 'city', name: 'Barcelona', subtitle: 'Spain', searchValue: 'Barcelona' },
  { type: 'city', name: 'Rome', subtitle: 'Italy', searchValue: 'Rome' },
  { type: 'city', name: 'Amsterdam', subtitle: 'Netherlands', searchValue: 'Amsterdam' },
  { type: 'city', name: 'Istanbul', subtitle: 'Turkey', searchValue: 'Istanbul' },
  { type: 'city', name: 'Bangkok', subtitle: 'Thailand', searchValue: 'Bangkok' },
  { type: 'city', name: 'Sydney', subtitle: 'Australia', searchValue: 'Sydney' },
  { type: 'city', name: 'Toronto', subtitle: 'Canada', searchValue: 'Toronto' },
  { type: 'city', name: 'Hong Kong', subtitle: 'China', searchValue: 'Hong Kong' },
  { type: 'city', name: 'Bali', subtitle: 'Indonesia', searchValue: 'Bali' },
  { type: 'city', name: 'Maldives', subtitle: 'Maldives', searchValue: 'Maldives' },
  { type: 'city', name: 'Phuket', subtitle: 'Thailand', searchValue: 'Phuket' },
  { type: 'city', name: 'Lisbon', subtitle: 'Portugal', searchValue: 'Lisbon' },
  { type: 'city', name: 'Vienna', subtitle: 'Austria', searchValue: 'Vienna' },
  { type: 'city', name: 'Prague', subtitle: 'Czech Republic', searchValue: 'Prague' },
  { type: 'city', name: 'Zurich', subtitle: 'Switzerland', searchValue: 'Zurich' },
];

const HOTELS: AutocompleteItem[] = [
  // Dubai hotels from data/hotels.ts
  { type: 'hotel', name: 'Atlantis Tower Suites', subtitle: 'Dubai', searchValue: 'Dubai' },
  { type: 'hotel', name: 'Skyline Resort & Spa', subtitle: 'Dubai', searchValue: 'Dubai' },
  { type: 'hotel', name: 'The Grand Palace Hotel', subtitle: 'Dubai', searchValue: 'Dubai' },
  { type: 'hotel', name: 'Desert Oasis Retreat', subtitle: 'Dubai', searchValue: 'Dubai' },
  { type: 'hotel', name: 'Burj Al Suites', subtitle: 'Dubai', searchValue: 'Dubai' },
  { type: 'hotel', name: 'Ocean View Stay', subtitle: 'Dubai', searchValue: 'Dubai' },
  { type: 'hotel', name: 'Royal Palm Hotel', subtitle: 'Dubai', searchValue: 'Dubai' },
  { type: 'hotel', name: 'Marina Bay Suites', subtitle: 'Dubai', searchValue: 'Dubai' },
  { type: 'hotel', name: 'Heritage House Hotel', subtitle: 'Dubai', searchValue: 'Dubai' },
  { type: 'hotel', name: 'Palm Garden Resort', subtitle: 'Dubai', searchValue: 'Dubai' },
  // Well-known Dubai hotels
  { type: 'hotel', name: 'Burj Al Arab', subtitle: 'Dubai', searchValue: 'Dubai' },
  { type: 'hotel', name: 'Atlantis The Palm', subtitle: 'Dubai', searchValue: 'Dubai' },
  { type: 'hotel', name: 'Jumeirah Beach Hotel', subtitle: 'Dubai', searchValue: 'Dubai' },
  { type: 'hotel', name: 'One&Only The Palm', subtitle: 'Dubai', searchValue: 'Dubai' },
  { type: 'hotel', name: 'Armani Hotel Dubai', subtitle: 'Dubai', searchValue: 'Dubai' },
  { type: 'hotel', name: 'Four Seasons Resort Dubai', subtitle: 'Dubai', searchValue: 'Dubai' },
  // International hotels
  { type: 'hotel', name: 'The Ritz London', subtitle: 'London', searchValue: 'London' },
  { type: 'hotel', name: 'Claridge\'s', subtitle: 'London', searchValue: 'London' },
  { type: 'hotel', name: 'The Savoy', subtitle: 'London', searchValue: 'London' },
  { type: 'hotel', name: 'Shangri-La Paris', subtitle: 'Paris', searchValue: 'Paris' },
  { type: 'hotel', name: 'Hotel Le Bristol', subtitle: 'Paris', searchValue: 'Paris' },
  { type: 'hotel', name: 'The Plaza Hotel', subtitle: 'New York', searchValue: 'New York' },
  { type: 'hotel', name: 'The St. Regis New York', subtitle: 'New York', searchValue: 'New York' },
  { type: 'hotel', name: 'Marina Bay Sands', subtitle: 'Singapore', searchValue: 'Singapore' },
  { type: 'hotel', name: 'Park Hyatt Tokyo', subtitle: 'Tokyo', searchValue: 'Tokyo' },
  { type: 'hotel', name: 'Mandarin Oriental Bangkok', subtitle: 'Bangkok', searchValue: 'Bangkok' },
  { type: 'hotel', name: 'Park Hyatt Sydney', subtitle: 'Sydney', searchValue: 'Sydney' },
];

export const AUTOCOMPLETE_DATA: AutocompleteItem[] = [...CITIES, ...HOTELS];

export function searchAutocomplete(query: string): AutocompleteItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matches = AUTOCOMPLETE_DATA.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)),
  );

  // Starts-with matches appear before contains matches; cities before hotels within each group
  return matches
    .sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aStarts = aName.startsWith(q);
      const bStarts = bName.startsWith(q);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      if (a.type !== b.type) return a.type === 'city' ? -1 : 1;
      return aName.localeCompare(bName);
    })
    .slice(0, 8);
}
