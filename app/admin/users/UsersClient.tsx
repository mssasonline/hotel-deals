'use client';

import { useState, useTransition } from 'react';
import StatusBadge from '../components/StatusBadge';
import { setUserStatus, generatePasswordResetLink } from './actions';
import { useAdminDateFormat } from '../components/useAdminFormat';
import AEDAmount, { useAEDFormat } from '../../partner/components/AEDAmount';

export type UserStatus = 'active' | 'suspended';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  country: string;
  totalBookings: number;
  totalSpent: number;
  lastBooking: string | null;
  joinedAt: string;
  status: UserStatus;
}

const STATUS_FILTERS: Array<{ label: string; value: UserStatus | 'all' }> = [
  { label: 'All Users', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
];

function UserRow({
  user,
  onToggle,
}: {
  user: AdminUser;
  onToggle: (u: AdminUser, status: UserStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [resetLink, setResetLink]     = useState<string | null>(null);
  const { fmtDate } = useAdminDateFormat();
  const fmt = useAEDFormat();
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError]   = useState<string | null>(null);
  const [copied, setCopied]           = useState(false);

  async function handleReset(e: React.MouseEvent) {
    e.stopPropagation();
    setResetError(null);
    setResetLink(null);
    setResetLoading(true);
    const result = await generatePasswordResetLink(user.id);
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

  return (
    <>
      <tr
        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-blue-light flex items-center justify-center text-brand-blue font-bold text-xs shrink-0">
              {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
        </td>
        <td className="px-5 py-4 text-gray-600 text-sm">{user.country || '—'}</td>
        <td className="px-5 py-4 font-medium text-gray-800">{user.totalBookings}</td>
        <td className="px-5 py-4 font-semibold text-gray-900"><AEDAmount amount={user.totalSpent} /></td>
        <td className="px-5 py-4 text-xs text-gray-400">{fmtDate(user.lastBooking)}</td>
        <td className="px-5 py-4">
          <StatusBadge status={user.status} />
        </td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {user.status === 'active' ? (
              <button
                onClick={() => onToggle(user, 'suspended')}
                className="px-2.5 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
              >
                Suspend
              </button>
            ) : (
              <button
                onClick={() => onToggle(user, 'active')}
                className="px-2.5 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                Activate
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-blue-50/30">
          <td colSpan={7} className="px-5 py-4 space-y-3">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'User ID', value: user.id },
                { label: 'Joined', value: fmtDate(user.joinedAt) },
                { label: 'Last Booking', value: fmtDate(user.lastBooking) },
                { label: 'Avg Spend / Booking', value: user.totalBookings > 0 ? fmt(Math.round(user.totalSpent / user.totalBookings)) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-xl p-3 shadow-sm">
                  <p className="text-xs text-gray-400 font-medium">{label}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate" title={value}>{value}</p>
                </div>
              ))}
            </div>

            {/* Password Reset */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-semibold text-gray-700">Password Reset</p>
                  <p className="text-xs text-gray-400 mt-0.5">Generate a one-time reset link to share with the user</p>
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

              {resetError && (
                <p className="text-xs text-red-600 mt-2">{resetError}</p>
              )}

              {resetLink && (
                <div className="mt-2.5 flex gap-2 items-center">
                  <input
                    readOnly
                    value={resetLink}
                    dir="ltr"
                    className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-gray-600 truncate focus:outline-none"
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
              )}
              {resetLink && (
                <p className="text-[10px] text-gray-400 mt-1.5">
                  Link expires in 24 hours. Share it via WhatsApp, SMS, or email.
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function UsersClient({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [filter, setFilter] = useState<UserStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    const matchStatus = filter === 'all' || u.status === filter;
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.country.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    all: users.length,
    active: users.filter((u) => u.status === 'active').length,
    suspended: users.filter((u) => u.status === 'suspended').length,
  };

  function handleToggle(u: AdminUser, newStatus: UserStatus) {
    setActionError(null);
    // Optimistic update
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, status: newStatus } : x));

    startTransition(async () => {
      const result = await setUserStatus(u.id, newStatus);
      if (result.error) {
        // Rollback
        setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, status: u.status } : x));
        setActionError(result.error);
      }
    });
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-400 text-sm mt-0.5">{users.length} registered travellers</p>
      </div>

      {actionError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {actionError}
        </div>
      )}

      {/* Search + Tabs */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative w-72">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue placeholder-gray-400 transition"
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
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === value ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
            style={filter === value ? { background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' } : {}}
          >
            {label}
            <span className={`ml-1.5 text-xs ${filter === value ? 'text-white/70' : 'text-gray-400'}`}>
              {counts[value]}
            </span>
          </button>
        ))}
        </div>
      </div>

      <div className={`overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white transition-opacity ${isPending ? 'opacity-70' : ''}`}>
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">User</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Country</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Bookings</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Spent</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Last Booking</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">No users found.</td></tr>
            ) : (
              filtered.map((user) => (
                <UserRow key={user.id} user={user} onToggle={handleToggle} />
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3">Click any row to view booking history details.</p>
    </div>
  );
}
