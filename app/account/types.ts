export interface EditValues {
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

export interface ProfileRow {
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

export interface SavedCard {
  id: number;
  user_id: string;
  card_holder: string;
  last_four: string;
  network: string;
  expiry: string;
  is_default: boolean;
  created_at: string;
}

export interface SelectOption {
  value: string;
  primary: string;
  secondary?: string;
}

export interface FieldSharedProps {
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
