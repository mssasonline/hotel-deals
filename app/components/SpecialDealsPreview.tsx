'use client';

import Link from 'next/link';
import AEDAmount from '@/app/partner/components/AEDAmount';

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
                PARTNER OFFER
              </div>
              <span className="text-xs font-bold text-white/30 uppercase tracking-wide">Track 2 · Fixed Price</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Partner Special Deals
            </h2>

            {/* One-line mechanism explainer — opposite of Track 1 */}
            <p className="text-white/50 text-sm mt-2 max-w-md leading-relaxed">
              Hand-picked by hotels — <strong className="text-white/70">fixed price</strong>,
              no hourly changes. Available for specific date ranges only.
            </p>

            <div className="mt-3 h-1 w-14 bg-brand-gold rounded-full" />
          </div>

          <Link
            href="/special-deals"
            className="hidden sm:flex items-center gap-1.5 text-brand-gold hover:text-yellow-400 text-sm font-semibold transition-colors shrink-0 ml-4"
          >
            Browse All
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
            <p className="text-white/40 text-sm font-medium mb-1">No partner deals active today</p>
            <p className="text-white/25 text-xs">Partners publish new deals regularly — check back soon</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {deals.map((deal, i) => (
                <Link
                  key={deal.hotelId}
                  href={`/hotel/${deal.hotelId}`}
                  className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 hover:border-white/25 transition-all"
                >
                  {/* Image strip */}
                  <div className="relative h-36 overflow-hidden">
                    <div className="absolute inset-0" style={{ background: DEFAULT_GRADIENTS[i % 3] }} />
                    <img
                      src={deal.imageUrl ?? FALLBACK_IMAGE}
                      alt={deal.hotelName}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-70"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    {/* Fixed price badge — contrasts with the "live" badge in Track 1 */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-brand-gold text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      -{deal.discountPct}% FIXED
                    </div>
                    <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                      {deal.dealCount} deal{deal.dealCount !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <h3 className="font-bold text-white text-base truncate group-hover:text-brand-gold transition-colors">
                      {deal.hotelName}
                    </h3>
                    <p className="text-white/45 text-xs mt-0.5 mb-3">{deal.city}</p>

                    <div className="flex items-end justify-between">
                      <div>
                        {deal.basePrice > deal.dealPrice && (
                          <p className="text-white/35 text-xs line-through">
                            <AEDAmount amount={deal.basePrice} />
                          </p>
                        )}
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-brand-gold font-extrabold text-xl">
                            <AEDAmount amount={deal.dealPrice} />
                          </span>
                          <span className="text-white/35 text-xs">/night</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white/25 text-[10px] uppercase tracking-wide">Until</p>
                        <p className="text-white/55 text-xs font-semibold">{fmtDate(deal.endDate)}</p>
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
                Browse All Partner Deals
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
