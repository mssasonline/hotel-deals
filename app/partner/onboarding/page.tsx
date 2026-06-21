'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createHotelForPartner } from './actions';

const STAR_OPTIONS = [3, 4, 5];

const COUNTRIES = [
  'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman',
  'Egypt', 'Jordan', 'Lebanon', 'Turkey', 'United Kingdom', 'United States',
  'France', 'Germany', 'Spain', 'Italy', 'Thailand', 'Malaysia', 'Singapore',
  'Indonesia', 'India', 'Pakistan', 'Morocco', 'Tunisia',
];

function ProgressBar({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              s < step
                ? 'bg-green-500 text-white'
                : s === step
                ? 'text-white shadow-md'
                : 'bg-gray-100 text-gray-400'
            }`}
            style={s === step ? { background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' } : {}}
          >
            {s < step ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : s}
          </div>
          {s < 2 && (
            <div className={`h-0.5 w-16 rounded-full transition-all ${s < step ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

const INPUT = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    city: '',
    country: '',
    star_rating: 4 as number | null,
    address: '',
    description: '',
  });

  function set(key: keyof typeof form, value: string | number | null) {
    setForm(p => ({ ...p, [key]: value }));
  }

  function validateStep1() {
    if (!form.name.trim()) return 'Hotel name is required.';
    if (!form.city.trim())  return 'City is required.';
    if (!form.country)      return 'Please select a country.';
    return null;
  }

  function handleNext() {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError(null);
    setStep(2);
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const { error: err } = await createHotelForPartner({
      name:        form.name,
      city:        form.city,
      country:     form.country,
      address:     form.address,
      description: form.description,
      star_rating: form.star_rating,
    });
    setSubmitting(false);
    if (err) { setError(err); return; }
    setDone(true);
    setTimeout(() => router.replace('/partner/dashboard'), 2000);
  }

  if (done) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Hotel Created!</h2>
          <p className="text-gray-500">Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-start justify-center p-6 lg:p-10">
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="mb-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
          <div className="px-6 py-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>
                {step === 1 ? (
                  <>
                    Welcome to{' '}
                    <span style={{ fontFamily: 'var(--font-montserrat, sans-serif)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      <span style={{ color: '#fff' }}>Selected</span><span style={{ color: '#D97706' }}>Room</span>
                    </span><span style={{ fontFamily: 'var(--font-montserrat, sans-serif)', fontSize: '10px', letterSpacing: '0.05em', color: '#fff', verticalAlign: 'baseline', position: 'relative', top: '-2px' }}>.com</span>
                  </>
                ) : 'About your hotel'}
              </h1>
              <p className="text-white/50 text-xs mt-0.5">
                {step === 1 ? "Let's set up your hotel — it only takes a minute." : 'Add more details to help guests find you.'}
              </p>
            </div>
          </div>
        </div>

        <ProgressBar step={step} />

        <div className="bg-white rounded-2xl p-6 space-y-5" style={{ border: '1px solid rgba(30,58,138,0.09)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>

          {/* ── Step 1 ── */}
          {step === 1 && (
            <>
              {/* Hotel name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Hotel Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Grand Hyatt Dubai"
                  className={INPUT}
                  autoFocus
                />
              </div>

              {/* City + Country */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={form.city}
                    onChange={e => set('city', e.target.value)}
                    placeholder="e.g. Dubai"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Country <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.country}
                    onChange={e => set('country', e.target.value)}
                    className={`${INPUT} bg-white`}
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Star rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Star Rating</label>
                <div className="flex gap-3">
                  {STAR_OPTIONS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('star_rating', s)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        form.star_rating === s
                          ? 'bg-brand-gold/10 border-brand-gold text-brand-gold shadow-sm'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {s} ★
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <>
              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                <input
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  placeholder="e.g. Sheikh Zayed Road, Downtown Dubai"
                  className={INPUT}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Hotel Description
                  <span className="ml-2 text-xs font-normal text-gray-400">optional</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Describe your hotel — location highlights, atmosphere, what makes it special…"
                  rows={4}
                  className={`${INPUT} resize-none`}
                />
                <p className="text-xs text-gray-400 mt-1">
                  This will be shown to guests browsing your hotel page.
                </p>
              </div>

              {/* Summary preview */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Summary</p>
                <div className="flex items-center gap-2 text-gray-700">
                  <svg className="w-4 h-4 text-brand-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                  </svg>
                  <span className="font-medium">{form.name}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {form.city}, {form.country}
                </div>
                {form.star_rating && (
                  <div className="flex items-center gap-1 text-brand-gold">
                    {'★'.repeat(form.star_rating)}
                    <span className="text-gray-400 text-xs font-normal ml-1">{form.star_rating}-star</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-sm text-red-600">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            {step === 2 && (
              <button
                type="button"
                onClick={() => { setError(null); setStep(1); }}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={step === 1 ? handleNext : handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 text-sm font-bold text-white disabled:opacity-60 rounded-xl transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
            >
              {submitting && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {step === 1 ? 'Continue →' : submitting ? 'Creating hotel…' : 'Create Hotel'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          You can update all details later from the Hotels section.
        </p>
      </div>
    </div>
  );
}
