#!/usr/bin/env node
/**
 * Phase 114 -- Restart-Durability QA Gate
 *
 * Validates that the 3 durable stores (sessions, workqueues, capability audit)
 * are properly wired to the DB by checking:
 *   1. Schema tables exist in schema.ts
 *   2. Migration DDL exists in migrate.ts
 *   3. Repo files exist with correct exports
 *   4. Store files delegate to repos (no raw Map-as-primary)
 *   5. index.ts wires initSessionRepo, initWorkqueueRepo, initCapabilityAudit
 *
 * Exits 0 if all gates pass, 1 if any fail.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

let pass = 0;
let fail = 0;

function gate(name, ok) {
  if (ok) {
    console.log(`  PASS  ${name}`);
    pass++;
  } else {
    console.error(`  FAIL  ${name}`);
    fail++;
  }
}

function readSrc(rel) {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, "utf-8");
}

console.log("Phase 114 -- Restart-Durability Gate\n");

// ── 1. Schema tables ────────────────────────────────────────
console.log("Schema tables:");
const schema = readSrc("apps/api/src/platform/db/schema.ts") ?? "";
gate("auth_session table in schema", schema.includes('sqliteTable("auth_session"'));
gate("rcm_work_item table in schema", schema.includes('sqliteTable("rcm_work_item"'));
gate("rcm_work_item_event table in schema", schema.includes('sqliteTable("rcm_work_item_event"'));

// ── 2. Migration DDL ────────────────────────────────────────
console.log("\nMigration DDL:");
const migrate = readSrc("apps/api/src/platform/db/migrate.ts") ?? "";
gate("CREATE TABLE auth_session in migrate", migrate.includes("CREATE TABLE IF NOT EXISTS auth_session"));
gate("CREATE TABLE rcm_work_item in migrate", migrate.includes("CREATE TABLE IF NOT EXISTS rcm_work_item"));
gate("CREATE TABLE rcm_work_item_event in migrate", migrate.includes("CREATE TABLE IF NOT EXISTS rcm_work_item_event"));

// ── 3. Repo files ───────────────────────────────────────────
console.log("\nRepo files:");
const sessionRepo = readSrc("apps/api/src/platform/db/repo/session-repo.ts");
gate("session-repo.ts exists", sessionRepo !== null);
gate("session-repo exports createAuthSession", sessionRepo?.includes("export function createAuthSession") ?? false);
gate("session-repo exports findSessionByTokenHash", sessionRepo?.includes("export function findSessionByTokenHash") ?? false);

const wqRepo = readSrc("apps/api/src/platform/db/repo/workqueue-repo.ts");
gate("workqueue-repo.ts exists", wqRepo !== null);
gate("workqueue-repo exports createWorkItem", wqRepo?.includes("export function createWorkItem") ?? false);
gate("workqueue-repo exports listWorkItems", wqRepo?.includes("export function listWorkItems") ?? false);

// ── 4. Store files delegate to repo ─────────────────────────
console.log("\nStore delegation:");
const sessionStore = readSrc("apps/api/src/auth/session-store.ts") ?? "";
gate("session-store uses hashToken", sessionStore.includes("hashToken"));
gate("session-store has initSessionRepo", sessionStore.includes("export function initSessionRepo"));
gate("session-store does NOT use raw Map as primary",
  !sessionStore.includes('const sessions = new Map<string, SessionData>()'));

const wqStore = readSrc("apps/api/src/rcm/workqueues/workqueue-store.ts") ?? "";
gate("workqueue-store has initWorkqueueRepo", wqStore.includes("export function initWorkqueueRepo"));
gate("workqueue-store does NOT use raw Map as primary",
  !wqStore.includes('const items = new Map<string, WorkqueueItem>()'));

const capMatrix = readSrc("apps/api/src/rcm/payerOps/capability-matrix.ts") ?? "";
gate("capability-matrix has initCapabilityAudit", capMatrix.includes("export function initCapabilityAudit"));
gate("capability-matrix calls auditMutation", capMatrix.includes("auditMutation("));

// ── 5. index.ts wiring ──────────────────────────────────────
console.log("\nStartup wiring:");
const index = readSrc("apps/api/src/index.ts") ?? "";
gate("index.ts wires initSessionRepo", index.includes("initSessionRepo"));
gate("index.ts wires initWorkqueueRepo", index.includes("initWorkqueueRepo"));
gate("index.ts wires initCapabilityAudit", index.includes("initCapabilityAudit"));

// ── 6. Barrel exports ───────────────────────────────────────
console.log("\nBarrel exports:");
const barrel = readSrc("apps/api/src/platform/db/repo/index.ts") ?? "";
gate("barrel exports sessionRepo", barrel.includes('sessionRepo'));
gate("barrel exports workqueueRepo", barrel.includes('workqueueRepo'));

// ── 7. Store policy doc ─────────────────────────────────────
console.log("\nStore policy:");
gate("store-policy.md exists", existsSync(resolve(ROOT, "docs/architecture/store-policy.md")));

// ── Summary ─────────────────────────────────────────────────
console.log(`\n${"=".repeat(50)}`);
console.log(`Restart-Durability Gate: ${pass} PASS / ${fail} FAIL`);

setTimeout(() => process.exit(fail === 0 ? 0 : 1), 50);
