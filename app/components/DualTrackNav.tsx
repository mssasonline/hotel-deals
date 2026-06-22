'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentTier } from '@/lib/pricingEngine';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';

export default function DualTrackNav() {
  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);
  const [discountPct, setDiscountPct] = useState(() => getCurrentTier().discountPercent);

  useEffect(() => {
    const id = setInterval(() => setDiscountPct(getCurrentTier().discountPercent), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="border-b" style={{ background: '#F8FAFC', borderColor: 'rgba(30,58,138,0.08)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <p className="text-center text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#94A3B8' }}>
          {t['nav.chooseTrack']}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* Track 1 — Time-based */}
          <Link
            href="/search"
            className="group flex items-center gap-4 bg-white rounded-2xl px-5 py-4 text-start transition-all hover:-translate-y-0.5"
            style={{ border: '1px solid rgba(30,58,138,0.12)', boxShadow: '0 1px 4px rgba(30,58,138,0.06)', transition: 'all 0.2s ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(30,58,138,0.12)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(30,58,138,0.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(30,58,138,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(30,58,138,0.12)'; }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 8px rgba(30,58,138,0.25)' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-extrabold text-gray-900 text-sm">{t['nav.liveHourlyPricing']}</span>
                <span className="bg-brand-blue text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                  -{discountPct}% {t['nav.nowBadge']}
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-snug">
                {t['nav.liveDescription']}
              </p>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-brand-blue transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Link>

          {/* Track 2 — Partner deals */}
          <Link
            href="/special-deals"
            className="group flex items-center gap-4 bg-white rounded-2xl px-5 py-4 text-start transition-all hover:-translate-y-0.5"
            style={{ border: '1px solid rgba(180,83,9,0.15)', boxShadow: '0 1px 4px rgba(180,83,9,0.06)', transition: 'all 0.2s ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(180,83,9,0.12)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(180,83,9,0.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(180,83,9,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(180,83,9,0.15)'; }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform" style={{ background: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)', boxShadow: '0 2px 8px rgba(180,83,9,0.25)' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-extrabold text-gray-900 text-sm">{t['nav.specialDeals']}</span>
                <span className="bg-brand-gold text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                  {t['nav.fixedBadge']}
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-snug">
                {t['nav.partnerDescription']}
              </p>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-brand-gold transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Link>

        </div>
      </div>
    </div>
  );
}
