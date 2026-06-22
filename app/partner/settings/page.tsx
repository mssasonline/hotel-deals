'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/authContext';
import { getMyProfile, getPayoutDetails, savePayoutDetails, type MyProfile as Profile, type PayoutDetails } from '../actions';

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
    <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(30,58,138,0.09)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
      <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(30,58,138,0.06)' }}>
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

  const [payoutForm, setPayoutForm] = useState<PayoutDetails>({
    bank_name: '', account_holder: '', iban: '', swift_bic: '', bank_country: '',
  });
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [payoutMsg, setPayoutMsg]       = useState<string | null>(null);
  const [payoutErr, setPayoutErr]       = useState<string | null>(null);

  const [showChangePw, setShowChangePw]   = useState(false);
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPw, setConfirmPw]         = useState('');
  const [pwLoading, setPwLoading]         = useState(false);
  const [pwMsg, setPwMsg]                 = useState<string | null>(null);
  const [pwErr, setPwErr]                 = useState<string | null>(null);
  const [showNewPw, setShowNewPw]         = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }

    async function load() {
      try {
        const [p, pd] = await Promise.all([getMyProfile(), getPayoutDetails()]);
        if (p) {
          setProfile(p);
          setForm({
            full_name:    p.full_name ?? '',
            phone:        p.phone ?? '',
            addr_city:    p.addr_city ?? '',
            addr_country: p.addr_country ?? '',
          });
        }
        if (pd) {
          setPayoutForm({
            bank_name:      pd.bank_name      ?? '',
            account_holder: pd.account_holder ?? '',
            iban:           pd.iban           ?? '',
            swift_bic:      pd.swift_bic      ?? '',
            bank_country:   pd.bank_country   ?? '',
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

  async function handleChangePassword() {
    setPwErr(null);
    setPwMsg(null);
    if (newPassword.length < 8) { setPwErr('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPw) { setPwErr('Passwords do not match.'); return; }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) { setPwErr(error.message); return; }
    setPwMsg('Password changed successfully.');
    setNewPassword('');
    setConfirmPw('');
    setShowChangePw(false);
    setTimeout(() => setPwMsg(null), 4000);
  }

  async function handlePayoutSave() {
    setPayoutErr(null);
    setPayoutMsg(null);
    setPayoutSaving(true);
    const { error } = await savePayoutDetails({
      bank_name:      payoutForm.bank_name      || null,
      account_holder: payoutForm.account_holder || null,
      iban:           payoutForm.iban           || null,
      swift_bic:      payoutForm.swift_bic      || null,
      bank_country:   payoutForm.bank_country   || null,
    });
    setPayoutSaving(false);
    if (error) {
      setPayoutErr('Failed to save: ' + error);
    } else {
      setPayoutMsg('Bank details saved successfully');
      setTimeout(() => setPayoutMsg(null), 3000);
    }
  }

  if (loading) return <Spinner />;

  const initials = form.full_name
    ? form.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : (profile?.email ?? 'P').slice(0, 2).toUpperCase();

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      {/* Page header */}
      <div className="mb-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #D97706 0%, #B45309 100%)' }} />
            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>Settings</h1>
          </div>
          <p className="text-white/45 text-xs pl-3">Manage your partner account and preferences.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile section */}
        <Section title="Partner Profile" description="Your name and contact information visible to the platform.">
          {/* Avatar preview */}
          <div className="flex items-center gap-4 pb-2">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}>
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

        {/* Payout Details */}
        <Section title="Payout Details" description="Bank account where your monthly earnings will be transferred by the platform.">
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2.5">
            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-amber-700">
              Make sure your bank details are correct. The platform uses this information to transfer your monthly net payout.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Bank Name">
              <input
                value={payoutForm.bank_name ?? ''}
                onChange={e => setPayoutForm(p => ({ ...p, bank_name: e.target.value }))}
                className={INPUT}
                placeholder="e.g. Emirates NBD"
              />
            </Field>
            <Field label="Account Holder Name">
              <input
                value={payoutForm.account_holder ?? ''}
                onChange={e => setPayoutForm(p => ({ ...p, account_holder: e.target.value }))}
                className={INPUT}
                placeholder="Full name as on bank account"
              />
            </Field>
            <Field label="IBAN">
              <input
                value={payoutForm.iban ?? ''}
                onChange={e => setPayoutForm(p => ({ ...p, iban: e.target.value.toUpperCase() }))}
                className={INPUT}
                placeholder="AE07 0331 2345 6789 0123 456"
              />
            </Field>
            <Field label="SWIFT / BIC Code">
              <input
                value={payoutForm.swift_bic ?? ''}
                onChange={e => setPayoutForm(p => ({ ...p, swift_bic: e.target.value.toUpperCase() }))}
                className={INPUT}
                placeholder="e.g. EBILAEAD"
              />
            </Field>
            <Field label="Bank Country">
              <input
                value={payoutForm.bank_country ?? ''}
                onChange={e => setPayoutForm(p => ({ ...p, bank_country: e.target.value }))}
                className={INPUT}
                placeholder="e.g. United Arab Emirates"
              />
            </Field>
          </div>

          {(payoutMsg || payoutErr) && (
            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
              payoutMsg
                ? 'bg-green-50 border border-green-100 text-green-700'
                : 'bg-red-50 border border-red-100 text-red-600'
            }`}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {payoutMsg
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                }
              </svg>
              {payoutMsg ?? payoutErr}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handlePayoutSave}
              disabled={payoutSaving}
              className="px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-60 flex items-center gap-2 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}
            >
              {payoutSaving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {payoutSaving ? 'Saving…' : 'Save Bank Details'}
            </button>
          </div>
        </Section>

        {/* Security */}
        <Section title="Security" description="Manage your login credentials.">

          {/* Option 1: Change password directly */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">Change Password</p>
                <p className="text-xs text-gray-400 mt-0.5">Set a new password directly</p>
              </div>
              <button
                onClick={() => { setShowChangePw(v => !v); setPwErr(null); setPwMsg(null); }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-brand-blue bg-brand-blue-light hover:bg-blue-100 border border-brand-blue/20 rounded-xl transition-colors shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                {showChangePw ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {showChangePw && (
              <div className="p-4 space-y-3 border-t border-gray-100">
                {/* New password */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className={`${INPUT} pr-10`}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPw ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      placeholder="Re-enter new password"
                      className={`${INPUT} pr-10 ${confirmPw && confirmPw !== newPassword ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : confirmPw && confirmPw === newPassword ? 'border-green-300 focus:ring-green-200 focus:border-green-400' : ''}`}
                      onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPw ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {confirmPw && confirmPw !== newPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                  {confirmPw && confirmPw === newPassword && (
                    <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
                  )}
                </div>

                {pwErr && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{pwErr}</p>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleChangePassword}
                    disabled={pwLoading}
                    className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-60 flex items-center gap-2 hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}
                  >
                    {pwLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {pwLoading ? 'Updating…' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {pwMsg && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5 text-sm text-green-700">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {pwMsg}
            </div>
          )}
        </Section>

        {/* Account status */}
        <Section title="Account Status" description="Current status and role of your partner account.">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">Account Status</p>
              <p className="text-xs text-gray-400">
                {profile?.status === 'suspended'
                  ? 'Your account has been suspended. Please contact support.'
                  : 'Your partner account is active and verified.'}
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              profile?.status === 'suspended'
                ? 'bg-red-50 text-red-600'
                : 'bg-green-50 text-green-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${profile?.status === 'suspended' ? 'bg-red-400' : 'bg-green-500'}`} />
              {profile?.status === 'suspended' ? 'Suspended' : 'Active'}
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
            className="px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-60 flex items-center gap-2 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}
          >
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
