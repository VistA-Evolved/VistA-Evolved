/**
 * Theme Tokens — Phase 280 (Wave 9) → Phase 281 (Wave 10)
 *
 * Centralized theme pack definitions for VistA-Evolved.
 * Each theme pack defines CSS custom property values that map to the
 * `--cprs-*` variable namespace in cprs.module.css.
 *
 * Theme packs can be:
 *   - Built-in (modern-default, modern-dark, vista-legacy, openmrs, openemr)
 *   - Tenant-customized (via tenant config overrides)
 *
 * The active theme is applied by CPRSUIProvider via document.documentElement
 * data-theme attribute. Theme pack overrides are injected as inline CSS variables.
 *
 * Resolution order: tenant default → user preference → system default (modern-default)
 */

/** All built-in theme pack IDs */
export type ThemePackId =
  | 'modern-default'
  | 'modern-dark'
  | 'vista-legacy'
  | 'openmrs'
  | 'openemr'
  | 'high-contrast'
  | `custom:${string}`;

export interface ThemePack {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Short description */
  description: string;
  /** CSS variable overrides (without -- prefix) */
  tokens: Record<string, string>;
  /** Category for grouping in UI */
  category: 'built-in' | 'oss-inspired' | 'custom';
  /** Whether this is a dark theme */
  isDark: boolean;
  /** Accessibility: WCAG contrast level target */
  contrastLevel: 'AA' | 'AAA';
}

/* ── Built-in Light Theme (default) ────────────────────── */

const LIGHT_TOKENS: Record<string, string> = {
  'cprs-bg': '#f0f0f0',
  'cprs-content-bg': '#ffffff',
  'cprs-text': '#1a1a1a',
  'cprs-text-muted': '#666666',
  'cprs-primary': '#003366',
  'cprs-primary-hover': '#004488',
  'cprs-secondary': '#0078d4',
  'cprs-border': '#c0c0c0',
  'cprs-border-light': '#e0e0e0',
  'cprs-header-bg': '#003366',
  'cprs-header-text': '#ffffff',
  'cprs-header-detail': '#b8d4f0',
  'cprs-tab-bg': '#d8d8d8',
  'cprs-tab-active-bg': '#ffffff',
  'cprs-tab-text': '#333333',
  'cprs-tab-active-text': '#000000',
  'cprs-menu-bg': '#f0f0f0',
  'cprs-menu-hover': '#d8d8d8',
  'cprs-menu-text': '#1a1a1a',
  'cprs-dropdown-bg': '#ffffff',
  'cprs-dropdown-border': '#b0b0b0',
  'cprs-input-bg': '#ffffff',
  'cprs-input-border': '#c0c0c0',
  'cprs-badge-bg': '#e8e8e8',
  'cprs-badge-text': '#555555',
  'cprs-success': '#2e7d32',
  'cprs-error': '#c62828',
  'cprs-warning': '#f57f17',
  'cprs-hover-bg': '#f0f7ff',
  'cprs-section-bg': '#fafafa',
  'cprs-table-header-bg': '#eeeeee',
  'cprs-separator': '#d0d0d0',
  'cprs-shadow': 'rgba(0, 0, 0, 0.15)',
};

/* ── Built-in Dark Theme ───────────────────────────────── */

