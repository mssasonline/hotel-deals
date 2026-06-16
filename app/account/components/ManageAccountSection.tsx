'use client';

import CountrySelect from '@/app/components/CountrySelect';
import { getCountryName, getCountryByCode, type Country } from '@/lib/countries';
import type { Language } from '@/store/appSettingsStore';
import type { getTranslations } from '@/lib/i18n/translations';
import type { EditValues, ProfileRow, FieldSharedProps } from '../types';
import { INPUT_CLASS, LABEL_CLASS } from '../utils';
import { Field } from './Field';

type Translations = ReturnType<typeof getTranslations>;

interface ManageAccountSectionProps {
  profileRow: ProfileRow | null;
  editValues: EditValues;
  editingField: string | null;
  userEmail: string;
  displayName: string;
  language: Language;
  fieldShared: FieldSharedProps;
  saving: boolean;
  setVal: (key: keyof EditValues, value: string) => void;
  setMultiVal: (updates: Partial<EditValues>) => void;
  t: Translations;
}

export function ManageAccountSection({
  profileRow,
  editValues,
  editingField,
  userEmail,
  displayName,
  language,
  fieldShared,
  saving,
  setVal,
  setMultiVal,
  t,
}: ManageAccountSectionProps) {
  const p = (k: keyof ProfileRow) => profileRow?.[k] ?? '';

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

  return (
    <section className="mb-6">
      <h2 className="text-base font-bold text-gray-900 mb-3 px-1">{t['account.manageAccount']}</h2>
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
        <div className="px-6 py-3.5 bg-gray-50 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t['account.personalDetails']}
          </p>
        </div>

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

        <Field
          {...fieldShared}
          fieldKey="email"
          label={t['account.emailAddress']}
          displayValue={userEmail}
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
                    setMultiVal({ phone_country_iso: country.code, phone_country_code: country.dialCode });
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
  );
}
