#!/usr/bin/env node
/**
 * G13 -- Imaging + Scheduling Restart Gate (Phase 128)
 *
 * Wraps scripts/qa-gates/imaging-scheduling-restart.mjs for the gauntlet.
 * Validates that PG repos, async-safe stores, migration v12, and
 * index.ts wiring are all in place for imaging worklist, imaging ingest,
 * scheduling requests, and scheduling booking locks.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const API = resolve(ROOT, 'apps/api/src');

export const id = 'G13_imaging_scheduling_restart';
export const name = 'Imaging+Scheduling PG Durability';

function rd(rel) {
  const p = resolve(ROOT, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

export async function run(opts = {}) {
  const start = Date.now();
  const details = [];
  let status = 'pass';
  let p = 0;
  let f = 0;

  function check(label, ok) {
    if (ok) {
      p++;
    } else {
      f++;
      details.push(`FAIL: ${label}`);
      status = 'fail';
    }
  }

  // ── PG Schema ──
  const pgSchema = rd('apps/api/src/platform/pg/pg-schema.ts') ?? '';
  check('pgImagingWorkItem in schema', pgSchema.includes('pgTable("imaging_work_item"'));
  check('pgImagingIngestEvent in schema', pgSchema.includes('pgTable("imaging_ingest_event"'));
  check(
    'pgSchedulingWaitlistRequest in schema',
    pgSchema.includes('pgTable("scheduling_waitlist_request"')
  );
  check(
    'pgSchedulingBookingLock in schema',
    pgSchema.includes('pgTable("scheduling_booking_lock"')
  );

  // ── PG Migration v12 ──
  const pgMigrate = rd('apps/api/src/platform/pg/pg-migrate.ts') ?? '';
  check('v12 label in pg-migrate', pgMigrate.includes('imaging_scheduling_durability_pg'));
  check(
    'imaging_work_item DDL',
    pgMigrate.includes('CREATE TABLE IF NOT EXISTS imaging_work_item')
  );
  check(
    'imaging_ingest_event DDL',
    pgMigrate.includes('CREATE TABLE IF NOT EXISTS imaging_ingest_event')
  );
  check(
    'scheduling_waitlist_request DDL',
    pgMigrate.includes('CREATE TABLE IF NOT EXISTS scheduling_waitlist_request')
  );
  check(
    'scheduling_booking_lock DDL',
    pgMigrate.includes('CREATE TABLE IF NOT EXISTS scheduling_booking_lock')
  );

  // ── PG Repo files ──
  const repos = [
    ['pg-imaging-worklist-repo.ts', 'insertWorkOrder'],
    ['pg-imaging-ingest-repo.ts', 'insertStudyLink'],
    ['pg-scheduling-request-repo.ts', 'insertSchedulingRequest'],
    ['pg-scheduling-lock-repo.ts', 'acquireLock'],
  ];
  for (const [file, fn] of repos) {
    const src = rd(`apps/api/src/platform/pg/repo/${file}`);
    check(`${file} exists`, src !== null);
    check(`${file} exports ${fn}`, src?.includes(`export async function ${fn}`) ?? false);
  }

  // ── Store async safety ──
  const imgWl = rd('apps/api/src/services/imaging-worklist.ts') ?? '';
  check('imaging-worklist uses interface WorklistRepo', imgWl.includes('interface WorklistRepo'));
  check('imaging-worklist async reads', imgWl.includes('await Promise.resolve(_repo'));

  const imgIng = rd('apps/api/src/services/imaging-ingest.ts') ?? '';
  check('imaging-ingest interface IngestRepo', imgIng.includes('interface IngestRepo'));
  check('imaging-ingest reconcileStudy async', imgIng.includes('async function reconcileStudy'));
  check('imaging-ingest await reconcileStudy', imgIng.includes('await reconcileStudy'));

  const sched = rd('apps/api/src/adapters/scheduling/vista-adapter.ts') ?? '';
  check(
    'vista-adapter initSchedulingRepo async',
    sched.includes('export async function initSchedulingRepo')
  );
  check(
    'vista-adapter SchedulingLockRepo iface',
    sched.includes('export interface SchedulingLockRepo')
  );
  check(
    'vista-adapter initSchedulingLockRepo',
    sched.includes('export function initSchedulingLockRepo')
  );
  check(
    'vista-adapter getRequestStore async',
    sched.includes('export async function getRequestStore')
  );

  // ── index.ts wiring ──
  const index = rd('apps/api/src/index.ts') ?? '';
  check('index wires pg-imaging-worklist-repo', index.includes('pg-imaging-worklist-repo'));
  check('index wires pg-imaging-ingest-repo', index.includes('pg-imaging-ingest-repo'));
  check('index wires pg-scheduling-request-repo', index.includes('pg-scheduling-request-repo'));
  check('index wires pg-scheduling-lock-repo', index.includes('pg-scheduling-lock-repo'));
  check('index wires initSchedulingLockRepo', index.includes('initSchedulingLockRepo'));

  // ── PG barrel ──
  const barrel = rd('apps/api/src/platform/pg/repo/index.ts') ?? '';
  check('barrel pgImagingWorklistRepo', barrel.includes('pgImagingWorklistRepo'));
  check('barrel pgImagingIngestRepo', barrel.includes('pgImagingIngestRepo'));
  check('barrel pgSchedulingRequestRepo', barrel.includes('pgSchedulingRequestRepo'));
  check('barrel pgSchedulingLockRepo', barrel.includes('pgSchedulingLockRepo'));

  // ── RLS ──
  check('imaging_work_item in RLS', pgMigrate.includes('"imaging_work_item"'));
  check('imaging_ingest_event in RLS', pgMigrate.includes('"imaging_ingest_event"'));
  check('scheduling_waitlist_request in RLS', pgMigrate.includes('"scheduling_waitlist_request"'));
  check('scheduling_booking_lock in RLS', pgMigrate.includes('"scheduling_booking_lock"'));

  // ── Lock TTL ──
  const lockRepo = rd('apps/api/src/platform/pg/repo/pg-scheduling-lock-repo.ts') ?? '';
  check('lock repo expires_at TTL', lockRepo.includes('expires_at'));
  check('lock repo unique violation handling', lockRepo.includes('23505'));

  if (f > 0) {
    details.unshift(`${p} pass / ${f} fail`);
  } else {
    details.push(`All ${p} checks passed`);
  }

  return { id, name, status, details, durationMs: Date.now() - start };
}
