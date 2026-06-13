'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/authContext';
import { getMyProfile, type MyProfile as Profile } from '../actions';

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
    </div>
  );
}

interface SectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function Section({ title, description, children }: SectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="text-gray-500 text-xs mt-0.5">{description}</p>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const INPUT = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    full_name:    '',
    phone:        '',
    addr_city:    '',
    addr_country: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }

    async function load() {
      try {
        const p = await getMyProfile();
        if (p) {
          setProfile(p);
          setForm({
            full_name:    p.full_name ?? '',
            phone:        p.phone ?? '',
            addr_city:    p.addr_city ?? '',
            addr_country: p.addr_country ?? '',
          });
        }
      } catch (err) {
        console.error('[settings] load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, authLoading, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handlePasswordReset() {
    if (!profile?.email) return;
    setResetError(null);
    setResetSent(false);
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) { setResetError(error.message); return; }
    setResetSent(true);
  }

  async function handleSave() {
    if (!profile) return;
    setSaveErr(null);
    setSaveMsg(null);
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:    form.full_name.trim() || null,
        phone:        form.phone.trim() || null,
        addr_city:    form.addr_city.trim() || null,
        addr_country: form.addr_country.trim() || null,
      })
      .eq('id', profile.id);

    setSaving(false);
    if (error) {
      setSaveErr('Failed to save: ' + error.message);
    } else {
      setProfile(prev => prev ? { ...prev, ...form } as Profile : null);
      setSaveMsg('Profile updated successfully');
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }

  if (loading) return <Spinner />;

  const initials = form.full_name
    ? form.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : (profile?.email ?? 'P').slice(0, 2).toUpperCase();

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <p className="text-gray-500 text-sm">Manage your partner account and preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Profile section */}
        <Section title="Partner Profile" description="Your name and contact information visible to the platform.">
          {/* Avatar preview */}
          <div className="flex items-center gap-4 pb-2">
            <div className="w-14 h-14 rounded-full bg-brand-blue flex items-center justify-center text-white text-xl font-bold shrink-0">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{form.full_name || 'Hotel Partner'}</p>
              <p className="text-gray-400 text-xs">{profile?.email ?? '—'}</p>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-brand-blue-light text-brand-blue text-[10px] font-bold uppercase tracking-wide">
                {profile?.role ?? 'partner'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>:last-child]:sm:col-span-1">
            <Field label="Full Name">
              <input
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                className={INPUT}
                placeholder="Your full name"
              />
            </Field>
            <Field label="Email Address">
              <input
                value={profile?.email ?? ''}
                disabled
                className={`${INPUT} bg-gray-50 text-gray-500 cursor-not-allowed`}
                title="Email is managed through your login credentials"
              />
            </Field>
            <Field label="Phone Number">
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className={INPUT}
                placeholder="+971 4 123 4567"
              />
            </Field>
            <Field label="City">
              <input
                name="addr_city"
                value={form.addr_city}
                onChange={handleChange}
                className={INPUT}
                placeholder="e.g. Dubai"
              />
            </Field>
            <Field label="Country">
              <input
                name="addr_country"
                value={form.addr_country}
                onChange={handleChange}
                className={INPUT}
                placeholder="e.g. AE"
              />
            </Field>
          </div>
        </Section>

        {/* Security */}
        <Section title="Security" description="Manage your login credentials.">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">Change Password</p>
              <p className="text-xs text-gray-400 mt-0.5">
                We'll send a reset link to <span className="font-medium text-gray-600">{profile?.email}</span>
              </p>
            </div>
            <button
              onClick={handlePasswordReset}
              disabled={resetLoading || resetSent}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-colors disabled:opacity-50 shrink-0"
            >
              {resetLoading ? (
                <span className="w-3.5 h-3.5 border-2 border-orange-400/30 border-t-orange-500 rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              )}
              {resetLoading ? 'Sending…' : resetSent ? 'Email Sent!' : 'Send Reset Email'}
            </button>
          </div>
          {resetError && (
            <p className="text-xs text-red-600 px-1">{resetError}</p>
          )}
          {resetSent && (
            <p className="text-xs text-green-600 px-1">Check your inbox — the link expires in 24 hours.</p>
          )}
        </Section>

        {/* Account status */}
        <Section title="Account Status" description="Current status and role of your partner account.">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">Account Status</p>
              <p className="text-xs text-gray-400">
                {profile?.status === 'active' ? 'Your partner account is active and verified.' : 'Your account has been suspended.'}
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              profile?.status === 'active'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-600'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${profile?.status === 'active' ? 'bg-green-500' : 'bg-red-400'}`} />
              {profile?.status === 'active' ? 'Active' : 'Suspended'}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">Account Role</p>
              <p className="text-xs text-gray-400">Your current permission level on the platform.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-blue-light text-brand-blue capitalize">
              {profile?.role ?? 'partner'}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
            <div>
              <p className="text-sm font-medium text-red-800">Request Suspension</p>
              <p className="text-xs text-red-400">Temporarily pause all your listings and bookings.</p>
            </div>
            <button className="px-4 py-2 text-xs font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-xl transition-colors">
              Contact Admin
            </button>
          </div>
        </Section>

        {/* Save feedback */}
        {(saveMsg || saveErr) && (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
            saveMsg
              ? 'bg-green-50 border border-green-100 text-green-700'
              : 'bg-red-50 border border-red-100 text-red-600'
          }`}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {saveMsg
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              }
            </svg>
            {saveMsg ?? saveErr}
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue-dark rounded-xl transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2"
          >
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
