'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import CountrySelect from '@/app/components/CountrySelect';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';
import { fetchMyAccountData } from '@/app/user-actions';
import { useAppSettingsStore, type Language, type CurrencyCode } from '@/store/appSettingsStore';
import { CURRENCIES } from '@/lib/currencyData';
import { LANGUAGES } from '@/lib/languageData';
import { getTranslations } from '@/lib/i18n/translations';
import { saveLoginRedirect } from '@/lib/auth';
import { getCountryName, getCountryByCode, type Country } from '@/lib/countries';

function getDisplayName(user: { user_metadata?: Record<string, unknown>; email?: string }): string {
  const meta = user.user_metadata ?? {};
  return (
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'User'
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface EditValues {
  full_name: string;
  email: string;
  phone_country_code: string;
  phone_country_iso: string;
  phone_number: string;
  date_of_birth: string;
  nationality: string;
  gender: string;
  addr_country: string;
  addr_city: string;
  addr_district: string;
  addr_building: string;
  addr_apartment: string;
  addr_street: string;
  addr_postal_code: string;
  addr_additional: string;
}

interface ProfileRow {
  full_name: string | null;
  phone_country_code: string | null;
  phone_country_iso: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  gender: string | null;
  addr_country: string | null;
  addr_city: string | null;
  addr_district: string | null;
  addr_building: string | null;
  addr_apartment: string | null;
  addr_street: string | null;
  addr_postal_code: string | null;
  addr_additional: string | null;
}

interface SavedCard {
  id: number;
  user_id: string;
  card_holder: string;
  last_four: string;
  network: string;
  expiry: string;
  is_default: boolean;
  created_at: string;
}

function detectNetwork(cardNumber: string): string {
  const n = cardNumber.replace(/\s/g, '');
  if (n.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^(6011|65|64[4-9]|622)/.test(n)) return 'discover';
  return 'unknown';
}

function networkBadge(network: string) {
  const map: Record<string, { label: string; cls: string }> = {
    visa:       { label: 'VISA',  cls: 'text-blue-700 bg-blue-50 border-blue-200' },
    mastercard: { label: 'MC',    cls: 'text-orange-700 bg-orange-50 border-orange-200' },
    amex:       { label: 'AMEX', cls: 'text-green-700 bg-green-50 border-green-200' },
    discover:   { label: 'DISC',  cls: 'text-amber-700 bg-amber-50 border-amber-200' },
    unknown:    { label: '••••',  cls: 'text-gray-600 bg-gray-100 border-gray-200' },
  };
  return map[network] ?? map.unknown;
}

function buildEditValuesFromProfile(
  profile: ProfileRow | null,
  email: string,
  fallbackName: string,
): EditValues {
  const s = (v: string | null | undefined) => v ?? '';
  return {
    full_name: s(profile?.full_name) || fallbackName,
    email,
    phone_country_code: s(profile?.phone_country_code) || '+971',
    phone_country_iso: s(profile?.phone_country_iso) || 'AE',
    phone_number: s(profile?.phone_number),
    date_of_birth: s(profile?.date_of_birth),
    nationality: s(profile?.nationality),
    gender: s(profile?.gender),
    addr_country: s(profile?.addr_country),
    addr_city: s(profile?.addr_city),
    addr_district: s(profile?.addr_district),
    addr_building: s(profile?.addr_building),
    addr_apartment: s(profile?.addr_apartment),
    addr_street: s(profile?.addr_street),
    addr_postal_code: s(profile?.addr_postal_code),
    addr_additional: s(profile?.addr_additional),
  };
}

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:opacity-50';
const LABEL_CLASS = 'block text-xs font-medium text-gray-500 mb-1';

// ── Shared action buttons ── (defined outside AccountPage to prevent remounting)
interface SaveCancelButtonsProps {
  fieldKey: string;
  saving: boolean;
  onSave: (fieldKey: string) => void;
  onCancel: () => void;
  saveLabel: string;
  savingLabel: string;
  cancelLabel: string;
}

function SaveCancelButtons({
  fieldKey,
  saving,
  onSave,
  onCancel,
  saveLabel,
  savingLabel,
  cancelLabel,
}: SaveCancelButtonsProps) {
  return (
    <div className="flex gap-2 mt-3">
      <button
        onClick={() => onSave(fieldKey)}
        disabled={saving}
        className="px-4 py-2 bg-brand-blue text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
      >
        {saving ? savingLabel : saveLabel}
      </button>
      <button
        onClick={onCancel}
        disabled={saving}
        className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {cancelLabel}
      </button>
    </div>
  );
}

// ── Generic field wrapper ── (defined outside AccountPage to prevent remounting on every render)
interface FieldProps {
  fieldKey: string;
  label: string;
  displayValue: string;
  editContent: React.ReactNode;
  isLast?: boolean;
  isEditing: boolean;
  saving: boolean;
  onEdit: (fieldKey: string) => void;
  onSave: (fieldKey: string) => void;
  onCancel: () => void;
  editLabel: string;
  saveLabel: string;
  savingLabel: string;
  cancelLabel: string;
  notProvided: string;
}

function Field({
  fieldKey,
  label,
  displayValue,
  editContent,
  isLast = false,
  isEditing,
  saving,
  onEdit,
  onSave,
  onCancel,
  editLabel,
  saveLabel,
  savingLabel,
  cancelLabel,
  notProvided,
}: FieldProps) {
  return (
    <div className={`px-6 py-4 ${!isLast ? 'border-b border-gray-50' : ''}`}>
      {!isEditing ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
            <p className={`text-sm font-medium ${displayValue ? 'text-gray-900' : 'text-gray-300 italic'}`}>
              {displayValue || notProvided}
            </p>
          </div>
          <button
            onClick={() => onEdit(fieldKey)}
            className="shrink-0 text-sm text-brand-blue hover:text-blue-700 font-semibold transition-colors"
          >
            {editLabel}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{label}</p>
          {editContent}
          <SaveCancelButtons
            fieldKey={fieldKey}
            saving={saving}
            onSave={onSave}
            onCancel={onCancel}
            saveLabel={saveLabel}
            savingLabel={savingLabel}
            cancelLabel={cancelLabel}
          />
        </div>
      )}
    </div>
  );
}

// ── Searchable preference selector ──
interface SelectOption {
  value: string;
  primary: string;
  secondary?: string;
}

function SearchableSelect({
  options,
  value,
  onChange,
  searchPlaceholder,
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  searchPlaceholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const filtered = search
    ? options.filter(
        (o) =>
          o.primary.toLowerCase().includes(search.toLowerCase()) ||
          (o.secondary ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setSearch('');
        }}
        className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-left bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-gray-900 truncate">{selected?.primary}</span>
          {selected?.secondary && (
            <span className="text-gray-400 shrink-0 text-xs">{selected.secondary}</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-400 text-center">—</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 ${
                    opt.value === value ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={`font-medium truncate ${opt.value === value ? 'text-brand-blue' : 'text-gray-900'}`}
                    >
                      {opt.primary}
                    </span>
                    {opt.secondary && (
                      <span className="text-gray-400 text-xs shrink-0">{opt.secondary}</span>
                    )}
                  </span>
                  {opt.value === value && (
                    <svg
                      className="w-4 h-4 text-brand-blue shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const CURRENCY_OPTIONS: SelectOption[] = CURRENCIES.map((c) => ({
  value: c.code,
  primary: `${c.code.toUpperCase()} — ${c.name}`,
  secondary: c.symbol,
}));

const LANGUAGE_OPTIONS: SelectOption[] = LANGUAGES.map((l) => ({
  value: l.code,
  primary: l.nativeName,
  secondary: l.englishName !== l.nativeName ? l.englishName : undefined,
}));

export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const language = useAppSettingsStore((s) => s.language);
  const currency = useAppSettingsStore((s) => s.currency);
  const setCurrency = useAppSettingsStore((s) => s.setCurrency);
  const setLanguage = useAppSettingsStore((s) => s.setLanguage);
  const t = getTranslations(language);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [profileRow, setProfileRow] = useState<ProfileRow | null>(null);
  const [editValues, setEditValues] = useState<EditValues>({
    full_name: '',
    email: '',
    phone_country_code: '+971',
    phone_country_iso: 'AE',
    phone_number: '',
    date_of_birth: '',
    nationality: '',
    gender: '',
    addr_country: '',
    addr_city: '',
    addr_district: '',
    addr_building: '',
    addr_apartment: '',
    addr_street: '',
    addr_postal_code: '',
    addr_additional: '',
  });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Saved cards ──
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [addCard, setAddCard] = useState({ cardNumber: '', cardHolder: '', expiry: '', cvv: '' });
  const [addCardError, setAddCardError] = useState('');
  const [addCardSaving, setAddCardSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      saveLoginRedirect('/account');
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch profile + saved cards via server action (avoids browser client token-refresh lock)
  useEffect(() => {
    if (!user) return;
    const fallback = (user.user_metadata?.full_name as string | undefined)
      || (user.user_metadata?.name as string | undefined)
      || user.email?.split('@')[0]
      || '';
    fetchMyAccountData().then(({ profile, savedCards: cards }) => {
      const row = profile as ProfileRow | null;
      setProfileRow(row);
      setEditValues(buildEditValuesFromProfile(row, user.email ?? '', fallback));
      setSavedCards(cards as SavedCard[]);
    }).catch(err => console.error('[account] fetch error:', err));
  }, [user?.id]);

  // ── Saved card handlers ──
  async function handleAddCard() {
    const raw = addCard.cardNumber.replace(/\s/g, '');
    if (!addCard.cardHolder.trim()) { setAddCardError(t['payment.errorName']); return; }
    if (raw.length < 16)            { setAddCardError(t['payment.errorCard']); return; }
    if (addCard.expiry.length < 5)  { setAddCardError(t['payment.errorExpiry']); return; }
    if (addCard.cvv.length < 3)     { setAddCardError(t['payment.errorCvv']); return; }

    setAddCardSaving(true);
    setAddCardError('');
    const isFirst = savedCards.length === 0;
    const { data, error } = await supabase.from('saved_cards').insert({
      user_id:     user!.id,
      card_holder: addCard.cardHolder.trim(),
      last_four:   raw.slice(-4),
      network:     detectNetwork(raw),
      expiry:      addCard.expiry,
      is_default:  isFirst,
    }).select().single();
    setAddCardSaving(false);
    if (error) { setAddCardError('Failed to save card. Please try again.'); return; }
    setSavedCards(prev => isFirst ? [data as SavedCard] : [...prev, data as SavedCard]);
    setShowAddCard(false);
    setAddCard({ cardNumber: '', cardHolder: '', expiry: '', cvv: '' });
    setSuccessMsg('Card saved successfully.');
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  async function handleDeleteCard(cardId: number) {
    await supabase.from('saved_cards').delete().eq('id', cardId);
    setSavedCards(prev => {
      const next = prev.filter(c => c.id !== cardId);
      if (prev.find(c => c.id === cardId)?.is_default && next.length > 0) {
        supabase.from('saved_cards').update({ is_default: true }).eq('id', next[0].id).then(() => {});
        next[0] = { ...next[0], is_default: true };
      }
      return next;
    });
  }

  async function handleSetDefault(cardId: number) {
    await supabase.from('saved_cards').update({ is_default: false }).eq('user_id', user!.id);
    await supabase.from('saved_cards').update({ is_default: true }).eq('id', cardId);
    setSavedCards(prev => prev.map(c => ({ ...c, is_default: c.id === cardId })));
  }

  // Sync currency/language preferences from user metadata
  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata ?? {};
    const savedCurrency = meta.preferred_currency as string | undefined;
    const savedLanguage = meta.preferred_language as string | undefined;
    const validCurrencies: CurrencyCode[] = ['usd', 'aed', 'eur', 'gbp'];
    const validLanguages: Language[] = ['en', 'ar', 'fr'];
    if (savedCurrency && validCurrencies.includes(savedCurrency as CurrencyCode)) {
      setCurrency(savedCurrency as CurrencyCode);
    }
    if (savedLanguage && validLanguages.includes(savedLanguage as Language)) {
      setLanguage(savedLanguage as Language);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleCurrencyChange = useCallback(
    async (value: string) => {
      setCurrency(value as CurrencyCode);
      if (user) {
        try {
          await supabase.auth.updateUser({ data: { preferred_currency: value } });
        } catch {
          // fail silently — localStorage persists the preference
        }
      }
    },
    [user, setCurrency]
  );

  const handleLanguageChange = useCallback(
    async (value: string) => {
      setLanguage(value as Language);
      if (user) {
        try {
          await supabase.auth.updateUser({ data: { preferred_language: value } });
        } catch {
          // fail silently
        }
      }
    },
    [user, setLanguage]
  );

  const startEditing = useCallback((fieldKey: string) => {
    if (user) {
      const fallback = (user.user_metadata?.full_name as string | undefined)
        || (user.user_metadata?.name as string | undefined)
        || user.email?.split('@')[0] || '';
      setEditValues(buildEditValuesFromProfile(profileRow, user.email ?? '', fallback));
    }
    setEditingField(fieldKey);
    setErrorMsg('');
  }, [user, profileRow]);

  const cancelEditing = useCallback(() => {
    setEditingField(null);
    if (user) {
      const fallback = (user.user_metadata?.full_name as string | undefined)
        || (user.user_metadata?.name as string | undefined)
        || user.email?.split('@')[0] || '';
      setEditValues(buildEditValuesFromProfile(profileRow, user.email ?? '', fallback));
    }
  }, [user, profileRow]);

  const setVal = useCallback((key: keyof EditValues, value: string) =>
    setEditValues(prev => ({ ...prev, [key]: value })), []);

  const handleSave = useCallback(async (fieldKey: string) => {
    if (!user) return;
    setSaving(true);
    setErrorMsg('');
    try {
      if (fieldKey === 'email') {
        // Email must go through Auth
        const { error } = await supabase.auth.updateUser({ email: editValues.email });
        if (error) throw error;

      } else if (fieldKey === 'full_name') {
        const name = editValues.full_name || null;
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: name })
          .eq('id', user.id);
        if (error) throw error;
        // Keep auth JWT display name in sync
        await supabase.auth.updateUser({ data: { full_name: editValues.full_name } });
        setProfileRow(prev => ({ ...prev!, full_name: name }));

      } else if (fieldKey === 'phone') {
        const combinedPhone = editValues.phone_number
          ? `${editValues.phone_country_code} ${editValues.phone_number}`.trim()
          : null;
        const { error } = await supabase
          .from('profiles')
          .update({
            phone_country_code: editValues.phone_country_code || null,
            phone_country_iso: editValues.phone_country_iso || null,
            phone_number: editValues.phone_number || null,
            phone: combinedPhone,
          })
          .eq('id', user.id);
        if (error) throw error;
        setProfileRow(prev => ({
          ...prev!,
          phone_country_code: editValues.phone_country_code || null,
          phone_country_iso: editValues.phone_country_iso || null,
          phone_number: editValues.phone_number || null,
        }));

      } else if (fieldKey === 'nationality') {
        const { error } = await supabase
          .from('profiles')
          .update({ nationality: editValues.nationality || null })
          .eq('id', user.id);
        if (error) throw error;
        setProfileRow(prev => ({ ...prev!, nationality: editValues.nationality || null }));

      } else if (fieldKey === 'address') {
        const { error } = await supabase
          .from('profiles')
          .update({
            addr_country:    editValues.addr_country    || null,
            addr_city:       editValues.addr_city       || null,
            addr_district:   editValues.addr_district   || null,
            addr_building:   editValues.addr_building   || null,
            addr_apartment:  editValues.addr_apartment  || null,
            addr_street:     editValues.addr_street     || null,
            addr_postal_code: editValues.addr_postal_code || null,
            addr_additional: editValues.addr_additional  || null,
          })
          .eq('id', user.id);
        if (error) throw error;

      } else {
        // date_of_birth, gender, and any other single-column fields
        const value = editValues[fieldKey as keyof EditValues] || null;
        const { error } = await supabase
          .from('profiles')
          .update({ [fieldKey]: value })
          .eq('id', user.id);
        if (error) throw error;
        setProfileRow(prev => ({ ...prev!, [fieldKey]: value }));
      }

      setEditingField(null);
      setSuccessMsg(t['account.updateSuccess']);
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch {
      setErrorMsg(t['account.updateFailed']);
    } finally {
      setSaving(false);
    }
  }, [user, editValues, t]);

  async function handleDeleteAccount() {
    if (!user) return;
    setDeleting(true);
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch {
      setDeleting(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Display values come from profiles table (single source of truth)
  const p = (k: keyof ProfileRow) => profileRow?.[k] ?? '';
  const displayName =
    (profileRow?.full_name) ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split('@')[0] ||
    'User';
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

  // ── Display value helpers ──
  function phoneDisplay(): string {
    const code = p('phone_country_code') as string;
    const num = p('phone_number') as string;
    if (code && num) return `${code} ${num}`;
    if (num) return num;
    return '';
  }

  function nationalityDisplay(): string {
    const iso = p('nationality') as string;
    if (!iso) return '';
    const c = getCountryByCode(iso);
    return c ? getCountryName(c, language) : iso;
  }

  function genderDisplay(): string {
    const g = p('gender') as string;
    if (g === 'male') return t['account.male'];
    if (g === 'female') return t['account.female'];
    return '';
  }

  function addressDisplay(): string {
    const city = (p('addr_city') ?? '') as string;
    const countryIso = (p('addr_country') ?? '') as string;
    const countryObj = countryIso ? getCountryByCode(countryIso) : null;
    const countryName = countryObj ? getCountryName(countryObj, language) : countryIso;
    if (city && countryName) return `${city}, ${countryName}`;
    if (city) return city;
    return countryName;
  }

  // Shared props passed to every Field
  const fieldShared = {
    saving,
    isEditing: false,
    onEdit: startEditing,
    onSave: handleSave,
    onCancel: cancelEditing,
    editLabel: t['account.edit'],
    saveLabel: t['account.save'],
    savingLabel: t['account.saving'],
    cancelLabel: t['account.cancel'],
    notProvided: t['account.notProvided'],
  };

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-brand-blue transition-colors">
              {t['account.breadcrumbHome']}
            </Link>
            <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900 font-medium">{t['account.title']}</span>
          </nav>

          {/* Page Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-6 mb-6 flex items-center gap-5">
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatarUrl} alt={displayName} className="w-16 h-16 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-16 h-16 bg-brand-gold rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0">
                {getInitials(displayName)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{t['account.title']}</h1>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{displayName}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>

          {/* Toasts */}
          {successMsg && (
            <div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2.5">
              <svg className="w-4 h-4 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {errorMsg}
            </div>
          )}

          {/* ── Section 1: Manage Account ── */}
          <section className="mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-3 px-1">{t['account.manageAccount']}</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-3.5 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t['account.personalDetails']}
                </p>
              </div>

              {/* ── Name ── */}
              <Field
                {...fieldShared}
                fieldKey="full_name"
                label={t['account.name']}
                displayValue={displayName}
                isEditing={editingField === 'full_name'}
                editContent={
                  <input
                    type="text"
                    value={editValues.full_name}
                    onChange={e => setVal('full_name', e.target.value)}
                    autoFocus
                    disabled={saving}
                    className={INPUT_CLASS}
                  />
                }
              />

              {/* ── Email ── */}
              <Field
                {...fieldShared}
                fieldKey="email"
                label={t['account.emailAddress']}
                displayValue={user.email ?? ''}
                isEditing={editingField === 'email'}
                editContent={
                  <input
                    type="email"
                    value={editValues.email}
                    onChange={e => setVal('email', e.target.value)}
                    autoFocus
                    disabled={saving}
                    className={INPUT_CLASS}
                  />
                }
              />

              {/* ── Phone Number ── */}
              <Field
                {...fieldShared}
                fieldKey="phone"
                label={t['account.phoneNumber']}
                displayValue={phoneDisplay()}
                isEditing={editingField === 'phone'}
                editContent={
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLASS}>{t['account.countryCode']}</label>
                      <CountrySelect
                        value={editValues.phone_country_iso}
                        onChange={(country: Country) => {
                          setEditValues(prev => ({
                            ...prev,
                            phone_country_iso: country.code,
                            phone_country_code: country.dialCode,
                          }));
                        }}
                        language={language}
                        placeholder={t['account.searchCountry']}
                        searchPlaceholder={t['account.searchCountry']}
                        showDialCode
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>{t['account.phoneNumberLocal']}</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={editValues.phone_number}
                        onChange={e => setVal('phone_number', e.target.value.replace(/\D/g, ''))}
                        placeholder={t['account.phoneNumberPlaceholder']}
                        disabled={saving}
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                }
              />

              {/* ── Date of Birth ── */}
              <Field
                {...fieldShared}
                fieldKey="date_of_birth"
                label={t['account.dateOfBirth']}
                displayValue={(p('date_of_birth') ?? '') as string}
                isEditing={editingField === 'date_of_birth'}
                editContent={
                  <input
                    type="date"
                    value={editValues.date_of_birth}
                    onChange={e => setVal('date_of_birth', e.target.value)}
                    autoFocus
                    disabled={saving}
                    className={INPUT_CLASS}
                  />
                }
              />

              {/* ── Nationality ── */}
              <Field
                {...fieldShared}
                fieldKey="nationality"
                label={t['account.nationality']}
                displayValue={nationalityDisplay()}
                isEditing={editingField === 'nationality'}
                editContent={
                  <CountrySelect
                    value={editValues.nationality}
                    onChange={(country: Country) => setVal('nationality', country.code)}
                    language={language}
                    placeholder={t['account.selectNationality']}
                    searchPlaceholder={t['account.searchNationality']}
                    disabled={saving}
                  />
                }
              />

              {/* ── Gender ── */}
              <Field
                {...fieldShared}
                fieldKey="gender"
                label={t['account.gender']}
                displayValue={genderDisplay()}
                isEditing={editingField === 'gender'}
                editContent={
                  <div className="flex gap-3">
                    {(['male', 'female'] as const).map(g => (
                      <label
                        key={g}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all text-sm font-medium ${
                          editValues.gender === g
                            ? 'border-brand-blue bg-blue-50 text-brand-blue'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="radio"
                          name="gender"
                          value={g}
                          checked={editValues.gender === g}
                          onChange={() => setVal('gender', g)}
                          disabled={saving}
                          className="sr-only"
                        />
                        <span>{g === 'male' ? '♂' : '♀'}</span>
                        <span>{g === 'male' ? t['account.male'] : t['account.female']}</span>
                      </label>
                    ))}
                  </div>
                }
              />

              {/* ── Address ── */}
              <Field
                {...fieldShared}
                fieldKey="address"
                label={t['account.addressDetails']}
                displayValue={addressDisplay()}
                isEditing={editingField === 'address'}
                isLast
                editContent={
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLASS}>{t['account.addressCountry']}</label>
                      <CountrySelect
                        value={editValues.addr_country}
                        onChange={(country: Country) => setVal('addr_country', country.code)}
                        language={language}
                        placeholder={t['account.addressCountry']}
                        searchPlaceholder={t['account.searchCountry']}
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>{t['account.addressCity']}</label>
                      <input
                        type="text"
                        value={editValues.addr_city}
                        onChange={e => setVal('addr_city', e.target.value)}
                        placeholder={t['account.addressCityPlaceholder']}
                        disabled={saving}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>{t['account.addressDistrict']}</label>
                      <input
                        type="text"
                        value={editValues.addr_district}
                        onChange={e => setVal('addr_district', e.target.value)}
                        placeholder={t['account.addressDistrictPlaceholder']}
                        disabled={saving}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>{t['account.addressBuilding']}</label>
                      <input
                        type="text"
                        value={editValues.addr_building}
                        onChange={e => setVal('addr_building', e.target.value)}
                        placeholder={t['account.addressBuildingPlaceholder']}
                        disabled={saving}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>{t['account.addressApartment']}</label>
                      <input
                        type="text"
                        value={editValues.addr_apartment}
                        onChange={e => setVal('addr_apartment', e.target.value)}
                        placeholder={t['account.addressApartmentPlaceholder']}
                        disabled={saving}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLASS}>{t['account.addressStreet']}</label>
                      <input
                        type="text"
                        value={editValues.addr_street}
                        onChange={e => setVal('addr_street', e.target.value)}
                        placeholder={t['account.addressStreetPlaceholder']}
                        disabled={saving}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>{t['account.addressPostalCode']}</label>
                      <input
                        type="text"
                        value={editValues.addr_postal_code}
                        onChange={e => setVal('addr_postal_code', e.target.value)}
                        placeholder={t['account.addressPostalCodePlaceholder']}
                        disabled={saving}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLASS}>{t['account.addressAdditional']}</label>
                      <input
                        type="text"
                        value={editValues.addr_additional}
                        onChange={e => setVal('addr_additional', e.target.value)}
                        placeholder={t['account.addressAdditionalPlaceholder']}
                        disabled={saving}
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                }
              />
            </div>
          </section>

          {/* ── Section 2: Customisation Preferences ── */}
          <section className="mb-6">
            <div className="mb-3 px-1">
              <h2 className="text-base font-bold text-gray-900">{t['account.customisationPreferences']}</h2>
              <p className="text-sm text-gray-500 mt-1">{t['account.customisationSubtitle']}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

              {/* Currency */}
              <div className="px-6 py-5 border-b border-gray-50">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                      {t['account.currencyLabel']}
                    </p>
                    <SearchableSelect
                      options={CURRENCY_OPTIONS}
                      value={currency}
                      onChange={handleCurrencyChange}
                      searchPlaceholder={t['account.searchCurrency']}
                    />
                  </div>
                </div>
              </div>

              {/* Language */}
              <div className="px-6 py-5">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                      {t['account.languageLabel']}
                    </p>
                    <SearchableSelect
                      options={LANGUAGE_OPTIONS}
                      value={language}
                      onChange={handleLanguageChange}
                      searchPlaceholder={t['account.searchLanguage']}
                    />
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* ── Section 3: Payment Methods ── */}
          <section className="mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-3 px-1">{t['account.paymentMethods']}</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-3.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t['account.paymentCards']}
                </p>
                <button
                  onClick={() => { setShowAddCard(true); setAddCardError(''); }}
                  className="flex items-center gap-1.5 text-sm text-brand-blue hover:text-blue-700 font-semibold transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  {t['account.addCard']}
                </button>
              </div>

              {savedCards.length === 0 ? (
                <div className="px-6 py-12 flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">{t['account.noSavedCards']}</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs">{t['account.noSavedCardsDesc']}</p>
                  <button
                    onClick={() => { setShowAddCard(true); setAddCardError(''); }}
                    className="mt-4 flex items-center gap-2 px-5 py-2.5 border border-brand-blue text-brand-blue text-sm font-semibold rounded-lg hover:bg-brand-blue-light transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t['account.addCard']}
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {savedCards.map((card) => {
                    const badge = networkBadge(card.network);
                    return (
                      <li key={card.id} className="px-6 py-4 flex items-center gap-4">
                        <span className={`shrink-0 px-2 py-0.5 text-xs font-bold border rounded ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            •••• •••• •••• {card.last_four}
                          </p>
                          <p className="text-xs text-gray-400">{card.card_holder} · {card.expiry}</p>
                        </div>
                        {card.is_default ? (
                          <span className="shrink-0 text-xs font-semibold text-brand-blue bg-brand-blue-light px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetDefault(card.id)}
                            className="shrink-0 text-xs text-gray-400 hover:text-brand-blue transition-colors"
                          >
                            Set default
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="shrink-0 text-gray-300 hover:text-red-500 transition-colors"
                          title="Remove card"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* ── Add Card Modal ── */}
          {showAddCard && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">{t['account.addCard']}</h3>
                  <button onClick={() => setShowAddCard(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  {addCardError && (
                    <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{addCardError}</p>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t['payment.cardNumber']}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="1234 5678 9012 3456"
                      value={addCard.cardNumber}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
                        setAddCard(p => ({ ...p, cardNumber: v }));
                      }}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t['payment.cardHolder']}</label>
                    <input
                      type="text"
                      placeholder="Name on card"
                      value={addCard.cardHolder}
                      onChange={e => setAddCard(p => ({ ...p, cardHolder: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t['payment.expiry']}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="MM/YY"
                        value={addCard.expiry}
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                          const v = digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
                          setAddCard(p => ({ ...p, expiry: v }));
                        }}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t['payment.cvv']}</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        placeholder="•••"
                        maxLength={4}
                        value={addCard.cvv}
                        onChange={e => setAddCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                  <button
                    onClick={handleAddCard}
                    disabled={addCardSaving}
                    className="flex-1 py-2.5 bg-brand-blue text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
                  >
                    {addCardSaving ? t['account.saving'] : t['account.save']}
                  </button>
                  <button
                    onClick={() => setShowAddCard(false)}
                    disabled={addCardSaving}
                    className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {t['account.cancel']}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Section 4: Delete Account ── */}
          <section>
            <h2 className="text-base font-bold text-red-600 mb-3 px-1">{t['account.deleteAccount']}</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
              <div className="px-6 py-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 leading-relaxed mb-5">{t['account.deleteWarning']}</p>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors shadow-sm"
                    >
                      {t['account.deleteButton']}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>
      <Footer />

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { if (!deleting) setShowDeleteModal(false); }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t['account.deleteConfirmTitle']}</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">{t['account.deleteConfirmMessage']}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? t['account.deleting'] : t['account.deleteConfirmButton']}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t['account.deleteCancelButton']}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
