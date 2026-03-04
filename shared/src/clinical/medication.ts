/**
 * Canonical Medication type — single source of truth.
 *
 * Consolidates duplicates from:
 *   - apps/web/src/lib/chart-types.ts
 *   - apps/web/src/stores/data-cache.tsx
 *   - apps/api/src/adapters/types.ts (MedicationRecord — richer shape)
 */

/** Medication for display in chart panels. */
export interface Medication {
  id: string;
  name: string;
  sig: string;
  status: string;
}

/**
 * Extended medication record for API/adapter layer.
 * Superset of `Medication` with additional VistA fields.
 */
export interface MedicationRecord extends Medication {
  dose?: string;
  route?: string;
  schedule?: string;
  prescriber?: string;
  startDate?: string;
}
