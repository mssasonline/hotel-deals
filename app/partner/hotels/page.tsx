'use client';

import { useEffect, useState } from 'react';
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
import { createHotelForPartner } from '../onboarding/actions';

// ── Constants ─────────────────────────────────────────────────────────────────

const HOTEL_AMENITIES = [
  { key: 'pool',            label: 'Swimming Pool',   icon: '🏊', group: 'facilities' },
  { key: 'gym',             label: 'Gym / Fitness',   icon: '🏋️', group: 'facilities' },
  { key: 'spa',             label: 'Spa & Wellness',  icon: '💆', group: 'facilities' },
  { key: 'beach_access',    label: 'Beach Access',    icon: '🏖️', group: 'facilities' },
  { key: 'golf',            label: 'Golf Course',     icon: '⛳', group: 'facilities' },
  { key: 'rooftop',         label: 'Rooftop',         icon: '🌆', group: 'facilities' },
  { key: 'bar_lounge',      label: 'Bar & Lounge',    icon: '🍸', group: 'facilities' },
  { key: 'casino',          label: 'Casino',          icon: '🎰', group: 'facilities' },
  { key: 'conference',      label: 'Conference Room', icon: '🏛️', group: 'facilities' },
  { key: 'business_center', label: 'Business Center', icon: '💼', group: 'facilities' },
  { key: 'kids_club',       label: 'Kids Club',       icon: '🧒', group: 'facilities' },
  { key: 'restaurant',      label: 'Restaurant',      icon: '🍽️', group: 'services'   },
  { key: 'room_service',    label: 'Room Service',    icon: '🛎️', group: 'services'   },
  { key: 'free_wifi',       label: 'Free Wi-Fi',      icon: '📶', group: 'services'   },
  { key: 'free_parking',    label: 'Free Parking',    icon: '🅿️', group: 'services'   },
  { key: 'paid_parking',    label: 'Paid Parking',    icon: '🏷️', group: 'services'   },
  { key: 'valet_parking',   label: 'Valet Parking',   icon: '🚗', group: 'services'   },
  { key: 'airport_shuttle', label: 'Airport Shuttle', icon: '🚌', group: 'services'   },
  { key: 'pet_friendly',    label: 'Pet Friendly',    icon: '🐾', group: 'services'   },
] as const;

const CHECK_IN_TIMES  = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const CHECK_OUT_TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function parseGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  const llMatch = url.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
  return null;
}

function parseBookingComUrl(url: string): { name: string; countryCode: string } | null {
  const match = url.match(/booking\.com\/hotel\/([a-z]{2})\/([^.?#/]+)\.html/i);
  if (!match) return null;
  return { countryCode: match[1].toLowerCase(), name: match[2].replace(/-/g, ' ') };
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
  } catch { return null; }
}

// ── Small UI helpers ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
    </div>
  );
}

function SuccessMsg({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5 text-sm text-green-700">
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {msg}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-sm text-red-600">
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {msg}
    </div>
  );
}

function SaveBtn({
  onClick, saving, label = 'Save Changes',
}: { onClick: () => void; saving: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-60 hover:-translate-y-0.5"
      style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}
    >
      {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {saving ? 'Saving…' : label}
    </button>
  );
}

