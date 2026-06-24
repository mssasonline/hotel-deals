'use client';

import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';

export default function SecureCheckoutBanner() {
  const language = useAppSettingsStore((s) => s.language);
  const t = getTranslations(language);

  const badges = [
    {
      labelKey: 'payment.sslSecure' as const,
      subKey: 'payment.encryptionBits' as const,
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      labelKey: 'payment.encryptedBadge' as const,
      subKey: 'payment.pciDss' as const,
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      labelKey: 'payment.guaranteedBadge' as const,
      subKey: 'payment.secureBookingPromise' as const,
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg" style={{ background: 'linear-gradient(135deg, #0F2260 0%, #1E3A8A 55%, #2563EB 100%)' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <p className="text-white font-extrabold text-sm">{t['payment.secureCheckout']}</p>
          <p className="text-white/55 text-xs">{t['payment.protectedEnd']}</p>
        </div>
      </div>

      <div className="flex items-center gap-5 sm:gap-8">
        {badges.map((badge) => (
          <div key={badge.labelKey} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
              {badge.icon}
            </div>
            <div className="hidden sm:block">
              <p className="text-white text-[11px] font-bold leading-none">{t[badge.labelKey]}</p>
              <p className="text-white/50 text-[10px] mt-0.5">{t[badge.subKey]}</p>
            </div>
            <p className="block sm:hidden text-white text-[10px] font-bold">{t[badge.labelKey]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
