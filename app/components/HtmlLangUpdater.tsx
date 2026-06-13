'use client';

import { useEffect } from 'react';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { RTL_LANGUAGES } from '@/lib/languageData';

export default function HtmlLangUpdater() {
  const language = useAppSettingsStore((s) => s.language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';
  }, [language]);

  return null;
}
