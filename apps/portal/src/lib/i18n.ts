import { API_BASE } from '@/lib/api-config';
/**
 * i18n configuration for the Patient Portal — Phase 132.
 *
 * Uses next-intl with client-side provider.
 * Locale persisted via portal_patient_setting.language (existing endpoint).
 * Supported locales: en, fil (Filipino), es (Spanish).
 */

export const SUPPORTED_LOCALES = ["en", "fil", "es"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  fil: "Filipino",
  es: "Espanol",
};

const LS_KEY = "portal-locale";

/** Get the current locale from localStorage */
export function getStoredLocale(): SupportedLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const stored = localStorage.getItem(LS_KEY);
  if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
    return stored as SupportedLocale;
  }
  return DEFAULT_LOCALE;
}

/** Set the locale in localStorage */
export function setStoredLocale(locale: SupportedLocale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, locale);
}

/** Sync locale to the API via portal settings */
export async function syncLocaleToApi(locale: SupportedLocale): Promise<void> {
  try {
    await fetch(`${API_BASE}/portal/settings`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: locale }),
    });
  } catch {
    // Best-effort
  }
}

/** Load locale from API portal settings */
export async function loadLocaleFromApi(): Promise<SupportedLocale | null> {
  try {
    const res = await fetch(`${API_BASE}/portal/settings`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.settings?.language) {
        const lang = data.settings.language;
        if ((SUPPORTED_LOCALES as readonly string[]).includes(lang)) {
          return lang as SupportedLocale;
        }
      }
    }
  } catch {
    // Fallback to localStorage
  }
  return null;
}