const DARK_TOKENS: Record<string, string> = {
  'cprs-bg': '#1a1a2e',
  'cprs-content-bg': '#16213e',
  'cprs-text': '#e0e0e0',
  'cprs-text-muted': '#a0a0a0',
  'cprs-primary': '#4a90d9',
  'cprs-primary-hover': '#5ba0e9',
  'cprs-secondary': '#64b5f6',
  'cprs-border': '#2a3a5e',
  'cprs-border-light': '#1e2d4d',
  'cprs-header-bg': '#0f3460',
  'cprs-header-text': '#e0e0e0',
  'cprs-header-detail': '#7fb8e0',
  'cprs-tab-bg': '#1e2d4d',
  'cprs-tab-active-bg': '#16213e',
  'cprs-tab-text': '#b0b0b0',
  'cprs-tab-active-text': '#e0e0e0',
  'cprs-menu-bg': '#1a1a2e',
  'cprs-menu-hover': '#2a3a5e',
  'cprs-menu-text': '#e0e0e0',
  'cprs-dropdown-bg': '#16213e',
  'cprs-dropdown-border': '#2a3a5e',
  'cprs-input-bg': '#1e2d4d',
  'cprs-input-border': '#2a3a5e',
  'cprs-badge-bg': '#2a3a5e',
  'cprs-badge-text': '#b0b0b0',
  'cprs-success': '#66bb6a',
  'cprs-error': '#ef5350',
  'cprs-warning': '#ffb74d',
  'cprs-hover-bg': '#1e2d4d',
  'cprs-section-bg': '#1e2d4d',
  'cprs-table-header-bg': '#2a3a5e',
  'cprs-separator': '#2a3a5e',
  'cprs-shadow': 'rgba(0, 0, 0, 0.4)',
};

/* ── Vista Legacy Theme (high contrast, classic look) ──── */

const VISTA_LEGACY_TOKENS: Record<string, string> = {
  ...LIGHT_TOKENS,
  'cprs-bg': '#d4d0c8',
  'cprs-content-bg': '#ffffff',
  'cprs-primary': '#000080',
  'cprs-primary-hover': '#0000a0',
  'cprs-secondary': '#0000ff',
  'cprs-border': '#808080',
  'cprs-header-bg': '#000080',
  'cprs-tab-bg': '#c0c0c0',
  'cprs-menu-bg': '#d4d0c8',
  'cprs-menu-hover': '#b0b0a0',
};

/* ── OpenMRS-Inspired Theme (warm earth tones, clinical clarity) ──── */

const OPENMRS_TOKENS: Record<string, string> = {
  ...LIGHT_TOKENS,
  'cprs-bg': '#f4f1ee',
  'cprs-content-bg': '#ffffff',
  'cprs-text': '#2c2c2c',
  'cprs-text-muted': '#6b6b6b',
  'cprs-primary': '#00463f', // OpenMRS teal-green
  'cprs-primary-hover': '#005a50',
  'cprs-secondary': '#d4a843', // warm gold accent
  'cprs-border': '#d0ccc7',
  'cprs-border-light': '#e8e4df',
  'cprs-header-bg': '#00463f',
  'cprs-header-text': '#ffffff',
  'cprs-header-detail': '#a8d8cf',
  'cprs-tab-bg': '#e8e4df',
  'cprs-tab-active-bg': '#ffffff',
  'cprs-tab-text': '#555555',
  'cprs-tab-active-text': '#00463f',
  'cprs-menu-bg': '#f4f1ee',
  'cprs-menu-hover': '#e0dbd5',
  'cprs-menu-text': '#2c2c2c',
  'cprs-dropdown-bg': '#ffffff',
  'cprs-dropdown-border': '#c5c0ba',
  'cprs-input-bg': '#ffffff',
  'cprs-input-border': '#c5c0ba',
  'cprs-badge-bg': '#e8e4df',
  'cprs-badge-text': '#4a4a4a',
  'cprs-success': '#1b7a3d',
  'cprs-error': '#b52a2a',
  'cprs-warning': '#c17d10',
  'cprs-hover-bg': '#eef7f5',
  'cprs-section-bg': '#faf8f6',
  'cprs-table-header-bg': '#ece8e3',
  'cprs-separator': '#d5d0ca',
  'cprs-shadow': 'rgba(0, 0, 0, 0.12)',
};

/* ── OpenEMR-Inspired Theme (clean blue-gray clinical) ──────────── */

