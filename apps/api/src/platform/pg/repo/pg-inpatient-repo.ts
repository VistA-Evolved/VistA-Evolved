/**
 * PG Inpatient Repository -- Async durable bed, ADT, flowsheet, vitals state
 *
 * Phase 577: Inpatient Durability (Map stores -> Postgres write-through)
 *
 * Uses GenericPgRepo for uniform CRUD over 4 tables:
 *   inpatient_bed_assignment, inpatient_adt_event,
 *   inpatient_flowsheet_row, inpatient_vitals_entry
 */

import { createPgRepo, type GenericPgRepo } from './generic-pg-repo.js';

/* -- Bed Assignment ----------------------------------------- */

export function createBedAssignmentRepo(): GenericPgRepo<any> {
  return createPgRepo('inpatient_bed_assignment');
}

/* -- ADT Event ---------------------------------------------- */

export function createAdtEventRepo(): GenericPgRepo<any> {
  return createPgRepo('inpatient_adt_event');
}

/* -- Flowsheet Row ------------------------------------------ */

export function createFlowsheetRowRepo(): GenericPgRepo<any> {
  return createPgRepo('inpatient_flowsheet_row');
}

/* -- Vitals Entry ------------------------------------------- */

export function createVitalsEntryRepo(): GenericPgRepo<any> {
  return createPgRepo('inpatient_vitals_entry');
}
