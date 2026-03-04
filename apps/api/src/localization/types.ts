/**
 * Phase 397 (W22-P9): Localization + Multi-Country Packs + Theming -- Types
 *
 * Implements:
 *   - Locale catalog (language + region + clinical variants)
 *   - Translation bundles (key-value i18n strings)
 *   - UCUM unit normalization profiles
 *   - Country-specific clinical packs (ICD version, drug formulary, lab ranges)
 *   - Theme definitions (CSS custom properties, presets)
 *   - Tenant locale/theme configuration
 *
 * Dependencies:
 *   - Phase 390 (W22-P2): Content pack framework
 *   - ADR-W22-TERMINOLOGY: LOINC/UCUM full, SNOMED/ICD pass-through
 *   - ADR-W22-THEMING: CSS custom properties, legacy/modern/high-contrast
 */

// -- Locale Catalog --

export interface LocaleDefinition {
  id: string;
  /** BCP 47 language tag (e.g., "en-US", "fil-PH", "es-MX") */
  languageTag: string;
  /** Display name in the locale's own language */
  nativeName: string;
  /** Display name in English */
  englishName: string;
  /** Text direction */
  direction: 'ltr' | 'rtl';
  /** Date/time format preference */
  dateFormat: string;
  /** Number format (decimal separator) */
  decimalSeparator: '.' | ',';
  /** Thousands separator */
  thousandsSeparator: ',' | '.' | ' ' | '';
  /** Default UCUM unit profile */
  defaultUnitProfileId: string | null;
  /** Whether this locale is enabled */
  enabled: boolean;
  createdAt: string;
}

// -- Translation Bundles --

export interface TranslationBundle {
  id: string;
  tenantId: string;
  /** Target locale (BCP 47) */
  languageTag: string;
  /** Namespace (e.g., "common", "orders", "pharmacy", "lab") */
  namespace: string;
  /** Key-value translations */
  translations: Record<string, string>;
  /** Version number for cache busting */
  version: number;
  /** Source: manual, imported, content-pack */
  source: 'manual' | 'imported' | 'content-pack';
  contentPackId: string | null;
  createdAt: string;
  updatedAt: string;
}

// -- UCUM Unit Normalization --

export interface UnitConversion {
  /** Source unit (UCUM code) */
  from: string;
  /** Target unit (UCUM code) */
  to: string;
  /** Conversion factor (multiply source by this) */
  factor: number;
  /** Offset (add after multiplication, e.g., Fahrenheit to Celsius) */
  offset: number;
}

export interface UcumUnitProfile {
  id: string;
  /** Profile name (e.g., "US Conventional", "SI Metric", "PH Mixed") */
  name: string;
  /** Description */
  description: string;
  /** Preferred display units per clinical domain */
  preferredUnits: Record<string, string>;
  /** Conversion rules from this profile to SI base */
  conversions: UnitConversion[];
  /** Country/region this profile applies to */
  region: string;
  createdAt: string;
}

// -- Country-Specific Clinical Packs --

export type IcdVersion = 'ICD-10-CM' | 'ICD-10-AM' | 'ICD-10-PCS' | 'ICD-11' | 'ICD-O-3';

export interface CountryPack {
  id: string;
  tenantId: string;
  /** Country code (ISO 3166-1 alpha-2) */
  countryCode: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** ICD version used */
  icdVersion: IcdVersion;
  /** Default locale */
  defaultLocale: string;
  /** Drug formulary reference (external system) */
  formularyReference: string | null;
  /** Lab reference ranges profile ID */
  labRangeProfileId: string | null;
  /** Clinical documentation templates (locale-aware) */
  documentTemplateIds: string[];
  /** Content pack ID that installed this */
  contentPackId: string | null;
  /** Active */
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// -- Theme Definitions --

export type ThemePreset = 'legacy' | 'modern' | 'high-contrast' | 'custom';

export interface ThemeVariable {
  /** CSS custom property name (e.g., "--color-primary") */
  name: string;
  /** Value */
  value: string;
  /** Category for UI grouping */
  category: 'color' | 'typography' | 'spacing' | 'border' | 'shadow' | 'animation';
}

export interface ThemeDefinition {
  id: string;
  /** Theme name */
  name: string;
  /** Base preset */
  preset: ThemePreset;
  /** Description */
  description: string;
  /** CSS custom property overrides */
  variables: ThemeVariable[];
  /** Dark mode variant variables (null = no dark mode) */
  darkModeVariables: ThemeVariable[] | null;
  /** Font family stack */
  fontFamily: string;
  /** Base font size (px) */
  baseFontSize: number;
  /** Border radius (px) */
  borderRadius: number;
  /** Whether this is a system-provided theme */
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

// -- Tenant Locale/Theme Configuration --

export interface TenantLocaleConfig {
  tenantId: string;
  /** Primary locale */
  primaryLocale: string;
  /** Additional supported locales */
  supportedLocales: string[];
  /** Active theme ID */
  activeThemeId: string;
  /** Active country pack ID */
  activeCountryPackId: string | null;
  /** Active UCUM unit profile ID */
  activeUnitProfileId: string | null;
  /** Whether to show locale switcher in UI */
  showLocaleSwitcher: boolean;
  /** Whether to show theme switcher in UI */
  showThemeSwitcher: boolean;
  updatedAt: string;
}

// -- Dashboard Stats --

export interface LocalizationDashboardStats {
  totalLocales: number;
  enabledLocales: number;
  totalTranslationBundles: number;
  totalTranslationKeys: number;
  totalUnitProfiles: number;
  totalCountryPacks: number;
  enabledCountryPacks: number;
  totalThemes: number;
  systemThemes: number;
  customThemes: number;
}
