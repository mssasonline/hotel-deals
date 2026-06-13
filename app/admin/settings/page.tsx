'use client';

import { useState, useEffect } from 'react';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import type { CurrencyCode } from '@/store/appSettingsStore';
import { getEffectiveTimezone } from '../components/useAdminFormat';
import { fetchCommissionRate, updateCommissionRate, fetchUserPolicies, updateUserPolicies } from './actions';

type SelectOption = string | { value: string; label: string };

const TIMEZONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '',                    label: 'Auto (Browser)'          },
  { value: 'UTC',                 label: 'UTC'                     },
  { value: 'Asia/Dubai',          label: 'Dubai (UTC+4)'           },
  { value: 'Asia/Riyadh',         label: 'Riyadh (UTC+3)'          },
  { value: 'Asia/Kuwait',         label: 'Kuwait (UTC+3)'          },
  { value: 'Europe/London',       label: 'London (UTC±0)'          },
  { value: 'Europe/Paris',        label: 'Paris / Berlin (UTC+1)'  },
  { value: 'America/New_York',    label: 'New York (UTC-5)'        },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)'     },
  { value: 'Asia/Singapore',      label: 'Singapore (UTC+8)'       },
  { value: 'Asia/Tokyo',          label: 'Tokyo (UTC+9)'           },
];

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-400 mt-0.5">{description}</p>
    </div>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
      {children}
    </div>
  );
}

function FieldRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6 py-4 border-b border-gray-50 last:border-0">
      <div className="sm:w-56 shrink-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Input({ defaultValue, placeholder }: { defaultValue?: string; placeholder?: string }) {
  return (
    <input
      type="text"
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="w-full max-w-sm px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
    />
  );
}

function Toggle({ defaultChecked = false, label }: { defaultChecked?: boolean; label: string }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <label className="flex items-center gap-3 cursor-pointer w-fit">
      <div
        onClick={() => setOn((v) => !v)}
        className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${on ? 'bg-brand-blue' : 'bg-gray-200'}`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-1'}`}
        />
      </div>
      <span className="text-sm text-gray-700 font-medium">{label}</span>
    </label>
  );
}

