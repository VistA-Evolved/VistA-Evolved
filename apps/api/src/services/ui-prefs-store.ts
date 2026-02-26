/**
 * Phase 79 — UI Preferences Store (in-memory, tenant + user scoped)
 *
 * Follows the same in-memory Map<> pattern as imaging-worklist.ts (Phase 23)
 * and room-store.ts (Phase 30). Data resets on API restart.
 *
 * Migration plan:
 *   1. Current: in-memory Map keyed by `${tenantId}:${duz}`
 *   2. Future: persist to VistA NEW PERSON file (#200) or external DB
 *
 * Each preference document is versioned (schemaVersion) so clients
 * can detect stale layouts and migrate forward.
 */

import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface CoverSheetLayoutV1 {
  schemaVersion: 1;
  /** Ordered panel keys — determines render order */
  panelOrder: string[];
  /** Panel heights in pixels (key → px). 0 = collapsed. */
  panelHeights: Record<string, number>;
  /** Panel visibility (key → boolean). Hidden panels are not rendered. */
  panelVisibility: Record<string, boolean>;
  /** Layout mode when saved */
  layoutMode: "cprs" | "modern";
}

export interface UIPrefsDocument {
  tenantId: string;
  duz: string;
  coverSheet: CoverSheetLayoutV1;
  updatedAt: string;
  updatedBy: string;
}

/* ------------------------------------------------------------------ */
/* Default layout (matches CPRS 32b panel arrangement)                 */
/* ------------------------------------------------------------------ */

const DEFAULT_PANEL_ORDER = [
  "problems",
  "allergies",
  "meds",
  "vitals",
  "notes",
  "labs",
  "orders",
  "appointments",
  "immunizations",
  "reminders",
];

const DEFAULT_PANEL_HEIGHTS: Record<string, number> = {
  problems: 200,
  allergies: 200,
  meds: 200,
  vitals: 200,
  notes: 200,
  labs: 200,
  orders: 200,
  appointments: 200,
  immunizations: 200,
  reminders: 200,
};

const DEFAULT_PANEL_VISIBILITY: Record<string, boolean> = {
  problems: true,
  allergies: true,
  meds: true,
  vitals: true,
  notes: true,
  labs: true,
  orders: true,
  appointments: true,
  immunizations: true,
  reminders: true,
};

