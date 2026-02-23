/**
 * Platform DB — PostgreSQL Initialization Entrypoint
 *
 * Phase 101+102: Platform Data Architecture + Registry Migration
 *
 * Call initPlatformPg() at server startup. It:
 *   1. Checks if PLATFORM_PG_URL is configured
 *   2. Connects to Postgres and validates the pool
 *   3. Runs versioned migrations
 *   4. Optionally applies RLS policies
 *   5. Seeds payer data from JSON fixtures (Phase 102)
 *
 * Safe to call multiple times (idempotent).
 * If PLATFORM_PG_URL is not set, returns { ok: false, reason: 'not_configured' }.
 * Does NOT crash the server on failure — SQLite continues as fallback.
 */

import { isPgConfigured, getPgDb, pgHealthCheck } from "./pg-db.js";
import { runPgMigrations, applyRlsPolicies } from "./pg-migrate.js";
import { pgSeedFromJsonFixtures } from "./pg-seed.js";

let initialized = false;

export interface PlatformPgInitResult {
  ok: boolean;
  reason?: string;
  migrations?: { applied: number; skipped: number; errors: string[] };
  rls?: { applied: string[]; errors: string[] };
  seeded?: { inserted: number; skipped: number; errors: string[] };
  healthCheck?: { ok: boolean; latencyMs?: number; error?: string };
  error?: string;
}

/**
 * Initialize the PostgreSQL platform database.
 * Returns detailed result — never throws.
 */
export async function initPlatformPg(): Promise<PlatformPgInitResult> {
  if (initialized) {
    return { ok: true, reason: "already_initialized" };
  }

  if (!isPgConfigured()) {
    return { ok: false, reason: "not_configured" };
  }

  try {
    // Step 1: Create the connection pool and verify connectivity
    getPgDb();
    const health = await pgHealthCheck();
    if (!health.ok) {
      return {
        ok: false,
        reason: "connection_failed",
        healthCheck: health,
        error: health.error,
      };
    }

    // Step 2: Run versioned migrations
    const migrations = await runPgMigrations();
    if (migrations.errors.length > 0) {
      return {
        ok: false,
        reason: "migration_failed",
        migrations,
        healthCheck: health,
        error: migrations.errors.join("; "),
      };
    }

    // Step 3: Optionally apply RLS policies
    const rls = await applyRlsPolicies();

    // Step 4: Seed payer data from JSON fixtures (Phase 102)
    let seeded: { inserted: number; skipped: number; errors: string[] } | undefined;
    try {
      seeded = await pgSeedFromJsonFixtures();
    } catch (seedErr) {
      // Non-fatal: seed failure should not prevent PG from being used
      const seedMsg = seedErr instanceof Error ? seedErr.message : String(seedErr);
      seeded = { inserted: 0, skipped: 0, errors: [seedMsg] };
    }

    initialized = true;
    return {
      ok: true,
      migrations,
      rls,
      seeded,
      healthCheck: health,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: "unexpected_error", error: msg };
  }
}

/** Reset initialized flag (for testing). */
export function resetPgInit(): void {
  initialized = false;
}
