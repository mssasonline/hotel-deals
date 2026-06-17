'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getTranslations } from '@/lib/i18n/translations';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import {
  getMyHotels,
  getMyHotelImages,
  addHotelImage,
  deleteHotelImage,
  updateMyHotel,
  type PartnerHotel,
  type HotelImage,
} from '../actions';

// ── Hotel amenity options ─────────────────────────────────────────────────────

const HOTEL_AMENITIES = [
  // ── Facilities ──────────────────────────────────────
  { key: 'pool',           label: 'Swimming Pool',    icon: '🏊', group: 'facilities' },
  { key: 'gym',            label: 'Gym / Fitness',    icon: '🏋️', group: 'facilities' },
  { key: 'spa',            label: 'Spa & Wellness',   icon: '💆', group: 'facilities' },
  { key: 'beach_access',   label: 'Beach Access',     icon: '🏖️', group: 'facilities' },
  { key: 'golf',           label: 'Golf Course',      icon: '⛳', group: 'facilities' },
  { key: 'rooftop',        label: 'Rooftop',          icon: '🌆', group: 'facilities' },
  { key: 'bar_lounge',     label: 'Bar & Lounge',     icon: '🍸', group: 'facilities' },
  { key: 'casino',         label: 'Casino',           icon: '🎰', group: 'facilities' },
  { key: 'conference',     label: 'Conference Room',  icon: '🏛️', group: 'facilities' },
  { key: 'business_center',label: 'Business Center',  icon: '💼', group: 'facilities' },
  { key: 'kids_club',      label: 'Kids Club',        icon: '🧒', group: 'facilities' },
  // ── Services ─────────────────────────────────────────
  { key: 'restaurant',     label: 'Restaurant',       icon: '🍽️', group: 'services' },
  { key: 'room_service',   label: 'Room Service',     icon: '🛎️', group: 'services' },
  { key: 'free_wifi',      label: 'Free Wi-Fi',       icon: '📶', group: 'services' },
  { key: 'free_parking',   label: 'Free Parking',     icon: '🅿️', group: 'services' },
  { key: 'paid_parking',   label: 'Paid Parking',     icon: '🏷️', group: 'services' },
  { key: 'valet_parking',  label: 'Valet Parking',    icon: '🚗', group: 'services' },
  { key: 'airport_shuttle',label: 'Airport Shuttle',  icon: '🚌', group: 'services' },
  { key: 'pet_friendly',   label: 'Pet Friendly',     icon: '🐾', group: 'services' },
] as const;

type Tab = 'details' | 'images' | 'amenities' | 'location';

// ── URL parsers & geocoding ───────────────────────────────────────────────────

function parseGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  // Format: @lat,lng,zoom  (covers /maps/place/.../@lat,lng,... too)
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  // Format: ?q=lat,lng or &q=lat,lng
  const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  // Format: /maps?ll=lat,lng
  const llMatch = url.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
  return null;
}

