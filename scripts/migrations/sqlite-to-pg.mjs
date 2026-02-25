#!/usr/bin/env node
/**
 * SQLite-to-PostgreSQL Migration Script
 * Phase 125: Postgres-Only Production Data Plane
 *
 * One-shot transfer of all data from the SQLite platform.db to Postgres.
 * Idempotent: skips rows that already exist in PG (by primary key).
 *
 * Usage:
 *   node scripts/migrations/sqlite-to-pg.mjs [--dry-run] [--table TABLE_NAME]
 *
 * Prerequisites:
 *   - SQLite DB at data/platform.db (created by API startup)
 *   - PLATFORM_PG_URL env var set
 *   - PG migrations already applied (API startup or manual)
 *
 * Tables migrated (all SQLite platform tables):
 *   payer, tenant_payer, payer_capability, payer_task,
 *   payer_evidence_snapshot, payer_audit_event, denial_case,
 *   denial_action, denial_attachment, resubmission_attempt,
 *   remittance_import, payment_record, reconciliation_match,
 *   underpayment_case, eligibility_check, claim_status_check,
 *   module_catalog, tenant_module, tenant_feature_flag,
 *   module_audit_log, auth_session, rcm_work_item,
 *   rcm_work_item_event, portal_message, portal_appointment,
 *   telehealth_room, imaging_work_order, imaging_study_link,
 *   imaging_unmatched, credential_artifact, credential_document,
 *   accreditation_status, accreditation_task, loa_request,
 *   loa_attachment, claim_draft, scrub_rule, scrub_result,
 *   claim_lifecycle_event, integration_evidence, idempotency_key,
 *   capability_matrix_cell, capability_matrix_evidence
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const SQLITE_PATH = join(ROOT, "data", "platform.db");

const isDryRun = process.argv.includes("--dry-run");
const tableFilter = process.argv.includes("--table")
  ? process.argv[process.argv.indexOf("--table") + 1]
  : null;

// ─── Preflight ───────────────────────────────────────────────
if (!existsSync(SQLITE_PATH)) {
  console.error(`[FATAL] SQLite DB not found at ${SQLITE_PATH}`);
  console.error("Start the API once in dev mode to create it.");
  process.exit(1);
}

const pgUrl = process.env.PLATFORM_PG_URL;
if (!pgUrl) {
  console.error("[FATAL] PLATFORM_PG_URL is not set.");
  console.error("Set it to your Postgres connection string.");
  process.exit(1);
}

// ─── Dynamic imports ─────────────────────────────────────────
let Database;
try {
  Database = (await import("better-sqlite3")).default;
} catch {
  console.error("[FATAL] better-sqlite3 not installed. Run: pnpm add better-sqlite3");
  process.exit(1);
}

let pg;
try {
  pg = (await import("pg")).default;
} catch {
  console.error("[FATAL] pg not installed. Run: pnpm add pg");
  process.exit(1);
}

// ─── Connect ─────────────────────────────────────────────────
const sqlite = new Database(SQLITE_PATH, { readonly: true });
const pool = new pg.Pool({ connectionString: pgUrl });

// ─── Discover tables ─────────────────────────────────────────
const allTables = sqlite
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_migrations%' ORDER BY name")
  .all()
  .map(r => r.name);

const tables = tableFilter ? allTables.filter(t => t === tableFilter) : allTables;

if (tables.length === 0) {
  console.error(tableFilter ? `Table "${tableFilter}" not found in SQLite.` : "No tables found in SQLite.");
  process.exit(1);
}

console.log(`\n=== SQLite -> PostgreSQL Migration (Phase 125) ===`);
console.log(`Mode: ${isDryRun ? "DRY RUN" : "LIVE"}`);
console.log(`SQLite: ${SQLITE_PATH}`);
console.log(`PG: ${pgUrl.replace(/:[^@]+@/, ":***@")}`);
console.log(`Tables: ${tables.length}\n`);

// ─── Migrate each table ─────────────────────────────────────
let totalRows = 0;
let totalInserted = 0;
let totalSkipped = 0;
let totalErrors = 0;

for (const table of tables) {
  const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all();
  if (rows.length === 0) {
    console.log(`  [SKIP] ${table}: 0 rows`);
    continue;
  }

  const columns = Object.keys(rows[0]);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const colList = columns.map(c => `"${c}"`).join(", ");
  const insertSql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  if (isDryRun) {
    console.log(`  [DRY] ${table}: ${rows.length} rows would be migrated`);
    totalRows += rows.length;
    continue;
  }

  for (const row of rows) {
    const values = columns.map(c => {
      const v = row[c];
      // SQLite stores JSON as TEXT; PG expects it as-is for JSONB columns
      // We pass strings through -- PG will cast them appropriately
      return v;
    });

    try {
      const result = await pool.query(insertSql, values);
      if (result.rowCount > 0) {
        inserted++;
      } else {
        skipped++;
      }
    } catch (err) {
      // Log first 3 errors per table, then suppress
      if (errors < 3) {
        console.error(`    [ERR] ${table}: ${err.message.slice(0, 120)}`);
      }
      errors++;
    }
  }

  totalRows += rows.length;
  totalInserted += inserted;
  totalSkipped += skipped;
  totalErrors += errors;

  const status = errors > 0 ? "WARN" : "OK";
  console.log(`  [${status}] ${table}: ${rows.length} rows -> ${inserted} inserted, ${skipped} skipped, ${errors} errors`);
}

// ─── Summary ─────────────────────────────────────────────────
console.log(`\n=== Summary ===`);
console.log(`Total rows:     ${totalRows}`);
if (!isDryRun) {
  console.log(`Inserted:       ${totalInserted}`);
  console.log(`Skipped (dupe): ${totalSkipped}`);
  console.log(`Errors:         ${totalErrors}`);
}
console.log(`Result: ${totalErrors === 0 ? "SUCCESS" : "COMPLETED WITH ERRORS"}\n`);

// ─── Cleanup ─────────────────────────────────────────────────
sqlite.close();
await pool.end();

process.exit(totalErrors > 0 ? 1 : 0);
