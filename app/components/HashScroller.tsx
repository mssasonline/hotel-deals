'use client';

import { useEffect } from 'react';

export default function HashScroller() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const tryScroll = () => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return true;
      }
      return false;
    };

    if (!tryScroll()) {
      const timer = setTimeout(tryScroll, 150);
      return () => clearTimeout(timer);
    }
  }, []);

  return null;
}