const OPENEMR_TOKENS: Record<string, string> = {
  ...LIGHT_TOKENS,
  'cprs-bg': '#eef2f6',
  'cprs-content-bg': '#ffffff',
  'cprs-text': '#1e293b',
  'cprs-text-muted': '#64748b',
  'cprs-primary': '#1e40af', // OpenEMR blue
  'cprs-primary-hover': '#2550c5',
  'cprs-secondary': '#7c3aed', // purple accent
  'cprs-border': '#cbd5e1',
  'cprs-border-light': '#e2e8f0',
  'cprs-header-bg': '#1e293b', // dark blue-gray header
  'cprs-header-text': '#f8fafc',
  'cprs-header-detail': '#94a3b8',
  'cprs-tab-bg': '#e2e8f0',
  'cprs-tab-active-bg': '#ffffff',
  'cprs-tab-text': '#475569',
  'cprs-tab-active-text': '#1e40af',
  'cprs-menu-bg': '#eef2f6',
  'cprs-menu-hover': '#dbeafe',
  'cprs-menu-text': '#1e293b',
  'cprs-dropdown-bg': '#ffffff',
  'cprs-dropdown-border': '#c7d2e0',
  'cprs-input-bg': '#ffffff',
  'cprs-input-border': '#cbd5e1',
  'cprs-badge-bg': '#e0e7ff',
  'cprs-badge-text': '#3730a3',
  'cprs-success': '#15803d',
  'cprs-error': '#dc2626',
  'cprs-warning': '#d97706',
  'cprs-hover-bg': '#eff6ff',
  'cprs-section-bg': '#f8fafc',
  'cprs-table-header-bg': '#e2e8f0',
  'cprs-separator': '#cbd5e1',
  'cprs-shadow': 'rgba(15, 23, 42, 0.1)',
};

/* ── High Contrast Accessibility Theme ──────────────────────────── */

const HIGH_CONTRAST_TOKENS: Record<string, string> = {
  ...LIGHT_TOKENS,
  'cprs-bg': '#ffffff',
  'cprs-content-bg': '#ffffff',
  'cprs-text': '#000000',
  'cprs-text-muted': '#333333',
  'cprs-primary': '#0000cc',
  'cprs-primary-hover': '#0000ff',
  'cprs-secondary': '#6600cc',
  'cprs-border': '#000000',
  'cprs-border-light': '#666666',
  'cprs-header-bg': '#000000',
  'cprs-header-text': '#ffffff',
  'cprs-header-detail': '#ffff00',
  'cprs-tab-bg': '#cccccc',
  'cprs-tab-active-bg': '#ffffff',
  'cprs-tab-text': '#000000',
  'cprs-tab-active-text': '#000000',
  'cprs-menu-bg': '#ffffff',
  'cprs-menu-hover': '#ffff00',
  'cprs-menu-text': '#000000',
  'cprs-dropdown-bg': '#ffffff',
  'cprs-dropdown-border': '#000000',
  'cprs-input-bg': '#ffffff',
  'cprs-input-border': '#000000',
  'cprs-badge-bg': '#eeeeee',
  'cprs-badge-text': '#000000',
  'cprs-success': '#006600',
  'cprs-error': '#cc0000',
  'cprs-warning': '#cc6600',
  'cprs-hover-bg': '#ffffcc',
  'cprs-section-bg': '#f5f5f5',
  'cprs-table-header-bg': '#dddddd',
  'cprs-separator': '#000000',
  'cprs-shadow': 'rgba(0, 0, 0, 0.3)',
};

/* ── Theme Pack Registry ───────────────────────────────── */

