/**
 * Theme Tokens — Phase 280 (Wave 9)
 *
 * Centralized theme pack definitions for VistA-Evolved.
 * Each theme pack defines CSS custom property values that map to the
 * `--cprs-*` variable namespace in cprs.module.css.
 *
 * Theme packs can be:
 *   - Built-in (vista-legacy, modern-default)
 *   - Tenant-customized (via tenant config overrides)
 *
 * The active theme is applied by CPRSUIProvider via document.documentElement
 * data-theme attribute. Theme pack overrides are injected as inline CSS variables.
 */

export interface ThemePack {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Short description */
  description: string;
  /** CSS variable overrides (without -- prefix) */
  tokens: Record<string, string>;
}

/* ── Built-in Light Theme (default) ────────────────────── */

const LIGHT_TOKENS: Record<string, string> = {
  "cprs-bg": "#f0f0f0",
  "cprs-content-bg": "#ffffff",
  "cprs-text": "#1a1a1a",
  "cprs-text-muted": "#666666",
  "cprs-primary": "#003366",
  "cprs-primary-hover": "#004488",
  "cprs-secondary": "#0078d4",
  "cprs-border": "#c0c0c0",
  "cprs-border-light": "#e0e0e0",
  "cprs-header-bg": "#003366",
  "cprs-header-text": "#ffffff",
  "cprs-header-detail": "#b8d4f0",
  "cprs-tab-bg": "#d8d8d8",
  "cprs-tab-active-bg": "#ffffff",
  "cprs-tab-text": "#333333",
  "cprs-tab-active-text": "#000000",
  "cprs-menu-bg": "#f0f0f0",
  "cprs-menu-hover": "#d8d8d8",
  "cprs-menu-text": "#1a1a1a",
  "cprs-dropdown-bg": "#ffffff",
  "cprs-dropdown-border": "#b0b0b0",
  "cprs-input-bg": "#ffffff",
  "cprs-input-border": "#c0c0c0",
  "cprs-badge-bg": "#e8e8e8",
  "cprs-badge-text": "#555555",
  "cprs-success": "#2e7d32",
  "cprs-error": "#c62828",
  "cprs-warning": "#f57f17",
  "cprs-hover-bg": "#f0f7ff",
  "cprs-section-bg": "#fafafa",
  "cprs-table-header-bg": "#eeeeee",
  "cprs-separator": "#d0d0d0",
  "cprs-shadow": "rgba(0, 0, 0, 0.15)",
};

/* ── Built-in Dark Theme ───────────────────────────────── */

const DARK_TOKENS: Record<string, string> = {
  "cprs-bg": "#1a1a2e",
  "cprs-content-bg": "#16213e",
  "cprs-text": "#e0e0e0",
  "cprs-text-muted": "#a0a0a0",
  "cprs-primary": "#4a90d9",
  "cprs-primary-hover": "#5ba0e9",
  "cprs-secondary": "#64b5f6",
  "cprs-border": "#2a3a5e",
  "cprs-border-light": "#1e2d4d",
  "cprs-header-bg": "#0f3460",
  "cprs-header-text": "#e0e0e0",
  "cprs-header-detail": "#7fb8e0",
  "cprs-tab-bg": "#1e2d4d",
  "cprs-tab-active-bg": "#16213e",
  "cprs-tab-text": "#b0b0b0",
  "cprs-tab-active-text": "#e0e0e0",
  "cprs-menu-bg": "#1a1a2e",
  "cprs-menu-hover": "#2a3a5e",
  "cprs-menu-text": "#e0e0e0",
  "cprs-dropdown-bg": "#16213e",
  "cprs-dropdown-border": "#2a3a5e",
  "cprs-input-bg": "#1e2d4d",
  "cprs-input-border": "#2a3a5e",
  "cprs-badge-bg": "#2a3a5e",
  "cprs-badge-text": "#b0b0b0",
  "cprs-success": "#66bb6a",
  "cprs-error": "#ef5350",
  "cprs-warning": "#ffb74d",
  "cprs-hover-bg": "#1e2d4d",
  "cprs-section-bg": "#1e2d4d",
  "cprs-table-header-bg": "#2a3a5e",
  "cprs-separator": "#2a3a5e",
  "cprs-shadow": "rgba(0, 0, 0, 0.4)",
};

/* ── Vista Legacy Theme (high contrast, classic look) ──── */

const VISTA_LEGACY_TOKENS: Record<string, string> = {
  ...LIGHT_TOKENS,
  "cprs-bg": "#d4d0c8",
  "cprs-content-bg": "#ffffff",
  "cprs-primary": "#000080",
  "cprs-primary-hover": "#0000a0",
  "cprs-secondary": "#0000ff",
  "cprs-border": "#808080",
  "cprs-header-bg": "#000080",
  "cprs-tab-bg": "#c0c0c0",
  "cprs-menu-bg": "#d4d0c8",
  "cprs-menu-hover": "#b0b0a0",
};

/* ── Theme Pack Registry ───────────────────────────────── */

export const BUILT_IN_THEMES: ThemePack[] = [
  {
    id: "modern-default",
    name: "Modern Default",
    description: "Clean modern interface with blue accents",
    tokens: LIGHT_TOKENS,
  },
  {
    id: "modern-dark",
    name: "Modern Dark",
    description: "Dark interface for low-light environments",
    tokens: DARK_TOKENS,
  },
  {
    id: "vista-legacy",
    name: "VistA Legacy",
    description: "Classic VistA/CPRS interface colors",
    tokens: VISTA_LEGACY_TOKENS,
  },
];

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
  overrides: Record<string, string>,
): ThemePack {
  const base = getThemePack(baseThemeId);
  return {
    id,
    name,
    description: `Custom theme based on ${base.name}`,
    tokens: { ...base.tokens, ...overrides },
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
export function resolveEffectiveTheme(
  mode: "light" | "dark" | "system",
): "light" | "dark" {
  if (mode === "system") {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light"; // SSR fallback
  }
  return mode;
}
