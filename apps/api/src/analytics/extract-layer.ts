/**
 * Analytics Extract Layer -- Phase 363 (W19-P2)
 *
 * Reproducible, tenant-safe incremental extracts from domain stores.
 * Extracts events and domain snapshots into a normalized analytics dataset.
 *
 * ADR: docs/decisions/ADR-ANALYTICS-STACK.md
 */

import { randomUUID, createHash } from 'node:crypto';
import { log } from '../lib/logger.js';
import type {
  ExtractEntityType,
  ExtractRunConfig,
  ExtractRunResult,
  ExtractRecord,
} from './extract-types.js';
import { queryAnalyticsEvents } from '../services/analytics-store.js';

// -- In-memory stores ----------------------------------------------------

const extractRuns: ExtractRunResult[] = [];
const extractRecords = new Map<string, ExtractRecord[]>(); // runId -> records
const MAX_RUNS = 200;
const MAX_RECORDS_PER_RUN = 50_000;

// -- Offset tracking (per tenant + entity type) -------------------------

const extractOffsets = new Map<string, string>(); // key: `${tenantId}::${entityType}` -> last timestamp

function offsetKey(tenantId: string, entityType: ExtractEntityType): string {
  return `${tenantId}::${entityType}`;
}

function getOffset(tenantId: string, entityType: ExtractEntityType): string | undefined {
  return extractOffsets.get(offsetKey(tenantId, entityType));
}

function setOffset(tenantId: string, entityType: ExtractEntityType, ts: string): void {
  extractOffsets.set(offsetKey(tenantId, entityType), ts);
}

// -- Extract Logic -------------------------------------------------------

/**
 * Run an incremental extract for the given config.
 * Extracts records from the analytics event store and domain stores.
 */