function parseBookingComUrl(url: string): { name: string; countryCode: string } | null {
  const match = url.match(/booking\.com\/hotel\/([a-z]{2})\/([^.?#/]+)\.html/i);
  if (!match) return null;
  return {
    countryCode: match[1].toLowerCase(),
    name: match[2].replace(/-/g, ' '),
  };
}

async function geocodeByName(name: string, countryCode: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const params = new URLSearchParams({ q: name, format: 'json', limit: '1', countrycodes: countryCode });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'hotel-deals-partner' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
    </div>
  );
}

function StarDisplay({ rating }: { rating: number | null }) {
  const r = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i < r ? 'text-brand-gold fill-current' : 'text-gray-200 fill-current'}`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      {r > 0 && <span className="ml-1 text-xs text-gray-500">{r}-star</span>}
    </div>
  );
}

// ── Amenity chip picker ───────────────────────────────────────────────────────

function AmenityPicker({
  selected,
  onChange,
  t,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  t: ReturnType<typeof getTranslations>;
}) {
  const [customInput, setCustomInput] = useState('');

  const predefinedKeys: Set<string> = new Set(HOTEL_AMENITIES.map(a => a.key));
  const customAmenities = selected.filter(k => !predefinedKeys.has(k));

  function toggle(key: string) {
    onChange(
      selected.includes(key)
        ? selected.filter(k => k !== key)
        : [...selected, key]
    );
  }

  function addCustom() {
    const val = customInput.trim();
    if (!val || selected.includes(val)) return;
    onChange([...selected, val]);
    setCustomInput('');
  }

  function removeCustom(key: string) {
    onChange(selected.filter(k => k !== key));
  }

  const facilities = HOTEL_AMENITIES.filter(a => a.group === 'facilities');
  const services   = HOTEL_AMENITIES.filter(a => a.group === 'services');

  function renderChips(list: typeof facilities | typeof services) {
    return list.map(a => {
      const on = selected.includes(a.key);
      return (
        <button
          key={a.key}
          type="button"
          onClick={() => toggle(a.key)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            on
              ? 'text-white border-transparent shadow-sm'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-brand-blue hover:text-brand-blue'
          }`}
          style={on ? { background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' } : {}}
        >
          <span>{a.icon}</span>
          <span>{a.label}</span>
        </button>
      );
    });
  }

  return (
    <div className="space-y-4">
      {/* Facilities */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Facilities</p>
        <div className="flex flex-wrap gap-2">{renderChips(facilities)}</div>
      </div>

      {/* Services */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Services</p>
        <div className="flex flex-wrap gap-2">{renderChips(services)}</div>
      </div>

      {/* Custom amenities */}
      {customAmenities.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">{t['partner.hotels.customAmenities']}</p>
          <div className="flex flex-wrap gap-2">
            {customAmenities.map(key => (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
              >
                {key}
                <button
                  type="button"
                  onClick={() => removeCustom(key)}
                  className="ml-0.5 hover:text-red-500 transition-colors"
                  aria-label={`Remove ${key}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add custom amenity */}
      <div className="flex gap-2 pt-1 border-t border-gray-100">
        <input
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          placeholder={t['partner.hotels.customAmenityPlaceholder']}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customInput.trim()}
          className="px-3 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-50 shrink-0 hover:-translate-y-0.5 transition-all"
          style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
        >
          {t['partner.hotels.addCustomAmenity']}
        </button>
      </div>
    </div>
  );
}

// ── Edit hotel modal ──────────────────────────────────────────────────────────

interface ManageModalProps {
  hotel: PartnerHotel;
  onClose: () => void;
  onSaved: (updated: PartnerHotel) => void;
}

function ManageHotelModal({ hotel, onClose, onSaved }: ManageModalProps) {
  const language = useAppSettingsStore(s => s.language);
  const t = getTranslations(language);

  const [tab, setTab] = useState<Tab>('details');

  // ── Details state
  const [form, setForm] = useState({
    name:        hotel.name,
    city:        hotel.city,
    country:     hotel.country,
    address:     hotel.address,
    description: hotel.description,
    star_rating: String(hotel.star_rating ?? ''),
  });
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsError, setDetailsError]   = useState<string | null>(null);
  const [detailsMsg, setDetailsMsg]       = useState<string | null>(null);

  // ── Images state
  const [images, setImages]         = useState<HotelImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [newUrl, setNewUrl]         = useState('');
  const [urlError, setUrlError]     = useState<string | null>(null);
  const [imgMsg, setImgMsg]         = useState<string | null>(null);
  const [addingImg, setAddingImg]   = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Amenities state
  const [amenities, setAmenities]         = useState<string[]>(Array.isArray(hotel.amenities) ? hotel.amenities : []);
  const [amenitiesSaving, setAmenitiesSaving] = useState(false);
  const [amenitiesMsg, setAmenitiesMsg]   = useState<string | null>(null);

  // ── Location state
  const [locationForm, setLocationForm] = useState({
    latitude:     hotel.latitude  != null ? String(hotel.latitude)  : '',
    longitude:    hotel.longitude != null ? String(hotel.longitude) : '',
    airport_code: hotel.airport_code ?? '',
  });
  const [mapsUrl, setMapsUrl]           = useState('');
  const [mapsError, setMapsError]       = useState<string | null>(null);
  const [geocoding, setGeocoding]       = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationMsg, setLocationMsg]   = useState<string | null>(null);

  // Load images when images tab first opened
  const loadImages = useCallback(async () => {
    setImagesLoading(true);
    const imgs = await getMyHotelImages(hotel.id);
    setImages(imgs);
    setImagesLoading(false);
  }, [hotel.id]);

  function handleTabChange(next: Tab) {
    setTab(next);
    if (next === 'images' && images.length === 0 && !imagesLoading) {
      loadImages();
    }
  }

  // ── Details save
  async function saveDetails() {
    setDetailsError(null);
    if (!form.name.trim()) { setDetailsError(t['partner.hotels.nameRequired']); return; }
    setDetailsSaving(true);
    const { error } = await updateMyHotel(hotel.id, {
      name:        form.name.trim(),
      city:        form.city.trim(),
      country:     form.country.trim(),
      address:     form.address.trim(),
      description: form.description.trim(),
      star_rating: form.star_rating ? parseInt(form.star_rating, 10) : null,
    });
    setDetailsSaving(false);
    if (error) { setDetailsError(error); return; }
    setDetailsMsg(t['partner.hotels.updated']);
    setTimeout(() => setDetailsMsg(null), 2500);
    onSaved({
      ...hotel,
      name:        form.name.trim(),
      city:        form.city.trim(),
      country:     form.country.trim(),
      address:     form.address.trim(),
      description: form.description.trim(),
      star_rating: form.star_rating ? parseInt(form.star_rating, 10) : null,
    });
  }

  // ── Add image
  async function handleAddImage() {
    const url = newUrl.trim();
    if (!url) return;
    setUrlError(null);
    setAddingImg(true);
    const { data, error } = await addHotelImage(hotel.id, url);
    setAddingImg(false);
    if (error) { setUrlError(error); return; }
    if (data) setImages(prev => [...prev, data]);
    setNewUrl('');
    setImgMsg(t['partner.hotels.imageAdded']);
    setTimeout(() => setImgMsg(null), 2000);
  }

  // ── Delete image
  async function handleDeleteImage(imageId: string) {
    setDeletingId(imageId);
    await deleteHotelImage(imageId, hotel.id);
    setImages(prev => prev.filter(i => i.id !== imageId));
    setDeletingId(null);
    setImgMsg(t['partner.hotels.imageDeleted']);
    setTimeout(() => setImgMsg(null), 2000);
  }

  // ── Parse maps / booking URL → coordinates
  async function handleParseMapsUrl() {
    setMapsError(null);
    const url = mapsUrl.trim();

    // 1. Try Google Maps URL (instant, no network)
    const gmResult = parseGoogleMapsUrl(url);
    if (gmResult) {
      setLocationForm(p => ({ ...p, latitude: String(gmResult.lat), longitude: String(gmResult.lng) }));
      setMapsUrl('');
      return;
    }

    // 2. Try Booking.com URL → geocode via Nominatim
    const booking = parseBookingComUrl(url);
    if (booking) {
      setGeocoding(true);
      const geo = await geocodeByName(booking.name, booking.countryCode);
      setGeocoding(false);
      if (geo) {
        setLocationForm(p => ({ ...p, latitude: String(geo.lat), longitude: String(geo.lng) }));
        setMapsUrl('');
      } else {
        setMapsError(t['partner.hotels.locationNotFound'].replace('{name}', booking.name));
      }
      return;
    }

    setMapsError(t['partner.hotels.locationUnsupported']);
  }

  // ── Save location
  async function saveLocation() {
    setLocationMsg(null);
    const lat  = locationForm.latitude.trim()  ? parseFloat(locationForm.latitude.trim())  : null;
    const lng  = locationForm.longitude.trim() ? parseFloat(locationForm.longitude.trim()) : null;
    const code = locationForm.airport_code.trim() || null;

    if ((locationForm.latitude.trim() && isNaN(lat!)) || (locationForm.longitude.trim() && isNaN(lng!))) {
      setLocationMsg(t['partner.hotels.locationInvalid']);
      return;
    }

    setLocationSaving(true);
    const { error } = await updateMyHotel(hotel.id, {
      latitude:     lat,
      longitude:    lng,
      airport_code: code,
    });
    setLocationSaving(false);
    if (error) { setLocationMsg(t['partner.hotels.locationErrorPrefix'] + error); return; }
    setLocationMsg(t['partner.hotels.locationSaved']);
    setTimeout(() => setLocationMsg(null), 2500);
    onSaved({ ...hotel, latitude: lat, longitude: lng, airport_code: code });
  }

  // ── Save amenities
  async function saveAmenities() {
    setAmenitiesSaving(true);
    await updateMyHotel(hotel.id, { amenities });
    setAmenitiesSaving(false);
    setAmenitiesMsg(t['partner.hotels.amenitiesSaved']);
    setTimeout(() => setAmenitiesMsg(null), 2500);
    onSaved({ ...hotel, amenities });
  }

  const INPUT = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue';

  const TABS: { key: Tab; label: string }[] = [
    { key: 'details',   label: t['partner.hotels.tabDetails']   },
    { key: 'images',    label: t['partner.hotels.tabImages']    },
    { key: 'amenities', label: t['partner.hotels.tabAmenities'] },
    { key: 'location',  label: t['partner.hotels.tabLocation']  },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{hotel.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          {TABS.map(tb => (
            <button
              key={tb.key}
              onClick={() => handleTabChange(tb.key)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === tb.key
                  ? 'text-brand-blue border-b-2 border-brand-blue'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Details tab ── */}
          {tab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t['partner.hotels.nameLabel']} <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className={INPUT}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.cityLabel']}</label>
                  <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className={INPUT} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.countryLabel']}</label>
                  <input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} className={INPUT} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.addressLabel']}</label>
                <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className={INPUT} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.starsLabel']}</label>
                <select
                  value={form.star_rating}
                  onChange={e => setForm(p => ({ ...p, star_rating: e.target.value }))}
                  className={`${INPUT} bg-white`}
                >
                  <option value="">— Select —</option>
                  {[3, 4, 5].map(s => <option key={s} value={s}>{s} ★</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.descLabel']}</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className={`${INPUT} resize-none`}
                />
              </div>
              {detailsError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-sm text-red-600">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {detailsError}
                </div>
              )}
              {detailsMsg && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5 text-sm text-green-700">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {detailsMsg}
                </div>
              )}
            </div>
          )}

          {/* ── Images tab ── */}
          {tab === 'images' && (
            <div className="space-y-4">
              {/* Counter */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {t['partner.hotels.imageCounter']
                    .replace('{count}', String(images.length))
                    .replace('{max}', '15')}
                </span>
                <div className="flex-1 mx-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((images.length / 15) * 100, 100)}%`,
                      background: images.length >= 15
                        ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                        : 'linear-gradient(90deg, #1E3A8A, #2563EB)',
                    }}
                  />
                </div>
                <span className={`text-xs font-semibold ${images.length >= 15 ? 'text-red-500' : 'text-brand-blue'}`}>
                  {Math.round((images.length / 15) * 100)}%
                </span>
              </div>

              {/* Add URL row */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.imageUrlLabel']}</label>
                <div className="flex gap-2">
                  <input
                    value={newUrl}
                    onChange={e => { setNewUrl(e.target.value); setUrlError(null); }}
                    onKeyDown={e => e.key === 'Enter' && handleAddImage()}
                    placeholder={t['partner.hotels.imageUrlPlaceholder']}
                    className={`${INPUT} flex-1`}
                  />
                  <button
                    onClick={handleAddImage}
                    disabled={addingImg || !newUrl.trim()}
                    className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50 shrink-0 hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
                  >
                    {addingImg
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                      : t['partner.hotels.addImage']
                    }
                  </button>
                </div>
                {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
              </div>

              {/* Live preview for current input */}
              {newUrl.trim() && (
                <div className="rounded-xl overflow-hidden border border-gray-200 h-32">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={newUrl.trim()}
                    alt="preview"
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}

              {imgMsg && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-sm text-green-700">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {imgMsg}
                </div>
              )}

              {/* Gallery grid */}
              {imagesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
                </div>
              ) : images.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-6">{t['partner.hotels.noImages']}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {images.map((img, idx) => (
                    <div key={img.id} className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.image_url} alt={`hotel ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-brand-blue text-white px-1.5 py-0.5 rounded-full">
                          Cover
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        disabled={deletingId === img.id}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      >
                        {deletingId === img.id
                          ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                          : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        }
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Location tab ── */}
          {tab === 'location' && (
            <div className="space-y-5">

              {/* URL parser — Google Maps or Booking.com */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2.5">
                <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {t['partner.hotels.locationExtractTitle']}
                </p>
                <p className="text-xs text-blue-600">{t['partner.hotels.locationExtractDesc']}</p>
                <div className="flex gap-2">
                  <input
                    value={mapsUrl}
                    onChange={e => { setMapsUrl(e.target.value); setMapsError(null); }}
                    onKeyDown={e => e.key === 'Enter' && !geocoding && handleParseMapsUrl()}
                    placeholder={t['partner.hotels.locationUrlPlaceholder']}
                    dir="ltr"
                    className={`${INPUT} flex-1 text-xs`}
                  />
                  <button
                    type="button"
                    onClick={handleParseMapsUrl}
                    disabled={!mapsUrl.trim() || geocoding}
                    className="px-3 py-2 text-xs font-semibold text-white rounded-xl transition-all disabled:opacity-50 shrink-0 whitespace-nowrap flex items-center gap-1.5 hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
                  >
                    {geocoding
                      ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t['partner.hotels.locationExtracting']}</>
                      : t['partner.hotels.locationExtractBtn']
                    }
                  </button>
                </div>
                {mapsError && <p className="text-xs text-red-600">{mapsError}</p>}
              </div>

              {/* Manual coordinate inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.locationLatLabel']}</label>
                  <input
                    value={locationForm.latitude}
                    onChange={e => setLocationForm(p => ({ ...p, latitude: e.target.value }))}
                    placeholder="24.7136"
                    dir="ltr"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.locationLngLabel']}</label>
                  <input
                    value={locationForm.longitude}
                    onChange={e => setLocationForm(p => ({ ...p, longitude: e.target.value }))}
                    placeholder="46.6753"
                    dir="ltr"
                    className={INPUT}
                  />
                </div>
              </div>

              {/* Airport code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.locationAirportLabel']}</label>
                <input
                  value={locationForm.airport_code}
                  onChange={e => setLocationForm(p => ({ ...p, airport_code: e.target.value.toUpperCase() }))}
                  placeholder="RUH / DXB / JED"
                  maxLength={10}
                  dir="ltr"
                  className={`${INPUT} uppercase`}
                />
              </div>

              {/* Preview link */}
              {locationForm.latitude && locationForm.longitude && (
                <a
                  href={`https://maps.google.com/?q=${locationForm.latitude},${locationForm.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-brand-blue font-medium hover:underline"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {t['partner.hotels.locationVerifyLink']}
                </a>
              )}

              {/* Status messages */}
              {locationMsg && (
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
                  locationMsg.startsWith(t['partner.hotels.locationErrorPrefix'])
                    ? 'bg-red-50 border border-red-100 text-red-600'
                    : 'bg-green-50 border border-green-100 text-green-700'
                }`}>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {locationMsg.startsWith(t['partner.hotels.locationErrorPrefix'])
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    }
                  </svg>
                  {locationMsg}
                </div>
              )}
            </div>
          )}

          {/* ── Amenities tab ── */}
          {tab === 'amenities' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">{t['partner.hotels.amenitiesLabel']}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t['partner.hotels.amenitiesHint']}</p>
              </div>
              <AmenityPicker selected={amenities} onChange={setAmenities} t={t} />
              {amenitiesMsg && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-sm text-green-700">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {amenitiesMsg}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            {t['partner.hotels.cancelBtn']}
          </button>

          {tab === 'details' && (
            <button
              onClick={saveDetails}
              disabled={detailsSaving}
              className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-60 flex items-center gap-2 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}
            >
              {detailsSaving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {detailsSaving ? t['partner.hotels.savingChanges'] : t['partner.hotels.saveChangesBtn']}
            </button>
          )}

          {tab === 'amenities' && (
            <button
              onClick={saveAmenities}
              disabled={amenitiesSaving}
              className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-60 flex items-center gap-2 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}
            >
              {amenitiesSaving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {amenitiesSaving ? t['partner.hotels.savingAmenities'] : t['partner.hotels.saveAmenitiesBtn']}
            </button>
          )}

          {tab === 'location' && (
            <button
              onClick={saveLocation}
              disabled={locationSaving}
              className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-60 flex items-center gap-2 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}
            >
              {locationSaving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {locationSaving ? t['partner.hotels.locationSaving'] : t['partner.hotels.locationSaveBtn']}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HotelsPage() {
  const router   = useRouter();
  const { user, loading: authLoading } = useAuth();
  const language = useAppSettingsStore(s => s.language);
  const t        = getTranslations(language);

  const [loading, setLoading]     = useState(true);
  const [hotels, setHotels]       = useState<PartnerHotel[]>([]);
  const [editHotel, setEditHotel] = useState<PartnerHotel | null>(null);
  const [coverImages, setCoverImages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }

    async function load() {
      try {
        const myHotels = await getMyHotels();
        setHotels(myHotels);

        const covers: Record<string, string> = {};
        await Promise.all(
          myHotels.map(async h => {
            const imgs = await getMyHotelImages(h.id);
            if (imgs.length > 0) covers[h.id] = imgs[0].image_url;
          })
        );
        setCoverImages(covers);
      } catch (err) {
        console.error('[hotels] load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, authLoading, router]);

  function handleSaved(updated: PartnerHotel) {
    setHotels(prev => prev.map(h => h.id === updated.id ? updated : h));
  }

  if (loading) return <Spinner />;

  const count = hotels.length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Page header */}
      <div className="mb-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #D97706 0%, #B45309 100%)' }} />
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>{t['partner.nav.hotels']}</h1>
            </div>
            <p className="text-white/45 text-xs pl-3">{count} {count === 1 ? t['partner.hotels.property'] : t['partner.hotels.properties']} {t['partner.hotels.assigned']}</p>
          </div>
        </div>
      </div>

      {hotels.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {hotels.map(hotel => {
            const cover = coverImages[hotel.id];
            const amenityLabels = (Array.isArray(hotel.amenities) ? hotel.amenities : [])
              .map(key => HOTEL_AMENITIES.find(a => a.key === key))
              .filter(Boolean);

            return (
              <div key={hotel.id} className="bg-white rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 cursor-default" style={{ border: '1px solid rgba(30,58,138,0.09)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(15,34,96,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(15,34,96,0.06)'; }}
              >
                {/* Cover image or gradient */}
                <div className="h-36 relative overflow-hidden">
                  {cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={cover} alt={hotel.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-blue to-brand-blue-dark" />
                  )}
                  {/* Overlay with location badge */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {hotel.city || hotel.country || t['partner.hotels.noLocation']}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-4 min-w-0">
                    <h3 className="text-white font-bold text-base leading-snug truncate drop-shadow">{hotel.name}</h3>
                    {hotel.country && <p className="text-white/60 text-xs mt-0.5">{hotel.country}</p>}
                  </div>
                </div>

                <div className="p-4">
                  <StarDisplay rating={hotel.star_rating} />

                  {hotel.address && (
                    <p className="text-gray-500 text-xs mt-2 flex items-start gap-1.5">
                      <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span className="line-clamp-1">{hotel.address}</span>
                    </p>
                  )}

                  {hotel.description ? (
                    <p className="text-gray-600 text-xs leading-relaxed line-clamp-2 mt-2">{hotel.description}</p>
                  ) : (
                    <p className="text-gray-300 text-xs italic mt-2">{t['partner.hotels.noDesc']}</p>
                  )}

                  {/* Amenity chips preview */}
                  {amenityLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {amenityLabels.slice(0, 4).map(a => a && (
                        <span
                          key={a.key}
                          className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                        >
                          {a.icon} {a.label}
                        </span>
                      ))}
                      {amenityLabels.length > 4 && (
                        <span className="text-[10px] font-medium text-gray-400 px-1 py-0.5">
                          +{amenityLabels.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setEditHotel(hotel)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white py-2 rounded-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {t['partner.hotels.editBtn']}
                    </button>
                    <a
                      href={`/hotel/${hotel.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 py-2 px-3 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {t['partner.hotels.viewBtn']}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t['partner.hotels.noHotels']}</h2>
          <p className="text-gray-500 text-sm max-w-sm">{t['partner.hotels.noHotelsDesc']}</p>
        </div>
      )}

      {/* Manage modal */}
      {editHotel && (
        <ManageHotelModal
          hotel={editHotel}
          onClose={() => setEditHotel(null)}
          onSaved={updated => {
            handleSaved(updated);
          }}
        />
      )}
    </div>
  );
}
