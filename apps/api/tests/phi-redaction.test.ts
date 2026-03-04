/**
 * Phase 151 -- PHI Redaction Unit Tests
 *
 * Tests for the centralized PHI redaction system in lib/phi-redaction.ts.
 * Covers: PHI_FIELDS, redactPhi, sanitizeAuditDetail, sanitizeForAudit,
 * isBlockedField, classifyField, assertNoPhiInAttributes, assertNoPhiInMetricLabels.
 *
 * Run: cd apps/api && pnpm exec vitest run tests/phi-redaction.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  PHI_FIELDS,
  CREDENTIAL_FIELDS,
  ALL_BLOCKED_FIELDS,
  INLINE_REDACT_PATTERNS,
  isBlockedField,
  redactPhi,
  sanitizeForAudit,
  sanitizeAuditDetail,
  classifyField,
  assertNoPhiInAttributes,
  assertNoPhiInMetricLabels,
} from '../src/lib/phi-redaction.js';

/* ------------------------------------------------------------------ */
/* PHI_FIELDS completeness                                             */
/* ------------------------------------------------------------------ */

describe('PHI_FIELDS', () => {
  it('includes patient identifier fields (Phase 151)', () => {
    for (const field of ['dfn', 'patientdfn', 'patient_dfn', 'mrn']) {
      expect(PHI_FIELDS.has(field)).toBe(true);
    }
  });

  it('includes SSN/DOB/name fields', () => {
    for (const field of ['ssn', 'dob', 'dateofbirth', 'patientname', 'patient_name']) {
      expect(PHI_FIELDS.has(field)).toBe(true);
    }
  });

  it('includes insurance/member fields', () => {
    for (const field of ['memberid', 'subscriberid', 'insuranceid', 'policyid']) {
      expect(PHI_FIELDS.has(field)).toBe(true);
    }
  });

  it('includes contact fields', () => {
    for (const field of ['address', 'phonenumber', 'email']) {
      expect(PHI_FIELDS.has(field)).toBe(true);
    }
  });
});

describe('CREDENTIAL_FIELDS', () => {
  it('includes auth-related fields', () => {
    for (const field of ['accesscode', 'verifycode', 'password', 'token', 'cookie']) {
      expect(CREDENTIAL_FIELDS.has(field)).toBe(true);
    }
  });
});

