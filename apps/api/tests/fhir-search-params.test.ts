/**
 * Phase 233 -- FHIR Search Parameters Tests.
 *
 * Tests for expanded FHIR search parameter parsing and filtering.
 */

import { describe, it, expect } from 'vitest';
import {
  parseDateParam,
  matchesDate,
  applyCount,
  filterEncounters,
  filterObservations,
  filterMedicationRequests,
  filterConditions,
  filterAllergyIntolerances,
  filterDocumentReferences,
} from '../src/fhir/fhir-search-params.js';

/* ================================================================== */
/* parseDateParam                                                       */
/* ================================================================== */

describe('parseDateParam', () => {
  it('parses date without prefix (defaults to eq)', () => {
    const p = parseDateParam('2024-01-15');
    expect(p?.prefix).toBe('eq');
    expect(p?.date.getFullYear()).toBe(2024);
  });

  it('parses gt prefix', () => {
    const p = parseDateParam('gt2024-06-01');
    expect(p?.prefix).toBe('gt');
    expect(p?.date.getMonth()).toBe(5); // June = 5 (0-indexed)
  });

  it('parses lt prefix', () => {
    const p = parseDateParam('lt2024-12-31');
    expect(p?.prefix).toBe('lt');
  });

  it('parses ge prefix', () => {
    const p = parseDateParam('ge2024-01-01');
    expect(p?.prefix).toBe('ge');
  });

  it('parses le prefix', () => {
    const p = parseDateParam('le2024-12-31');
    expect(p?.prefix).toBe('le');
  });

  it('returns null for invalid date', () => {
    expect(parseDateParam('not-a-date')).toBeNull();
    expect(parseDateParam('eqxyz')).toBeNull();
  });
});

/* ================================================================== */
/* matchesDate                                                          */
/* ================================================================== */

describe('matchesDate', () => {
  it('matches same day with eq prefix', () => {
    const p = parseDateParam('2024-06-15')!;
    expect(matchesDate('2024-06-15T10:30:00Z', p)).toBe(true);
    expect(matchesDate('2024-06-14T23:59:59Z', p)).toBe(false);
  });

  it('matches gt prefix', () => {
    const p = parseDateParam('gt2024-06-15')!;
    expect(matchesDate('2024-06-16T00:00:01Z', p)).toBe(true);
    expect(matchesDate('2024-06-14T00:00:00Z', p)).toBe(false);
  });

  it('returns false for undefined resourceDate', () => {
    const p = parseDateParam('2024-01-01')!;
    expect(matchesDate(undefined, p)).toBe(false);
  });

  it('returns false for invalid resourceDate', () => {
    const p = parseDateParam('2024-01-01')!;
    expect(matchesDate('invalid', p)).toBe(false);
  });
});

/* ================================================================== */
/* applyCount                                                           */
/* ================================================================== */

describe('applyCount', () => {
  const items = Array.from({ length: 50 }, (_, i) => i);

  it('defaults to 20', () => {
    expect(applyCount(items).length).toBe(20);
  });

  it('respects explicit count', () => {
    expect(applyCount(items, '5').length).toBe(5);
  });

  it('clamps to max 100', () => {
    expect(applyCount(items, '200').length).toBe(50); // only 50 items
  });

  it('clamps to min 1', () => {
    expect(applyCount(items, '0').length).toBe(1);
    expect(applyCount(items, '-5').length).toBe(1);
  });
});

/* ================================================================== */
/* filterEncounters                                                     */
/* ================================================================== */

describe('filterEncounters', () => {
  const encounters = [
    { resourceType: 'Encounter', status: 'finished', period: { start: '2024-06-15T10:00:00Z' } },
    { resourceType: 'Encounter', status: 'in-progress', period: { start: '2024-06-16T08:00:00Z' } },
    { resourceType: 'Encounter', status: 'finished', period: { start: '2024-07-01T12:00:00Z' } },
  ] as any[];

  it('filters by status', () => {
    const result = filterEncounters(encounters, { status: 'finished' });
    expect(result).toHaveLength(2);
  });

  it('filters by date', () => {
    const result = filterEncounters(encounters, { date: 'gt2024-06-20' });
    expect(result).toHaveLength(1);
  });

  it('filters by status + date', () => {
    const result = filterEncounters(encounters, { status: 'finished', date: 'gt2024-06-20' });
    expect(result).toHaveLength(1);
  });

  it('returns all when no filters', () => {
    const result = filterEncounters(encounters, {});
    expect(result).toHaveLength(3);
  });
});

