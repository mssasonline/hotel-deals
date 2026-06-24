'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { consumeLoginRedirect } from '@/lib/auth';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }

      // If a pre-login redirect was saved (e.g. from a protected page), honour it
      const savedRedirect = consumeLoginRedirect('');
      if (savedRedirect) {
        router.replace(savedRedirect);
        return;
      }

      // Redirect to login — it detects role client-side and sends
      // partner → /partner/dashboard, admin → /admin/dashboard, user → /
      router.replace('/login');
    }

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <svg
          className="animate-spin w-8 h-8 text-brand-blue mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="text-gray-500 text-sm">Signing you in…</p>
      </div>
    </div>
  );
}
