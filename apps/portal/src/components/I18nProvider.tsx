'use client';

/**
 * I18nProvider — Phase 132: Wraps the portal with next-intl locale context.
 *
 * Loads messages from /messages/{locale}.json and provides them
 * to all child components via useTranslations().
 *
 * Locale is managed via localStorage + portal settings API sync.
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import {
  type SupportedLocale,
  DEFAULT_LOCALE,
  getStoredLocale,
  setStoredLocale,
  syncLocaleToApi,
  loadLocaleFromApi,
} from '@/lib/i18n';

// Dynamic message loaders — fetch from /messages/*.json at runtime
async function loadMessagesForLocale(locale: string): Promise<Record<string, any>> {
  try {
    const res = await fetch(`/messages/${locale}.json`);
    if (res.ok) return res.json();
  } catch {
    // fallback
  }
  // Fallback to English
  if (locale !== 'en') {
    try {
      const res = await fetch('/messages/en.json');
      if (res.ok) return res.json();
    } catch {
      // ignore
    }
  }
  // Minimal fallback
  return {};
}

interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

export function useLocale(): I18nContextValue {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<Record<string, any> | null>(null);
  const [ready, setReady] = useState(false);

  const loadMessages = useCallback(async (loc: SupportedLocale) => {
    const msgs = await loadMessagesForLocale(loc);
    setMessages(msgs);
  }, []);

  useEffect(() => {
    async function init() {
      let loc = getStoredLocale();

      // Try to load from API
      const apiLocale = await loadLocaleFromApi();
      if (apiLocale && apiLocale !== loc) {
        loc = apiLocale;
        setStoredLocale(loc);
      }

      setLocaleState(loc);
      await loadMessages(loc);
      setReady(true);
    }
    init();
  }, [loadMessages]);

  const setLocale = useCallback(
    async (newLocale: SupportedLocale) => {
      setLocaleState(newLocale);
      setStoredLocale(newLocale);
      await loadMessages(newLocale);
      document.documentElement.lang = newLocale;
      void syncLocaleToApi(newLocale);
    },
    [loadMessages]
  );

  if (!ready || !messages) {
    return null;
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </I18nContext.Provider>
  );
}