function Select({
  options,
  defaultValue,
  value,
  onChange,
}: {
  options: SelectOption[];
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const getValue = (o: SelectOption) => typeof o === 'string' ? o : o.value;
  const getLabel = (o: SelectOption) => typeof o === 'string' ? o : o.label;
  const cls = 'px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white';

  if (value !== undefined) {
    return (
      <select value={value} onChange={(e) => onChange?.(e.target.value)} className={cls}>
        {options.map((o) => (
          <option key={getValue(o)} value={getValue(o)}>{getLabel(o)}</option>
        ))}
      </select>
    );
  }
  return (
    <select defaultValue={defaultValue} className={cls}>
      {options.map((o) => (
        <option key={getValue(o)} value={getValue(o)}>{getLabel(o)}</option>
      ))}
    </select>
  );
}

function SaveButton() {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <button
      onClick={handleSave}
      className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${
        saved ? 'bg-emerald-600' : 'bg-brand-blue hover:bg-brand-blue-dark'
      }`}
    >
      {saved ? '✓ Saved' : 'Save Changes'}
    </button>
  );
}

export default function SettingsPage() {
  const currency    = useAppSettingsStore(s => s.currency);
  const setCurrency = useAppSettingsStore(s => s.setCurrency);
  const timezone    = useAppSettingsStore(s => s.timezone);
  const setTimezone = useAppSettingsStore(s => s.setTimezone);
  const [detectedTz, setDetectedTz] = useState('');
  useEffect(() => { setDetectedTz(getEffectiveTimezone(timezone)); }, [timezone]);

  // ── Commission rate state ─────────────────────────────────────────────────
  const [commissionInput, setCommissionInput] = useState('10');
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [commissionSaved, setCommissionSaved] = useState(false);
  const [commissionError, setCommissionError] = useState<string | null>(null);

  useEffect(() => {
    fetchCommissionRate().then(r => setCommissionInput(String(r)));
  }, []);

  // ── User policies state ───────────────────────────────────────────────────
  const [bookingLimitInput,      setBookingLimitInput]      = useState('5');
  const [suspendThresholdInput,  setSuspendThresholdInput]  = useState('3');
  const [policySaving,   setPolicySaving]   = useState(false);
  const [policySaved,    setPolicySaved]    = useState(false);
  const [policyError,    setPolicyError]    = useState<string | null>(null);

  useEffect(() => {
    fetchUserPolicies().then(({ bookingLimit, suspendThreshold }) => {
      setBookingLimitInput(String(bookingLimit));
      setSuspendThresholdInput(String(suspendThreshold));
    });
  }, []);

  async function handleSavePolicies() {
    const limit     = parseInt(bookingLimitInput, 10);
    const threshold = parseInt(suspendThresholdInput, 10);
    setPolicyError(null);
    if (isNaN(limit) || limit < 1) { setPolicyError('Booking limit must be at least 1.'); return; }
    if (isNaN(threshold) || threshold < 1) { setPolicyError('Threshold must be at least 1.'); return; }
    setPolicySaving(true);
    const result = await updateUserPolicies(limit, threshold);
    setPolicySaving(false);
    if (result.error) { setPolicyError(result.error); } else {
      setPolicySaved(true);
      setTimeout(() => setPolicySaved(false), 2500);
    }
  }

  async function handleSaveCommission() {
    const rate = parseFloat(commissionInput);
    setCommissionError(null);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setCommissionError('يجب أن تكون النسبة بين 0 و 100.');
      return;
    }
    setCommissionSaving(true);
    const result = await updateCommissionRate(rate);
    setCommissionSaving(false);
    if (result.error) {
      setCommissionError(result.error);
    } else {
      setCommissionSaved(true);
      setTimeout(() => setCommissionSaved(false), 2500);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Configure SelectedRoom platform defaults and policies.</p>
      </div>

      {/* General */}
      <SettingsCard>
        <SectionHeader title="General Settings" description="Core platform configuration and contact information." />
        <div className="divide-y divide-gray-50">
          <FieldRow label="Platform Name" description="Displayed in emails and the UI.">
            <Input defaultValue="SelectedRoom" />
          </FieldRow>
          <FieldRow label="Support Email" description="Used for user support communications.">
            <Input defaultValue="support@selectedroom.com" />
          </FieldRow>
          <FieldRow label="Default Currency">
            <Select
              options={['USD', 'EUR', 'GBP', 'AED']}
              value={currency.toUpperCase()}
              onChange={(v) => setCurrency(v.toLowerCase() as CurrencyCode)}
            />
          </FieldRow>
          <FieldRow label="Default Timezone" description="Dates and times shown across the admin portal.">
            <div className="flex flex-col gap-1.5">
              <Select
                options={TIMEZONE_OPTIONS}
                value={timezone}
                onChange={(v) => setTimezone(v)}
              />
              {detectedTz && (
                <p className="text-xs text-gray-400">
                  Currently using: <span className="font-medium text-gray-600">{detectedTz}</span>
                </p>
              )}
            </div>
          </FieldRow>
          <FieldRow label="Maintenance Mode" description="Takes the platform offline for all users.">
            <Toggle defaultChecked={false} label="Enable maintenance mode" />
          </FieldRow>
        </div>
        <div className="mt-5 flex justify-end">
          <SaveButton />
        </div>
      </SettingsCard>

      {/* Branding */}
      <SettingsCard>
        <SectionHeader title="Branding" description="Visual identity and colour scheme." />
        <div className="divide-y divide-gray-50">
          <FieldRow label="Primary Color" description="Used for buttons, links, and highlights.">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-blue border border-gray-200" />
              <Input defaultValue="#003B95" />
            </div>
          </FieldRow>
          <FieldRow label="Accent Color" description="Used for badges and highlights.">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-gold border border-gray-200" />
              <Input defaultValue="#D4A017" />
            </div>
          </FieldRow>
          <FieldRow label="Logo URL" description="Hosted image URL for the platform logo.">
            <Input placeholder="https://cdn.selectedroom.com/logo.svg" />
          </FieldRow>
          <FieldRow label="Favicon URL">
            <Input placeholder="https://cdn.selectedroom.com/favicon.ico" />
          </FieldRow>
        </div>
        <div className="mt-5 flex justify-end">
          <SaveButton />
        </div>
      </SettingsCard>

      {/* Commission */}
      <SettingsCard>
        <SectionHeader title="Commission Settings" description="Platform fees charged to hotel partners." />
        <div className="divide-y divide-gray-50">
          <FieldRow label="Base Commission Rate" description="Deducted from each confirmed booking. Partners receive the remainder.">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={commissionInput}
                  onChange={e => setCommissionInput(e.target.value)}
                  className="w-28 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
                />
                <span className="text-sm text-gray-500 font-medium">%</span>
              </div>
              {parseFloat(commissionInput) >= 0 && parseFloat(commissionInput) <= 100 && (
                <p className="text-xs text-gray-400">
                  Partners keep{' '}
                  <span className="font-semibold text-emerald-600">
                    {(100 - parseFloat(commissionInput) || 0).toFixed(commissionInput.includes('.') ? 1 : 0)}%
                  </span>{' '}
                  · Platform earns{' '}
                  <span className="font-semibold text-brand-blue">
                    {(parseFloat(commissionInput) || 0).toFixed(commissionInput.includes('.') ? 1 : 0)}%
                  </span>
                </p>
              )}
              {commissionError && (
                <p className="text-xs text-red-500">{commissionError}</p>
              )}
            </div>
          </FieldRow>
          <FieldRow label="Minimum Commission" description="Minimum fee per booking.">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-medium">$</span>
              <Input defaultValue="5.00" />
            </div>
          </FieldRow>
          <FieldRow label="Auto-Payout" description="Automatically pay partners at month-end.">
            <Toggle defaultChecked={true} label="Enable automatic payouts" />
          </FieldRow>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSaveCommission}
            disabled={commissionSaving}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 ${
              commissionSaved ? 'bg-emerald-600' : 'bg-brand-blue hover:bg-brand-blue-dark'
            }`}
          >
            {commissionSaving ? 'Saving…' : commissionSaved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </SettingsCard>

      {/* Payment */}
      <SettingsCard>
        <SectionHeader title="Payment Settings" description="Accepted payment methods and gateway configuration." />
        <div className="divide-y divide-gray-50">
          <FieldRow label="Apple Pay">
            <Toggle defaultChecked={true} label="Enabled" />
          </FieldRow>
          <FieldRow label="Google Pay">
            <Toggle defaultChecked={true} label="Enabled" />
          </FieldRow>
          <FieldRow label="Credit Card">
            <Toggle defaultChecked={true} label="Enabled" />
          </FieldRow>
          <FieldRow label="Debit Card">
            <Toggle defaultChecked={true} label="Enabled" />
          </FieldRow>
          <FieldRow label="Payment Gateway" description="Processor handling card transactions.">
            <Select options={['Stripe', 'Braintree', 'Adyen', 'Checkout.com']} defaultValue="Stripe" />
          </FieldRow>
          <FieldRow label="Refund Window" description="Days after booking a full refund is allowed.">
            <div className="flex items-center gap-2">
              <Input defaultValue="24" />
              <span className="text-sm text-gray-500 font-medium">hours</span>
            </div>
          </FieldRow>
        </div>
        <div className="mt-5 flex justify-end">
          <SaveButton />
        </div>
      </SettingsCard>

      {/* User Policies */}
      <SettingsCard>
        <SectionHeader title="User Policies" description="Rules governing guest accounts and behaviour." />
        <div className="divide-y divide-gray-50">

          {/* Email Verification — managed in Supabase Dashboard */}
          <FieldRow label="Email Verification" description="Require guests to verify email on signup.">
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 w-fit">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Managed in <span className="font-medium text-gray-700">Supabase Dashboard → Authentication → Email</span></span>
            </div>
          </FieldRow>

          {/* Guest Booking Limit */}
          <FieldRow label="Guest Booking Limit" description="Maximum simultaneous active bookings per user. Enforced at checkout.">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                value={bookingLimitInput}
                onChange={e => setBookingLimitInput(e.target.value)}
                className="w-24 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              />
              <span className="text-sm text-gray-500 font-medium">bookings</span>
            </div>
          </FieldRow>

          {/* Auto-Suspend Threshold */}
          <FieldRow label="Auto-Suspend Threshold" description="Failed payment bookings before the account is automatically suspended.">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={suspendThresholdInput}
                  onChange={e => setSuspendThresholdInput(e.target.value)}
                  className="w-24 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
                />
                <span className="text-sm text-gray-500 font-medium">failed attempts</span>
              </div>
              <p className="text-xs text-gray-400">Account status changes to <span className="font-medium text-red-500">Suspended</span> automatically via DB trigger.</p>
            </div>
          </FieldRow>

        </div>

        {policyError && (
          <p className="mt-3 text-xs text-red-500">{policyError}</p>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSavePolicies}
            disabled={policySaving}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 ${
              policySaved ? 'bg-emerald-600' : 'bg-brand-blue hover:bg-brand-blue-dark'
            }`}
          >
            {policySaving ? 'Saving…' : policySaved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </SettingsCard>
    </div>
  );
}
