/**
 * Canonical Allergy type — single source of truth.
 *
 * Consolidates duplicates from:
 *   - apps/web/src/lib/chart-types.ts
 *   - apps/web/src/stores/data-cache.tsx
 *   - apps/web/src/app/patient-search/page.tsx (local)
 *   - apps/api/src/adapters/types.ts (AllergyRecord — richer shape)
 */

/** Lightweight allergy for display in chart panels and cover sheets. */
export interface Allergy {
  id: string;
  allergen: string;
  severity: string;
  reactions: string;
}

/**
 * Extended allergy record for API/adapter layer.
 * Superset of `Allergy` with additional VistA fields.
 */
export interface AllergyRecord extends Allergy {
  type?: string;
  verified?: boolean;
  enteredDate?: string;
  /** Parsed reaction list (adapter layer splits the string) */
  reactionList?: string[];
}
