'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';
import { fetchMyAccountData } from '@/app/user-actions';
import { useAppSettingsStore, type Language, type CurrencyCode } from '@/store/appSettingsStore';
import { getTranslations } from '@/lib/i18n/translations';
import { saveLoginRedirect } from '@/lib/auth';
import type { EditValues, ProfileRow, SavedCard, FieldSharedProps } from './types';
import {
  getDisplayName,
  getInitials,
  detectNetwork,
  buildEditValuesFromProfile,
} from './utils';
import { ManageAccountSection } from './components/ManageAccountSection';
import { PreferencesSection } from './components/PreferencesSection';
import { PaymentMethodsSection } from './components/PaymentMethodsSection';
import { DeleteAccountSection } from './components/DeleteAccountSection';

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

  const setMultiVal = useCallback((updates: Partial<EditValues>) =>
    setEditValues(prev => ({ ...prev, ...updates })), []);

  const handleSave = useCallback(async (fieldKey: string) => {
    if (!user) return;
    setSaving(true);
    setErrorMsg('');
    try {
      if (fieldKey === 'email') {
        const { error } = await supabase.auth.updateUser({ email: editValues.email });
        if (error) throw error;

      } else if (fieldKey === 'full_name') {
        const name = editValues.full_name || null;
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: name })
          .eq('id', user.id);
        if (error) throw error;
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFC' }}>
        <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayName =
    (profileRow?.full_name) ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split('@')[0] ||
    'User';
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

  const fieldShared: FieldSharedProps = {
    saving,
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
      <main className="min-h-screen pb-16" style={{ background: '#F8FAFC' }}>

        {/* ── Premium banner ── */}
        <div style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <nav className="flex items-center gap-2 text-xs text-white/40 mb-5">
              <Link href="/" className="hover:text-white/70 transition-colors">{t['account.breadcrumbHome']}</Link>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              <span className="text-white/60">{t['account.title']}</span>
            </nav>
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="shrink-0">
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarUrl} alt={displayName} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/20" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white ring-2 ring-white/20" style={{ background: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)' }}>
                    {getInitials(displayName)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-1 h-5 rounded-full shrink-0" style={{ background: 'linear-gradient(180deg, #D97706 0%, #B45309 100%)' }} />
                  <h1 className="text-xl font-bold truncate" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>
                    {displayName}
                  </h1>
                </div>
                <p className="text-white/45 text-xs pl-3">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

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

          <ManageAccountSection
            profileRow={profileRow}
            editValues={editValues}
            editingField={editingField}
            userEmail={user.email ?? ''}
            displayName={displayName}
            language={language}
            fieldShared={fieldShared}
            saving={saving}
            setVal={setVal}
            setMultiVal={setMultiVal}
            t={t}
          />

          <PreferencesSection
            currency={currency}
            language={language}
            onCurrencyChange={handleCurrencyChange}
            onLanguageChange={handleLanguageChange}
            t={t}
          />

          <PaymentMethodsSection
            savedCards={savedCards}
            showAddCard={showAddCard}
            setShowAddCard={setShowAddCard}
            addCard={addCard}
            setAddCard={setAddCard}
            addCardError={addCardError}
            addCardSaving={addCardSaving}
            onAddCard={handleAddCard}
            onDeleteCard={handleDeleteCard}
            onSetDefault={handleSetDefault}
            t={t}
          />

          <DeleteAccountSection
            showDeleteModal={showDeleteModal}
            setShowDeleteModal={setShowDeleteModal}
            deleting={deleting}
            onDeleteAccount={handleDeleteAccount}
            t={t}
          />

        </div>
      </main>
      <Footer />
    </>
  );
}
