'use client';

import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import DealsSection from './DealsSection';
import type { Hotel } from './HotelCard';

interface HomeDealsSectionsProps {
  featuredDeals: Hotel[];
  tonightDeals: Hotel[];
}

export default function HomeDealsSections({ featuredDeals, tonightDeals }: HomeDealsSectionsProps) {
  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);

  return (
    <>
      {featuredDeals.length > 0 ? (
        <DealsSection
          id="last-minute"
          title={t['sections.featuredDeals']}
          subtitle={t['sections.featuredDealsSubtitle']}
          hotels={featuredDeals}
          viewAllLabel={t['sections.viewAllDeals']}
        />
      ) : (
        <section className="py-14 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
            {t['sections.noDealsFallback']}
          </div>
        </section>
      )}
      {tonightDeals.length > 0 && (
        <DealsSection
          id="tonight"
          title={t['sections.tonightDeals']}
          subtitle={t['sections.tonightDealsSubtitle']}
          hotels={tonightDeals}
          viewAllLabel={t['sections.viewAllTonightDeals']}
          dark
        />
      )}
    </>
  );
}
