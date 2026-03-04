/**
 * Phase 397 (W22-P9): Localization + Multi-Country Packs + Theming -- Store
 *
 * In-memory stores for:
 *   - Locale catalog
 *   - Translation bundles
 *   - UCUM unit profiles
 *   - Country packs
 *   - Theme definitions
 *   - Tenant locale/theme config
 *
 * Seeds 3 system themes (legacy, modern, high-contrast) and 4 base locales.
 */

import type {
  CountryPack,
  LocaleDefinition,
  LocalizationDashboardStats,
  TenantLocaleConfig,
  ThemeDefinition,
  TranslationBundle,
  UcumUnitProfile,
} from './types.js';
import { randomBytes } from 'crypto';

const MAX_ITEMS = 10_000;

// ---- Locale Catalog ----

const locales = new Map<string, LocaleDefinition>();

// Seed base locales
function seedLocales() {
  const base: Omit<LocaleDefinition, 'id' | 'createdAt'>[] = [
    {
      languageTag: 'en-US',
      nativeName: 'English (US)',
      englishName: 'English (US)',
      direction: 'ltr',
      dateFormat: 'MM/DD/YYYY',
      decimalSeparator: '.',
      thousandsSeparator: ',',
      defaultUnitProfileId: null,
      enabled: true,
    },
    {
      languageTag: 'en-GB',
      nativeName: 'English (UK)',
      englishName: 'English (UK)',
      direction: 'ltr',
      dateFormat: 'DD/MM/YYYY',
      decimalSeparator: '.',
      thousandsSeparator: ',',
      defaultUnitProfileId: null,
      enabled: true,
    },
    {
      languageTag: 'fil-PH',
      nativeName: 'Filipino',
      englishName: 'Filipino (Philippines)',
      direction: 'ltr',
      dateFormat: 'MM/DD/YYYY',
      decimalSeparator: '.',
      thousandsSeparator: ',',
      defaultUnitProfileId: null,
      enabled: true,
    },
    {
      languageTag: 'es-MX',
      nativeName: 'Espanol (Mexico)',
      englishName: 'Spanish (Mexico)',
      direction: 'ltr',
      dateFormat: 'DD/MM/YYYY',
      decimalSeparator: '.',
      thousandsSeparator: ',',
      defaultUnitProfileId: null,
      enabled: true,
    },
  ];
  const now = new Date().toISOString();
  for (const l of base) {
    const id = l.languageTag;
    locales.set(id, { ...l, id, createdAt: now });
  }
}
seedLocales();

export function listLocales(): LocaleDefinition[] {
  return [...locales.values()];
}

export function getLocale(id: string): LocaleDefinition | undefined {
  return locales.get(id);
}

export function createLocale(loc: Omit<LocaleDefinition, 'id' | 'createdAt'>): LocaleDefinition {
  if (locales.size >= MAX_ITEMS) throw new Error('Locale store full');
  const id = loc.languageTag;
  if (locales.has(id)) throw new Error(`Locale ${id} already exists`);
  const created: LocaleDefinition = { ...loc, id, createdAt: new Date().toISOString() };
  locales.set(id, created);
  return created;
}

export function updateLocale(
  id: string,
  patch: Partial<Omit<LocaleDefinition, 'id' | 'createdAt'>>
): LocaleDefinition | undefined {
  const existing = locales.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch, id: existing.id, createdAt: existing.createdAt };
  locales.set(id, updated);
  return updated;
}

export function deleteLocale(id: string): boolean {
  return locales.delete(id);
}

// ---- Translation Bundles ----

const translationBundles = new Map<string, TranslationBundle>();

export function listTranslationBundles(
  tenantId?: string,
  languageTag?: string
): TranslationBundle[] {
  let all = [...translationBundles.values()];
  if (tenantId) all = all.filter((b) => b.tenantId === tenantId);
  if (languageTag) all = all.filter((b) => b.languageTag === languageTag);
  return all;
}

export function getTranslationBundle(id: string): TranslationBundle | undefined {
  return translationBundles.get(id);
}

