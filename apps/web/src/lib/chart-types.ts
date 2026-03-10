/**
 * Chart types and constants derived from CPRS Delphi source extraction.
 * See design/contracts/cprs/v1/tabs.json and menus.json.
 */

/* ------------------------------------------------------------------ */
/* Tab definitions -- ordered as they appear in the bottom tab strip   */
/* ------------------------------------------------------------------ */

export interface ChartTab {
  /** URL slug used in /chart/[dfn]/[tab] */
  slug: string;
  /** Display label on the tab strip */
  label: string;
  /** Original Delphi constant name (informational) */
  constant: string;
  /** Original CT_* numeric id */
  id: number;
  /** Whether an API endpoint exists for this tab */
  hasApi: boolean;
}

/**
 * Canonical tab order -- matches CPRS CreateTab() order from fFrame.pas,
 * except Cover Sheet is moved to first position (as CPRS displays it).
 */
export const CHART_TABS: ChartTab[] = [
  { slug: 'cover', label: 'Cover Sheet', constant: 'CT_COVER', id: 1, hasApi: true },
  { slug: 'problems', label: 'Problems', constant: 'CT_PROBLEMS', id: 2, hasApi: true },
  { slug: 'meds', label: 'Meds', constant: 'CT_MEDS', id: 3, hasApi: true },
  { slug: 'orders', label: 'Orders', constant: 'CT_ORDERS', id: 4, hasApi: false },
  { slug: 'notes', label: 'Notes', constant: 'CT_NOTES', id: 6, hasApi: true },
  { slug: 'consults', label: 'Consults', constant: 'CT_CONSULTS', id: 7, hasApi: false },
  { slug: 'surgery', label: 'Surgery', constant: 'CT_SURGERY', id: 11, hasApi: false },
  { slug: 'dcsumm', label: 'D/C Summ', constant: 'CT_DCSUMM', id: 8, hasApi: false },
  { slug: 'labs', label: 'Labs', constant: 'CT_LABS', id: 9, hasApi: false },
  { slug: 'reports', label: 'Reports', constant: 'CT_REPORTS', id: 10, hasApi: false },
];

export function tabBySlug(slug: string): ChartTab | undefined {
  return CHART_TABS.find((t) => t.slug === slug);
}

export function defaultTab(): ChartTab {
  return CHART_TABS[0]; // Cover Sheet
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

// Re-export from centralised config for backward compat
export { API_BASE } from '@/lib/api-config';

/* ------------------------------------------------------------------ */
/* Menu types (subset of menus.json structure)                         */
/* ------------------------------------------------------------------ */

export interface MenuItem {
  name: string;
  caption: string;
  isSeparator: boolean;
  shortcut: string | null;
  tag: number | null;
  onClick: string | null;
  visible: boolean;
  enabled: boolean;
  children: MenuItem[];
}

/** Clean the Delphi '&' accelerator prefix from captions */
export function cleanCaption(caption: string): string {
  return caption.replace(/&/g, '');
}

/* ------------------------------------------------------------------ */
/* API response types -- re-exported from canonical shared types        */
/* ------------------------------------------------------------------ */

export type {
  Patient,
  PatientDemographics,
  PatientSummary,
  Allergy,
  Vital,
  Note,
  Medication,
  Problem,
} from '@vista-evolved/shared-types';