export function runExtract(config: ExtractRunConfig): ExtractRunResult {
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const counts: Record<string, number> = {};
  const errors: string[] = [];
  const records: ExtractRecord[] = [];

  for (const entityType of config.entityTypes) {
    try {
      const since = config.since || getOffset(config.tenantId, entityType);
      const extracted = extractEntity(config.tenantId, entityType, since, config.until);
      counts[entityType] = extracted.length;
      records.push(...extracted);

      // Update offset to latest record timestamp
      if (extracted.length > 0) {
        const latest = extracted[extracted.length - 1].extractedAt;
        setOffset(config.tenantId, entityType, latest);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${entityType}: ${msg}`);
      counts[entityType] = 0;
    }
  }

  const completedAt = new Date().toISOString();
  const result: ExtractRunResult = {
    runId,
    tenantId: config.tenantId,
    startedAt,
    completedAt,
    status: errors.length > 0 ? (records.length > 0 ? 'partial' : 'failed') : 'completed',
    counts: counts as Record<ExtractEntityType, number>,
    totalRecords: records.length,
    extractedCount: records.length,
    deidMode: config.deidMode || 'strict',
    durationMs: Date.now() - new Date(startedAt).getTime(),
    errors,
  };

  // Store results
  extractRecords.set(runId, records.slice(0, MAX_RECORDS_PER_RUN));
  extractRuns.push(result);
  if (extractRuns.length > MAX_RUNS) extractRuns.shift();

  log.info(`Extract run ${runId}: ${result.totalRecords} records, ${errors.length} errors`);
  return result;
}

/**
 * Extract records for a single entity type.
 */
function extractEntity(
  tenantId: string,
  entityType: ExtractEntityType,
  since?: string,
  until?: string
): ExtractRecord[] {
  switch (entityType) {
    case 'analytics_event':
      return extractAnalyticsEvents(tenantId, since, until);
    case 'claim':
      return extractFromSyntheticFixture(tenantId, entityType, since, until);
    case 'session':
      return extractFromSyntheticFixture(tenantId, entityType, since, until);
    case 'appointment':
      return extractFromSyntheticFixture(tenantId, entityType, since, until);
    case 'imaging_order':
      return extractFromSyntheticFixture(tenantId, entityType, since, until);
    case 'medication_order':
      return extractFromSyntheticFixture(tenantId, entityType, since, until);
    case 'note':
      return extractFromSyntheticFixture(tenantId, entityType, since, until);
    case 'lab_result':
      return extractFromSyntheticFixture(tenantId, entityType, since, until);
    case 'patient_encounter':
      return extractFromSyntheticFixture(tenantId, entityType, since, until);
    default:
      return [];
  }
}

/**
 * Extract analytics events from the in-memory event store.
 */
function extractAnalyticsEvents(tenantId: string, since?: string, until?: string): ExtractRecord[] {
  const events = queryAnalyticsEvents({
    tenantId,
    since,
    until,
    limit: MAX_RECORDS_PER_RUN,
    offset: 0,
  });
  return events.events.map((e) => ({
    id: e.id,
    entityType: 'analytics_event' as const,
    tenantId,
    extractedAt: e.timestamp,
    data: {
      category: e.category,
      metric: e.metric,
      value: e.value,
      unit: e.unit,
      method: e.method,
      statusCode: e.statusCode,
      target: e.target,
      tags: e.tags,
    },
  }));
}

/**
 * Generate synthetic fixture data for a given entity type.
 * These simulate what real domain store extracts would produce.
 */
function extractFromSyntheticFixture(
  tenantId: string,
  entityType: ExtractEntityType,
  since?: string,
  _until?: string
): ExtractRecord[] {
  const fixtures = SYNTHETIC_FIXTURES[entityType];
  if (!fixtures) return [];

  const sinceTs = since ? new Date(since).getTime() : 0;
  return fixtures
    .filter((f) => new Date(f.extractedAt).getTime() > sinceTs)
    .map((f) => ({
      ...f,
      tenantId,
      id: createHash('sha256').update(`${tenantId}::${f.id}`).digest('hex').slice(0, 16),
    }));
}

// -- Synthetic Fixtures --------------------------------------------------

const now = new Date();
function hoursAgo(h: number): string {
  return new Date(now.getTime() - h * 3600_000).toISOString();
}

const SYNTHETIC_FIXTURES: Partial<Record<ExtractEntityType, ExtractRecord[]>> = {
  claim: [
    {
      id: 'c1',
      entityType: 'claim',
      tenantId: '',
      extractedAt: hoursAgo(48),
      data: {
        claimId: 'CLM-001',
        status: 'submitted',
        amount: 1250.0,
        payerId: 'P001',
        diagnosisCodes: ['Z00.00'],
        procedureCodes: ['99213'],
        patientName: 'SYNTHETIC,PATIENT A',
        ssn: '123-45-6789',
      },
    },
    {
      id: 'c2',
      entityType: 'claim',
      tenantId: '',
      extractedAt: hoursAgo(36),
      data: {
        claimId: 'CLM-002',
        status: 'accepted',
        amount: 850.0,
        payerId: 'P002',
        diagnosisCodes: ['J06.9'],
        procedureCodes: ['99214'],
        patientName: 'SYNTHETIC,PATIENT B',
        ssn: '234-56-7890',
      },
    },
    {
      id: 'c3',
      entityType: 'claim',
      tenantId: '',
      extractedAt: hoursAgo(24),
      data: {
        claimId: 'CLM-003',
        status: 'denied',
        amount: 2100.0,
        payerId: 'P001',
        diagnosisCodes: ['M54.5'],
        procedureCodes: ['99215'],
        denialReason: 'CO-16',
        patientName: 'SYNTHETIC,PATIENT C',
        ssn: '345-67-8901',
      },
    },
    {
      id: 'c4',
      entityType: 'claim',
      tenantId: '',
      extractedAt: hoursAgo(12),
      data: {
        claimId: 'CLM-004',
        status: 'submitted',
        amount: 450.0,
        payerId: 'P003',
        diagnosisCodes: ['E11.9'],
        procedureCodes: ['99212'],
        patientName: 'SYNTHETIC,PATIENT D',
        ssn: '456-78-9012',
      },
    },
    {
      id: 'c5',
      entityType: 'claim',
      tenantId: '',
      extractedAt: hoursAgo(6),
      data: {
        claimId: 'CLM-005',
        status: 'paid',
        amount: 1800.0,
        payerId: 'P002',
        diagnosisCodes: ['I10'],
        procedureCodes: ['99214'],
        paidAmount: 1620.0,
        patientName: 'SYNTHETIC,PATIENT E',
        ssn: '567-89-0123',
      },
    },
  ],
  session: [
    {
      id: 's1',
      entityType: 'session',
      tenantId: '',
      extractedAt: hoursAgo(48),
      data: {
        userId: 'USR-001',
        loginAt: hoursAgo(48),
        logoutAt: hoursAgo(47),
        durationMin: 60,
        role: 'provider',
      },
    },
    {
      id: 's2',
      entityType: 'session',
      tenantId: '',
      extractedAt: hoursAgo(24),
      data: {
        userId: 'USR-002',
        loginAt: hoursAgo(24),
        logoutAt: hoursAgo(23),
        durationMin: 45,
        role: 'nurse',
      },
    },
    {
      id: 's3',
      entityType: 'session',
      tenantId: '',
      extractedAt: hoursAgo(12),
      data: {
        userId: 'USR-001',
        loginAt: hoursAgo(12),
        logoutAt: hoursAgo(11),
        durationMin: 90,
        role: 'provider',
      },
    },
    {
      id: 's4',
      entityType: 'session',
      tenantId: '',
      extractedAt: hoursAgo(6),
      data: { userId: 'USR-003', loginAt: hoursAgo(6), durationMin: 30, role: 'admin' },
    },
  ],
  appointment: [
    {
      id: 'a1',
      entityType: 'appointment',
      tenantId: '',
      extractedAt: hoursAgo(72),
      data: {
        appointmentId: 'APT-001',
        status: 'completed',
        clinicIen: '44',
        appointmentDate: hoursAgo(72),
        patientName: 'SYNTHETIC,ALICE',
      },
    },
    {
      id: 'a2',
      entityType: 'appointment',
      tenantId: '',
      extractedAt: hoursAgo(48),
      data: {
        appointmentId: 'APT-002',
        status: 'no_show',
        clinicIen: '44',
        appointmentDate: hoursAgo(48),
        patientName: 'SYNTHETIC,BOB',
      },
    },
    {
      id: 'a3',
      entityType: 'appointment',
      tenantId: '',
      extractedAt: hoursAgo(24),
      data: {
        appointmentId: 'APT-003',
        status: 'completed',
        clinicIen: '45',
        appointmentDate: hoursAgo(24),
        patientName: 'SYNTHETIC,CAROL',
      },
    },
    {
      id: 'a4',
      entityType: 'appointment',
      tenantId: '',
      extractedAt: hoursAgo(6),
      data: {
        appointmentId: 'APT-004',
        status: 'scheduled',
        clinicIen: '44',
        appointmentDate: hoursAgo(-24),
        patientName: 'SYNTHETIC,DAVE',
      },
    },
  ],
  lab_result: [
    {
      id: 'l1',
      entityType: 'lab_result',
      tenantId: '',
      extractedAt: hoursAgo(72),
      data: {
        labId: 'LAB-001',
        testName: 'CBC',
        result: 'abnormal',
        orderedAt: hoursAgo(96),
        resultedAt: hoursAgo(72),
        followupAt: hoursAgo(48),
        value: 3.2,
        unit: 'K/uL',
        refLow: 4.5,
        refHigh: 11.0,
        patientDfn: '3',
      },
    },
    {
      id: 'l2',
      entityType: 'lab_result',
      tenantId: '',
      extractedAt: hoursAgo(48),
      data: {
        labId: 'LAB-002',
        testName: 'BMP',
        result: 'normal',
        orderedAt: hoursAgo(72),
        resultedAt: hoursAgo(48),
        value: 140,
        unit: 'mEq/L',
        refLow: 136,
        refHigh: 145,
        patientDfn: '5',
      },
    },
    {
      id: 'l3',
      entityType: 'lab_result',
      tenantId: '',
      extractedAt: hoursAgo(24),
      data: {
        labId: 'LAB-003',
        testName: 'HbA1c',
        result: 'abnormal',
        orderedAt: hoursAgo(48),
        resultedAt: hoursAgo(24),
        value: 8.5,
        unit: '%',
        refLow: 4.0,
        refHigh: 5.6,
        patientDfn: '7',
      },
    },
  ],
  medication_order: [
    {
      id: 'm1',
      entityType: 'medication_order',
      tenantId: '',
      extractedAt: hoursAgo(48),
      data: {
        orderId: 'MED-001',
        medication: 'Lisinopril 10mg',
        orderedAt: hoursAgo(48),
        administeredAt: hoursAgo(46),
        orderToAdminMin: 120,
      },
    },
    {
      id: 'm2',
      entityType: 'medication_order',
      tenantId: '',
      extractedAt: hoursAgo(24),
      data: {
        orderId: 'MED-002',
        medication: 'Metformin 500mg',
        orderedAt: hoursAgo(24),
        administeredAt: hoursAgo(23),
        orderToAdminMin: 60,
      },
    },
    {
      id: 'm3',
      entityType: 'medication_order',
      tenantId: '',
      extractedAt: hoursAgo(12),
      data: {
        orderId: 'MED-003',
        medication: 'Amlodipine 5mg',
        orderedAt: hoursAgo(12),
        orderToAdminMin: null,
      },
    },
  ],
  note: [
    {
      id: 'n1',
      entityType: 'note',
      tenantId: '',
      extractedAt: hoursAgo(48),
      data: {
        noteId: 'NOTE-001',
        type: 'progress',
        authorDuz: '87',
        createdAt: hoursAgo(48),
        signedAt: hoursAgo(47),
        completionMin: 60,
        text: 'Patient SYNTHETIC,ALICE seen for follow-up. SSN 111-22-3333. DOB 1985-03-15.',
      },
    },
    {
      id: 'n2',
      entityType: 'note',
      tenantId: '',
      extractedAt: hoursAgo(24),
      data: {
        noteId: 'NOTE-002',
        type: 'discharge',
        authorDuz: '87',
        createdAt: hoursAgo(24),
        signedAt: hoursAgo(20),
        completionMin: 240,
        text: 'Discharge summary for patient.',
      },
    },
    {
      id: 'n3',
      entityType: 'note',
      tenantId: '',
      extractedAt: hoursAgo(6),
      data: {
        noteId: 'NOTE-003',
        type: 'progress',
        authorDuz: '88',
        createdAt: hoursAgo(6),
        completionMin: null,
        text: 'Pending signature.',
      },
    },
  ],
  patient_encounter: [
    {
      id: 'pe1',
      entityType: 'patient_encounter',
      tenantId: '',
      extractedAt: hoursAgo(72),
      data: {
        encounterId: 'ENC-001',
        type: 'outpatient',
        visitDate: hoursAgo(72),
        facilityId: 'F001',
        patientName: 'SYNTHETIC,EVE',
      },
    },
    {
      id: 'pe2',
      entityType: 'patient_encounter',
      tenantId: '',
      extractedAt: hoursAgo(48),
      data: {
        encounterId: 'ENC-002',
        type: 'emergency',
        visitDate: hoursAgo(48),
        facilityId: 'F001',
        patientName: 'SYNTHETIC,FRANK',
      },
    },
    {
      id: 'pe3',
      entityType: 'patient_encounter',
      tenantId: '',
      extractedAt: hoursAgo(24),
      data: {
        encounterId: 'ENC-003',
        type: 'inpatient',
        visitDate: hoursAgo(24),
        facilityId: 'F002',
        patientName: 'SYNTHETIC,GRACE',
      },
    },
  ],
};

// -- Query Functions -----------------------------------------------------

export function getExtractRuns(tenantId: string, limit = 50): ExtractRunResult[] {
  return extractRuns.filter((r) => r.tenantId === tenantId).slice(-limit);
}

export function getExtractRunById(runId: string): ExtractRunResult | undefined {
  return extractRuns.find((r) => r.runId === runId);
}

export function getExtractRecords(
  runId: string,
  opts?: { entityType?: ExtractEntityType; limit?: number; offset?: number }
): ExtractRecord[] {
  const records = extractRecords.get(runId) || [];
  let filtered = records;
  if (opts?.entityType) {
    filtered = filtered.filter((r) => r.entityType === opts.entityType);
  }
  const start = opts?.offset || 0;
  const end = start + (opts?.limit || 100);
  return filtered.slice(start, end);
}

export function getExtractOffsets(tenantId: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, val] of extractOffsets) {
    if (key.startsWith(`${tenantId}::`)) {
      result[key.replace(`${tenantId}::`, '')] = val;
    }
  }
  return result;
}

export function clearExtractData(tenantId: string): void {
  // Remove runs and records for this tenant
  const runIds = extractRuns.filter((r) => r.tenantId === tenantId).map((r) => r.runId);
  for (const id of runIds) extractRecords.delete(id);

  // Clear offsets
  for (const key of extractOffsets.keys()) {
    if (key.startsWith(`${tenantId}::`)) extractOffsets.delete(key);
  }

  // Remove from runs array
  const remaining = extractRuns.filter((r) => r.tenantId !== tenantId);
  extractRuns.length = 0;
  extractRuns.push(...remaining);
}

export function getExtractStats(tenantId: string): {
  totalRuns: number;
  totalRecords: number;
  entityTypes: string[];
} {
  const tenantRunIds = new Set(
    extractRuns.filter((r) => r.tenantId === tenantId).map((r) => r.runId)
  );
  const entityTypes = new Set<string>();
  for (const [runId, records] of extractRecords.entries()) {
    if (!tenantRunIds.has(runId)) continue;
    for (const r of records) entityTypes.add(r.entityType);
  }
  let totalRecords = 0;
  for (const [runId, records] of extractRecords.entries()) {
    if (tenantRunIds.has(runId)) totalRecords += records.length;
  }
  return {
    totalRuns: tenantRunIds.size,
    totalRecords,
    entityTypes: Array.from(entityTypes),
  };
}
