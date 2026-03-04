/**
 * CI Smoke Test: Job Worker (Phase 116)
 *
 * Validates the Graphile Worker job system can initialize correctly:
 *  - All job module exports are importable
 *  - Job registry has all 4 expected jobs with payload schemas
 *  - PHI rejection catches blocked fields
 *  - Payload validation accepts/rejects correctly
 *  - Runner module exports are present (without starting the runner)
 *
 * Does NOT require Postgres or a running API — purely structural.
 * Run: pnpm exec vitest run tests/job-worker-smoke.test.ts
 */

import { describe, it, expect } from 'vitest';

import {
  JOB_NAMES,
  ALL_JOB_NAMES,
  JOB_PAYLOAD_SCHEMAS,
  PHI_BLOCKED_FIELDS,
  containsPhiFields,
  getJobConcurrency,
  getJobCronSchedule,
  EligibilityCheckPollPayload,
  ClaimStatusPollPayload,
  EvidenceStalenessScanPayload,
  RetentionCleanupPayload,
  DEFAULT_CONCURRENCY,
  DEFAULT_CRON_SCHEDULES,
} from '../src/jobs/registry.js';

import { validateJobPayload, redactErrorMessage } from '../src/jobs/governance.js';

import {
  startJobRunner,
  stopJobRunner,
  isJobRunnerActive,
  getAddJobFn,
} from '../src/jobs/runner.js';

/* ── Registry Smoke ────────────────────────────────────────── */

describe('Job Registry (smoke)', () => {
  it('exports exactly 5 job names', () => {
    expect(ALL_JOB_NAMES).toHaveLength(5);
    expect(ALL_JOB_NAMES).toContain('eligibility_check_poll');
    expect(ALL_JOB_NAMES).toContain('claim_status_poll');
    expect(ALL_JOB_NAMES).toContain('evidence_staleness_scan');
    expect(ALL_JOB_NAMES).toContain('retention_cleanup');
    expect(ALL_JOB_NAMES).toContain('pg_backup');
  });

  it('has payload schemas for every job name', () => {
    for (const name of ALL_JOB_NAMES) {
      expect(JOB_PAYLOAD_SCHEMAS[name]).toBeDefined();
      expect(typeof JOB_PAYLOAD_SCHEMAS[name].parse).toBe('function');
    }
  });

  it('JOB_NAMES constants match ALL_JOB_NAMES values', () => {
    const fromConstants = Object.values(JOB_NAMES);
    expect(fromConstants.sort()).toEqual([...ALL_JOB_NAMES].sort());
  });

  it('has PHI_BLOCKED_FIELDS with at least standard PHI field names', () => {
    expect(PHI_BLOCKED_FIELDS.size).toBeGreaterThanOrEqual(5);
    for (const field of ['patientName', 'ssn', 'dob', 'address', 'phoneNumber']) {
      expect(PHI_BLOCKED_FIELDS.has(field)).toBe(true);
    }
  });

  it('has default cron schedules for all 5 jobs', () => {
    for (const name of ALL_JOB_NAMES) {
      const schedule = getJobCronSchedule(name);
      expect(schedule).toBeTruthy();
      expect(typeof schedule).toBe('string');
    }
  });

  it('has default concurrency for all 5 jobs', () => {
    for (const name of ALL_JOB_NAMES) {
      const c = getJobConcurrency(name);
      expect(c).toBeGreaterThanOrEqual(1);
    }
  });

  it('DEFAULT_CONCURRENCY and DEFAULT_CRON_SCHEDULES are objects', () => {
    expect(typeof DEFAULT_CONCURRENCY).toBe('object');
    expect(typeof DEFAULT_CRON_SCHEDULES).toBe('object');
  });
});

/* ── Payload Schema Smoke ──────────────────────────────────── */

describe('Payload Schemas (smoke)', () => {
  it('EligibilityCheckPollPayload accepts minimal payload', () => {
    const result = EligibilityCheckPollPayload.safeParse({ tenantId: 'default' });
    expect(result.success).toBe(true);
  });

  it('ClaimStatusPollPayload accepts minimal payload', () => {
    const result = ClaimStatusPollPayload.safeParse({ tenantId: 'default' });
    expect(result.success).toBe(true);
  });

  it('EvidenceStalenessScanPayload accepts minimal payload', () => {
    const result = EvidenceStalenessScanPayload.safeParse({ tenantId: 'default' });
    expect(result.success).toBe(true);
  });

  it('RetentionCleanupPayload accepts minimal payload', () => {
    const result = RetentionCleanupPayload.safeParse({ tenantId: 'default' });
    expect(result.success).toBe(true);
  });

  it('EligibilityCheckPollPayload allows optional payerId', () => {
    const withPayer = EligibilityCheckPollPayload.safeParse({
      tenantId: 'default',
      payerId: 'payer-001',
    });
    expect(withPayer.success).toBe(true);

    const withoutPayer = EligibilityCheckPollPayload.safeParse({
      tenantId: 'default',
    });
    expect(withoutPayer.success).toBe(true);
  });
});

