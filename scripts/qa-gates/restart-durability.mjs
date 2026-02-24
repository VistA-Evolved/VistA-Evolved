#!/usr/bin/env node
/**
 * Phase 114+115 -- Restart-Durability QA Gate
 *
 * Validates that the 9 durable stores (sessions, workqueues, capability audit,
 * portal messaging, portal appointments, telehealth rooms, imaging worklist,
 * imaging ingest, idempotency) are properly wired to the DB by checking:
 *   1. Schema tables exist in schema.ts
 *   2. Migration DDL exists in migrate.ts
 *   3. Repo files exist with correct exports
 *   4. Store files delegate to repos (no raw Map-as-primary)
 *   5. index.ts wires all init functions
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

console.log("Phase 114+115 -- Restart-Durability Gate\n");

// ── 1. Schema tables ────────────────────────────────────────
console.log("Schema tables (Phase 114):");
const schema = readSrc("apps/api/src/platform/db/schema.ts") ?? "";
gate("auth_session table in schema", schema.includes('sqliteTable("auth_session"'));
gate("rcm_work_item table in schema", schema.includes('sqliteTable("rcm_work_item"'));
gate("rcm_work_item_event table in schema", schema.includes('sqliteTable("rcm_work_item_event"'));

console.log("\nSchema tables (Phase 115):");
gate("portal_message table in schema", schema.includes('sqliteTable("portal_message"'));
gate("portal_appointment table in schema", schema.includes('sqliteTable("portal_appointment"'));
gate("telehealth_room table in schema", schema.includes('sqliteTable("telehealth_room"'));
gate("imaging_work_order table in schema", schema.includes('sqliteTable("imaging_work_order"'));
gate("imaging_study_link table in schema", schema.includes('sqliteTable("imaging_study_link"'));
gate("imaging_unmatched table in schema", schema.includes('sqliteTable("imaging_unmatched"'));
gate("idempotency_key table in schema", schema.includes('sqliteTable("idempotency_key"'));

// ── 2. Migration DDL ────────────────────────────────────────
console.log("\nMigration DDL (Phase 114):");
const migrate = readSrc("apps/api/src/platform/db/migrate.ts") ?? "";
gate("CREATE TABLE auth_session in migrate", migrate.includes("CREATE TABLE IF NOT EXISTS auth_session"));
gate("CREATE TABLE rcm_work_item in migrate", migrate.includes("CREATE TABLE IF NOT EXISTS rcm_work_item"));
gate("CREATE TABLE rcm_work_item_event in migrate", migrate.includes("CREATE TABLE IF NOT EXISTS rcm_work_item_event"));

console.log("\nMigration DDL (Phase 115):");
gate("CREATE TABLE portal_message in migrate", migrate.includes("CREATE TABLE IF NOT EXISTS portal_message"));
gate("CREATE TABLE portal_appointment in migrate", migrate.includes("CREATE TABLE IF NOT EXISTS portal_appointment"));
gate("CREATE TABLE telehealth_room in migrate", migrate.includes("CREATE TABLE IF NOT EXISTS telehealth_room"));
gate("CREATE TABLE imaging_work_order in migrate", migrate.includes("CREATE TABLE IF NOT EXISTS imaging_work_order"));
gate("CREATE TABLE imaging_study_link in migrate", migrate.includes("CREATE TABLE IF NOT EXISTS imaging_study_link"));
gate("CREATE TABLE imaging_unmatched in migrate", migrate.includes("CREATE TABLE IF NOT EXISTS imaging_unmatched"));
gate("CREATE TABLE idempotency_key in migrate", migrate.includes("CREATE TABLE IF NOT EXISTS idempotency_key"));

// ── 3. Repo files ───────────────────────────────────────────
console.log("\nRepo files (Phase 114):");
const sessionRepo = readSrc("apps/api/src/platform/db/repo/session-repo.ts");
gate("session-repo.ts exists", sessionRepo !== null);
gate("session-repo exports createAuthSession", sessionRepo?.includes("export function createAuthSession") ?? false);
gate("session-repo exports findSessionByTokenHash", sessionRepo?.includes("export function findSessionByTokenHash") ?? false);

const wqRepo = readSrc("apps/api/src/platform/db/repo/workqueue-repo.ts");
gate("workqueue-repo.ts exists", wqRepo !== null);
gate("workqueue-repo exports createWorkItem", wqRepo?.includes("export function createWorkItem") ?? false);
gate("workqueue-repo exports listWorkItems", wqRepo?.includes("export function listWorkItems") ?? false);

console.log("\nRepo files (Phase 115):");
const pmRepo = readSrc("apps/api/src/platform/db/repo/portal-message-repo.ts");
gate("portal-message-repo.ts exists", pmRepo !== null);
gate("portal-message-repo exports insertMessage", pmRepo?.includes("export function insertMessage") ?? false);

const paRepo = readSrc("apps/api/src/platform/db/repo/portal-appointment-repo.ts");
gate("portal-appointment-repo.ts exists", paRepo !== null);
gate("portal-appointment-repo exports insertAppointment", paRepo?.includes("export function insertAppointment") ?? false);

const trRepo = readSrc("apps/api/src/platform/db/repo/telehealth-room-repo.ts");
gate("telehealth-room-repo.ts exists", trRepo !== null);
gate("telehealth-room-repo exports insertRoom", trRepo?.includes("export function insertRoom") ?? false);

const iwRepo = readSrc("apps/api/src/platform/db/repo/imaging-worklist-repo.ts");
gate("imaging-worklist-repo.ts exists", iwRepo !== null);
gate("imaging-worklist-repo exports insertWorkOrder", iwRepo?.includes("export function insertWorkOrder") ?? false);

const iiRepo = readSrc("apps/api/src/platform/db/repo/imaging-ingest-repo.ts");
gate("imaging-ingest-repo.ts exists", iiRepo !== null);
gate("imaging-ingest-repo exports insertStudyLink", iiRepo?.includes("export function insertStudyLink") ?? false);
gate("imaging-ingest-repo exports insertUnmatched", iiRepo?.includes("export function insertUnmatched") ?? false);

const idRepo = readSrc("apps/api/src/platform/db/repo/idempotency-repo.ts");
gate("idempotency-repo.ts exists", idRepo !== null);
gate("idempotency-repo exports upsertKey", idRepo?.includes("export function upsertKey") ?? false);

// ── 4. Store files delegate to repo ─────────────────────────
console.log("\nStore delegation (Phase 114):");
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

console.log("\nStore delegation (Phase 115):");
const portalMsg = readSrc("apps/api/src/services/portal-messaging.ts") ?? "";
gate("portal-messaging has initMessageRepo", portalMsg.includes("export function initMessageRepo"));
gate("portal-messaging uses messageCache", portalMsg.includes("messageCache"));
gate("portal-messaging no raw messageStore", !portalMsg.includes("messageStore = new Map"));

const portalAppt = readSrc("apps/api/src/services/portal-appointments.ts") ?? "";
gate("portal-appointments has initAppointmentRepo", portalAppt.includes("export function initAppointmentRepo"));
gate("portal-appointments uses appointmentCache", portalAppt.includes("appointmentCache"));
gate("portal-appointments no raw appointmentStore", !portalAppt.includes("appointmentStore = new Map"));

const roomStore = readSrc("apps/api/src/telehealth/room-store.ts") ?? "";
gate("room-store has initTelehealthRoomRepo", roomStore.includes("export function initTelehealthRoomRepo"));
gate("room-store has _repo wiring", roomStore.includes("let _repo:"));

const imgWl = readSrc("apps/api/src/services/imaging-worklist.ts") ?? "";
gate("imaging-worklist has initWorklistRepo", imgWl.includes("export function initWorklistRepo"));
gate("imaging-worklist uses worklistCache", imgWl.includes("worklistCache"));
gate("imaging-worklist no raw worklistStore", !imgWl.includes("worklistStore = new Map"));

const imgIng = readSrc("apps/api/src/services/imaging-ingest.ts") ?? "";
gate("imaging-ingest has initIngestRepo", imgIng.includes("export function initIngestRepo"));
gate("imaging-ingest uses linkageCache", imgIng.includes("linkageCache"));
gate("imaging-ingest no raw linkageStore", !imgIng.includes("linkageStore = new Map"));

const idemp = readSrc("apps/api/src/middleware/idempotency.ts") ?? "";
gate("idempotency has initIdempotencyRepo", idemp.includes("export function initIdempotencyRepo"));
gate("idempotency has _repo wiring", idemp.includes("let _repo:"));

// ── 5. index.ts wiring ──────────────────────────────────────
console.log("\nStartup wiring (Phase 114):");
const index = readSrc("apps/api/src/index.ts") ?? "";
gate("index.ts wires initSessionRepo", index.includes("initSessionRepo"));
gate("index.ts wires initWorkqueueRepo", index.includes("initWorkqueueRepo"));
gate("index.ts wires initCapabilityAudit", index.includes("initCapabilityAudit"));

console.log("\nStartup wiring (Phase 115):");
gate("index.ts wires initMessageRepo", index.includes("initMessageRepo"));
gate("index.ts wires initAppointmentRepo", index.includes("initAppointmentRepo"));
gate("index.ts wires initTelehealthRoomRepo", index.includes("initTelehealthRoomRepo"));
gate("index.ts wires initWorklistRepo", index.includes("initWorklistRepo"));
gate("index.ts wires initIngestRepo", index.includes("initIngestRepo"));
gate("index.ts wires initIdempotencyRepo", index.includes("initIdempotencyRepo"));

// ── 6. Barrel exports ───────────────────────────────────────
console.log("\nBarrel exports:");
const barrel = readSrc("apps/api/src/platform/db/repo/index.ts") ?? "";
gate("barrel exports sessionRepo", barrel.includes('sessionRepo'));
gate("barrel exports workqueueRepo", barrel.includes('workqueueRepo'));
gate("barrel exports portalMessageRepo", barrel.includes('portalMessageRepo'));
gate("barrel exports portalAppointmentRepo", barrel.includes('portalAppointmentRepo'));
gate("barrel exports telehealthRoomRepo", barrel.includes('telehealthRoomRepo'));
gate("barrel exports imagingWorklistRepo", barrel.includes('imagingWorklistRepo'));
gate("barrel exports imagingIngestRepo", barrel.includes('imagingIngestRepo'));
gate("barrel exports idempotencyRepo", barrel.includes('idempotencyRepo'));

// ── 7. Store policy doc ─────────────────────────────────────
console.log("\nStore policy:");
gate("store-policy.md exists", existsSync(resolve(ROOT, "docs/architecture/store-policy.md")));

// ── Summary ─────────────────────────────────────────────────
console.log(`\n${"=".repeat(50)}`);
console.log(`Restart-Durability Gate: ${pass} PASS / ${fail} FAIL`);

setTimeout(() => process.exit(fail === 0 ? 0 : 1), 50);
