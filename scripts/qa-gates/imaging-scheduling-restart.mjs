#!/usr/bin/env node
/**
 * Phase 128 -- Imaging + Scheduling Restart-Durability QA Gate
 *
 * Validates that 4 PG durable stores (imaging worklist, imaging ingest,
 * scheduling requests, scheduling booking locks) are properly wired:
 *   1. PG schema tables exist in pg-schema.ts
 *   2. PG migration DDL exists in pg-migrate.ts (v12)
 *   3. PG repo files exist with correct async exports
 *   4. Store files are async-safe (await Promise.resolve pattern)
 *   5. index.ts wires all PG init functions
 *   6. PG barrel exports present
 *   7. RLS tenant list includes all 4 tables
 *   8. Lock repo has TTL-based cleanup
 *
 * Exits 0 if all gates pass, 1 if any fail.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

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
  return readFileSync(abs, 'utf-8');
}

console.log('Phase 128 -- Imaging + Scheduling PG Restart-Durability Gate\n');

// -- 1. PG Schema tables -------------------------------------
console.log('PG Schema tables:');
const pgSchema = readSrc('apps/api/src/platform/pg/pg-schema.ts') ?? '';
gate('pgImagingWorkItem table in pg-schema', pgSchema.includes('pgTable("imaging_work_item"'));
gate(
  'pgImagingIngestEvent table in pg-schema',
  pgSchema.includes('pgTable("imaging_ingest_event"')
);
gate(
  'pgSchedulingWaitlistRequest table in pg-schema',
  pgSchema.includes('pgTable("scheduling_waitlist_request"')
);
gate(
  'pgSchedulingBookingLock table in pg-schema',
  pgSchema.includes('pgTable("scheduling_booking_lock"')
);

// -- 2. PG Migration DDL (v12) -------------------------------
console.log('\nPG Migration DDL (v12):');
const pgMigrate = readSrc('apps/api/src/platform/pg/pg-migrate.ts') ?? '';
gate(
  'imaging_work_item CREATE TABLE in pg-migrate',
  pgMigrate.includes('CREATE TABLE IF NOT EXISTS imaging_work_item')
);
gate(
  'imaging_ingest_event CREATE TABLE in pg-migrate',
  pgMigrate.includes('CREATE TABLE IF NOT EXISTS imaging_ingest_event')
);
gate(
  'scheduling_waitlist_request CREATE TABLE in pg-migrate',
  pgMigrate.includes('CREATE TABLE IF NOT EXISTS scheduling_waitlist_request')
);
gate(
  'scheduling_booking_lock CREATE TABLE in pg-migrate',
  pgMigrate.includes('CREATE TABLE IF NOT EXISTS scheduling_booking_lock')
);
gate('v12 migration label exists', pgMigrate.includes('imaging_scheduling_durability_pg'));

// -- 3. PG Repo files ----------------------------------------
console.log('\nPG Repo files:');

const pgIwRepo = readSrc('apps/api/src/platform/pg/repo/pg-imaging-worklist-repo.ts');
gate('pg-imaging-worklist-repo.ts exists', pgIwRepo !== null);
gate(
  'pg-imaging-worklist-repo exports insertWorkOrder',
  pgIwRepo?.includes('export async function insertWorkOrder') ?? false
);
gate(
  'pg-imaging-worklist-repo exports findWorkOrderById',
  pgIwRepo?.includes('export async function findWorkOrderById') ?? false
);
gate(
  'pg-imaging-worklist-repo exports findByAccessionNumber',
  pgIwRepo?.includes('export async function findByAccessionNumber') ?? false
);
gate(
  'pg-imaging-worklist-repo exports findByPatientDfn',
  pgIwRepo?.includes('export async function findByPatientDfn') ?? false
);
gate(
  'pg-imaging-worklist-repo exports updateWorkOrder',
  pgIwRepo?.includes('export async function updateWorkOrder') ?? false
);

const pgIiRepo = readSrc('apps/api/src/platform/pg/repo/pg-imaging-ingest-repo.ts');
gate('pg-imaging-ingest-repo.ts exists', pgIiRepo !== null);
gate(
  'pg-imaging-ingest-repo exports insertStudyLink',
  pgIiRepo?.includes('export async function insertStudyLink') ?? false
);
gate(
  'pg-imaging-ingest-repo exports insertUnmatched',
  pgIiRepo?.includes('export async function insertUnmatched') ?? false
);
gate(
  'pg-imaging-ingest-repo exports findLinkagesByPatient',
  pgIiRepo?.includes('export async function findLinkagesByPatient') ?? false
);
gate(
  'pg-imaging-ingest-repo exports findLinkageByStudyUid',
  pgIiRepo?.includes('export async function findLinkageByStudyUid') ?? false
);
gate(
  'pg-imaging-ingest-repo exports markResolved',
  pgIiRepo?.includes('export async function markResolved') ?? false
);

const pgSrRepo = readSrc('apps/api/src/platform/pg/repo/pg-scheduling-request-repo.ts');
gate('pg-scheduling-request-repo.ts exists', pgSrRepo !== null);
gate(
  'pg-scheduling-request-repo exports insertSchedulingRequest',
  pgSrRepo?.includes('export async function insertSchedulingRequest') ?? false
);
gate(
  'pg-scheduling-request-repo exports findSchedulingRequestById',
  pgSrRepo?.includes('export async function findSchedulingRequestById') ?? false
);
gate(
  'pg-scheduling-request-repo exports findAllActiveRequests',
  pgSrRepo?.includes('export async function findAllActiveRequests') ?? false
);
gate(
  'pg-scheduling-request-repo exports updateSchedulingRequest',
  pgSrRepo?.includes('export async function updateSchedulingRequest') ?? false
);

const pgSlRepo = readSrc('apps/api/src/platform/pg/repo/pg-scheduling-lock-repo.ts');
gate('pg-scheduling-lock-repo.ts exists', pgSlRepo !== null);
gate(
  'pg-scheduling-lock-repo exports acquireLock',
  pgSlRepo?.includes('export async function acquireLock') ?? false
);
gate(
  'pg-scheduling-lock-repo exports releaseLock',
  pgSlRepo?.includes('export async function releaseLock') ?? false
);
gate(
  'pg-scheduling-lock-repo exports cleanupExpiredLocks',
  pgSlRepo?.includes('export async function cleanupExpiredLocks') ?? false
);
gate('pg-scheduling-lock-repo has expires_at TTL logic', pgSlRepo?.includes('expires_at') ?? false);

// -- 4. Store files async-safe -------------------------------
console.log('\nStore async safety:');

const imgWl = readSrc('apps/api/src/services/imaging-worklist.ts') ?? '';
gate('imaging-worklist uses interface WorklistRepo', imgWl.includes('interface WorklistRepo'));
gate(
  'imaging-worklist getWorklistItem is async',
  imgWl.includes('async function getWorklistItem') ||
    imgWl.includes('export async function getWorklistItem')
);
gate(
  'imaging-worklist findByAccession is async',
  imgWl.includes('async function findByAccession') ||
    imgWl.includes('export async function findByAccession')
);
gate(
  'imaging-worklist findByPatientDfn is async',
  imgWl.includes('async function findByPatientDfn') ||
    imgWl.includes('export async function findByPatientDfn')
);
gate(
  'imaging-worklist getAllWorklistItems is async',
  imgWl.includes('export async function getAllWorklistItems')
);
gate(
  'imaging-worklist uses Promise.resolve for reads',
  imgWl.includes('await Promise.resolve(_repo')
);

const imgIng = readSrc('apps/api/src/services/imaging-ingest.ts') ?? '';
gate('imaging-ingest uses interface IngestRepo', imgIng.includes('interface IngestRepo'));
gate('imaging-ingest reconcileStudy is async', imgIng.includes('async function reconcileStudy'));
gate('imaging-ingest createLinkage is async', imgIng.includes('async function createLinkage'));
gate('imaging-ingest quarantineStudy is async', imgIng.includes('async function quarantineStudy'));
gate(
  'imaging-ingest getLinkagesForPatient is async',
  imgIng.includes('export async function getLinkagesForPatient')
);
gate(
  'imaging-ingest getAllUnmatched is async',
  imgIng.includes('export async function getAllUnmatched')
);
gate('imaging-ingest route uses await reconcileStudy', imgIng.includes('await reconcileStudy'));
gate('imaging-ingest route uses await getAllUnmatched', imgIng.includes('await getAllUnmatched'));

const schedAdapter = readSrc('apps/api/src/adapters/scheduling/vista-adapter.ts') ?? '';
gate(
  'vista-adapter initSchedulingRepo is async',
  schedAdapter.includes('export async function initSchedulingRepo')
);
gate(
  'vista-adapter has SchedulingLockRepo interface',
  schedAdapter.includes('export interface SchedulingLockRepo')
);
gate(
  'vista-adapter has initSchedulingLockRepo export',
  schedAdapter.includes('export function initSchedulingLockRepo')
);
gate(
  'vista-adapter persistEntry uses Promise.resolve',
  schedAdapter.includes('Promise.resolve') && schedAdapter.includes('persistEntry')
);
gate(
  'vista-adapter acquireBookingLock writes to PG',
  schedAdapter.includes('lockRepo.acquireLock')
);
gate(
  'vista-adapter releaseBookingLock writes to PG',
  schedAdapter.includes('lockRepo.releaseLock')
);
gate(
  'vista-adapter cleanup calls PG cleanupExpiredLocks',
  schedAdapter.includes('lockRepo.cleanupExpiredLocks')
);
gate(
  'vista-adapter getRequestStore is async',
  schedAdapter.includes('export async function getRequestStore')
);

// -- 5. index.ts wiring --------------------------------------
console.log('\nStartup wiring (Phase 128 PG block):');
const index = readSrc('apps/api/src/index.ts') ?? '';
const lifecycle = readSrc('apps/api/src/server/lifecycle.ts') ?? '';
const startup = index + '\n' + lifecycle;
gate('index.ts wires PG imaging worklist repo', startup.includes('pg-imaging-worklist-repo'));
gate('index.ts wires PG imaging ingest repo', startup.includes('pg-imaging-ingest-repo'));
gate('index.ts wires PG scheduling request repo', startup.includes('pg-scheduling-request-repo'));
gate('index.ts wires PG scheduling lock repo', startup.includes('pg-scheduling-lock-repo'));
gate('index.ts wires initSchedulingLockRepo', startup.includes('initSchedulingLockRepo'));
gate(
  'index.ts awaits initSchedulingRepo (async)',
  startup.includes('await initSchedPgRepo') || startup.includes('await initSchedulingRepo')
);

// -- 6. PG barrel exports ------------------------------------
console.log('\nPG Barrel exports:');
const pgBarrel = readSrc('apps/api/src/platform/pg/repo/index.ts') ?? '';
gate('PG barrel exports pgImagingWorklistRepo', pgBarrel.includes('pgImagingWorklistRepo'));
gate('PG barrel exports pgImagingIngestRepo', pgBarrel.includes('pgImagingIngestRepo'));
gate('PG barrel exports pgSchedulingRequestRepo', pgBarrel.includes('pgSchedulingRequestRepo'));
gate('PG barrel exports pgSchedulingLockRepo', pgBarrel.includes('pgSchedulingLockRepo'));

// -- 7. RLS tenant list --------------------------------------
console.log('\nRLS tenant list:');
gate('imaging_work_item in RLS tenant list', pgMigrate.includes('"imaging_work_item"'));
gate('imaging_ingest_event in RLS tenant list', pgMigrate.includes('"imaging_ingest_event"'));
gate(
  'scheduling_waitlist_request in RLS tenant list',
  pgMigrate.includes('"scheduling_waitlist_request"')
);
gate('scheduling_booking_lock in RLS tenant list', pgMigrate.includes('"scheduling_booking_lock"'));

// -- 8. Lock TTL ---------------------------------------------
console.log('\nLock TTL semantics:');
gate(
  'pg-scheduling-lock-repo deletes expired before acquire',
  (pgSlRepo?.includes('delete') || pgSlRepo?.includes('DELETE')) && pgSlRepo?.includes('expires_at')
    ? true
    : false
);
gate(
  'pg-scheduling-lock-repo unique constraint on lock_key',
  pgSlRepo?.includes('23505') || pgSlRepo?.includes('unique') ? true : false
);
gate('vista-adapter LOCK_TTL_MS defined', schedAdapter.includes('LOCK_TTL_MS'));

// -- 9. Phase 128 VERIFY fixes -------------------------------
console.log('\nPhase 128 VERIFY fixes:');
gate(
  'rowToLinkage falls back to createdAt for linkedAt',
  imgIng.includes('row.linkedAt ?? row.createdAt')
);
gate(
  'rowToUnmatched falls back to createdAt for quarantinedAt',
  imgIng.includes('row.quarantinedAt ?? row.createdAt')
);
gate(
  'rowToUnmatched falls back to patientDfn for dicomPatientId',
  imgIng.includes('row.dicomPatientId ?? row.patientDfn')
);
gate('PG schema has dicomPatientName column', pgSchema.includes('dicom_patient_name'));
gate(
  'v13 migration adds dicom_patient_name (ALTER TABLE)',
  pgMigrate.includes('dicom_patient_name') && pgMigrate.includes('ALTER TABLE')
);
gate(
  'initWorklistRepo rehydrates from DB on startup',
  imgWl.includes('rehydrat') && imgWl.includes('findAllWorkOrders')
);
gate(
  'initIngestRepo rehydrates from DB on startup',
  imgIng.includes('rehydrat') && imgIng.includes('findAllStudyLinks')
);
gate('initWorklistRepo is async', imgWl.includes('async function initWorklistRepo'));
gate('initIngestRepo is async', imgIng.includes('async function initIngestRepo'));
gate('index.ts awaits initWorklistRepo', startup.includes('await initWorklistRepo'));
gate('index.ts awaits initIngestRepo', startup.includes('await initIngestRepo'));
gate(
  'Lock tenant scoping in releaseLock',
  pgSlRepo?.includes('tenantId') && pgSlRepo?.includes('releaseLock') ? true : false
);

// -- Summary -------------------------------------------------
console.log(`\n${'='.repeat(50)}`);
console.log(`Phase 128 Imaging+Scheduling Restart Gate: ${pass} PASS / ${fail} FAIL`);

setTimeout(() => process.exit(fail === 0 ? 0 : 1), 50);
