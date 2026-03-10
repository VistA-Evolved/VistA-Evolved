/**
 * Canonical Vital type -- single source of truth.
 *
 * Consolidates duplicates from:
 *   - apps/web/src/lib/chart-types.ts
 *   - apps/web/src/stores/data-cache.tsx
 *   - apps/api/src/adapters/types.ts (VitalRecord -- richer shape)
 */

/** Lightweight vital sign for display in chart panels and cover sheets. */
export interface Vital {
  type: string;
  value: string;
  takenAt: string;
}

/**
 * Extended vital record for API/adapter layer.
 * Superset of `Vital` with additional fields.
 */
export interface VitalRecord extends Vital {
  id: string;
  unit?: string;
  /** ISO 8601 timestamp (alias for takenAt in adapter layer) */
  dateTime?: string;
  facility?: string;
}
