'use client';

import Link from 'next/link';
import Image from 'next/image';
import AEDAmount from '@/app/partner/components/AEDAmount';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';

export interface SpecialDealPreviewItem {
  hotelId: number;
  hotelName: string;
  city: string;
  imageUrl: string | null;
  dealPrice: number;
  basePrice: number;
  discountPct: number;
  dealCount: number;
  endDate: string;
}

interface Props {
  deals: SpecialDealPreviewItem[];
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';

const DEFAULT_GRADIENTS = [
  'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
  'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
  'linear-gradient(135deg, #c79832 0%, #f7971e 60%, #ffd200 100%)',
];

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function SpecialDealsPreview({ deals }: Props) {
  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);

  return (
    <section id="partner-deals" className="py-14 bg-brand-blue-dark scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Section header ─────────────────────────────────────── */}
        <div className="flex items-end justify-between mb-8">
          <div>

            {/* Track label */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 bg-brand-gold/20 border border-brand-gold/30 text-brand-gold text-xs font-bold px-2.5 py-1 rounded-full">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {t['hotel.partnerDealBadge']}
              </div>
              <span className="text-xs font-bold text-white/30 uppercase tracking-wide">{t['sections.trackFixed']}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight" style={{ color: '#F8FAFC' }}>
              {t['nav.specialDeals']}
            </h2>

            <p className="text-sm mt-2 max-w-md leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {t['nav.partnerDescription']}
            </p>

            <div className="mt-3 h-0.5 w-14 rounded-full" style={{ background: 'linear-gradient(90deg, #B45309, #FCD34D)' }} />
          </div>

          <Link
            href="/special-deals"
            className="hidden sm:flex items-center gap-1.5 text-brand-gold hover:text-yellow-400 text-sm font-semibold transition-colors shrink-0 ml-4"
          >
            {t['sections.browseAll']}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* ── Content ────────────────────────────────────────────── */}
        {deals.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl px-8 py-10 text-center">
            <svg className="w-10 h-10 mx-auto mb-3 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <p className="text-white/40 text-sm font-medium mb-1">{t['sections.noPartnerDeals']}</p>
            <p className="text-white/25 text-xs">{t['sections.noPartnerDealsDesc']}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {deals.map((deal, i) => (
                <Link
                  key={deal.hotelId}
                  href={`/hotel/${deal.hotelId}`}
                  className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.28)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)'; }}
                >
                  {/* Image strip */}
                  <div className="relative h-36 overflow-hidden">
                    <div className="absolute inset-0" style={{ background: DEFAULT_GRADIENTS[i % 3] }} />
                    <Image
                      src={deal.imageUrl ?? FALLBACK_IMAGE}
                      alt={deal.hotelName}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-70"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    {/* Fixed price badge — contrasts with the "live" badge in Track 1 */}
                    <div className="absolute top-3 start-3 flex items-center gap-1.5 bg-brand-gold text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      -{deal.discountPct}% {t['nav.fixedBadge']}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <h3 className="font-bold text-xl truncate transition-colors" style={{ color: '#fff' }}>
                      {deal.hotelName}
                    </h3>
                    <p className="text-xs mt-0.5 mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>{deal.city}</p>

                    <div className="flex items-end justify-between">
                      <div>
                        {deal.basePrice > deal.dealPrice && (
                          <p className="text-base font-semibold leading-none mb-1 text-red-400">
                            <AEDAmount amount={deal.basePrice} className="line-through decoration-2 decoration-red-400" /><span className="text-xs font-normal text-white/30">{t['price.perNight']}</span>
                          </p>
                        )}
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-extrabold text-xl" style={{ color: '#FCD34D' }}>
                            <AEDAmount amount={deal.dealPrice} />
                          </span>
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{t['price.perNight']}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>{t['sections.until']}</p>
                        <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>{fmtDate(deal.endDate)}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Mobile CTA */}
            <div className="mt-6 text-center sm:hidden">
              <Link
                href="/special-deals"
                className="inline-flex items-center gap-1.5 text-brand-gold text-sm font-semibold"
              >
                {t['sections.browseAll']}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </>
        )}

      </div>
    </section>
  );
}