/* ── PHI Rejection Smoke ───────────────────────────────────── */

describe('PHI Rejection (smoke)', () => {
  // containsPhiFields returns string[] of violation paths
  it('containsPhiFields detects blocked fields', () => {
    const violations = containsPhiFields({
      tenantId: 'default',
      patientName: 'John Doe',
    });
    expect(violations.length).toBeGreaterThan(0);
    expect(violations).toContain('patientName');
  });

  it('containsPhiFields detects SSN', () => {
    const violations = containsPhiFields({
      tenantId: 'default',
      ssn: '123-45-6789',
    });
    expect(violations.length).toBeGreaterThan(0);
    expect(violations).toContain('ssn');
  });

  it('containsPhiFields detects multiple PHI fields', () => {
    const violations = containsPhiFields({
      patientName: 'Jane',
      dob: '1990-01-01',
      ssn: '000-00-0000',
    });
    expect(violations.length).toBeGreaterThanOrEqual(3);
  });

  it('containsPhiFields passes clean payload', () => {
    const violations = containsPhiFields({
      tenantId: 'default',
      payerId: 'payer-001',
      batchSize: 10,
    });
    expect(violations).toHaveLength(0);
  });
});

/* ── Governance Validation Smoke ───────────────────────────── */

describe('Governance Validation (smoke)', () => {
  it('validateJobPayload accepts valid retention_cleanup payload', () => {
    const result = validateJobPayload('retention_cleanup', {
      tenantId: 'default',
      dryRun: true,
    });
    expect(result.ok).toBe(true);
    expect(result.payload).toBeDefined();
  });

  it('validateJobPayload rejects unknown job name', () => {
    const result = validateJobPayload('nonexistent_job', {
      tenantId: 'default',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/unknown/i);
  });

  it('validateJobPayload rejects PHI in payload', () => {
    const result = validateJobPayload('retention_cleanup', {
      tenantId: 'default',
      patientName: 'John Doe',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/PHI/i);
  });

  it('redactErrorMessage strips SSN patterns', () => {
    const raw = 'Error processing patient 123-45-6789 record';
    const redacted = redactErrorMessage(raw);
    expect(redacted).not.toContain('123-45-6789');
    expect(redacted).toContain('[REDACTED]');
  });

  it('redactErrorMessage strips name patterns', () => {
    const raw = 'Patient Doe, John not found in system';
    const redacted = redactErrorMessage(raw);
    expect(redacted).not.toContain('Doe, John');
  });

  it('redactErrorMessage truncates long messages', () => {
    const longMsg = 'A'.repeat(600);
    const redacted = redactErrorMessage(longMsg);
    expect(redacted.length).toBeLessThanOrEqual(503); // 500 + "..."
  });
});

/* ── Runner Exports Smoke ──────────────────────────────────── */

describe('Runner Exports (smoke)', () => {
  it('exports startJobRunner function', () => {
    expect(typeof startJobRunner).toBe('function');
  });

  it('exports stopJobRunner function', () => {
    expect(typeof stopJobRunner).toBe('function');
  });

  it('exports isJobRunnerActive function', () => {
    expect(typeof isJobRunnerActive).toBe('function');
  });

  it('exports getAddJobFn function', () => {
    expect(typeof getAddJobFn).toBe('function');
  });

  it('isJobRunnerActive returns false when runner not started', () => {
    expect(isJobRunnerActive()).toBe(false);
  });

  it('getAddJobFn returns null when runner not started', () => {
    expect(getAddJobFn()).toBeNull();
  });

  it('startJobRunner throws without PLATFORM_PG_URL', async () => {
    // In CI, PLATFORM_PG_URL is typically not set
    // This verifies the guard works correctly
    const origUrl = process.env.PLATFORM_PG_URL;
    delete process.env.PLATFORM_PG_URL;
    try {
      await expect(startJobRunner()).rejects.toThrow(/PLATFORM_PG_URL/);
    } finally {
      if (origUrl) process.env.PLATFORM_PG_URL = origUrl;
    }
  });
});
