'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function LiveBadge() {
  const [bright, setBright] = useState(true);
  const t = useTranslation();

  useEffect(() => {
    const id = setInterval(() => setBright((v) => !v), 900);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex items-center gap-1.5 text-white text-xs font-bold px-3 py-1.5 rounded-full"
      style={{
        background: 'linear-gradient(135deg, #991B1B 0%, #DC2626 100%)',
        opacity: bright ? 1 : 0,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white" />
      {t['sections.live'] ?? 'LIVE'}
    </div>
  );
}