export function getDefaultCoverSheetLayout(): CoverSheetLayoutV1 {
  return {
    schemaVersion: 1,
    panelOrder: [...DEFAULT_PANEL_ORDER],
    panelHeights: { ...DEFAULT_PANEL_HEIGHTS },
    panelVisibility: { ...DEFAULT_PANEL_VISIBILITY },
    layoutMode: "cprs",
  };
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const VALID_PANEL_KEYS = new Set(DEFAULT_PANEL_ORDER);
const MIN_PANEL_HEIGHT = 80;
const MAX_PANEL_HEIGHT = 800;

export interface ValidationError {
  field: string;
  message: string;
}

export function validateCoverSheetLayout(
  input: unknown,
): { ok: true; layout: CoverSheetLayoutV1 } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!input || typeof input !== "object") {
    return { ok: false, errors: [{ field: "body", message: "Request body must be an object" }] };
  }

  const obj = input as Record<string, unknown>;

  // schemaVersion
  if (obj.schemaVersion !== undefined && obj.schemaVersion !== 1) {
    errors.push({ field: "schemaVersion", message: "Only schemaVersion 1 is supported" });
  }

  // panelOrder
  if (obj.panelOrder !== undefined) {
    if (!Array.isArray(obj.panelOrder)) {
      errors.push({ field: "panelOrder", message: "panelOrder must be an array" });
    } else {
      for (const key of obj.panelOrder) {
        if (typeof key !== "string" || !VALID_PANEL_KEYS.has(key)) {
          errors.push({ field: "panelOrder", message: `Invalid panel key: ${key}` });
        }
      }
      // Check for duplicates
      const seen = new Set<string>();
      for (const key of obj.panelOrder) {
        if (seen.has(key)) {
          errors.push({ field: "panelOrder", message: `Duplicate panel key: ${key}` });
        }
        seen.add(key);
      }
    }
  }

  // panelHeights
  if (obj.panelHeights !== undefined) {
    if (typeof obj.panelHeights !== "object" || obj.panelHeights === null || Array.isArray(obj.panelHeights)) {
      errors.push({ field: "panelHeights", message: "panelHeights must be an object" });
    } else {
      for (const [key, val] of Object.entries(obj.panelHeights as Record<string, unknown>)) {
        if (!VALID_PANEL_KEYS.has(key)) {
          errors.push({ field: `panelHeights.${key}`, message: `Invalid panel key: ${key}` });
        }
        if (typeof val !== "number" || val < MIN_PANEL_HEIGHT || val > MAX_PANEL_HEIGHT) {
          errors.push({
            field: `panelHeights.${key}`,
            message: `Height must be ${MIN_PANEL_HEIGHT}-${MAX_PANEL_HEIGHT}px, got ${val}`,
          });
        }
      }
    }
  }

  // panelVisibility
  if (obj.panelVisibility !== undefined) {
    if (typeof obj.panelVisibility !== "object" || obj.panelVisibility === null || Array.isArray(obj.panelVisibility)) {
      errors.push({ field: "panelVisibility", message: "panelVisibility must be an object" });
    } else {
      for (const [key, val] of Object.entries(obj.panelVisibility as Record<string, unknown>)) {
        if (!VALID_PANEL_KEYS.has(key)) {
          errors.push({ field: `panelVisibility.${key}`, message: `Invalid panel key: ${key}` });
        }
        if (typeof val !== "boolean") {
          errors.push({ field: `panelVisibility.${key}`, message: "Visibility must be boolean" });
        }
      }
    }
  }

  // layoutMode
  if (obj.layoutMode !== undefined && obj.layoutMode !== "cprs" && obj.layoutMode !== "modern") {
    errors.push({ field: "layoutMode", message: "layoutMode must be 'cprs' or 'modern'" });
  }

  if (errors.length > 0) return { ok: false, errors };

  // Build merged layout (partial updates allowed)
  const defaults = getDefaultCoverSheetLayout();
  const layout: CoverSheetLayoutV1 = {
    schemaVersion: 1,
    panelOrder: (obj.panelOrder as string[]) ?? defaults.panelOrder,
    panelHeights: { ...defaults.panelHeights, ...(obj.panelHeights as Record<string, number> ?? {}) },
    panelVisibility: { ...defaults.panelVisibility, ...(obj.panelVisibility as Record<string, boolean> ?? {}) },
    layoutMode: (obj.layoutMode as "cprs" | "modern") ?? defaults.layoutMode,
  };

  return { ok: true, layout };
}

/* ------------------------------------------------------------------ */
/* In-memory store                                                     */
/* ------------------------------------------------------------------ */

const store = new Map<string, UIPrefsDocument>();

/* Phase 146: DB repo wiring */
let prefsDbRepo: { upsert(d: any): Promise<any> } | null = null;
export function initUiPrefsStoreRepo(repo: typeof prefsDbRepo): void { prefsDbRepo = repo; }

function makeKey(tenantId: string, duz: string): string {
  return `${tenantId}:${duz}`;
}

export function getUIPrefs(tenantId: string, duz: string): UIPrefsDocument | null {
  return store.get(makeKey(tenantId, duz)) ?? null;
}

export function saveUIPrefs(
  tenantId: string,
  duz: string,
  layout: CoverSheetLayoutV1,
  updatedBy: string,
): UIPrefsDocument {
  const doc: UIPrefsDocument = {
    tenantId,
    duz,
    coverSheet: layout,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  store.set(makeKey(tenantId, duz), doc);

  // Phase 146: Write-through to PG
  prefsDbRepo?.upsert({ id: makeKey(tenantId, duz), tenantId, userDuz: duz, key: 'layout', value: JSON.stringify(layout), createdAt: (doc as any).createdAt ?? new Date().toISOString(), updatedAt: doc.updatedAt }).catch(() => {});

  log.debug("UI prefs saved", { tenantId, duz });
  return doc;
}

export function deleteUIPrefs(tenantId: string, duz: string): boolean {
  return store.delete(makeKey(tenantId, duz));
}

export function getUIPrefsStats(): { totalDocuments: number } {
  return { totalDocuments: store.size };
}
