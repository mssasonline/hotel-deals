'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import AutocompleteSearch from '@/app/components/AutocompleteSearch';
import CountdownTimer from '@/app/components/CountdownTimer';
import PricingPulseBar from '@/app/components/PricingPulseBar';
import { getCurrentTier, type PriceTier } from '@/lib/pricingEngine';
import { localDateISO, localTomorrowISO } from '@/lib/dateUtils';

const TIER_GRADIENTS: Record<number, string> = {
  0: 'linear-gradient(135deg, #1A0E38 0%, #2E1F5E 50%, #3D2B72 100%)',  // Midnight — deep cosmic
  1: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)',                // Early Bird — brand blue
  2: 'linear-gradient(135deg, #92400E 0%, #B45309 50%, #D97706 100%)',   // Afternoon — amber
  3: 'linear-gradient(135deg, #2B2050 0%, #453470 50%, #5C4890 100%)',   // Evening Rush — Dubai dusk
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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

      {/* ── Hero background ── */}
      <div
        className="relative min-h-[620px] flex items-center justify-center text-white bg-cover bg-center"
        style={{ backgroundImage: "url('/BackGraund.jpeg')" }}
      >
        {/* Base dark overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,22,68,0.72) 0%, rgba(15,34,96,0.42) 45%, rgba(10,22,68,0.68) 100%)' }} />
        {/* Side vignette */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.2) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.2) 100%)' }} />

        {/* Animated aurora orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-[700px] h-[700px] rounded-full opacity-[0.18] animate-aurora"
            style={{
              background: 'radial-gradient(circle, rgba(217,119,6,0.55) 0%, rgba(37,99,235,0.35) 45%, transparent 70%)',
              top: '-20%', left: '25%',
              filter: 'blur(70px)',
            }}
          />
          <div
            className="absolute w-[500px] h-[500px] rounded-full opacity-[0.12]"
            style={{
              background: 'radial-gradient(circle, rgba(37,99,235,0.65) 0%, transparent 70%)',
              bottom: '-10%', right: '5%',
              filter: 'blur(55px)',
              animation: 'aurora 18s ease-in-out infinite reverse',
            }}
          />
        </div>

        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full py-16">

          {/* Trust badge */}
          <div
            className={`mb-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <span
              className="inline-flex items-center gap-2.5 text-white/90 text-xs font-semibold px-5 py-2.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.22)', boxShadow: '0 2px 16px rgba(0,0,0,0.15)' }}
            >
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" style={{ boxShadow: '0 0 6px #34d399', animation: 'pulse 2s ease-in-out infinite' }} />
              Live pricing · Updated every few hours
              <span className="w-px h-3 bg-white/30" />
              <svg className="w-3.5 h-3.5 text-yellow-300 fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              4.9 Rating
            </span>
          </div>

          {/* Live pricing pulse gauge — the signature element */}
          <PricingPulseBar />

          {/* Main headline */}
          <h1
            className={`text-4xl sm:text-5xl lg:text-[3.75rem] xl:text-[4.25rem] font-extrabold mb-3 leading-[1.06] transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: mounted ? '80ms' : '0ms', color: '#ffffff', textShadow: '0 2px 32px rgba(0,0,0,0.35)', letterSpacing: '-0.035em' }}
          >
            {t['hero.titleLine1']}
            <span
              className="block mt-1"
              style={{
                background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 45%, #FCD34D 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t['hero.titleLine2']}
            </span>
          </h1>

          {/* Gold accent divider */}
          <div
            className={`mx-auto mb-6 transition-all duration-700 ${mounted ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}
            style={{ width: '64px', height: '3px', background: 'linear-gradient(90deg, transparent, #D97706, #FCD34D, #D97706, transparent)', borderRadius: '2px', transitionDelay: mounted ? '160ms' : '0ms', transformOrigin: 'center' }}
          />

          <p
            className={`text-base sm:text-lg lg:text-xl mb-9 max-w-2xl mx-auto leading-relaxed transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ color: 'rgba(255,255,255,0.78)', transitionDelay: mounted ? '180ms' : '0ms', fontWeight: 400, letterSpacing: '0.01em' }}
          >
            {t['hero.heroSubtitle']}
          </p>

          {/* ── Premium search bar ── */}
          <form
            action="/search"
            method="GET"
            className={`rounded-2xl p-2 flex flex-col sm:flex-row gap-1.5 mb-5 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.28), 0 4px 20px rgba(30,58,138,0.15), 0 0 0 1px rgba(255,255,255,0.5)',
              transitionDelay: mounted ? '280ms' : '0ms',
            }}
          >
            <AutocompleteSearch
              value={city}
              onChange={setCity}
              inputName="city"
              placeholder={t['hero.searchPlaceholderText']}
              wrapperClassName="flex-1 flex items-center gap-2.5 px-4 py-3 border-b sm:border-b-0 sm:border-r cursor-text"
              inputClassName="flex-1 outline-none text-gray-800 placeholder-gray-400 text-sm bg-transparent font-medium"
              iconSize="w-5 h-5"
            />
            <input type="hidden" name="checkin"  value={localDateISO()} />
            <input type="hidden" name="checkout" value={localTomorrowISO()} />
            <input type="hidden" name="guests"   value="2" />
            <div className="flex gap-1.5">
              <button
                type="submit"
                className="flex-1 text-white font-bold px-8 py-3 rounded-xl transition-all duration-250 whitespace-nowrap text-sm"
                style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 3px 14px rgba(30,58,138,0.38)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 5px 22px rgba(30,58,138,0.55)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 14px rgba(30,58,138,0.38)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                {t['hero.searchButton']}
              </button>
              <button
                type="button"
                onClick={handleNearMe}
                disabled={locating}
                className="flex items-center justify-center gap-2 font-semibold px-4 py-3 rounded-xl transition-all duration-250 text-sm disabled:opacity-60 shrink-0 whitespace-nowrap cursor-pointer"
                style={{ background: '#EEF4FF', color: '#1E3A8A', border: '1.5px solid rgba(30,58,138,0.14)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#dce7ff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(30,58,138,0.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#EEF4FF'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(30,58,138,0.14)'; }}
              >
                {locating ? (
                  <span className="w-4 h-4 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
                ) : (
                  <span className="relative flex items-center justify-center w-4 h-4 shrink-0">
                    <span className="absolute w-3 h-3 rounded-full animate-ping opacity-35" style={{ background: '#22C55E' }} />
                    <svg className="w-4 h-4 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                )}
                {t['hero.nearMeBtn']}
              </button>
            </div>
          </form>

          {/* Popular cities */}
          <div className={`flex flex-wrap justify-center items-center gap-2 transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: mounted ? '380ms' : '0ms' }}>
            <span className="text-white/45 text-xs font-medium mr-1">Popular:</span>
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
                className="text-white/80 hover:text-white text-xs font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.18)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.35)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)'; }}
              >
                {t[labelKey]}
              </a>
            ))}
          </div>

        </div>
      </div>

      {/* ── Live tier announcement banner ── */}
      <div
        className={`text-white text-center py-3 px-4 relative overflow-hidden`}
        style={{ background: `linear-gradient(135deg, var(--from, #1e1b4b) 0%, var(--to, #312e81) 100%)` }}
      >
        <div
          className="absolute inset-0"
          style={{ background: TIER_GRADIENTS[tier.tierIndex], opacity: 0.95 }}
        />
        <div className="relative max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-5 text-sm">
          <span className="font-bold text-base flex items-center gap-2">
            <svg className="w-4 h-4 text-orange-300 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C9 7 6 8.5 6 13a6 6 0 0012 0c0-4.5-3-5-3-9-1 2-2 3-3 3s-1.5-1-1.5-2.5C10.5 4 12 2 12 2zm0 18a4 4 0 01-4-4c0-2.5 1.5-3.5 2-5 .5 1.5 1.5 2.5 2 2.5s2-2 2-3c.5 1.5 2 3 2 5.5a4 4 0 01-4 4z"/>
            </svg>
            {t['hero.tierBannerText']
              .replace('{label}', t[TIER_LABEL_KEYS[tier.tierIndex]])
              .replace('{pct}', String(tier.discountPercent))}
          </span>
          <span className="h-4 w-px bg-white/25 hidden sm:block" />
          <span className="opacity-85 text-xs sm:text-sm">
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
