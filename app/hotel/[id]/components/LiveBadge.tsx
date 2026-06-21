'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';

export default function LiveBadge() {
  const t = useTranslation();
  const label = t['sections.live'] ?? 'LIVE';

  return (
    <div
      className="flex items-center gap-1.5 text-white text-xs font-bold px-3 py-1.5 rounded-full"
      style={{ background: 'linear-gradient(135deg, #991B1B 0%, #DC2626 100%)' }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
      <span className="relative">
        <span
          className="absolute inset-0 flex items-center justify-center live-ping"
          aria-hidden="true"
        >
          {label}
        </span>
        {label}
      </span>
    </div>
  );
}
