import { API_BASE } from '@/lib/api-config';
/**
 * i18n configuration for the EHR Web App — Phase 132.
 *
 * Uses next-intl with client-side provider (no middleware routing).
 * Locale is stored in localStorage + synced to API for persistence.
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

export const LOCALE_NATIVE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  fil: "Filipino",
  es: "Espanol",
};

const LS_KEY = "ehr-locale";

/** Get the current locale from localStorage (client-side only) */
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

/** Sync locale to the API for persistence */
export async function syncLocaleToApi(locale: SupportedLocale): Promise<void> {
  try {
    const { csrfHeaders } = await import("./csrf");
    const API = API_BASE;
    await fetch(`${API}/i18n/locale`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...csrfHeaders(),
      },
      body: JSON.stringify({ locale }),
    });
  } catch {
    // Best-effort — localStorage is primary
  }
}

/** Load locale from API (for initial hydration) */
export async function loadLocaleFromApi(): Promise<SupportedLocale | null> {
  try {
    const API = API_BASE;
    const res = await fetch(`${API}/i18n/locale`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && (SUPPORTED_LOCALES as readonly string[]).includes(data.locale)) {
        return data.locale as SupportedLocale;
      }
    }
  } catch {
    // Fallback to localStorage
  }
  return null;
}
