'use client';

import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';

const STAT_ICONS = [
  <svg key="hotels" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>,
  <svg key="cities" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
  <svg key="rating" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>,
  <svg key="bookings" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>,
];

const STAT_VALUES = ['200+', '10', '4.9★', '50K+'];

export default function StatsBar() {
  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);

  const labels = [
    t['stats.hotels'],
    t['stats.cities'],
    t['stats.avgRating'],
    t['stats.bookings'],
  ];

  return (
    <div
      className="border-b"
      style={{
        background: 'linear-gradient(135deg, #FEFCE8 0%, #FFFFFF 40%, #FFFFFF 60%, #EEF4FF 100%)',
        borderColor: 'rgba(180,83,9,0.08)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 sm:divide-x divide-blue-900/[0.06]">
          {STAT_VALUES.map((value, i) => (
            <div key={labels[i]} className="flex items-center justify-center gap-4 py-6 px-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white transition-transform duration-300 hover:scale-110"
                style={{
                  background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
                  boxShadow: '0 3px 12px rgba(30,58,138,0.24)',
                }}
              >
                {STAT_ICONS[i]}
              </div>
              <div>
                <div
                  className="text-2xl font-extrabold leading-none"
                  style={{
                    color: '#B45309',
                    letterSpacing: '-0.03em',
                    fontFamily: 'var(--font-playfair), Georgia, serif',
                  }}
                >
                  {value}
                </div>
                <div className="text-xs mt-1 font-medium" style={{ color: '#64748B' }}>{labels[i]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
