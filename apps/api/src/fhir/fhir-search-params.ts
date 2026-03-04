/**
 * FHIR Search Parameter Helpers -- Phase 233 (Wave 5 Q233).
 *
 * Provides post-filter functions for FHIR search parameters that
 * the adapter layer doesn't natively support. Adapter returns all
 * records for a patient; these functions filter in-memory.
 *
 * New search params added:
 *   Patient:            identifier, _id, name, _count (existing)
 *   Encounter:          patient, date, status, _count
 *   Observation:        patient, category (existing), code, date, _count
 *   MedicationRequest:  patient, status, _count
 *   Condition:          patient, clinical-status, _count
 *   AllergyIntolerance: patient, clinical-status, _count
 *   DocumentReference:  patient, date, _count
 */

import type { FhirResource } from './types.js';

/* ================================================================== */
/* Date comparison helpers                                              */
/* ================================================================== */

/**
 * Parse a FHIR date prefix.
 * FHIR supports: eq (default), ne, lt, gt, le, ge, sa, eb, ap
 * We support: eq, lt, gt, le, ge.
 */
export type DatePrefix = 'eq' | 'lt' | 'gt' | 'le' | 'ge';

export interface DateParam {
  prefix: DatePrefix;
  date: Date;
}

export function parseDateParam(param: string): DateParam | null {
  const prefixMatch = param.match(/^(eq|ne|lt|gt|le|ge|sa|eb|ap)?(.+)$/);
  if (!prefixMatch) return null;
  const prefix = (prefixMatch[1] || 'eq') as DatePrefix;
  const dateStr = prefixMatch[2];

  // Support YYYY, YYYY-MM, YYYY-MM-DD, YYYY-MM-DDThh:mm:ss
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return { prefix, date: d };
}

/**
 * Check if a resource date matches a FHIR date search parameter.
 */
export function matchesDate(resourceDate: string | undefined, param: DateParam): boolean {
  if (!resourceDate) return false;
  const rd = new Date(resourceDate);
  if (isNaN(rd.getTime())) return false;

  const t = param.date.getTime();
  const r = rd.getTime();

  switch (param.prefix) {
    case 'eq':
      return r >= t && r < t + 86400000; // Same day
    case 'lt':
      return r < t;
    case 'gt':
      return r > t;
    case 'le':
      return r <= t + 86400000;
    case 'ge':
      return r >= t;
    default:
      return r >= t && r < t + 86400000;
  }
}

/* ================================================================== */
/* Generic filters                                                      */
/* ================================================================== */

/**
 * Apply _count (page size) to a resource array.
 * Clamps to 1-100, defaults to 20.
 */
export function applyCount<T>(items: T[], countParam?: string): T[] {
  const parsed = parseInt(countParam || '', 10);
  const count = Math.min(Math.max(Number.isNaN(parsed) ? 20 : parsed || 1, 1), 100);
  return items.slice(0, count);
}

/**
 * Filter FHIR Encounter resources by date and/or status.
 */
export function filterEncounters(
  resources: FhirResource[],
  params: { date?: string; status?: string }
): FhirResource[] {
  let filtered = resources;

  if (params.status) {
    const statuses = params.status.split(',').map((s) => s.trim().toLowerCase());
    filtered = filtered.filter((r: any) => r.status && statuses.includes(r.status.toLowerCase()));
  }

  if (params.date) {
    const dp = parseDateParam(params.date);
    if (dp) {
      filtered = filtered.filter((r: any) => {
        const period = r.period;
        if (period?.start) return matchesDate(period.start, dp);
        return false;
      });
    }
  }

  return filtered;
}

/**
 * Filter FHIR Observation resources by code and/or date.
 */
export function filterObservations(
  resources: FhirResource[],
  params: { code?: string; date?: string }
): FhirResource[] {
  let filtered = resources;

  if (params.code) {
    const codes = params.code.split(',').map((c) => c.trim().toLowerCase());
    filtered = filtered.filter((r: any) => {
      const codings = r.code?.coding || [];
      return codings.some(
        (c: any) =>
          codes.includes(c.code?.toLowerCase()) || codes.includes(c.display?.toLowerCase())
      );
    });
  }

  if (params.date) {
    const dp = parseDateParam(params.date);
    if (dp) {
      filtered = filtered.filter((r: any) => matchesDate(r.effectiveDateTime, dp));
    }
  }

  return filtered;
}

/**
 * Filter FHIR MedicationRequest resources by status.
 */
export function filterMedicationRequests(
  resources: FhirResource[],
  params: { status?: string }
): FhirResource[] {
  if (!params.status) return resources;

  const statuses = params.status.split(',').map((s) => s.trim().toLowerCase());
  return resources.filter((r: any) => r.status && statuses.includes(r.status.toLowerCase()));
}

/**
 * Filter FHIR Condition resources by clinical-status.
 */
export function filterConditions(
  resources: FhirResource[],
  params: { 'clinical-status'?: string }
): FhirResource[] {
  const cs = params['clinical-status'];
  if (!cs) return resources;

  const statuses = cs.split(',').map((s) => s.trim().toLowerCase());
  return resources.filter((r: any) => {
    const coding = r.clinicalStatus?.coding?.[0]?.code;
    return coding && statuses.includes(coding.toLowerCase());
  });
}

/**
 * Filter FHIR AllergyIntolerance resources by clinical-status.
 */
export function filterAllergyIntolerances(
  resources: FhirResource[],
  params: { 'clinical-status'?: string }
): FhirResource[] {
  const cs = params['clinical-status'];
  if (!cs) return resources;

  const statuses = cs.split(',').map((s) => s.trim().toLowerCase());
  return resources.filter((r: any) => {
    const coding = r.clinicalStatus?.coding?.[0]?.code;
    return coding && statuses.includes(coding.toLowerCase());
  });
}

/**
 * Filter FHIR DocumentReference resources by date.
 */
export function filterDocumentReferences(
  resources: FhirResource[],
  params: { date?: string }
): FhirResource[] {
  if (!params.date) return resources;

  const dp = parseDateParam(params.date);
  if (!dp) return resources;

  return resources.filter((r: any) => matchesDate(r.date, dp));
}
