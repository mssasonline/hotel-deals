'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminDateFormat } from '../components/useAdminFormat';
import AEDAmount from '../../partner/components/AEDAmount';
import {
  createProperty, deleteProperty, setPropertyPartnerStatus,
  generatePropertyPasswordReset, updatePropertyHotel,
  type PropertyCreateFields, type HotelUpdateFields,
} from './actions';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PropertyPartner = {
  id: string;
  full_name: string;
  email: string;
  status: 'active' | 'suspended';
  created_at: string;
};

export type PropertyHotel = {
  id: number;
  name: string;
  city: string | null;
  country: string | null;
  address: string | null;
  description: string | null;
  star_rating: number | null;
  image_url: string | null;
  is_active: boolean;
  room_count: number;
};

export type PropertyRow = {
  hotel: PropertyHotel;
  partner: PropertyPartner | null;
  booking_count: number;
  total_revenue: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const INPUT = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue';

function Stars({ rating }: { rating: number | null }) {
  const r = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < r ? 'text-amber-400 fill-current' : 'text-gray-200 fill-current'}`} viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: 'active' | 'suspended' }) {
  return status === 'active' ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Suspended
    </span>
  );
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── New Property Modal ────────────────────────────────────────────────────────

function NewPropertyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [form, setForm] = useState<PropertyCreateFields>({
    name: '', city: '', country: '', address: '', description: '',
    star_rating: null, partnerFullName: '', partnerEmail: '', partnerTempPassword: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'star_rating' ? (value ? Number(value) : null) : value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Hotel name is required.'); return; }
    if (!form.partnerEmail.trim()) { setError('Partner email is required.'); return; }
    if (!form.partnerTempPassword || form.partnerTempPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError(null);
    startTransition(async () => {
      const result = await createProperty(form);
      if (result.error) { setError(result.error); return; }
      setEmailSent(result.emailSent ?? false);
      onCreated();
      setTimeout(onClose, 2000);
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">New Property</h2>
            <p className="text-xs text-gray-400 mt-0.5">Create hotel + partner account in one step</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-4">
            {/* Hotel info */}
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Hotel Details</p>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Hotel Name <span className="text-red-400">*</span></label>
              <input name="name" value={form.name} onChange={handleChange} className={INPUT} placeholder="e.g. Cove Rotana Resort" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">City</label>
                <input name="city" value={form.city} onChange={handleChange} className={INPUT} placeholder="e.g. Ras Al Khaimah" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Country</label>
                <input name="country" value={form.country} onChange={handleChange} className={INPUT} placeholder="e.g. UAE" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address</label>
              <input name="address" value={form.address} onChange={handleChange} className={INPUT} placeholder="Full street address" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Star Rating</label>
              <select name="star_rating" value={form.star_rating ?? ''} onChange={handleChange} className={`${INPUT} bg-white`}>
                <option value="">— Select —</option>
                <option value="3">3 Stars</option>
                <option value="4">4 Stars</option>
                <option value="5">5 Stars</option>
              </select>
            </div>

            {/* Partner info */}
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-2 border-t border-gray-100">Partner Account</p>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name <span className="text-red-400">*</span></label>
              <input name="partnerFullName" value={form.partnerFullName} onChange={handleChange} className={INPUT} placeholder="Ahmed Al Mansouri" required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email <span className="text-red-400">*</span></label>
              <input name="partnerEmail" type="email" value={form.partnerEmail} onChange={handleChange} className={INPUT} placeholder="manager@hotel.com" required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Temporary Password <span className="text-red-400">*</span></label>
              <input name="partnerTempPassword" value={form.partnerTempPassword} onChange={handleChange} className={INPUT} placeholder="Min. 8 characters" />
              <p className="text-xs text-gray-400 mt-1">Share with the partner — they can change it after first login.</p>
            </div>

            {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}

            {emailSent === true && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Property created &amp; welcome email sent.
              </div>
            )}
            {emailSent === false && emailSent !== null && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Property created · Email skipped (test mode) — share credentials manually.
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              type="submit"
              disabled={isPending || emailSent !== null}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
            >
              {isPending ? 'Creating…' : 'Create Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Property Detail Panel ─────────────────────────────────────────────────────

function PropertyDetailPanel({
  row,
  onClose,
  onUpdate,
}: {
  row: PropertyRow;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editHotel, setEditHotel] = useState(false);
  const [hotelForm, setHotelForm] = useState<HotelUpdateFields>({
    name:        row.hotel.name,
    city:        row.hotel.city ?? '',
    country:     row.hotel.country ?? '',
    address:     row.hotel.address ?? '',
    description: row.hotel.description ?? '',
    star_rating: row.hotel.star_rating,
  });
  const { fmtDate } = useAdminDateFormat();

  function act(fn: () => Promise<{ error?: string; success?: boolean }>, closeAfter = false) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) { setError(result.error); return; }
      if (closeAfter) onClose();
      onUpdate();
    });
  }

  async function handleReset() {
    if (!row.partner) return;
    setResetError(null); setResetLink(null); setResetLoading(true);
    const result = await generatePropertyPasswordReset(row.partner.id);
    setResetLoading(false);
    if (result.error) { setResetError(result.error); return; }
    setResetLink(result.link ?? null);
  }

  function handleCopy() {
    if (!resetLink) return;
    navigator.clipboard.writeText(resetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleHotelChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setHotelForm(prev => ({ ...prev, [name]: name === 'star_rating' ? (value ? Number(value) : null) : value }));
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-900">Property Details</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">

          {/* Hotel section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Hotel</h3>
              <button
                onClick={() => setEditHotel(v => !v)}
                className="text-xs font-semibold text-brand-blue hover:underline"
              >
                {editHotel ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {editHotel ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hotel Name</label>
                  <input name="name" value={hotelForm.name ?? ''} onChange={handleHotelChange} className={INPUT} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                    <input name="city" value={hotelForm.city ?? ''} onChange={handleHotelChange} className={INPUT} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                    <input name="country" value={hotelForm.country ?? ''} onChange={handleHotelChange} className={INPUT} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                  <input name="address" value={hotelForm.address ?? ''} onChange={handleHotelChange} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Star Rating</label>
                  <select name="star_rating" value={hotelForm.star_rating ?? ''} onChange={handleHotelChange} className={`${INPUT} bg-white`}>
                    <option value="">—</option>
                    <option value="3">3 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="5">5 Stars</option>
                  </select>
                </div>
                <button
                  onClick={() => act(async () => {
                    const r = await updatePropertyHotel(row.hotel.id, hotelForm);
                    if (!r.error) setEditHotel(false);
                    return r;
                  })}
                  disabled={isPending}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
                >
                  {isPending ? 'Saving…' : 'Save Hotel Changes'}
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-gray-900">{row.hotel.name}</p>
                {(row.hotel.city || row.hotel.country) && (
                  <p className="text-sm text-gray-500">{[row.hotel.city, row.hotel.country].filter(Boolean).join(', ')}</p>
                )}
                {row.hotel.address && <p className="text-xs text-gray-400">{row.hotel.address}</p>}
                <div className="flex items-center gap-3 pt-1">
                  <Stars rating={row.hotel.star_rating} />
                  <span className="text-xs text-gray-400">{row.hotel.room_count} room{row.hotel.room_count !== 1 ? 's' : ''}</span>
                  <a href={`/hotel/${row.hotel.id}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-brand-blue hover:underline ml-auto">View →</a>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{row.booking_count.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-0.5">Bookings</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-900"><AEDAmount amount={row.total_revenue} /></p>
              <p className="text-xs text-gray-400 mt-0.5">Revenue</p>
            </div>
          </div>

          {/* Partner section */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Partner Account</h3>

            {row.partner ? (
              <div className="space-y-4">
                {/* Identity */}
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-[#001E5A] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {getInitials(row.partner.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{row.partner.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{row.partner.email}</p>
                    <div className="mt-1"><StatusPill status={row.partner.status} /></div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Partner since</span>
                  <span className="text-xs font-semibold text-gray-800">{fmtDate(row.partner.created_at)}</span>
                </div>

                {/* Password Reset */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Password Reset</p>
                      <p className="text-xs text-gray-400 mt-0.5">Generate a one-time link to share</p>
                    </div>
                    <button
                      onClick={handleReset}
                      disabled={resetLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                    >
                      {resetLoading
                        ? <span className="w-3.5 h-3.5 border-2 border-orange-400/30 border-t-orange-500 rounded-full animate-spin" />
                        : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                      }
                      {resetLoading ? 'Generating…' : 'Generate Reset Link'}
                    </button>
                  </div>
                  {resetError && <p className="text-xs text-red-600 mt-2">{resetError}</p>}
                  {resetLink && (
                    <>
                      <div className="mt-2.5 flex gap-2 items-center">
                        <input readOnly value={resetLink} dir="ltr"
                          className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-gray-600 truncate focus:outline-none" />
                        <button onClick={handleCopy}
                          className={`shrink-0 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${copied ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`}>
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1.5">Link expires in 24 hours.</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-5 text-center">
                <p className="text-sm text-gray-400">No partner account assigned</p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            {row.partner && (
              row.partner.status === 'active' ? (
                <button
                  onClick={() => act(() => setPropertyPartnerStatus(row.partner!.id, row.hotel.id, 'suspended'))}
                  disabled={isPending}
                  className="w-full py-2.5 rounded-xl border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  Suspend Partner Account
                </button>
              ) : (
                <button
                  onClick={() => act(() => setPropertyPartnerStatus(row.partner!.id, row.hotel.id, 'active'))}
                  disabled={isPending}
                  className="w-full py-2.5 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  Activate Partner Account
                </button>
              )
            )}

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors"
              >
                Delete Property
              </button>
            ) : (
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <p className="text-sm text-red-700 font-medium mb-1">Delete property permanently?</p>
                <p className="text-xs text-red-400 mb-3">This removes the hotel, all rooms, and the partner account. Cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={() => act(() => deleteProperty(row.hotel.id, row.partner?.id ?? null), true)}
                    disabled={isPending}
                    className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {isPending ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  initialProperties: PropertyRow[];
}

export default function PropertiesClient({ initialProperties }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'unassigned'>('all');
  const [selected, setSelected] = useState<PropertyRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { fmtDate } = useAdminDateFormat();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function handleUpdate() {
    router.refresh();
  }

  const filtered = useMemo(() => {
    return initialProperties.filter(row => {
      if (filter === 'active' && row.partner?.status !== 'active') return false;
      if (filter === 'suspended' && row.partner?.status !== 'suspended') return false;
      if (filter === 'unassigned' && row.partner !== null) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        row.hotel.name.toLowerCase().includes(q) ||
        (row.hotel.city ?? '').toLowerCase().includes(q) ||
        (row.hotel.country ?? '').toLowerCase().includes(q) ||
        (row.partner?.full_name ?? '').toLowerCase().includes(q) ||
        (row.partner?.email ?? '').toLowerCase().includes(q)
      );
    });
  }, [initialProperties, filter, search]);

  const counts = {
    all:        initialProperties.length,
    active:     initialProperties.filter(r => r.partner?.status === 'active').length,
    suspended:  initialProperties.filter(r => r.partner?.status === 'suspended').length,
    unassigned: initialProperties.filter(r => r.partner === null).length,
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">

      {/* Modals / Panels */}
      {showCreate && (
        <NewPropertyModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { showToast('Property created successfully.'); handleUpdate(); }}
        />
      )}
      {selected && (
        <PropertyDetailPanel
          row={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[60] flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #D97706 0%, #B45309 100%)' }} />
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>Properties</h1>
            </div>
            <p className="text-white/45 text-xs pl-3">{initialProperties.length} propert{initialProperties.length !== 1 ? 'ies' : 'y'} on the platform</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)', boxShadow: '0 2px 10px rgba(217,119,6,0.35)', color: '#fff' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Property
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: counts.all, accent: 'text-[#001E5A]' },
          { label: 'Active', value: counts.active, accent: 'text-emerald-600' },
          { label: 'Suspended', value: counts.suspended, accent: 'text-red-500' },
          { label: 'Unassigned', value: counts.unassigned, accent: 'text-amber-600' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <p className={`text-2xl font-bold ${accent}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 items-start sm:items-center">
        <div className="relative w-72">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search hotel, city, partner…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue placeholder-gray-400 transition"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-sm w-fit">
          {(['all', 'active', 'suspended', 'unassigned'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f ? 'bg-[#001E5A] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={`ml-1 ${filter === f ? 'text-white/60' : 'text-gray-400'}`}>{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Hotel</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Location</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Stars / Rooms</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Partner</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Bookings</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Revenue</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center text-gray-400 text-sm">
                  {search ? 'No properties match your search.' : 'No properties yet.'}
                </td>
              </tr>
            ) : filtered.map(row => (
              <tr
                key={row.hotel.id}
                onClick={() => setSelected(row)}
                className="hover:bg-gray-50/50 transition-colors cursor-pointer"
              >
                <td className="px-5 py-4">
                  <p className="font-semibold text-gray-900">{row.hotel.name}</p>
                  {row.hotel.address && <p className="text-xs text-gray-400 mt-0.5 max-w-[200px] truncate">{row.hotel.address}</p>}
                </td>
                <td className="px-5 py-4 text-gray-600 text-sm">
                  {[row.hotel.city, row.hotel.country].filter(Boolean).join(', ') || <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-4">
                  <Stars rating={row.hotel.star_rating} />
                  <p className="text-xs text-gray-400 mt-0.5">{row.hotel.room_count} room{row.hotel.room_count !== 1 ? 's' : ''}</p>
                </td>
                <td className="px-5 py-4">
                  {row.partner ? (
                    <div>
                      <p className="text-sm font-medium text-gray-800">{row.partner.full_name}</p>
                      <p className="text-xs text-gray-400">{row.partner.email}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">Unassigned</span>
                  )}
                </td>
                <td className="px-5 py-4 font-semibold text-gray-900">{row.booking_count.toLocaleString()}</td>
                <td className="px-5 py-4 font-semibold text-gray-900"><AEDAmount amount={row.total_revenue} /></td>
                <td className="px-5 py-4">
                  {row.partner
                    ? <StatusPill status={row.partner.status} />
                    : <span className="text-xs text-gray-300 italic">—</span>
                  }
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={e => { e.stopPropagation(); setSelected(row); }}
                    className="text-gray-300 hover:text-[#001E5A] hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Partner since col only shown in panel - mobile cards for future */}
      <p className="text-xs text-gray-300 mt-3 text-right">Click any row to view full details</p>
    </div>
  );
}
