'use client';

import { useState, useEffect, useTransition } from 'react';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import type { CurrencyCode } from '@/store/appSettingsStore';
import { getEffectiveTimezone } from '../components/useAdminFormat';
import {
  fetchCommissionRate, updateCommissionRate,
  fetchMinCommission,  updateMinCommission,
  fetchUserPolicies, updateUserPolicies,
  fetchTaxRates, upsertTaxRate, deleteTaxRate,
  type TaxRate,
} from './actions';

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

const CURRENCY_SYMBOL: Record<string, string> = {
  usd: '$', eur: '€', gbp: '£', aed: 'AED',
};

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
      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
      style={{ background: saved ? '#059669' : 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: saved ? undefined : '0 2px 10px rgba(30,58,138,0.25)' }}
    >
      {saved ? '✓ Saved' : 'Save Changes'}
    </button>
  );
}

// ── Tax Rate Row (inline edit) ───────────────────────────────────────────────
function TaxRateRow({
  rate,
  onSave,
  onDelete,
}: {
  rate: TaxRate;
  onSave: (r: TaxRate) => Promise<void>;
  onDelete: (code: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...rate });
  const [isPending, startTransition] = useTransition();
  const [confirmDel, setConfirmDel] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'vat_pct' || name === 'fixed_fee_per_night' ? Number(value) : value }));
  }

  return (
    <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
      {editing ? (
        <>
          <td className="px-4 py-2.5">
            <input name="country_code" value={form.country_code} onChange={handleChange} maxLength={2}
              className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
          </td>
          <td className="px-4 py-2.5">
            <input name="country_name" value={form.country_name} onChange={handleChange}
              className="w-40 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
          </td>
          <td className="px-4 py-2.5">
            <div className="flex items-center gap-1">
              <input name="vat_pct" type="number" min={0} max={100} step={0.5} value={form.vat_pct} onChange={handleChange}
                className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
              <span className="text-xs text-gray-400">%</span>
            </div>
          </td>
          <td className="px-4 py-2.5">
            <div className="flex items-center gap-1">
              <input name="fixed_fee_per_night" type="number" min={0} step={0.5} value={form.fixed_fee_per_night} onChange={handleChange}
                className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
              <input name="fixed_fee_currency" value={form.fixed_fee_currency} onChange={handleChange} maxLength={3}
                className="w-12 px-2 py-1.5 border border-gray-200 rounded-lg text-xs uppercase focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
            </div>
          </td>
          <td className="px-4 py-2.5">
            <input name="notes" value={form.notes ?? ''} onChange={handleChange}
              className="w-48 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
          </td>
          <td className="px-4 py-2.5">
            <div className="flex gap-1">
              <button onClick={() => startTransition(async () => { await onSave(form); setEditing(false); })}
                disabled={isPending}
                className="px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-all disabled:opacity-50 hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}>
                {isPending ? '…' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)}
                className="px-2.5 py-1.5 text-xs text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
            </div>
          </td>
        </>
      ) : (
        <>
          <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">{rate.country_code}</td>
          <td className="px-4 py-3 text-sm text-gray-800">{rate.country_name}</td>
          <td className="px-4 py-3">
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
              {rate.vat_pct}%
            </span>
          </td>
          <td className="px-4 py-3 text-sm text-gray-600">
            {rate.fixed_fee_per_night > 0
              ? <span>{rate.fixed_fee_per_night} <span className="text-xs text-gray-400">{rate.fixed_fee_currency}</span></span>
              : <span className="text-gray-300 text-xs">—</span>}
          </td>
          <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">{rate.notes ?? '—'}</td>
          <td className="px-4 py-3">
            {confirmDel ? (
              <div className="flex gap-1">
                <button onClick={() => startTransition(async () => { await onDelete(rate.country_code); })}
                  disabled={isPending}
                  className="px-2.5 py-1.5 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
                  {isPending ? '…' : 'Delete'}
                </button>
                <button onClick={() => setConfirmDel(false)}
                  className="px-2.5 py-1.5 text-xs text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-1">
                <button onClick={() => setEditing(true)}
                  className="px-2.5 py-1.5 text-xs font-medium text-brand-blue bg-brand-blue-light hover:bg-blue-100 rounded-lg transition-colors">
                  Edit
                </button>
                <button onClick={() => setConfirmDel(true)}
                  className="px-2.5 py-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  Delete
                </button>
              </div>
            )}
          </td>
        </>
      )}
    </tr>
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
  const [minCommissionInput, setMinCommissionInput] = useState('5.00');
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [commissionSaved, setCommissionSaved] = useState(false);
  const [commissionError, setCommissionError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchCommissionRate(), fetchMinCommission()]).then(([rate, min]) => {
      setCommissionInput(String(rate));
      setMinCommissionInput(String(min));
    });
  }, []);

  // ── Tax rates state ───────────────────────────────────────────────────────
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [taxLoading, setTaxLoading] = useState(true);
  const [showAddTax, setShowAddTax] = useState(false);
  const [addTaxForm, setAddTaxForm] = useState<TaxRate>({
    country_code: '', country_name: '', vat_pct: 0,
    fixed_fee_per_night: 0, fixed_fee_currency: 'AED', notes: '',
  });
  const [addTaxError, setAddTaxError] = useState<string | null>(null);
  const [, startAddTransition] = useTransition();

  useEffect(() => {
    fetchTaxRates().then(rates => { setTaxRates(rates); setTaxLoading(false); });
  }, []);

  async function handleSaveTaxRate(rate: TaxRate) {
    const result = await upsertTaxRate(rate);
    if (result.error) { alert(result.error); return; }
    setTaxRates(prev => {
      const idx = prev.findIndex(r => r.country_code === rate.country_code);
      return idx >= 0 ? prev.map((r, i) => i === idx ? rate : r) : [...prev, rate];
    });
  }

  async function handleDeleteTaxRate(code: string) {
    const result = await deleteTaxRate(code);
    if (result.error) { alert(result.error); return; }
    setTaxRates(prev => prev.filter(r => r.country_code !== code));
  }

  async function handleAddTaxRate() {
    setAddTaxError(null);
    if (!addTaxForm.country_code.trim() || addTaxForm.country_code.length !== 2)
      return setAddTaxError('Country code must be exactly 2 letters (e.g. AE).');
    if (!addTaxForm.country_name.trim())
      return setAddTaxError('Country name is required.');
    startAddTransition(async () => {
      const result = await upsertTaxRate(addTaxForm);
      if (result.error) { setAddTaxError(result.error); return; }
      setTaxRates(prev => {
        const idx = prev.findIndex(r => r.country_code === addTaxForm.country_code.toUpperCase());
        const newRate = { ...addTaxForm, country_code: addTaxForm.country_code.toUpperCase() };
        return idx >= 0 ? prev.map((r, i) => i === idx ? newRate : r) : [...prev, newRate];
      });
      setShowAddTax(false);
      setAddTaxForm({ country_code: '', country_name: '', vat_pct: 0, fixed_fee_per_night: 0, fixed_fee_currency: 'AED', notes: '' });
    });
  }

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
    const minAmt = parseFloat(minCommissionInput);
    setCommissionError(null);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setCommissionError('Rate must be between 0 and 100.');
      return;
    }
    if (isNaN(minAmt) || minAmt < 0) {
      setCommissionError('Minimum commission must be 0 or greater.');
      return;
    }
    setCommissionSaving(true);
    const [r1, r2] = await Promise.all([
      updateCommissionRate(rate),
      updateMinCommission(minAmt),
    ]);
    setCommissionSaving(false);
    if (r1.error || r2.error) {
      setCommissionError(r1.error ?? r2.error ?? 'Save failed.');
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
          <FieldRow label="Minimum Commission" description="Minimum platform fee per booking, applied when the percentage-based commission is lower.">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-medium w-8 shrink-0">
                {CURRENCY_SYMBOL[currency] ?? currency.toUpperCase()}
              </span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={minCommissionInput}
                onChange={e => setMinCommissionInput(e.target.value)}
                className="w-28 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              />
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
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 hover:-translate-y-0.5"
            style={{ background: commissionSaved ? '#059669' : 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: commissionSaved ? undefined : '0 2px 10px rgba(30,58,138,0.25)' }}
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

      {/* Tax Rates */}
      <SettingsCard>
        <div className="flex items-start justify-between mb-5">
          <SectionHeader
            title="Tax Rates by Country"
            description="VAT % and fixed fees applied per country. Partner/admin share is calculated on subtotal before tax."
          />
          <button
            onClick={() => setShowAddTax(v => !v)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-sm font-semibold transition-all shrink-0 ml-4 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Country
          </button>
        </div>

        {/* Add form */}
        {showAddTax && (
          <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">New Country Tax Rate</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Country Code</label>
                <input value={addTaxForm.country_code} maxLength={2} placeholder="AE"
                  onChange={e => setAddTaxForm(f => ({ ...f, country_code: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Country Name</label>
                <input value={addTaxForm.country_name} placeholder="United Arab Emirates"
                  onChange={e => setAddTaxForm(f => ({ ...f, country_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">VAT %</label>
                <input type="number" min={0} max={100} step={0.5} value={addTaxForm.vat_pct}
                  onChange={e => setAddTaxForm(f => ({ ...f, vat_pct: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fixed Fee / Night</label>
                <input type="number" min={0} step={0.5} value={addTaxForm.fixed_fee_per_night}
                  onChange={e => setAddTaxForm(f => ({ ...f, fixed_fee_per_night: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fee Currency</label>
                <input value={addTaxForm.fixed_fee_currency} maxLength={3} placeholder="AED"
                  onChange={e => setAddTaxForm(f => ({ ...f, fixed_fee_currency: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input value={addTaxForm.notes ?? ''} placeholder="Optional"
                  onChange={e => setAddTaxForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
              </div>
            </div>
            {addTaxError && <p className="text-xs text-red-500">{addTaxError}</p>}
            <div className="flex gap-2">
              <button onClick={handleAddTaxRate}
                className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}>
                Add
              </button>
              <button onClick={() => { setShowAddTax(false); setAddTaxError(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {taxLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
          </div>
        ) : taxRates.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No tax rates configured. Add one above.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">VAT</th>
                  <th className="px-4 py-3">Fixed Fee/Night</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {taxRates.map(rate => (
                  <TaxRateRow
                    key={rate.country_code}
                    rate={rate}
                    onSave={handleSaveTaxRate}
                    onDelete={handleDeleteTaxRate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-3">
          Tax is applied at checkout based on the hotel&apos;s country. Fixed fees are added per night.
          Partner and platform shares are calculated on room price before tax.
        </p>
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
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 hover:-translate-y-0.5"
            style={{ background: policySaved ? '#059669' : 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: policySaved ? undefined : '0 2px 10px rgba(30,58,138,0.25)' }}
          >
            {policySaving ? 'Saving…' : policySaved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </SettingsCard>
    </div>
  );
}