/* ================================================================== */
/* filterObservations                                                   */
/* ================================================================== */

describe('filterObservations', () => {
  const observations = [
    {
      resourceType: 'Observation',
      code: { coding: [{ code: '8310-5', display: 'Body temperature' }] },
      effectiveDateTime: '2024-06-15',
    },
    {
      resourceType: 'Observation',
      code: { coding: [{ code: '8867-4', display: 'Heart rate' }] },
      effectiveDateTime: '2024-06-16',
    },
    {
      resourceType: 'Observation',
      code: { coding: [{ code: '2160-0', display: 'Creatinine' }] },
      effectiveDateTime: '2024-07-01',
    },
  ] as any[];

  it('filters by code', () => {
    const result = filterObservations(observations, { code: '8310-5' });
    expect(result).toHaveLength(1);
  });

  it('filters by code display (case-insensitive)', () => {
    const result = filterObservations(observations, { code: 'heart rate' });
    expect(result).toHaveLength(1);
  });

  it('filters by date', () => {
    const result = filterObservations(observations, { date: 'ge2024-06-16' });
    expect(result).toHaveLength(2);
  });

  it('filters by code + date', () => {
    const result = filterObservations(observations, { code: '8310-5', date: '2024-06-15' });
    expect(result).toHaveLength(1);
  });
});

/* ================================================================== */
/* filterMedicationRequests                                             */
/* ================================================================== */

describe('filterMedicationRequests', () => {
  const meds = [
    { resourceType: 'MedicationRequest', status: 'active' },
    { resourceType: 'MedicationRequest', status: 'stopped' },
    { resourceType: 'MedicationRequest', status: 'active' },
  ] as any[];

  it('filters by status', () => {
    expect(filterMedicationRequests(meds, { status: 'active' })).toHaveLength(2);
    expect(filterMedicationRequests(meds, { status: 'stopped' })).toHaveLength(1);
  });

  it('supports comma-separated statuses', () => {
    expect(filterMedicationRequests(meds, { status: 'active,stopped' })).toHaveLength(3);
  });

  it('returns all when no status filter', () => {
    expect(filterMedicationRequests(meds, {})).toHaveLength(3);
  });
});

/* ================================================================== */
/* filterConditions                                                     */
/* ================================================================== */

describe('filterConditions', () => {
  const conditions = [
    { resourceType: 'Condition', clinicalStatus: { coding: [{ code: 'active' }] } },
    { resourceType: 'Condition', clinicalStatus: { coding: [{ code: 'resolved' }] } },
  ] as any[];

  it('filters by clinical-status', () => {
    expect(filterConditions(conditions, { 'clinical-status': 'active' })).toHaveLength(1);
  });

  it('returns all when no filter', () => {
    expect(filterConditions(conditions, {})).toHaveLength(2);
  });
});

/* ================================================================== */
/* filterAllergyIntolerances                                            */
/* ================================================================== */

describe('filterAllergyIntolerances', () => {
  const allergies = [
    { resourceType: 'AllergyIntolerance', clinicalStatus: { coding: [{ code: 'active' }] } },
    { resourceType: 'AllergyIntolerance', clinicalStatus: { coding: [{ code: 'inactive' }] } },
  ] as any[];

  it('filters by clinical-status', () => {
    expect(filterAllergyIntolerances(allergies, { 'clinical-status': 'active' })).toHaveLength(1);
  });
});

/* ================================================================== */
/* filterDocumentReferences                                             */
/* ================================================================== */

describe('filterDocumentReferences', () => {
  const docs = [
    { resourceType: 'DocumentReference', date: '2024-06-15T10:00:00Z' },
    { resourceType: 'DocumentReference', date: '2024-07-01T08:00:00Z' },
  ] as any[];

  it('filters by date', () => {
    expect(filterDocumentReferences(docs, { date: 'gt2024-06-20' })).toHaveLength(1);
  });

  it('returns all when no date filter', () => {
    expect(filterDocumentReferences(docs, {})).toHaveLength(2);
  });
});