describe('ALL_BLOCKED_FIELDS', () => {
  it('is the union of PHI + credential fields', () => {
    for (const f of PHI_FIELDS) expect(ALL_BLOCKED_FIELDS.has(f)).toBe(true);
    for (const f of CREDENTIAL_FIELDS) expect(ALL_BLOCKED_FIELDS.has(f)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* isBlockedField                                                      */
/* ------------------------------------------------------------------ */

describe('isBlockedField', () => {
  it('returns true for PHI fields (case-insensitive)', () => {
    expect(isBlockedField('dfn')).toBe(true);
    expect(isBlockedField('DFN')).toBe(true);
    // patientDfn.toLowerCase() = "patientdfn" which IS in PHI_FIELDS
    expect(isBlockedField('patientDfn')).toBe(true);
  });

  it('returns true for patientDfn (lowercase match)', () => {
    expect(isBlockedField('patientDfn')).toBe(true);
  });

  it('returns true for credential fields', () => {
    expect(isBlockedField('accessCode')).toBe(true);
    expect(isBlockedField('password')).toBe(true);
  });

  it('returns false for safe fields', () => {
    expect(isBlockedField('action')).toBe(false);
    expect(isBlockedField('route')).toBe(false);
    expect(isBlockedField('statusCode')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* classifyField                                                       */
/* ------------------------------------------------------------------ */

describe('classifyField', () => {
  it('classifies credentials', () => {
    expect(classifyField('password')).toBe('credential');
    expect(classifyField('accessCode')).toBe('credential');
  });

  it('classifies PHI', () => {
    expect(classifyField('dfn')).toBe('phi');
    expect(classifyField('ssn')).toBe('phi');
    expect(classifyField('patientName')).toBe('phi');
  });

  it('classifies safe fields', () => {
    expect(classifyField('action')).toBe('safe');
    expect(classifyField('rpcName')).toBe('safe');
  });
});

/* ------------------------------------------------------------------ */
/* redactPhi                                                           */
/* ------------------------------------------------------------------ */

describe('redactPhi', () => {
  it('redacts top-level PHI fields', () => {
    const input = { dfn: '123', ssn: '123-45-6789', action: 'read' };
    const result = redactPhi(input) as Record<string, unknown>;
    expect(result.dfn).toBe('[REDACTED]');
    expect(result.ssn).toBe('[REDACTED]');
    expect(result.action).toBe('read');
  });

  it('redacts nested objects', () => {
    const input = { patient: { dfn: '456', patientName: 'DOE,JOHN' } };
    const result = redactPhi(input) as Record<string, unknown>;
    const patient = result.patient as Record<string, unknown>;
    expect(patient.dfn).toBe('[REDACTED]');
    expect(patient.patientName).toBe('[REDACTED]');
  });

  it('redacts arrays', () => {
    const input = [{ dfn: '1' }, { dfn: '2' }];
    const result = redactPhi(input) as Array<Record<string, unknown>>;
    expect(result[0].dfn).toBe('[REDACTED]');
    expect(result[1].dfn).toBe('[REDACTED]');
  });

  it('scrubs inline SSN patterns in string values', () => {
    const input = { note: 'Patient SSN is 123-45-6789 and DOB 01/15/1985' };
    const result = redactPhi(input) as Record<string, unknown>;
    expect(result.note).not.toContain('123-45-6789');
    expect(result.note).not.toContain('01/15/1985');
  });

  it('scrubs inline VistA name patterns', () => {
    const input = { text: 'Provider: SMITH, JOHN A ordered meds' };
    const result = redactPhi(input) as Record<string, unknown>;
    expect(result.text).toContain('[REDACTED]');
  });

  it('returns null/undefined unchanged', () => {
    expect(redactPhi(null)).toBe(null);
    expect(redactPhi(undefined)).toBe(undefined);
  });

  it('returns primitives unchanged (numbers/booleans)', () => {
    expect(redactPhi(42)).toBe(42);
    expect(redactPhi(true)).toBe(true);
  });

  it('handles max depth', () => {
    // Build deeply nested object
    let obj: any = { safe: 'ok' };
    for (let i = 0; i < 15; i++) {
      obj = { nested: obj };
    }
    const result = redactPhi(obj) as any;
    // Should not throw; deep levels get [MAX_DEPTH]
    expect(result).toBeDefined();
  });

  it('never mutates the input object', () => {
    const input = { dfn: '123', data: { ssn: '999-99-9999' } };
    const original = JSON.parse(JSON.stringify(input));
    redactPhi(input);
    expect(input).toEqual(original);
  });

  it('redacts patientDfn, patient_dfn, mrn', () => {
    const input = { patientDfn: '99', patient_dfn: '88', mrn: 'MRN001' };
    const result = redactPhi(input) as Record<string, unknown>;
    expect(result.patientDfn).toBe('[REDACTED]');
    expect(result.patient_dfn).toBe('[REDACTED]');
    expect(result.mrn).toBe('[REDACTED]');
  });

  it('redacts credential fields', () => {
    const input = { accessCode: 'PROV123', verifyCode: 'PROV123!!' };
    const result = redactPhi(input) as Record<string, unknown>;
    expect(result.accessCode).toBe('[REDACTED]');
    expect(result.verifyCode).toBe('[REDACTED]');
  });
});

/* ------------------------------------------------------------------ */
/* sanitizeAuditDetail                                                 */
/* ------------------------------------------------------------------ */

describe('sanitizeAuditDetail', () => {
  it('returns undefined for undefined/null input', () => {
    expect(sanitizeAuditDetail(undefined)).toBe(undefined);
    expect(sanitizeAuditDetail(undefined)).toBeUndefined();
  });

  it('redacts PHI fields from detail objects', () => {
    const detail = { dfn: '3', patientName: 'DOE,JOHN', action: 'allergy.add' };
    const result = sanitizeAuditDetail(detail);
    expect(result!.dfn).toBe('[REDACTED]');
    expect(result!.patientName).toBe('[REDACTED]');
    expect(result!.action).toBe('allergy.add');
  });

  it('redacts patientDfn from detail objects', () => {
    const detail = { patientDfn: '42', route: '/vista/allergies' };
    const result = sanitizeAuditDetail(detail);
    expect(result!.patientDfn).toBe('[REDACTED]');
    expect(result!.route).toBe('/vista/allergies');
  });

  it('redacts mrn from detail objects', () => {
    const detail = { mrn: 'MRN-12345', status: 'ok' };
    const result = sanitizeAuditDetail(detail);
    expect(result!.mrn).toBe('[REDACTED]');
    expect(result!.status).toBe('ok');
  });

  it('handles nested detail objects', () => {
    const detail = {
      request: { dfn: '5', ssn: '111-22-3333' },
      response: { ok: true },
    };
    const result = sanitizeAuditDetail(detail);
    const request = result!.request as Record<string, unknown>;
    expect(request.dfn).toBe('[REDACTED]');
    expect(request.ssn).toBe('[REDACTED]');
    expect((result!.response as any).ok).toBe(true);
  });

  it('scrubs inline PHI patterns in string values', () => {
    const detail = { message: 'SSN: 555-66-7777, DOB: 1990-01-15' };
    const result = sanitizeAuditDetail(detail);
    expect(result!.message).not.toContain('555-66-7777');
    expect(result!.message).not.toContain('1990-01-15');
  });
});

/* ------------------------------------------------------------------ */
/* sanitizeForAudit                                                    */
/* ------------------------------------------------------------------ */

describe('sanitizeForAudit', () => {
  it('truncates long strings', () => {
    // Use a character that won't trigger any inline redact patterns
    const longStr = 'xyzzy '.repeat(100); // 600 chars of safe text
    const result = sanitizeForAudit(longStr);
    expect(typeof result).toBe('string');
    expect(result as string).toContain('[TRUNCATED]');
  });

  it('redacts PHI in objects', () => {
    const input = { dfn: '10', action: 'read' };
    const result = sanitizeForAudit(input) as Record<string, unknown>;
    expect(result.dfn).toBe('[REDACTED]');
    expect(result.action).toBe('read');
  });
});

/* ------------------------------------------------------------------ */
/* assertNoPhiInAttributes                                             */
/* ------------------------------------------------------------------ */

describe('assertNoPhiInAttributes', () => {
  it('does not throw for safe attributes', () => {
    expect(() => assertNoPhiInAttributes({ rpcName: 'ORWPT LIST', duration: 100 })).not.toThrow();
  });

  it('throws for PHI field in attributes', () => {
    expect(() => assertNoPhiInAttributes({ dfn: '3' })).toThrow(/PHI field/);
    expect(() => assertNoPhiInAttributes({ ssn: 'x' })).toThrow(/PHI field/);
  });

  it('throws for credential field in attributes', () => {
    expect(() => assertNoPhiInAttributes({ password: 'x' })).toThrow(/PHI field/);
  });
});

/* ------------------------------------------------------------------ */
/* assertNoPhiInMetricLabels                                           */
/* ------------------------------------------------------------------ */

describe('assertNoPhiInMetricLabels', () => {
  it('does not throw for safe labels', () => {
    expect(() => assertNoPhiInMetricLabels(['method', 'route', 'statusCode'])).not.toThrow();
  });

  it('throws for PHI label', () => {
    expect(() => assertNoPhiInMetricLabels(['dfn'])).toThrow(/PHI field/);
    expect(() => assertNoPhiInMetricLabels(['SSN'])).toThrow(/PHI field/);
  });
});
