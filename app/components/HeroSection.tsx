'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import AutocompleteSearch from '@/app/components/AutocompleteSearch';
import CountdownTimer from '@/app/components/CountdownTimer';
import { getCurrentTier, type PriceTier } from '@/lib/pricingEngine';
import { localDateISO, localTomorrowISO } from '@/lib/dateUtils';

const TIER_COLORS: Record<number, string> = {
  0: 'from-purple-900 to-purple-700',
  1: 'from-brand-blue to-blue-700',
  2: 'from-orange-600 to-orange-500',
  3: 'from-red-700 to-red-600',
};

const TIER_LABEL_KEYS = [
  'tier.midnight',
  'tier.earlyBird',
  'tier.afternoon',
  'tier.evening',
] as const;

export default function HeroSection() {
  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);
  const router = useRouter();

  const [tier, setTier] = useState<PriceTier>(() => getCurrentTier());
  const [city, setCity] = useState('');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTier(getCurrentTier()), 60_000);
    return () => clearInterval(id);
  }, []);

  function handleNearMe() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        sessionStorage.setItem('sr_lat', String(latitude));
        sessionStorage.setItem('sr_lng', String(longitude));
        router.push(`/search?lat=${latitude}&lng=${longitude}&checkin=${localDateISO()}&checkout=${localTomorrowISO()}`);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  }

  return (
    <section id="search" className="relative flex flex-col">

      {/* ── Hero background ────────────────────────────────────── */}
      <div
        className="relative min-h-[520px] flex items-center justify-center text-white bg-cover bg-center"
        style={{ backgroundImage: "url('/BackGraund.jpeg')" }}
      >
        {/* Lighter overlay so the photo breathes */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/65" />

        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full py-14">

          {/* Headline */}
          <div className="mb-3">
            <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Live pricing — updates every few hours
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-3 leading-tight">
            {t['hero.titleLine1']}
            <span className="text-brand-gold block">{t['hero.titleLine2']}</span>
          </h1>

          <p className="text-base sm:text-lg text-white/75 mb-8 max-w-xl mx-auto leading-relaxed font-extrabold">
            {t['hero.heroSubtitle']}
          </p>

          {/* ── Search bar — always visible ──────────────────── */}
          <form
            action="/search"
            method="GET"
            className="bg-white rounded-2xl p-2 flex flex-col sm:flex-row gap-1 shadow-2xl mb-4"
          >
            <AutocompleteSearch
              value={city}
              onChange={setCity}
              inputName="city"
              placeholder={t['hero.searchPlaceholderText']}
              wrapperClassName="flex-1 flex items-center gap-2.5 px-4 py-2.5 border-b sm:border-b-0 sm:border-r border-gray-150 cursor-text"
              inputClassName="flex-1 outline-none text-gray-800 placeholder-gray-400 text-sm bg-transparent"
              iconSize="w-5 h-5"
            />
            <input type="hidden" name="checkin"  value={localDateISO()} />
            <input type="hidden" name="checkout" value={localTomorrowISO()} />
            <input type="hidden" name="guests"   value="2" />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleNearMe}
                disabled={locating}
                title={t['hero.nearMeBtn']}
                className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-4 py-3 rounded-xl transition-colors text-sm disabled:opacity-60 shrink-0"
              >
                {locating ? (
                  <span className="w-4 h-4 border-2 border-gray-400/40 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                <span className="hidden sm:inline">{t['hero.nearMeBtn']}</span>
              </button>
              <button
                type="submit"
                className="flex-1 bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold px-7 py-3 rounded-xl transition-colors whitespace-nowrap text-sm shadow-sm"
              >
                {t['hero.searchButton']}
              </button>
            </div>
          </form>

          {/* Popular cities shortcuts */}
          <div className="flex flex-wrap justify-center gap-2">
            {(
              [
                { query: 'Dubai',    labelKey: 'hero.cityDubai'    },
                { query: 'Paris',    labelKey: 'hero.cityParis'    },
                { query: 'London',   labelKey: 'hero.cityLondon'   },
                { query: 'New York', labelKey: 'hero.cityNewYork'  },
                { query: 'Maldives', labelKey: 'hero.cityMaldives' },
              ] as const
            ).map(({ query, labelKey }) => (
              <a
                key={query}
                href={`/search?city=${encodeURIComponent(query)}&checkin=${localDateISO()}&checkout=${localTomorrowISO()}&guests=2`}
                className="bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/25 text-white text-sm px-4 py-1.5 rounded-full transition-colors"
              >
                {t[labelKey]}
              </a>
            ))}
          </div>

        </div>
      </div>

      {/* ── Live tier announcement banner ──────────────────────── */}
      <div className={`bg-gradient-to-r ${TIER_COLORS[tier.tierIndex]} text-white text-center py-2.5 px-4`}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm">
          <span className="font-bold text-base">
            🔥 {t['hero.tierBannerText']
                  .replace('{label}', t[TIER_LABEL_KEYS[tier.tierIndex]])
                  .replace('{pct}', String(tier.discountPercent))}
          </span>
          <span className="opacity-80 text-xs sm:text-sm">
            <CountdownTimer
              nextTierTime={tier.nextTierTime}
              nextDiscountPercent={tier.nextDiscountPercent}
              variant="full"
              className="text-white/90"
            />
          </span>
        </div>
      </div>
    </section>
  );
}
