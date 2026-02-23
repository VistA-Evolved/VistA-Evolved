/**
 * Platform DB — Initialization Entrypoint
 *
 * Phase 95B: Platform Persistence Unification
 *
 * Call initPlatformDb() at server startup. It:
 *   1. Creates the DB file if needed
 *   2. Runs migrations (CREATE TABLE IF NOT EXISTS)
 *   3. Seeds from JSON fixtures if DB is empty
 *
 * Safe to call multiple times (idempotent).
 * Catches and logs errors — does NOT crash the server.
 */

import { getDb, closeDb } from "./db.js";
import { runMigrations } from "./migrate.js";
import { seedFromJsonFixtures } from "./seed.js";
import { payer } from "./schema.js";

let initialized = false;

export interface PlatformDbInitResult {
  ok: boolean;
  migrated: boolean;
  seeded: { inserted: number; skipped: number; errors: string[] } | null;
  error?: string;
}

/**
 * Initialize the platform database. Safe to call multiple times.
 */
export function initPlatformDb(): PlatformDbInitResult {
  if (initialized) {
    return { ok: true, migrated: false, seeded: null };
  }

  try {
    // Step 1: Ensure DB connection exists
    getDb();

    // Step 2: Run migrations
    runMigrations();

    // Step 3: Seed if DB is empty (check payer count)
    const db = getDb();
    const countResult = db.select().from(payer).all();
    let seedResult: { inserted: number; skipped: number; errors: string[] } | null = null;

    if (countResult.length === 0) {
      seedResult = seedFromJsonFixtures();
    }

    initialized = true;
    return { ok: true, migrated: true, seeded: seedResult };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, migrated: false, seeded: null, error: msg };
  }
}

export { closeDb };
