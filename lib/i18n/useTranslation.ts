'use client';

import { useAppSettingsStore } from '@/store/appSettingsStore';
import { getTranslations, type TranslationKey } from './translations';

export function useTranslation() {
  const language = useAppSettingsStore((s) => s.language);
  return getTranslations(language);
}

export type { TranslationKey };
