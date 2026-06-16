'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '../components/StatusBadge';
import {
  createHotel, updateHotel, deleteHotel,
  getHotelImages, addHotelImage, deleteHotelImage,
  type HotelCreateFields, type HotelImageRow,
} from './actions';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AdminHotelRow = {
  id: number;
  name: string;
  city: string | null;
  country: string | null;
  address: string | null;
  description: string | null;
  star_rating: number | null;
  image_url: string | null;
  room_count: number;
  partners: Array<{ id: string; full_name: string }>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number | null }) {
  const r = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < r ? 'text-amber-400 fill-current' : 'text-gray-200 fill-current'}`} viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      {r > 0 && <span className="ml-1 text-xs text-gray-400">{r}★</span>}
    </div>
  );
}

// ── Shared input style ────────────────────────────────────────────────────────

const INPUT = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue';

// ── Hotel Form Modal ──────────────────────────────────────────────────────────

type HotelModalProps = {
  mode: 'create' | 'edit';
  initial?: AdminHotelRow;
  onClose: () => void;
  onDone: () => void;
};

function HotelModal({ mode, initial, onClose, onDone }: HotelModalProps) {
  const [form, setForm] = useState<HotelCreateFields>({
    name:        initial?.name        ?? '',
    city:        initial?.city        ?? '',
    country:     initial?.country     ?? '',
    address:     initial?.address     ?? '',
    description: initial?.description ?? '',
    star_rating: initial?.star_rating ?? null,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'star_rating' ? (value ? Number(value) : null) : value }));
  }

  function handleSubmit() {
    if (!form.name.trim()) { setError('Hotel name is required.'); return; }
    setError(null);

    startTransition(async () => {
      const result = mode === 'create'
        ? await createHotel(form)
        : await updateHotel(initial!.id, form);

      if (result.error) { setError(result.error); return; }
      onDone();
    });
  }

  const title = mode === 'create' ? 'Add New Hotel' : 'Edit Hotel Details';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} disabled={pending} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Hotel Name <span className="text-red-400">*</span></label>
            <input name="name" value={form.name} onChange={handleChange} className={INPUT} placeholder="e.g. Cove Rotana" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
              <input name="city" value={form.city} onChange={handleChange} className={INPUT} placeholder="e.g. Ras Al Khaimah" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
              <input name="country" value={form.country} onChange={handleChange} className={INPUT} placeholder="e.g. UAE" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
            <input name="address" value={form.address} onChange={handleChange} className={INPUT} placeholder="Full street address" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Star Rating</label>
            <select name="star_rating" value={form.star_rating ?? ''} onChange={handleChange} className={`${INPUT} bg-white`}>
              <option value="">— Select —</option>
              <option value="3">3 Stars</option>
              <option value="4">4 Stars</option>
              <option value="5">5 Stars</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className={`${INPUT} resize-none`}
              placeholder="Brief description of the hotel…"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-sm text-red-600">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} disabled={pending} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={pending}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-60 flex items-center gap-2 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}
          >
            {pending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {pending ? 'Saving…' : mode === 'create' ? 'Create Hotel' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────

function DeleteDialog({
  hotel,
  onConfirm,
  onCancel,
}: {
  hotel: AdminHotelRow;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await deleteHotel(hotel.id);
      onConfirm();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Delete Hotel</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <span className="font-semibold">{hotel.name}</span>? This will also remove all associated rooms and partner assignments. This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={pending} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={pending}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {pending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {pending ? 'Deleting…' : 'Delete Hotel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Hotel Images Modal ────────────────────────────────────────────────────────

function HotelImagesModal({ hotel, onClose }: { hotel: AdminHotelRow; onClose: () => void }) {
  const [images, setImages]     = useState<HotelImageRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [newUrl, setNewUrl]     = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getHotelImages(hotel.id).then(({ data }) => {
      setImages(data ?? []);
      setLoading(false);
    });
  }, [hotel.id]);

  useEffect(() => { inputRef.current?.focus(); }, [loading]);

  async function handleAdd() {
    const url = newUrl.trim();
    if (!url) { setUrlError('Please enter an image URL.'); return; }
    if (!/^https?:\/\/.+\..+/.test(url)) { setUrlError('Enter a valid URL starting with http:// or https://'); return; }
    setUrlError(null);
    setSaving(true);
    const nextOrder = images.length > 0 ? Math.max(...images.map(i => i.sort_order)) + 1 : 0;
    const result = await addHotelImage(hotel.id, url, nextOrder);
    if (result.error) { setUrlError(result.error); setSaving(false); return; }
    const { data } = await getHotelImages(hotel.id);
    setImages(data ?? []);
    setNewUrl('');
    setSaving(false);
  }

  async function handleDelete(img: HotelImageRow) {
    setDeletingId(img.id);
    await deleteHotelImage(img.id, hotel.id);
    setImages(prev => prev.filter(i => i.id !== img.id));
    setDeletingId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Gallery Images</h2>
            <p className="text-xs text-gray-400 mt-0.5">{hotel.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">No gallery images yet</span>
            </div>
          ) : (
            images.map((img, idx) => (
              <div key={img.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-2 border border-gray-100">
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.image_url}
                  alt={`Image ${idx + 1}`}
                  className="w-20 h-14 object-cover rounded-lg shrink-0 bg-gray-200"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&q=60'; }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-0.5">Image {idx + 1}</span>
                  <p className="text-xs text-gray-500 truncate">{img.image_url}</p>
                </div>
                <button
                  onClick={() => handleDelete(img)}
                  disabled={deletingId === img.id}
                  className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 shrink-0"
                  title="Remove image"
                >
                  {deletingId === img.id
                    ? <span className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin block" />
                    : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )
                  }
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add image */}
        <div className="shrink-0 border-t border-gray-100 px-6 py-4 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add Image URL</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                ref={inputRef}
                type="url"
                value={newUrl}
                onChange={(e) => { setNewUrl(e.target.value); setUrlError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                placeholder="https://images.unsplash.com/photo-…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
              />
              {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
            </div>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all shadow-sm disabled:opacity-60 flex items-center gap-2 whitespace-nowrap hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
            >
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Adding…' : 'Add Image'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {images.length} image{images.length !== 1 ? 's' : ''} · Images appear in the hotel gallery lightbox in order shown
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Client Component ─────────────────────────────────────────────────────

interface HotelsClientProps {
  initialHotels: AdminHotelRow[];
}

export default function HotelsClient({ initialHotels }: HotelsClientProps) {
  const router  = useRouter();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate]     = useState(false);
  const [editTarget, setEditTarget]     = useState<AdminHotelRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminHotelRow | null>(null);
  const [imagesTarget, setImagesTarget] = useState<AdminHotelRow | null>(null);
  const [toast, setToast]   = useState<string | null>(null);

  const filtered = initialHotels.filter(h => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      (h.city ?? '').toLowerCase().includes(q) ||
      (h.country ?? '').toLowerCase().includes(q)
    );
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function handleDone(msg: string) {
    showToast(msg);
    setShowCreate(false);
    setEditTarget(null);
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      {/* Modals */}
      {showCreate && (
        <HotelModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onDone={() => handleDone('Hotel created successfully.')}
        />
      )}
      {editTarget && (
        <HotelModal
          mode="edit"
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onDone={() => handleDone('Hotel updated successfully.')}
        />
      )}
      {deleteTarget && (
        <DeleteDialog
          hotel={deleteTarget}
          onConfirm={() => handleDone('Hotel deleted.')}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {imagesTarget && (
        <HotelImagesModal
          hotel={imagesTarget}
          onClose={() => setImagesTarget(null)}
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hotels</h1>
          <p className="text-gray-400 text-sm mt-0.5">{initialHotels.length} propert{initialHotels.length === 1 ? 'y' : 'ies'} on the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all whitespace-nowrap hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Hotel
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-72 mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by name, city, country…"
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

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Hotel</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Location</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Rating</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Rooms</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Partner</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-gray-400 text-sm">
                      {search ? 'No hotels match your search.' : 'No hotels yet. Click "New Hotel" to add one.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((hotel) => (
                <tr key={hotel.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{hotel.name}</p>
                      {hotel.address && (
                        <p className="text-xs text-gray-400 mt-0.5 max-w-[220px] truncate">{hotel.address}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    {[hotel.city, hotel.country].filter(Boolean).join(', ') || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <Stars rating={hotel.star_rating} />
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-gray-700 font-medium">{hotel.room_count}</span>
                    <span className="text-gray-400 text-xs ml-1">room{hotel.room_count !== 1 ? 's' : ''}</span>
                  </td>
                  <td className="px-5 py-4">
                    {hotel.partners.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {hotel.partners.map(p => (
                          <StatusBadge key={p.id} status="approved" />
                        )).slice(0, 1)}
                        <span className="text-sm text-gray-600">{hotel.partners[0].full_name}</span>
                        {hotel.partners.length > 1 && (
                          <span className="text-xs text-gray-400">+{hotel.partners.length - 1} more</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditTarget(hotel)}
                        className="px-3 py-1.5 text-xs font-medium bg-brand-blue-light text-brand-blue hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setImagesTarget(hotel)}
                        className="px-3 py-1.5 text-xs font-medium bg-violet-50 text-violet-600 hover:bg-violet-100 rounded-lg transition-colors"
                      >
                        Images
                      </button>
                      <a
                        href={`/hotel/${hotel.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        View
                      </a>
                      <button
                        onClick={() => setDeleteTarget(hotel)}
                        className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
