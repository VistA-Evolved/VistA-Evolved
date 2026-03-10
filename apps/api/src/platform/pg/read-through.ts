/**
 * Read-Through Cache Utilities -- Phase 276
 *
 * Generic utilities for adding read-through behavior to pg_backed stores.
 * Pattern: Map-first -> PG-fallback -> cache-fill on miss.
 *
 * Usage:
 *   const item = await readThroughGet(localMap, key, () => pgRepo.findById(key));
 *   const list = await readThroughList(localMap, hydrated, () => pgRepo.findByTenant(tid));
 */

import { isPgConfigured } from './pg-db.js';

/* ------------------------------------------------------------------ */
/* readThroughGet: single-item lookup with PG fallback                 */
/* ------------------------------------------------------------------ */

/**
 * Look up an item by key in the local Map. On miss, query PG via the
 * provided async fallback. If PG returns a result, cache it in the Map.
 *
 * @param localMap   The in-memory Map store
 * @param key        The key to look up
 * @param pgFallback Async function that queries PG and returns T | null
 * @returns          The item, or null if not found in either store
 */
export async function readThroughGet<T>(
  localMap: Map<string, T>,
  key: string,
  pgFallback: () => Promise<T | null>
): Promise<T | null> {
  // 1. Map-first
  const cached = localMap.get(key);
  if (cached !== undefined) return cached;

  // 2. PG fallback (only if configured)
  if (!isPgConfigured()) return null;

  try {
    const row = await pgFallback();
    if (row !== null) {
      localMap.set(key, row); // cache-fill
    }
    return row;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* readThroughList: bulk list with PG fallback                         */
/* ------------------------------------------------------------------ */

/**
 * Return all items from the local Map. If the Map hasn't been hydrated
 * from PG yet (tracked by the hydrated flag), bulk-load from PG first.
 *
 * @param localMap      The in-memory Map store
 * @param hydratedRef   Mutable ref { value: boolean } tracking hydration
 * @param pgListFn      Async function that returns all items from PG
 * @param keyExtractor  Function to extract the Map key from each item
 * @returns             Array of all items
 */
export async function readThroughList<T>(
  localMap: Map<string, T>,
  hydratedRef: { value: boolean },
  pgListFn: () => Promise<T[]>,
  keyExtractor: (item: T) => string
): Promise<T[]> {
  // If already hydrated or PG not configured, return Map contents
  if (hydratedRef.value || !isPgConfigured()) {
    return Array.from(localMap.values());
  }

  try {
    const rows = await pgListFn();
    for (const row of rows) {
      const key = keyExtractor(row);
      if (!localMap.has(key)) {
        localMap.set(key, row);
      }
    }
    hydratedRef.value = true;
  } catch {
    // PG unavailable -- serve from Map as-is
  }

  return Array.from(localMap.values());
}

/* ------------------------------------------------------------------ */
/* hydrateMapsFromPg: startup bulk-load for critical stores            */
/* ------------------------------------------------------------------ */

export interface HydrateTask {
  name: string;
  hydrate: () => Promise<number>;
}

/**
 * Run all registered hydration tasks at startup. Non-fatal -- each task
 * is isolated so one failure doesn't block others.
 *
 * @returns Summary of hydration results
 */
export async function hydrateMapsFromPg(
  tasks: HydrateTask[]
): Promise<{ succeeded: string[]; failed: string[] }> {
  if (!isPgConfigured()) {
    return { succeeded: [], failed: [] };
  }

  const succeeded: string[] = [];
  const failed: string[] = [];

  for (const task of tasks) {
    try {
      const count = await task.hydrate();
      succeeded.push(`${task.name} (${count} rows)`);
    } catch {
      failed.push(task.name);
    }
  }

  return { succeeded, failed };
}
