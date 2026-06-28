'use client';

import { useSidebarStore } from '@/store/sidebarStore';
import SiteLogo from '@/app/components/SiteLogo';

export default function AdminMobileHeader() {
  const setMobileOpen = useSidebarStore(s => s.setMobileOpen);

  return (
    <header
      className="lg:hidden sticky top-0 z-30 h-14 flex items-center px-4 gap-3"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(30,58,138,0.10)',
        boxShadow: '0 2px 12px rgba(15,34,96,0.07)',
      }}
    >
      <button
        onClick={() => setMobileOpen(true)}
        className="p-2 rounded-xl text-brand-blue hover:bg-brand-blue/5 transition-colors -ml-1"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <SiteLogo variant="dark" size="15px" />
      <span className="text-[10px] font-semibold tracking-widest uppercase text-amber-600 ml-1">Admin</span>
    </header>
  );
}
