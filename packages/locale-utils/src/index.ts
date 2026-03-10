/**
 * Centralized locale-aware formatting utilities for VistA-Evolved.
 *
 * All date, number, and currency formatting should go through these
 * functions to ensure consistency across the portal and EHR UIs.
 *
 * Uses Intl.* APIs (built into all modern browsers and Node.js).
 * No external dependencies.
 */

// -- Supported Locales ------------------------------------------

export const SUPPORTED_LOCALES = ['en', 'fil', 'es'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// -- Date Formatting --------------------------------------------

export type DateFormatStyle = 'short' | 'medium' | 'long' | 'iso';

const DATE_FORMATS: Record<DateFormatStyle, Intl.DateTimeFormatOptions> = {
  short: { year: 'numeric', month: '2-digit', day: '2-digit' },
  medium: {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
  long: {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  },
  iso: {}, // handled specially
};

/**
 * Format a date value according to the given locale and style.
 *
 * @param value - Date, ISO string, or epoch ms
 * @param locale - BCP 47 locale tag (e.g. "en-US", "fil", "es")
 * @param style - "short" | "medium" | "long" | "iso"
 * @returns Formatted date string, or empty string if value is falsy
 */
export function formatDate(
  value: Date | string | number | null | undefined,
  locale: string = 'en',
  style: DateFormatStyle = 'medium'
): string {
  if (value == null) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '';

  if (style === 'iso') {
    return date.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  try {
    return new Intl.DateTimeFormat(locale, DATE_FORMATS[style]).format(date);
  } catch {
    // Fallback for unsupported locale
    return new Intl.DateTimeFormat('en', DATE_FORMATS[style]).format(date);
  }
}

// -- Time Formatting --------------------------------------------

export type TimeFormatStyle = 'short' | 'medium' | 'full';

const TIME_FORMATS: Record<TimeFormatStyle, Intl.DateTimeFormatOptions> = {
  short: { hour: '2-digit', minute: '2-digit' },
  medium: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
  full: {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  },
};

/**
 * Format a time value according to the given locale.
 */
export function formatTime(
  value: Date | string | number | null | undefined,
  locale: string = 'en',
  style: TimeFormatStyle = 'short'
): string {
  if (value == null) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '';

  try {
    return new Intl.DateTimeFormat(locale, TIME_FORMATS[style]).format(date);
  } catch {
    return new Intl.DateTimeFormat('en', TIME_FORMATS[style]).format(date);
  }
}

/**
 * Format a date+time value according to the given locale.
 */
export function formatDateTime(
  value: Date | string | number | null | undefined,
  locale: string = 'en',
  dateStyle: DateFormatStyle = 'medium',
  timeStyle: TimeFormatStyle = 'short'
): string {
  if (value == null) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '';

  const dOpts = dateStyle === 'iso' ? DATE_FORMATS.short : DATE_FORMATS[dateStyle];
  const tOpts = TIME_FORMATS[timeStyle];
  const combined = { ...dOpts, ...tOpts };

  try {
    return new Intl.DateTimeFormat(locale, combined).format(date);
  } catch {
    return new Intl.DateTimeFormat('en', combined).format(date);
  }
}

// -- Number Formatting ------------------------------------------

/**
 * Format a number according to the given locale.
 *
 * @param value - Number to format
 * @param locale - BCP 47 locale tag
 * @param options - Additional Intl.NumberFormat options
 */
export function formatNumber(
  value: number | null | undefined,
  locale: string = 'en',
  options?: Intl.NumberFormatOptions
): string {
  if (value == null) return '';
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return new Intl.NumberFormat('en', options).format(value);
  }
}

// -- Currency Formatting ----------------------------------------

/**
 * Format a monetary value with currency symbol.
 *
 * @param value - Amount
 * @param currencyCode - ISO 4217 currency code (e.g. "USD", "PHP")
 * @param locale - BCP 47 locale tag
 */
export function formatCurrency(
  value: number | null | undefined,
  currencyCode: string = 'USD',
  locale: string = 'en'
): string {
  if (value == null) return '';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(value);
  } catch {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  }
}

// -- Relative Time ----------------------------------------------

/**
 * Format a relative time (e.g., "3 days ago", "in 2 hours").
 */
export function formatRelativeTime(
  value: Date | string | number | null | undefined,
  locale: string = 'en'
): string {
  if (value == null) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffMs = date.getTime() - now;
  const absDiff = Math.abs(diffMs);

  let unit: Intl.RelativeTimeFormatUnit;
  let amount: number;

  if (absDiff < 60_000) {
    unit = 'second';
    amount = Math.round(diffMs / 1000);
  } else if (absDiff < 3_600_000) {
    unit = 'minute';
    amount = Math.round(diffMs / 60_000);
  } else if (absDiff < 86_400_000) {
    unit = 'hour';
    amount = Math.round(diffMs / 3_600_000);
  } else if (absDiff < 2_592_000_000) {
    unit = 'day';
    amount = Math.round(diffMs / 86_400_000);
  } else {
    unit = 'month';
    amount = Math.round(diffMs / 2_592_000_000);
  }

  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(amount, unit);
  } catch {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(amount, unit);
  }
}

// -- RTL Detection ----------------------------------------------

/**
 * RTL locales that VistA-Evolved may support in the future.
 * Currently no RTL locales are active, but the infrastructure is ready.
 */
const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

/**
 * Check if a locale is RTL.
 */
export function isRtlLocale(locale: string): boolean {
  const base = locale.split('-')[0].toLowerCase();
  return RTL_LOCALES.has(base);
}

/**
 * Get the text direction for a locale.
 */
export function getTextDirection(locale: string): 'ltr' | 'rtl' {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}
