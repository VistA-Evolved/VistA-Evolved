/**
 * Canonical Problem type — single source of truth.
 *
 * Consolidates duplicates from:
 *   - apps/web/src/lib/chart-types.ts
 *   - apps/web/src/stores/data-cache.tsx
 *   - apps/api/src/adapters/types.ts (ProblemRecord — richer shape)
 */

/** Problem list entry for display in chart panels. */
export interface Problem {
  id: string;
  text: string;
  status: string;
  onset?: string;
}

/**
 * Extended problem record for API/adapter layer.
 * Superset of `Problem` with additional VistA fields.
 */
export interface ProblemRecord extends Problem {
  /** ICD-10 or SNOMED code */
  icdCode?: string;
  /** Full description (alias for text in adapter layer) */
  description?: string;
  /** Responsible provider */
  provider?: string;
}
