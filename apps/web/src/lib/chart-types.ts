/**
 * Chart types and constants derived from CPRS Delphi source extraction.
 * See design/contracts/cprs/v1/tabs.json and menus.json.
 */

/* ------------------------------------------------------------------ */
/* Tab definitions — ordered as they appear in the bottom tab strip   */
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
 * Canonical tab order — matches CPRS CreateTab() order from fFrame.pas,
 * except Cover Sheet is moved to first position (as CPRS displays it).
 */
export const CHART_TABS: ChartTab[] = [
  { slug: 'cover',     label: 'Cover Sheet',          constant: 'CT_COVER',    id: 1,  hasApi: true  },
  { slug: 'problems',  label: 'Problems',             constant: 'CT_PROBLEMS', id: 2,  hasApi: true  },
  { slug: 'meds',      label: 'Meds',                 constant: 'CT_MEDS',     id: 3,  hasApi: true  },
  { slug: 'orders',    label: 'Orders',               constant: 'CT_ORDERS',   id: 4,  hasApi: false },
  { slug: 'notes',     label: 'Notes',                constant: 'CT_NOTES',    id: 6,  hasApi: true  },
  { slug: 'consults',  label: 'Consults',             constant: 'CT_CONSULTS', id: 7,  hasApi: false },
  { slug: 'surgery',   label: 'Surgery',              constant: 'CT_SURGERY',  id: 11, hasApi: false },
  { slug: 'dcsumm',    label: 'D/C Summ',             constant: 'CT_DCSUMM',   id: 8,  hasApi: false },
  { slug: 'labs',      label: 'Labs',                 constant: 'CT_LABS',     id: 9,  hasApi: false },
  { slug: 'reports',   label: 'Reports',              constant: 'CT_REPORTS',  id: 10, hasApi: false },
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

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

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
/* API response types (matching apps/api responses)                    */
/* ------------------------------------------------------------------ */

export interface Patient {
  dfn: string;
  name: string;
}

export interface PatientDemographics {
  dfn: string;
  name: string;
  dob: string;
  sex: string;
  ssn?: string;
}

export interface Allergy {
  id: string;
  allergen: string;
  severity: string;
  reactions: string;
}

export interface Vital {
  type: string;
  value: string;
  takenAt: string;
}

export interface Note {
  id: string;
  title: string;
  date: string;
  author: string;
  location: string;
  status: string;
}

export interface Medication {
  id: string;
  name: string;
  sig: string;
  status: string;
}

export interface Problem {
  id: string;
  text: string;
  status: string;
  onset?: string;
}
