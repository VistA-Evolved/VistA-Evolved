/**
 * Canonical Note type — single source of truth.
 *
 * Consolidates duplicates from:
 *   - apps/web/src/lib/chart-types.ts
 *   - apps/web/src/stores/data-cache.tsx
 *   - apps/api/src/adapters/types.ts (NoteRecord — richer shape)
 */

/** Clinical note for display in chart panels. */
export interface Note {
  id: string;
  title: string;
  date: string;
  author: string;
  location: string;
  status: string;
}

/**
 * Extended note record for API/adapter layer.
 * Superset of `Note` with additional VistA fields.
 */
export interface NoteRecord extends Note {
  /** ISO 8601 timestamp (more precise than date string) */
  dateTime?: string;
  /** Full note text/body */
  text?: string;
}
