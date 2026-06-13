'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminDateFormat } from '../components/useAdminFormat';
import AEDAmount from '../../partner/components/AEDAmount';
import {
  createPartnerAccount,
  assignHotelToPartner,
  removeHotelFromPartner,
  setPartnerStatus,
  deletePartnerAccount,
  generatePasswordResetLink,
} from './actions';

// ── Types ────────────────────────────────────────────────────────────────────

export type PartnerHotel = { id: number; name: string; city: string };

export type Partner = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  status: 'active' | 'suspended';
  created_at: string;
  hotels: PartnerHotel[];
  booking_count: number;
  total_revenue: number;
};

type Props = {
  initialPartners: Partner[];
  allHotels: PartnerHotel[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}


// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'active' | 'suspended' }) {
  const cfg = status === 'active'
    ? { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Active' }
    : { bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-400',     label: 'Suspended' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── New Partner Modal ─────────────────────────────────────────────────────────

function NewPartnerModal({
  allHotels,
  onClose,
  onCreated,
}: {
  allHotels: PartnerHotel[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email       = fd.get('email') as string;
    const fullName    = fd.get('fullName') as string;
    const tempPwd     = fd.get('tempPassword') as string;
    const hotelIdStr  = fd.get('hotelId') as string;
    const hotelId     = hotelIdStr ? Number(hotelIdStr) : undefined;

    setError(null);
    startTransition(async () => {
      const result = await createPartnerAccount(email, fullName, tempPwd, hotelId);
      if (result.error) { setError(result.error); return; }
      onCreated();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">New Partner Account</h2>
            <p className="text-xs text-gray-400 mt-0.5">Create a hotel partner login</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name</label>
            <input
              name="fullName"
              type="text"
              required
              placeholder="Ahmed Al Mansouri"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
            <input
              name="email"
              type="email"
              required
              placeholder="manager@grandpalace.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Temporary Password</label>
            <input
              name="tempPassword"
              type="text"
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
            <p className="text-xs text-gray-400 mt-1">Share with the partner — they can change it after first login.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Assign Hotel <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              name="hotelId"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
            >
              <option value="">— Assign later —</option>
              {allHotels.map(h => (
                <option key={h.id} value={h.id}>{h.name} · {h.city}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Creating account…' : 'Create Partner Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Partner Detail Panel ──────────────────────────────────────────────────────

function PartnerDetailPanel({
  partner,
  allHotels,
  onClose,
  onUpdate,
}: {
  partner: Partner;
  allHotels: PartnerHotel[];
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
  const { fmtDate } = useAdminDateFormat();

  async function handleReset() {
    setResetError(null);
    setResetLink(null);
    setResetLoading(true);
    const result = await generatePasswordResetLink(partner.id);
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

  const unassigned = allHotels.filter(h => !partner.hotels.some(ph => ph.id === h.id));

  function act(fn: () => Promise<{ error?: string; success?: boolean }>, closeAfter = false) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) { setError(result.error); return; }
      if (closeAfter) onClose();
      onUpdate();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-900">Partner Details</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">

          {/* Identity */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#001E5A] flex items-center justify-center text-white font-bold text-xl shrink-0">
              {getInitials(partner.full_name)}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">{partner.full_name}</h3>
              <p className="text-gray-400 text-sm truncate">{partner.email}</p>
              <div className="mt-1.5">
                <StatusBadge status={partner.status} />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Hotels',   value: String(partner.hotels.length) },
              { label: 'Bookings', value: partner.booking_count.toLocaleString() },
              { label: 'Revenue',  value: <AEDAmount amount={partner.total_revenue} /> },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-sm font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Meta */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Partner since</span>
            <span className="text-xs font-semibold text-gray-800">{fmtDate(partner.created_at)}</span>
          </div>

          {/* Hotels */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Assigned Hotels</h4>

            {partner.hotels.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-5 bg-gray-50 rounded-xl">
                No hotels assigned yet
              </p>
            ) : (
              <div className="space-y-2">
                {partner.hotels.map(hotel => (
                  <div key={hotel.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div className="min-w-0 mr-3">
                      <p className="text-sm font-semibold text-gray-900 truncate">{hotel.name}</p>
                      <p className="text-xs text-gray-400">{hotel.city}</p>
                    </div>
                    <button
                      onClick={() => act(() => removeHotelFromPartner(partner.id, hotel.id))}
                      disabled={isPending}
                      title="Remove hotel"
                      className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-40 shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {unassigned.length > 0 && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Assign Hotel</label>
                <select
                  onChange={e => {
                    if (!e.target.value) return;
                    act(() => assignHotelToPartner(partner.id, Number(e.target.value)));
                    e.target.value = '';
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                >
                  <option value="">Select hotel to assign…</option>
                  {unassigned.map(h => (
                    <option key={h.id} value={h.id}>{h.name} · {h.city}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Password Reset */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs font-semibold text-gray-700">Password Reset</p>
                <p className="text-xs text-gray-400 mt-0.5">Generate a one-time reset link to share with the partner</p>
              </div>
              <button
                onClick={handleReset}
                disabled={resetLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors disabled:opacity-50 shrink-0"
              >
                {resetLoading ? (
                  <span className="w-3.5 h-3.5 border-2 border-orange-400/30 border-t-orange-500 rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                )}
                {resetLoading ? 'Generating…' : 'Generate Reset Link'}
              </button>
            </div>

            {resetError && <p className="text-xs text-red-600 mt-2">{resetError}</p>}

            {resetLink && (
              <>
                <div className="mt-2.5 flex gap-2 items-center">
                  <input
                    readOnly
                    value={resetLink}
                    dir="ltr"
                    className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-gray-600 truncate focus:outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className={`shrink-0 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                      copied
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  Link expires in 24 hours. Share it via WhatsApp, SMS, or email.
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            {partner.status === 'active' ? (
              <button
                onClick={() => act(() => setPartnerStatus(partner.id, 'suspended'))}
                disabled={isPending}
                className="w-full py-2.5 rounded-xl border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Suspend Account
              </button>
            ) : (
              <button
                onClick={() => act(() => setPartnerStatus(partner.id, 'active'))}
                disabled={isPending}
                className="w-full py-2.5 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Activate Account
              </button>
            )}

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors"
              >
                Delete Account
              </button>
            ) : (
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <p className="text-sm text-red-700 font-medium mb-3">
                  This permanently deletes the account and all its data. Cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => act(() => deletePartnerAccount(partner.id), true)}
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

// ── Main Client Component ─────────────────────────────────────────────────────

export default function PartnersClient({ initialPartners, allHotels }: Props) {
  const router = useRouter();
  const [filter, setFilter]           = useState<'all' | 'active' | 'suspended'>('all');
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState<Partner | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const { fmtDate } = useAdminDateFormat();

  // When server refreshes props, sync the open panel with fresh data
  useEffect(() => {
    if (selected) {
      const updated = initialPartners.find(p => p.id === selected.id);
      setSelected(updated ?? null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPartners]);

  function handleUpdate() {
    router.refresh();
  }

  const filtered = useMemo(() => {
    return initialPartners.filter(p => {
      if (filter !== 'all' && p.status !== filter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.hotels.some(h => h.name.toLowerCase().includes(q) || h.city.toLowerCase().includes(q))
      );
    });
  }, [initialPartners, filter, search]);

  const counts = {
    all:       initialPartners.length,
    active:    initialPartners.filter(p => p.status === 'active').length,
    suspended: initialPartners.filter(p => p.status === 'suspended').length,
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">

      {/* Modals / Panels */}
      {showNewModal && (
        <NewPartnerModal
          allHotels={allHotels}
          onClose={() => setShowNewModal(false)}
          onCreated={handleUpdate}
        />
      )}
      {selected && (
        <PartnerDetailPanel
          partner={selected}
          allHotels={allHotels}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}

      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hotel Partners</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {initialPartners.length} registered partner account{initialPartners.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#001E5A] text-white text-sm font-semibold hover:bg-[#001E5A]/90 transition-colors shadow-sm w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Partner
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Partners', value: counts.all,       accent: 'text-[#001E5A]' },
          { label: 'Active',         value: counts.active,    accent: 'text-emerald-600' },
          { label: 'Suspended',      value: counts.suspended, accent: 'text-red-500' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <p className={`text-2xl font-bold ${accent}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center">
        <div className="relative w-72">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, or hotel…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#001E5A]/20 focus:border-[#001E5A] placeholder-gray-400 transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-sm w-fit">
          {(['all', 'active', 'suspended'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f ? 'bg-[#001E5A] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={`ml-1.5 text-xs ${filter === f ? 'text-white/60' : 'text-gray-400'}`}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">
            {initialPartners.length === 0 ? 'No partner accounts yet. Create one above.' : 'No partners match your search.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Partner</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hotels</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Bookings</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Revenue</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Since</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(partner => (
                  <tr
                    key={partner.id}
                    onClick={() => setSelected(partner)}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    {/* Partner identity */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#001E5A] flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {getInitials(partner.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{partner.full_name}</p>
                          <p className="text-xs text-gray-400 truncate">{partner.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Hotels chips */}
                    <td className="px-6 py-4">
                      {partner.hotels.length === 0 ? (
                        <span className="text-xs text-gray-300 italic">None assigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {partner.hotels.slice(0, 2).map(h => (
                            <span
                              key={h.id}
                              className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-lg truncate max-w-[110px]"
                            >
                              {h.name}
                            </span>
                          ))}
                          {partner.hotels.length > 2 && (
                            <span className="text-xs text-gray-400 font-medium">
                              +{partner.hotels.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {partner.booking_count.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 font-semibold text-gray-900">
                      <AEDAmount amount={partner.total_revenue} />
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={partner.status} />
                    </td>

                    <td className="px-6 py-4 text-xs text-gray-400">
                      {fmtDate(partner.created_at)}
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={e => { e.stopPropagation(); setSelected(partner); }}
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
        </div>
      )}
    </div>
  );
}