export const BUILT_IN_THEMES: ThemePack[] = [
  {
    id: 'modern-default',
    name: 'Modern Default',
    description: 'Clean modern interface with blue accents',
    tokens: LIGHT_TOKENS,
    category: 'built-in',
    isDark: false,
    contrastLevel: 'AA',
  },
  {
    id: 'modern-dark',
    name: 'Modern Dark',
    description: 'Dark interface for low-light environments',
    tokens: DARK_TOKENS,
    category: 'built-in',
    isDark: true,
    contrastLevel: 'AA',
  },
  {
    id: 'vista-legacy',
    name: 'VistA Legacy',
    description: 'Classic VistA/CPRS interface colors',
    tokens: VISTA_LEGACY_TOKENS,
    category: 'built-in',
    isDark: false,
    contrastLevel: 'AA',
  },
  {
    id: 'openmrs',
    name: 'OpenMRS-Inspired',
    description: 'Warm earth tones with clinical clarity, inspired by OpenMRS',
    tokens: OPENMRS_TOKENS,
    category: 'oss-inspired',
    isDark: false,
    contrastLevel: 'AA',
  },
  {
    id: 'openemr',
    name: 'OpenEMR-Inspired',
    description: 'Clean blue-gray clinical interface, inspired by OpenEMR',
    tokens: OPENEMR_TOKENS,
    category: 'oss-inspired',
    isDark: false,
    contrastLevel: 'AA',
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Maximum contrast for accessibility (WCAG AAA target)',
    tokens: HIGH_CONTRAST_TOKENS,
    category: 'built-in',
    isDark: false,
    contrastLevel: 'AAA',
  },
];

/** All valid built-in theme IDs */
export const BUILT_IN_THEME_IDS = BUILT_IN_THEMES.map((t) => t.id);

/** Get all available theme packs (built-in only; custom are resolved at runtime). */
export function getAllThemePacks(): ThemePack[] {
  return [...BUILT_IN_THEMES];
}

/**
 * Get a theme pack by ID. Returns the modern-default if not found.
 */
export function getThemePack(id: string): ThemePack {
  return BUILT_IN_THEMES.find((t) => t.id === id) || BUILT_IN_THEMES[0];
}

/**
 * Create a custom theme pack with overrides on top of a base theme.
 */
export function createCustomThemePack(
  id: string,
  name: string,
  baseThemeId: string,
  overrides: Record<string, string>
): ThemePack {
  const base = getThemePack(baseThemeId);
  return {
    id,
    name,
    description: `Custom theme based on ${base.name}`,
    tokens: { ...base.tokens, ...overrides },
    category: 'custom',
    isDark: base.isDark,
    contrastLevel: 'AA',
  };
}

/**
 * Apply a theme pack's tokens as CSS custom properties on an element.
 * Typically called on document.documentElement.
 */
export function applyThemeTokens(element: HTMLElement, pack: ThemePack): void {
  for (const [key, value] of Object.entries(pack.tokens)) {
    element.style.setProperty(`--${key}`, value);
  }
}

/**
 * Remove theme-applied inline styles from an element.
 */
export function clearThemeTokens(element: HTMLElement, pack: ThemePack): void {
  for (const key of Object.keys(pack.tokens)) {
    element.style.removeProperty(`--${key}`);
  }
}

/**
 * Resolve the effective theme based on ThemeMode preference.
 * 'system' resolves to light/dark based on OS preference.
 */
export function resolveEffectiveTheme(mode: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light'; // SSR fallback
  }
  return mode;
}

/**
 * Resolve the effective theme pack ID using the priority chain:
 *   user preference → tenant default → system default ("modern-default")
 */
export function resolveThemePackId(
  userPref?: string | null,
  tenantDefault?: string | null
): string {
  const candidate = userPref || tenantDefault || 'modern-default';
  // Validate that the candidate is a known theme or custom
  if (candidate.startsWith('custom:')) return candidate;
  const found = BUILT_IN_THEMES.find((t) => t.id === candidate);
  return found ? found.id : 'modern-default';
}

/**
 * Check if a theme pack ID is valid (built-in or custom: prefix).
 */
export function isValidThemePackId(id: string): boolean {
  if (id.startsWith('custom:')) return true;
  return BUILT_IN_THEMES.some((t) => t.id === id);
}