export function createTranslationBundle(
  bundle: Omit<TranslationBundle, 'id' | 'version' | 'createdAt' | 'updatedAt'>
): TranslationBundle {
  if (translationBundles.size >= MAX_ITEMS) throw new Error('Translation bundle store full');
  const now = new Date().toISOString();
  const created: TranslationBundle = {
    ...bundle,
    id: randomBytes(12).toString('hex'),
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  translationBundles.set(created.id, created);
  return created;
}

export function updateTranslationBundle(
  id: string,
  patch: Partial<Omit<TranslationBundle, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>>
): TranslationBundle | undefined {
  const existing = translationBundles.get(id);
  if (!existing) return undefined;
  const updated: TranslationBundle = {
    ...existing,
    ...patch,
    id: existing.id,
    tenantId: existing.tenantId,
    version: existing.version + 1,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  translationBundles.set(id, updated);
  return updated;
}

export function deleteTranslationBundle(id: string): boolean {
  return translationBundles.delete(id);
}

/**
 * Resolve translations for a given locale + namespace.
 * Falls back from specific locale (en-US) to base language (en).
 */
export function resolveTranslations(
  tenantId: string,
  languageTag: string,
  namespace: string
): Record<string, string> {
  const bundles = listTranslationBundles(tenantId);
  // Try exact match first
  const exact = bundles.find((b) => b.languageTag === languageTag && b.namespace === namespace);
  if (exact) return exact.translations;

  // Fallback to base language (e.g., "en" from "en-US")
  const baseLang = languageTag.split('-')[0];
  const fallback = bundles.find((b) => b.languageTag === baseLang && b.namespace === namespace);
  if (fallback) return fallback.translations;

  // Fallback to en-US
  const defaultBundle = bundles.find((b) => b.languageTag === 'en-US' && b.namespace === namespace);
  return defaultBundle?.translations || {};
}

// ---- UCUM Unit Profiles ----

const unitProfiles = new Map<string, UcumUnitProfile>();

// Seed US Conventional and SI Metric profiles
function seedUnitProfiles() {
  const now = new Date().toISOString();
  const usConventional: UcumUnitProfile = {
    id: 'us-conventional',
    name: 'US Conventional',
    description: 'US customary clinical units (mg/dL, lbs, F)',
    preferredUnits: {
      glucose: 'mg/dL',
      cholesterol: 'mg/dL',
      weight: 'lb_av',
      height: 'in_us',
      temperature: 'degF',
      hemoglobin: 'g/dL',
      creatinine: 'mg/dL',
    },
    conversions: [
      { from: 'mg/dL', to: 'mmol/L', factor: 0.0555, offset: 0 },
      { from: 'lb_av', to: 'kg', factor: 0.453592, offset: 0 },
      { from: 'in_us', to: 'cm', factor: 2.54, offset: 0 },
      { from: 'degF', to: 'Cel', factor: 0.5556, offset: -17.7778 },
    ],
    region: 'US',
    createdAt: now,
  };
  const siMetric: UcumUnitProfile = {
    id: 'si-metric',
    name: 'SI Metric',
    description: 'International System clinical units (mmol/L, kg, C)',
    preferredUnits: {
      glucose: 'mmol/L',
      cholesterol: 'mmol/L',
      weight: 'kg',
      height: 'cm',
      temperature: 'Cel',
      hemoglobin: 'g/L',
      creatinine: 'umol/L',
    },
    conversions: [
      { from: 'mmol/L', to: 'mg/dL', factor: 18.0182, offset: 0 },
      { from: 'kg', to: 'lb_av', factor: 2.20462, offset: 0 },
      { from: 'cm', to: 'in_us', factor: 0.393701, offset: 0 },
      { from: 'Cel', to: 'degF', factor: 1.8, offset: 32 },
    ],
    region: 'International',
    createdAt: now,
  };
  unitProfiles.set(usConventional.id, usConventional);
  unitProfiles.set(siMetric.id, siMetric);
}
seedUnitProfiles();

export function listUnitProfiles(): UcumUnitProfile[] {
  return [...unitProfiles.values()];
}

export function getUnitProfile(id: string): UcumUnitProfile | undefined {
  return unitProfiles.get(id);
}

export function createUnitProfile(
  profile: Omit<UcumUnitProfile, 'id' | 'createdAt'>
): UcumUnitProfile {
  if (unitProfiles.size >= MAX_ITEMS) throw new Error('Unit profile store full');
  const created: UcumUnitProfile = {
    ...profile,
    id: randomBytes(12).toString('hex'),
    createdAt: new Date().toISOString(),
  };
  unitProfiles.set(created.id, created);
  return created;
}

// ---- Country Packs ----

const countryPacks = new Map<string, CountryPack>();

export function listCountryPacks(tenantId?: string): CountryPack[] {
  const all = [...countryPacks.values()];
  return tenantId ? all.filter((p) => p.tenantId === tenantId) : all;
}

export function getCountryPack(id: string): CountryPack | undefined {
  return countryPacks.get(id);
}

export function createCountryPack(
  pack: Omit<CountryPack, 'id' | 'createdAt' | 'updatedAt'>
): CountryPack {
  if (countryPacks.size >= MAX_ITEMS) throw new Error('Country pack store full');
  const now = new Date().toISOString();
  const created: CountryPack = {
    ...pack,
    id: randomBytes(12).toString('hex'),
    createdAt: now,
    updatedAt: now,
  };
  countryPacks.set(created.id, created);
  return created;
}

export function updateCountryPack(
  id: string,
  patch: Partial<Omit<CountryPack, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>>
): CountryPack | undefined {
  const existing = countryPacks.get(id);
  if (!existing) return undefined;
  const updated: CountryPack = {
    ...existing,
    ...patch,
    id: existing.id,
    tenantId: existing.tenantId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  countryPacks.set(id, updated);
  return updated;
}

export function deleteCountryPack(id: string): boolean {
  return countryPacks.delete(id);
}

// ---- Theme Definitions ----

const themes = new Map<string, ThemeDefinition>();

// Seed system themes (ADR-W22-THEMING)
function seedThemes() {
  const now = new Date().toISOString();
  const systemThemes: Omit<ThemeDefinition, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 'theme-legacy',
      name: 'VistA Legacy',
      preset: 'legacy',
      description: 'Traditional VistA/CPRS appearance',
      variables: [
        { name: '--color-primary', value: '#003366', category: 'color' },
        { name: '--color-secondary', value: '#336699', category: 'color' },
        { name: '--color-background', value: '#f0f0f0', category: 'color' },
        { name: '--color-surface', value: '#ffffff', category: 'color' },
        { name: '--color-text', value: '#1a1a1a', category: 'color' },
        { name: '--color-danger', value: '#cc0000', category: 'color' },
        { name: '--color-warning', value: '#cc6600', category: 'color' },
        { name: '--color-success', value: '#006600', category: 'color' },
      ],
      darkModeVariables: null,
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      baseFontSize: 14,
      borderRadius: 2,
      isSystem: true,
    },
    {
      id: 'theme-modern',
      name: 'Modern Clinical',
      preset: 'modern',
      description: 'Modern healthcare UI with accessibility focus',
      variables: [
        { name: '--color-primary', value: '#1976d2', category: 'color' },
        { name: '--color-secondary', value: '#424242', category: 'color' },
        { name: '--color-background', value: '#fafafa', category: 'color' },
        { name: '--color-surface', value: '#ffffff', category: 'color' },
        { name: '--color-text', value: '#212121', category: 'color' },
        { name: '--color-danger', value: '#d32f2f', category: 'color' },
        { name: '--color-warning', value: '#f57c00', category: 'color' },
        { name: '--color-success', value: '#388e3c', category: 'color' },
      ],
      darkModeVariables: [
        { name: '--color-primary', value: '#64b5f6', category: 'color' },
        { name: '--color-secondary', value: '#b0bec5', category: 'color' },
        { name: '--color-background', value: '#121212', category: 'color' },
        { name: '--color-surface', value: '#1e1e1e', category: 'color' },
        { name: '--color-text', value: '#e0e0e0', category: 'color' },
        { name: '--color-danger', value: '#ef5350', category: 'color' },
        { name: '--color-warning', value: '#ffa726', category: 'color' },
        { name: '--color-success', value: '#66bb6a', category: 'color' },
      ],
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      baseFontSize: 14,
      borderRadius: 8,
      isSystem: true,
    },
    {
      id: 'theme-high-contrast',
      name: 'High Contrast',
      preset: 'high-contrast',
      description: 'WCAG AAA compliant high contrast theme',
      variables: [
        { name: '--color-primary', value: '#0000ff', category: 'color' },
        { name: '--color-secondary', value: '#000000', category: 'color' },
        { name: '--color-background', value: '#ffffff', category: 'color' },
        { name: '--color-surface', value: '#ffffff', category: 'color' },
        { name: '--color-text', value: '#000000', category: 'color' },
        { name: '--color-danger', value: '#ff0000', category: 'color' },
        { name: '--color-warning', value: '#ff8c00', category: 'color' },
        { name: '--color-success', value: '#008000', category: 'color' },
      ],
      darkModeVariables: [
        { name: '--color-primary', value: '#6699ff', category: 'color' },
        { name: '--color-secondary', value: '#ffffff', category: 'color' },
        { name: '--color-background', value: '#000000', category: 'color' },
        { name: '--color-surface', value: '#1a1a1a', category: 'color' },
        { name: '--color-text', value: '#ffffff', category: 'color' },
        { name: '--color-danger', value: '#ff6666', category: 'color' },
        { name: '--color-warning', value: '#ffb347', category: 'color' },
        { name: '--color-success', value: '#66cc66', category: 'color' },
      ],
      fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif",
      baseFontSize: 16,
      borderRadius: 0,
      isSystem: true,
    },
  ];
  for (const t of systemThemes) {
    themes.set(t.id, { ...t, createdAt: now, updatedAt: now });
  }
}
seedThemes();

export function listThemes(): ThemeDefinition[] {
  return [...themes.values()];
}

export function getTheme(id: string): ThemeDefinition | undefined {
  return themes.get(id);
}

export function createTheme(
  theme: Omit<ThemeDefinition, 'id' | 'createdAt' | 'updatedAt'>
): ThemeDefinition {
  if (themes.size >= MAX_ITEMS) throw new Error('Theme store full');
  const now = new Date().toISOString();
  const created: ThemeDefinition = {
    ...theme,
    id: randomBytes(12).toString('hex'),
    isSystem: false, // user themes are never system
    createdAt: now,
    updatedAt: now,
  };
  themes.set(created.id, created);
  return created;
}

export function updateTheme(
  id: string,
  patch: Partial<Omit<ThemeDefinition, 'id' | 'createdAt' | 'updatedAt' | 'isSystem'>>
): ThemeDefinition | undefined {
  const existing = themes.get(id);
  if (!existing) return undefined;
  if (existing.isSystem) return undefined; // cannot modify system themes
  const updated: ThemeDefinition = {
    ...existing,
    ...patch,
    id: existing.id,
    isSystem: existing.isSystem,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  themes.set(id, updated);
  return updated;
}

export function deleteTheme(id: string): boolean {
  const existing = themes.get(id);
  if (!existing || existing.isSystem) return false; // cannot delete system themes
  return themes.delete(id);
}

// ---- Tenant Locale/Theme Config ----

const tenantLocaleConfigs = new Map<string, TenantLocaleConfig>();

export function getTenantLocaleConfig(tenantId: string): TenantLocaleConfig {
  const existing = tenantLocaleConfigs.get(tenantId);
  if (existing) return existing;
  // Return default config
  return {
    tenantId,
    primaryLocale: 'en-US',
    supportedLocales: ['en-US'],
    activeThemeId: 'theme-modern',
    activeCountryPackId: null,
    activeUnitProfileId: 'us-conventional',
    showLocaleSwitcher: true,
    showThemeSwitcher: true,
    updatedAt: new Date().toISOString(),
  };
}

export function updateTenantLocaleConfig(
  tenantId: string,
  patch: Partial<Omit<TenantLocaleConfig, 'tenantId' | 'updatedAt'>>
): TenantLocaleConfig {
  const existing = getTenantLocaleConfig(tenantId);
  const updated: TenantLocaleConfig = {
    ...existing,
    ...patch,
    tenantId,
    updatedAt: new Date().toISOString(),
  };
  tenantLocaleConfigs.set(tenantId, updated);
  return updated;
}

// ---- Dashboard Stats ----

export function getLocalizationDashboardStats(): LocalizationDashboardStats {
  const allBundles = listTranslationBundles();
  const totalKeys = allBundles.reduce((sum, b) => sum + Object.keys(b.translations).length, 0);
  const allThemes = listThemes();

  return {
    totalLocales: locales.size,
    enabledLocales: [...locales.values()].filter((l) => l.enabled).length,
    totalTranslationBundles: allBundles.length,
    totalTranslationKeys: totalKeys,
    totalUnitProfiles: unitProfiles.size,
    totalCountryPacks: countryPacks.size,
    enabledCountryPacks: [...countryPacks.values()].filter((p) => p.enabled).length,
    totalThemes: allThemes.length,
    systemThemes: allThemes.filter((t) => t.isSystem).length,
    customThemes: allThemes.filter((t) => !t.isSystem).length,
  };
}