function SectionCard({
  icon, title, hint, children,
}: { icon: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(30,58,138,0.09)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}
    >
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <span className="text-lg leading-none">{icon}</span>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {hint && <span className="ml-auto text-xs text-gray-400 italic hidden sm:block">{hint}</span>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

const INPUT = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue';

// ── Amenity chip picker ───────────────────────────────────────────────────────

function AmenityPicker({
  selected, onChange,
}: { selected: string[]; onChange: (next: string[]) => void }) {
  const [customInput, setCustomInput] = useState('');
  const predefinedKeys = new Set(HOTEL_AMENITIES.map(a => a.key));
  const customAmenities = selected.filter(k => !predefinedKeys.has(k as never));

  function toggle(key: string) {
    onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]);
  }
  function addCustom() {
    const val = customInput.trim();
    if (!val || selected.includes(val)) return;
    onChange([...selected, val]);
    setCustomInput('');
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
            on ? 'text-white border-transparent shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-brand-blue hover:text-brand-blue'
          }`}
          style={on ? { background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' } : {}}
        >
          <span>{a.icon}</span><span>{a.label}</span>
        </button>
      );
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Facilities</p>
        <div className="flex flex-wrap gap-2">{renderChips(facilities)}</div>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Services</p>
        <div className="flex flex-wrap gap-2">{renderChips(services)}</div>
      </div>
      {customAmenities.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Custom Amenities</p>
          <div className="flex flex-wrap gap-2">
            {customAmenities.map(key => (
              <span key={key} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                {key}
                <button type="button" onClick={() => onChange(selected.filter(k => k !== key))} className="ml-0.5 hover:text-red-500 transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-1 border-t border-gray-100">
        <input
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          placeholder="Add custom amenity…"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customInput.trim()}
          className="px-3 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-50 shrink-0 hover:-translate-y-0.5 transition-all"
          style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── Add hotel modal (empty state) ─────────────────────────────────────────────

function AddHotelModal({
  onClose, onCreated,
}: { onClose: () => void; onCreated: (hotel: PartnerHotel) => void }) {
  const language = useAppSettingsStore(s => s.language);
  const t = getTranslations(language);

  const [form, setForm] = useState({ name: '', city: '', country: '', address: '', description: '', star_rating: '4' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    if (!form.name.trim())    { setError(t['partner.hotels.nameRequired']); return; }
    if (!form.city.trim())    { setError('City is required.'); return; }
    if (!form.country.trim()) { setError('Country is required.'); return; }
    setSaving(true);
    const { hotelId, error: err } = await createHotelForPartner({
      name: form.name.trim(), city: form.city.trim(), country: form.country.trim(),
      address: form.address.trim(), description: form.description.trim(),
      star_rating: form.star_rating ? parseInt(form.star_rating, 10) : null,
    });
    setSaving(false);
    if (err || !hotelId) { setError(err ?? 'Failed to create hotel.'); return; }
    onCreated({
      id: hotelId, name: form.name.trim(), city: form.city.trim(), country: form.country.trim(),
      address: form.address.trim(), description: form.description.trim(),
      star_rating: form.star_rating ? parseInt(form.star_rating, 10) : null,
      amenities: [], latitude: null, longitude: null, airport_code: null,
      breakfast_price_per_person: null,
      contact_phone: null, contact_email: null, contact_whatsapp: null,
      emergency_phone: null, checkin_time: '15:00', checkout_time: '12:00', parking_info: null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Add New Hotel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.nameLabel']} <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={INPUT} placeholder="e.g. Grand Hyatt Dubai" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.cityLabel']} <span className="text-red-400">*</span></label>
              <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className={INPUT} placeholder="Dubai" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.countryLabel']} <span className="text-red-400">*</span></label>
              <input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} className={INPUT} placeholder="UAE" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.starsLabel']}</label>
            <select value={form.star_rating} onChange={e => setForm(p => ({ ...p, star_rating: e.target.value }))} className={`${INPUT} bg-white`}>
              <option value="">— Select —</option>
              {[3, 4, 5].map(s => <option key={s} value={s}>{s} ★</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.addressLabel']}</label>
            <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className={INPUT} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.descLabel']}</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className={`${INPUT} resize-none`} />
          </div>
          <ErrorMsg msg={error} />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
            Cancel
          </button>
          <SaveBtn onClick={handleCreate} saving={saving} label="Add Hotel" />
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HotelsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const language = useAppSettingsStore(s => s.language);
  const t = getTranslations(language);

  // ── Page state
  const [loading, setLoading]         = useState(true);
  const [hotel, setHotel]             = useState<PartnerHotel | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // ── Details section
  const [detailsForm, setDetailsForm] = useState({ name: '', city: '', country: '', address: '', description: '', star_rating: '' });
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsMsg, setDetailsMsg]       = useState<string | null>(null);
  const [detailsError, setDetailsError]   = useState<string | null>(null);

  // ── Breakfast
  const [breakfastEnabled, setBreakfastEnabled] = useState(false);
  const [breakfastPrice, setBreakfastPrice]     = useState('');
  const [breakfastSaving, setBreakfastSaving]   = useState(false);
  const [breakfastMsg, setBreakfastMsg]         = useState<string | null>(null);
  const [breakfastError, setBreakfastError]     = useState<string | null>(null);

  // ── Contact section
  const [contactForm, setContactForm] = useState({
    contact_phone: '', contact_email: '', contact_whatsapp: '',
    emergency_phone: '', checkin_time: '15:00', checkout_time: '12:00', parking_info: '',
  });
  const [contactSaving, setContactSaving] = useState(false);
  const [contactMsg, setContactMsg]       = useState<string | null>(null);

  // ── Amenities section
  const [amenities, setAmenities]             = useState<string[]>([]);
  const [amenitiesSaving, setAmenitiesSaving] = useState(false);
  const [amenitiesMsg, setAmenitiesMsg]       = useState<string | null>(null);

  // ── Location section
  const [locationForm, setLocationForm] = useState({ latitude: '', longitude: '', airport_code: '' });
  const [mapsUrl, setMapsUrl]           = useState('');
  const [mapsError, setMapsError]       = useState<string | null>(null);
  const [geocoding, setGeocoding]       = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationMsg, setLocationMsg]       = useState<string | null>(null);

  // ── Images section
  const [images, setImages]         = useState<HotelImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [newUrl, setNewUrl]         = useState('');
  const [urlError, setUrlError]     = useState<string | null>(null);
  const [imgMsg, setImgMsg]         = useState<string | null>(null);
  const [addingImg, setAddingImg]   = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Load ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    loadHotel();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router]);

  async function loadHotel() {
    setLoading(true);
    const hotels = await getMyHotels();
    const h = hotels[0] ?? null;
    setHotel(h);
    if (h) populateForms(h);
    setLoading(false);
    if (h) {
      setImagesLoading(true);
      const imgs = await getMyHotelImages(h.id);
      setImages(imgs);
      setImagesLoading(false);
    }
  }

  function populateForms(h: PartnerHotel) {
    setDetailsForm({
      name: h.name, city: h.city, country: h.country,
      address: h.address, description: h.description,
      star_rating: String(h.star_rating ?? ''),
    });
    setBreakfastEnabled(h.breakfast_price_per_person != null);
    setBreakfastPrice(String(h.breakfast_price_per_person ?? ''));
    setAmenities(Array.isArray(h.amenities) ? h.amenities : []);
    setLocationForm({
      latitude:     h.latitude  != null ? String(h.latitude)  : '',
      longitude:    h.longitude != null ? String(h.longitude) : '',
      airport_code: h.airport_code ?? '',
    });
    setContactForm({
      contact_phone:    h.contact_phone    ?? '',
      contact_email:    h.contact_email    ?? '',
      contact_whatsapp: h.contact_whatsapp ?? '',
      emergency_phone:  h.emergency_phone  ?? '',
      checkin_time:     h.checkin_time     ?? '15:00',
      checkout_time:    h.checkout_time    ?? '12:00',
      parking_info:     h.parking_info     ?? '',
    });
  }

  // ── Save: details ─────────────────────────────────────────────────────────────

  async function saveDetails() {
    if (!hotel) return;
    setDetailsError(null);
    if (!detailsForm.name.trim()) { setDetailsError(t['partner.hotels.nameRequired']); return; }
    setDetailsSaving(true);
    const { error } = await updateMyHotel(hotel.id, {
      name:        detailsForm.name.trim(),
      city:        detailsForm.city.trim(),
      country:     detailsForm.country.trim(),
      address:     detailsForm.address.trim(),
      description: detailsForm.description.trim(),
      star_rating: detailsForm.star_rating ? parseInt(detailsForm.star_rating, 10) : null,
    });
    setDetailsSaving(false);
    if (error) { setDetailsError(error); return; }
    setHotel(h => h ? { ...h!, ...detailsForm, star_rating: detailsForm.star_rating ? parseInt(detailsForm.star_rating, 10) : null } : h);
    setDetailsMsg(t['partner.hotels.updated']);
    setTimeout(() => setDetailsMsg(null), 2500);
  }

  // ── Save: breakfast ──────────────────────────────────────────────────────────

  async function saveBreakfast() {
    if (!hotel) return;
    setBreakfastError(null);
    const price = breakfastEnabled ? parseFloat(breakfastPrice) : null;
    if (breakfastEnabled && (!breakfastPrice.trim() || isNaN(price!) || price! <= 0)) {
      setBreakfastError('Please enter a valid price per person.');
      return;
    }
    setBreakfastSaving(true);
    const { error } = await updateMyHotel(hotel.id, { breakfast_price_per_person: price });
    setBreakfastSaving(false);
    if (error) { setBreakfastError(error); return; }
    setHotel(h => h ? { ...h!, breakfast_price_per_person: price } : h);
    setBreakfastMsg('Breakfast option saved.');
    setTimeout(() => setBreakfastMsg(null), 2500);
  }

  // ── Save: contact ────────────────────────────────────────────────────────────

  async function saveContact() {
    if (!hotel) return;
    setContactSaving(true);
    const { error } = await updateMyHotel(hotel.id, {
      contact_phone:    contactForm.contact_phone.trim()    || null,
      contact_email:    contactForm.contact_email.trim()    || null,
      contact_whatsapp: contactForm.contact_whatsapp.trim() || null,
      emergency_phone:  contactForm.emergency_phone.trim()  || null,
      checkin_time:     contactForm.checkin_time  || null,
      checkout_time:    contactForm.checkout_time || null,
      parking_info:     contactForm.parking_info.trim()     || null,
    });
    setContactSaving(false);
    if (!error) {
      setHotel(h => h ? { ...h!, ...contactForm } : h);
      setContactMsg('Contact info saved.');
      setTimeout(() => setContactMsg(null), 2500);
    }
  }

  // ── Save: amenities ──────────────────────────────────────────────────────────

  async function saveAmenities() {
    if (!hotel) return;
    setAmenitiesSaving(true);
    await updateMyHotel(hotel.id, { amenities });
    setAmenitiesSaving(false);
    setHotel(h => h ? { ...h!, amenities } : h);
    setAmenitiesMsg(t['partner.hotels.amenitiesSaved']);
    setTimeout(() => setAmenitiesMsg(null), 2500);
  }

  // ── Save: location ───────────────────────────────────────────────────────────

  async function handleParseMapsUrl() {
    setMapsError(null);
    const url = mapsUrl.trim();
    const gm = parseGoogleMapsUrl(url);
    if (gm) {
      setLocationForm(p => ({ ...p, latitude: String(gm.lat), longitude: String(gm.lng) }));
      setMapsUrl('');
      return;
    }
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

  async function saveLocation() {
    if (!hotel) return;
    const lat  = locationForm.latitude.trim()  ? parseFloat(locationForm.latitude.trim())  : null;
    const lng  = locationForm.longitude.trim() ? parseFloat(locationForm.longitude.trim()) : null;
    const code = locationForm.airport_code.trim() || null;
    if ((locationForm.latitude.trim() && isNaN(lat!)) || (locationForm.longitude.trim() && isNaN(lng!))) {
      setLocationMsg(t['partner.hotels.locationInvalid']);
      return;
    }
    setLocationSaving(true);
    const { error } = await updateMyHotel(hotel.id, { latitude: lat, longitude: lng, airport_code: code });
    setLocationSaving(false);
    if (error) { setLocationMsg(t['partner.hotels.locationErrorPrefix'] + error); return; }
    setHotel(h => h ? { ...h!, latitude: lat, longitude: lng, airport_code: code } : h);
    setLocationMsg(t['partner.hotels.locationSaved']);
    setTimeout(() => setLocationMsg(null), 2500);
  }

  // ── Images ───────────────────────────────────────────────────────────────────

  async function handleAddImage() {
    if (!hotel) return;
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

  async function handleDeleteImage(imageId: string) {
    if (!hotel) return;
    setDeletingId(imageId);
    await deleteHotelImage(imageId, hotel.id);
    setImages(prev => prev.filter(i => i.id !== imageId));
    setDeletingId(null);
    setImgMsg(t['partner.hotels.imageDeleted']);
    setTimeout(() => setImgMsg(null), 2000);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) return <Spinner />;

  // ── Empty state
  if (!hotel) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl">
        <div className="mb-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #D97706 0%, #B45309 100%)' }} />
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>{t['partner.nav.hotels']}</h1>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t['partner.hotels.noHotels']}</h2>
          <p className="text-gray-500 text-sm max-w-sm mb-6">{t['partner.hotels.noHotelsDesc']}</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Your First Hotel
          </button>
        </div>
        {showAddModal && (
          <AddHotelModal
            onClose={() => setShowAddModal(false)}
            onCreated={h => { setHotel(h); populateForms(h); setShowAddModal(false); }}
          />
        )}
      </div>
    );
  }

  const stars = hotel.star_rating ?? 0;

  // ── Hotel settings page
  return (
    <div className="p-6 lg:p-8 max-w-3xl">

      {/* ── Page header */}
      <div className="mb-6 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 shrink-0 rounded-full" style={{ background: 'linear-gradient(180deg, #D97706 0%, #B45309 100%)' }} />
              <h1 className="text-xl font-bold truncate" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>{hotel.name}</h1>
            </div>
            <div className="flex items-center gap-3 pl-3">
              {stars > 0 && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <svg key={i} className="w-3 h-3 text-brand-gold fill-current" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
              )}
              {(hotel.city || hotel.country) && (
                <span className="text-white/50 text-xs">{[hotel.city, hotel.country].filter(Boolean).join(', ')}</span>
              )}
            </div>
          </div>
          <a
            href={`/hotel/${hotel.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {t['partner.hotels.viewBtn']}
          </a>
        </div>
      </div>

      <div className="space-y-5">

        {/* ── 1. Hotel Details */}
        <SectionCard icon="🏨" title={t['partner.hotels.tabDetails']}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t['partner.hotels.nameLabel']} <span className="text-red-400">*</span>
              </label>
              <input value={detailsForm.name} onChange={e => setDetailsForm(p => ({ ...p, name: e.target.value }))} className={INPUT} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.cityLabel']}</label>
                <input value={detailsForm.city} onChange={e => setDetailsForm(p => ({ ...p, city: e.target.value }))} className={INPUT} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.countryLabel']}</label>
                <input value={detailsForm.country} onChange={e => setDetailsForm(p => ({ ...p, country: e.target.value }))} className={INPUT} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.addressLabel']}</label>
              <input value={detailsForm.address} onChange={e => setDetailsForm(p => ({ ...p, address: e.target.value }))} className={INPUT} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.starsLabel']}</label>
              <select value={detailsForm.star_rating} onChange={e => setDetailsForm(p => ({ ...p, star_rating: e.target.value }))} className={`${INPUT} bg-white`}>
                <option value="">— Select —</option>
                {[3, 4, 5].map(s => <option key={s} value={s}>{s} ★</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.descLabel']}</label>
              <textarea value={detailsForm.description} onChange={e => setDetailsForm(p => ({ ...p, description: e.target.value }))} rows={3} className={`${INPUT} resize-none`} />
            </div>
            <ErrorMsg msg={detailsError} />
            <SuccessMsg msg={detailsMsg} />
            <div className="flex justify-end">
              <SaveBtn onClick={saveDetails} saving={detailsSaving} />
            </div>

            {/* Breakfast divider */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">🍳 Breakfast Add-on</p>
              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <div
                  onClick={() => setBreakfastEnabled(p => !p)}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${breakfastEnabled ? 'bg-brand-blue' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${breakfastEnabled ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm text-gray-600">
                  {breakfastEnabled ? 'Breakfast option is enabled' : 'Enable breakfast add-on for guests'}
                </span>
              </label>
              {breakfastEnabled && (
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 mb-1">Price per person (AED)</label>
                  <input type="number" min="1" value={breakfastPrice} onChange={e => setBreakfastPrice(e.target.value)} placeholder="e.g. 50" className={INPUT} />
                </div>
              )}
              <ErrorMsg msg={breakfastError} />
              <SuccessMsg msg={breakfastMsg} />
              <div className="flex justify-end mt-3">
                <SaveBtn onClick={saveBreakfast} saving={breakfastSaving} label="Save Breakfast Option" />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── 2. Contact & Operations */}
        <SectionCard icon="📞" title="Contact & Operations" hint="Shown in guest booking confirmation emails">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Front Desk Phone</label>
                <input
                  value={contactForm.contact_phone}
                  onChange={e => setContactForm(p => ({ ...p, contact_phone: e.target.value }))}
                  className={INPUT}
                  placeholder="+971 4 XXX XXXX"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Front Desk Email</label>
                <input
                  type="email"
                  value={contactForm.contact_email}
                  onChange={e => setContactForm(p => ({ ...p, contact_email: e.target.value }))}
                  className={INPUT}
                  placeholder="frontdesk@hotel.com"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  WhatsApp Number
                  <span className="ml-1.5 text-[10px] font-normal text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                    Linked in email
                  </span>
                </label>
                <input
                  value={contactForm.contact_whatsapp}
                  onChange={e => setContactForm(p => ({ ...p, contact_whatsapp: e.target.value }))}
                  className={INPUT}
                  placeholder="+971 5X XXX XXXX"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Emergency Number (24/7)</label>
                <input
                  value={contactForm.emergency_phone}
                  onChange={e => setContactForm(p => ({ ...p, emergency_phone: e.target.value }))}
                  className={INPUT}
                  placeholder="+971 4 XXX XXXX"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Check-in Time</label>
                <select
                  value={contactForm.checkin_time}
                  onChange={e => setContactForm(p => ({ ...p, checkin_time: e.target.value }))}
                  className={`${INPUT} bg-white`}
                >
                  {CHECK_IN_TIMES.map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Check-out Time</label>
                <select
                  value={contactForm.checkout_time}
                  onChange={e => setContactForm(p => ({ ...p, checkout_time: e.target.value }))}
                  className={`${INPUT} bg-white`}
                >
                  {CHECK_OUT_TIMES.map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Parking Information</label>
              <textarea
                value={contactForm.parking_info}
                onChange={e => setContactForm(p => ({ ...p, parking_info: e.target.value }))}
                rows={2}
                className={`${INPUT} resize-none`}
                placeholder="e.g. Free valet parking available. Self-parking in basement B1–B3."
              />
            </div>

            <SuccessMsg msg={contactMsg} />
            <div className="flex justify-end">
              <SaveBtn onClick={saveContact} saving={contactSaving} label="Save Contact Info" />
            </div>
          </div>
        </SectionCard>

        {/* ── 3. Amenities */}
        <SectionCard icon="✨" title={t['partner.hotels.tabAmenities']}>
          <div className="space-y-4">
            <p className="text-xs text-gray-400">{t['partner.hotels.amenitiesHint']}</p>
            <AmenityPicker selected={amenities} onChange={setAmenities} />
            <SuccessMsg msg={amenitiesMsg} />
            <div className="flex justify-end">
              <SaveBtn onClick={saveAmenities} saving={amenitiesSaving} label={t['partner.hotels.saveAmenitiesBtn']} />
            </div>
          </div>
        </SectionCard>

        {/* ── 4. Location */}
        <SectionCard icon="📍" title={t['partner.hotels.tabLocation']}>
          <div className="space-y-5">
            {/* URL parser */}
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.locationLatLabel']}</label>
                <input value={locationForm.latitude} onChange={e => setLocationForm(p => ({ ...p, latitude: e.target.value }))} placeholder="24.7136" dir="ltr" className={INPUT} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t['partner.hotels.locationLngLabel']}</label>
                <input value={locationForm.longitude} onChange={e => setLocationForm(p => ({ ...p, longitude: e.target.value }))} placeholder="46.6753" dir="ltr" className={INPUT} />
              </div>
            </div>

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

            <div className="flex justify-end">
              <SaveBtn onClick={saveLocation} saving={locationSaving} label={t['partner.hotels.locationSaveBtn']} />
            </div>
          </div>
        </SectionCard>

        {/* ── 5. Images */}
        <SectionCard icon="🖼️" title={t['partner.hotels.tabImages']}>
          <div className="space-y-4">
            {/* Counter bar */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                {t['partner.hotels.imageCounter']
                  .replace('{count}', String(images.length))
                  .replace('{max}', '15')}
              </span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
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

            {/* Add URL */}
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

            {/* Live preview */}
            {newUrl.trim() && (
              <div className="rounded-xl overflow-hidden border border-gray-200 h-32">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={newUrl.trim()} alt="preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}

            <SuccessMsg msg={imgMsg} />

            {/* Gallery */}
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
        </SectionCard>

      </div>
    </div>
  );
}
