'use client';

import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import type { DestinationCity } from '@/lib/types';

interface Props {
  cities: DestinationCity[];
}

export default function PopularCities({ cities }: Props) {
  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);

  return (
    <section id="cities" className="py-14 bg-brand-blue-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t['sections.popularDestinations']}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {t['sections.popularDestinationsSubtitle']}
          </p>
          <div className="mt-2.5 h-1 w-14 bg-brand-gold rounded-full" />
        </div>

        {cities.length === 0 ? (
          <p className="text-sm text-gray-500">No destinations available right now.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {cities.map((city) => (
              <a
                key={city.id}
                href={`/search?city=${encodeURIComponent(city.name)}`}
                className="group relative h-32 rounded-2xl overflow-hidden transition-transform duration-200 hover:scale-105 hover:shadow-lg"
                style={{ background: city.gradient }}
                aria-label={`Explore ${city.name} deals`}
              >
                <div className="absolute inset-0 bg-black/15 group-hover:bg-black/5 transition-colors duration-200" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <span className="text-2xl mb-1">{city.emoji}</span>
                  <span className="font-bold text-sm">{city.name}</span>
                  <span className="text-white/65 text-xs mt-0.5">{city.deals_count.toLocaleString()} {t['cities.dealsLabel']}</span>
                </div>
              </a>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
