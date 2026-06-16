'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Dedicated non-SSR client for recovery flow — avoids conflicts with @supabase/ssr cookie management
const recoveryClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, detectSessionInUrl: false } }
);

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady]       = useState(false);
  const [expired, setExpired]   = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState(false);

  useEffect(() => {
    const hash        = window.location.hash.slice(1);
    const params      = new URLSearchParams(hash);
    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type         = params.get('type');

    if (!accessToken || type !== 'recovery') {
      setExpired(true);
      return;
    }

    recoveryClient.auth.setSession({
      access_token:  accessToken,
      refresh_token: refreshToken ?? '',
    }).then(({ error }) => {
      if (error) setExpired(true);
      else setReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const { error: updateErr } = await recoveryClient.auth.updateUser({ password });
    setLoading(false);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }

    setDone(true);

    const { data: { user } } = await recoveryClient.auth.getUser();
    if (user) {
      // Use the SSR client to get the role for redirect
      const { createBrowserClient } = await import('@supabase/ssr');
      const ssrClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: profile } = await ssrClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setTimeout(() => {
        if (profile?.role === 'admin')        router.replace('/admin');
        else if (profile?.role === 'partner') router.replace('/partner/settings');
        else                                  router.replace('/');
      }, 1500);
    } else {
      router.replace('/');
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center max-w-sm w-full">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Password Updated</h1>
          <p className="text-sm text-gray-400 mt-1">Redirecting you now…</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center max-w-sm w-full">
          {expired ? (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-gray-900">Link Expired</h1>
              <p className="text-sm text-gray-400 mt-1">This reset link is invalid or has expired. Request a new one.</p>
            </>
          ) : (
            <>
              <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-400">Verifying reset link…</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm">
        <div className="px-8 pt-8 pb-2">
          <h1 className="text-xl font-bold text-gray-900">Set New Password</h1>
          <p className="text-sm text-gray-400 mt-1">Choose a strong password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              placeholder="Repeat your password"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
          >
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Saving…' : 'Save New Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
