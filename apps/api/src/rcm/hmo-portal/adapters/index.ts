/**
 * HMO Portal Adapters — Index (Phase 97)
 *
 * Importing this module registers all 5 per-HMO portal adapters.
 * Call initHmoPortalAdapters() at server startup.
 */

export { maxicareAdapter } from './maxicare.js';
export { medicardAdapter } from './medicard.js';
export { intellicareAdapter } from './intellicare.js';
export { philcareAdapter } from './philcare.js';
export { valucareAdapter } from './valucare.js';

/** Call once at startup to register all adapters. Import triggers registration. */
export function initHmoPortalAdapters(): void {
  // Importing the adapter modules above triggers registerPortalAdapter() for each.
  // This function exists as an explicit init point for index.ts wiring.
}
