'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { saveLoginRedirect } from '@/lib/auth';
import CurrencyAmount from '@/app/components/CurrencyAmount';
import DealBookingModal from './DealBookingModal';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { type HotelFeeConfig, UAE_FEE_DEFAULTS } from '@/lib/pricingEngine';

export interface PartnerDeal {
  id: string;
  room_id: number;
  room_name: string;
  room_type: string | null;
  base_price: number;
  capacity: number;
  deal_price: number;
  title: string | null;
  start_date: string;
  end_date: string;
}

interface Props {
  hotelId: number;
  hotelName: string;
  city: string;
  location: string;
  address: string;
  stars: number;
  rating: number;
  deals: PartnerDeal[];
  breakfastPricePerPerson?: number | null;
  feeConfig?: HotelFeeConfig;
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function calcDiscount(base: number, deal: number): number {
  if (!base || base <= 0) return 0;
  return Math.max(0, Math.round((1 - deal / base) * 100));
}


export default function PartnerDealsSection({
  hotelId,
  hotelName,
  city,
  location,
  address,
  stars,
  rating,
  deals,
  breakfastPricePerPerson,
  feeConfig = UAE_FEE_DEFAULTS,
}: Props) {
  const { user } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const t        = useTranslation();
  const [modalDeal, setModalDeal] = useState<PartnerDeal | null>(null);

  const today = new Date().toISOString().split('T')[0];

  function handleOpen(deal: PartnerDeal) {
    if (!user) {
      saveLoginRedirect(pathname ?? `/hotel/${hotelId}`);
      router.push('/login');
      return;
    }
    setModalDeal(deal);
  }

  if (deals.length === 0) return null;

  const activeDeals   = deals.filter((d) => d.start_date <= today);
  const upcomingDeals = deals.filter((d) => d.start_date > today);

  return (
    <>
      {modalDeal && (
        <DealBookingModal
          deal={modalDeal}
          hotelId={hotelId}
          hotelName={hotelName}
          city={city}
          location={location}
          address={address}
          stars={stars}
          rating={rating}
          breakfastPricePerPerson={breakfastPricePerPerson ?? null}
          feeConfig={feeConfig}
          onClose={() => setModalDeal(null)}
        />
      )}

    <section className="mt-6 bg-amber-50 rounded-2xl border border-amber-200 p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex items-center gap-1.5 bg-brand-gold text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          </svg>
          {t['hotel.partnerDealBadge']}
        </div>
        <h2 className="font-bold text-gray-900 text-xl">{t['nav.specialDeals']}</h2>
        <span className="text-xs text-amber-700 bg-white border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
          {t['sections.trackFixed']}
        </span>
      </div>

      <div className="space-y-4">

        {/* ── Active now ─────────────────────────────────── */}
        {activeDeals.map((deal) => {
          const disc   = calcDiscount(deal.base_price, deal.deal_price);
          const saving = deal.base_price > deal.deal_price ? deal.base_price - deal.deal_price : 0;
          return (
            <div
              key={deal.id}
              className="bg-white rounded-2xl border-2 border-brand-gold/40 shadow-sm overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Info */}
                <div className="p-5 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {disc > 0 && (
                      <span className="bg-brand-gold text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        -{disc}% OFF
                      </span>
                    )}
                    <span className="text-xs font-bold text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-2.5 py-1 rounded-full">
                      {t['hotel.fixedPriceBadge']}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      {t['hotel.activeNow']}
                    </span>
                  </div>

                  {deal.title ? (
                    <h3 className="font-bold text-lg leading-snug" style={{ color: '#15803d' }}>{deal.title}</h3>
                  ) : (
                    <h3 className="font-bold text-xl leading-snug" style={{ color: '#B45309' }}>{deal.room_name}</h3>
                  )}
                  {deal.title && (
                    <p className="text-sm font-bold mt-0.5" style={{ color: '#B45309' }}>{deal.room_name}</p>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-3">
                    <svg className="w-3.5 h-3.5 text-brand-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {t['hotel.validPeriod'].replace('{from}', fmtDate(deal.start_date)).replace('{to}', fmtDate(deal.end_date))}
                  </div>

                  {saving > 0 && (
                    <p className="mt-2 text-xs text-green-700 font-semibold">
                      {t['hotel.savePerNight'].replace('{amount}', '')}<CurrencyAmount amount={saving} />
                    </p>
                  )}
                </div>

                {/* Price + CTA */}
                <div className="border-t sm:border-t-0 sm:border-l border-gray-100 bg-gray-50/50 px-5 py-5 flex flex-col justify-center items-end gap-2 sm:min-w-[170px]">
                  {deal.base_price > deal.deal_price && (
                    <p className="text-base font-semibold leading-none mb-0.5 text-red-500">
                      <CurrencyAmount amount={deal.base_price} className="line-through decoration-2 decoration-red-500" />{t['price.perNight']}
                    </p>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-brand-gold">
                      <CurrencyAmount amount={deal.deal_price} />
                    </span>
                    <span className="text-xs text-gray-400">{t['price.perNight']}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpen(deal)}
                    className="w-full text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
                  >
                    {t['hotel.bookThisDeal']}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Coming soon ────────────────────────────────── */}
        {upcomingDeals.map((deal) => {
          const disc = calcDiscount(deal.base_price, deal.deal_price);
          return (
            <div
              key={deal.id}
              className="bg-white rounded-2xl border-2 border-amber-200 shadow-sm overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Info */}
                <div className="p-5 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {disc > 0 && (
                      <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        -{disc}% OFF
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t['hotel.comingSoon']}
                    </span>
                  </div>

                  {deal.title ? (
                    <h3 className="font-bold text-lg leading-snug" style={{ color: '#15803d' }}>{deal.title}</h3>
                  ) : (
                    <h3 className="font-bold text-xl leading-snug" style={{ color: '#B45309' }}>{deal.room_name}</h3>
                  )}
                  {deal.title && (
                    <p className="text-sm font-bold mt-0.5" style={{ color: '#B45309' }}>{deal.room_name}</p>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-3">
                    <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {t['hotel.startsPeriod'].replace('{from}', fmtDate(deal.start_date)).replace('{to}', fmtDate(deal.end_date))}
                  </div>
                </div>

                {/* Price + CTA */}
                <div className="border-t sm:border-t-0 sm:border-l border-amber-100 bg-amber-50/30 px-5 py-5 flex flex-col justify-center items-end gap-2 sm:min-w-[170px]">
                  {deal.base_price > deal.deal_price && (
                    <p className="text-base font-semibold leading-none mb-0.5 text-red-500">
                      <CurrencyAmount amount={deal.base_price} className="line-through decoration-2 decoration-red-500" />{t['price.perNight']}
                    </p>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-amber-600">
                      <CurrencyAmount amount={deal.deal_price} />
                    </span>
                    <span className="text-xs text-gray-400">{t['price.perNight']}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpen(deal)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
                  >
                    {t['hotel.reserveInAdvance']}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

      </div>
    </section>
    </>
  );
}

