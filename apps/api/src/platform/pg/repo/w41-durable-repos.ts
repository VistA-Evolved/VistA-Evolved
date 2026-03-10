/**
 * Wave 41: Durable Ops Store Repos
 *
 * PG repos for stores upgraded from in-memory to PG-backed:
 *   - clinical_command / clinical_command_attempt / clinical_command_result (v30)
 *   - event_bus_outbox / event_bus_dlq / event_bus_delivery_log (v44)
 *   - scheduling_writeback_entry (v58)
 *   - hl7_dead_letter (v58)
 *   - dsar_request (v58)
 *   - bulk_export_job (v58)
 */

import { createPgRepo, type GenericPgRepo } from './generic-pg-repo.js';

/* -- W41-P1: Clinical Writeback Command Bus ------------- */
export function createClinicalCommandRepo(): GenericPgRepo<any> {
  return createPgRepo('clinical_command');
}
/**
 * WARNING: clinical_command_attempt PK is `id SERIAL` -- insert() works but
 * callers must NOT pass an `id` field (let PG auto-assign).
 */
export function createClinicalCommandAttemptRepo(): GenericPgRepo<any> {
  return createPgRepo('clinical_command_attempt');
}
/**
 * WARNING: clinical_command_result PK is `command_id`, NOT `id`.
 * GenericPgRepo.upsert() and findById() are BROKEN for this table because
 * they hardcode ON CONFLICT (id) / WHERE id = $1. Use .query() with raw
 * SQL for upserts and lookups on this repo. See persistResult() in
 * command-store.ts for the correct pattern.
 */
export function createClinicalCommandResultRepo(): GenericPgRepo<any> {
  return createPgRepo('clinical_command_result');
}

/* -- W41-P3: Event Bus Outbox --------------------------- */
export function createEventBusOutboxRepo(): GenericPgRepo<any> {
  return createPgRepo('event_bus_outbox');
}
export function createEventBusDlqRepo(): GenericPgRepo<any> {
  return createPgRepo('event_bus_dlq');
}
export function createEventBusDeliveryLogRepo(): GenericPgRepo<any> {
  return createPgRepo('event_bus_delivery_log');
}

/* -- W41-P4: Scheduling Writeback ----------------------- */
export function createSchedulingWritebackRepo(): GenericPgRepo<any> {
  return createPgRepo('scheduling_writeback_entry');
}

/* -- W41-P5: HL7 Dead-Letter + Raw Vault ---------------- */
export function createHl7DeadLetterRepo(): GenericPgRepo<any> {
  return createPgRepo('hl7_dead_letter');
}

/* -- W41-P6: DSAR + Bulk Export ------------------------- */
export function createDsarRequestRepo(): GenericPgRepo<any> {
  return createPgRepo('dsar_request');
}
export function createBulkExportJobRepo(): GenericPgRepo<any> {
  return createPgRepo('bulk_export_job');
}
