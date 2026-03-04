/**
 * Phase 232 -- SMART Scope Enforcement Tests.
 *
 * Tests for SMART-on-FHIR scope parsing and enforcement.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  parseScope,
  checkScopeAccess,
  enforceFhirScope,
} from '../src/fhir/fhir-scope-enforcement.js';

vi.mock('../src/lib/logger.js', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

/* ================================================================== */
/* parseScope                                                           */
/* ================================================================== */

describe('parseScope', () => {
  it('parses patient/Patient.read', () => {
    const s = parseScope('patient/Patient.read');
    expect(s).toEqual({ context: 'patient', resourceType: 'Patient', permission: 'read' });
  });

  it('parses user/*.read (wildcard resource)', () => {
    const s = parseScope('user/*.read');
    expect(s).toEqual({ context: 'user', resourceType: '*', permission: 'read' });
  });

  it('parses system/Observation.*', () => {
    const s = parseScope('system/Observation.*');
    expect(s).toEqual({ context: 'system', resourceType: 'Observation', permission: '*' });
  });

  it('parses patient/*.* (full wildcard)', () => {
    const s = parseScope('patient/*.*');
    expect(s).toEqual({ context: 'patient', resourceType: '*', permission: '*' });
  });

  it('returns null for openid (non-FHIR scope)', () => {
    expect(parseScope('openid')).toBeNull();
  });

  it('returns null for profile (non-FHIR scope)', () => {
    expect(parseScope('profile')).toBeNull();
  });

  it('returns null for fhirUser (non-FHIR scope)', () => {
    expect(parseScope('fhirUser')).toBeNull();
  });

  it('returns null for launch/patient (launch scope)', () => {
    expect(parseScope('launch/patient')).toBeNull();
  });

  it('returns null for malformed scope', () => {
    expect(parseScope('patient/')).toBeNull();
    expect(parseScope('/Patient.read')).toBeNull();
    expect(parseScope('patient/Patient')).toBeNull();
  });
});

/* ================================================================== */
/* checkScopeAccess                                                     */
/* ================================================================== */

describe('checkScopeAccess', () => {
  it('grants access with exact resource scope', () => {
    const result = checkScopeAccess(['openid', 'profile', 'patient/Patient.read'], 'Patient');
    expect(result.granted).toBe(true);
    expect(result.context).toBe('patient');
    expect(result.matchedScope).toBe('patient/Patient.read');
  });

  it('grants access with wildcard resource scope', () => {
    const result = checkScopeAccess(['user/*.read'], 'AllergyIntolerance');
    expect(result.granted).toBe(true);
    expect(result.context).toBe('user');
  });

  it('grants access with wildcard permission scope', () => {
    const result = checkScopeAccess(['patient/Observation.*'], 'Observation');
    expect(result.granted).toBe(true);
  });

  it('denies when no matching scope', () => {
    const result = checkScopeAccess(
      ['patient/Patient.read', 'patient/Observation.read'],
      'MedicationRequest'
    );
    expect(result.granted).toBe(false);
    expect(result.context).toBeNull();
  });

  it('denies with write-only scope on read request', () => {
    const result = checkScopeAccess(['patient/Patient.write'], 'Patient');
    expect(result.granted).toBe(false);
  });

  it('prefers exact resource match over wildcard', () => {
    const result = checkScopeAccess(['user/*.read', 'patient/Patient.read'], 'Patient');
    expect(result.granted).toBe(true);
    // Should prefer the exact patient/Patient.read match
    expect(result.matchedScope).toBe('patient/Patient.read');
  });

  it('handles empty scopes list', () => {
    const result = checkScopeAccess([], 'Patient');
    expect(result.granted).toBe(false);
  });
});

/* ================================================================== */
/* enforceFhirScope                                                     */
/* ================================================================== */

describe('enforceFhirScope', () => {
  function makeMockReply() {
    const sent: { status?: number; body?: any } = {};
    const reply: any = {
      sent: false,
      status(code: number) {
        sent.status = code;
        return reply;
      },
      header() {
        return reply;
      },
      send(body: any) {
        sent.body = body;
        reply.sent = true;
        return reply;
      },
    };
    return { reply, sent };
  }

  it('allows session-authenticated users unconditionally', () => {
    const request: any = {
      fhirPrincipal: {
        authMethod: 'session',
        sub: '87',
        duz: '87',
        userName: 'PROVIDER,CLYDE',
        roles: ['admin'],
        scopes: ['user/*.read'],
        tenantId: 'default',
      },
    };
    const { reply } = makeMockReply();
    expect(enforceFhirScope(request, reply, 'Patient', '3')).toBe(true);
  });

  it('allows when no fhirPrincipal (fallback)', () => {
    const request: any = {};
    const { reply } = makeMockReply();
    expect(enforceFhirScope(request, reply, 'Patient')).toBe(true);
  });

  it('allows bearer with matching patient scope', () => {
    const request: any = {
      fhirPrincipal: {
        authMethod: 'bearer',
        sub: 'u-1',
        duz: '87',
        userName: 'PROVIDER',
        roles: ['provider'],
        scopes: ['openid', 'patient/Patient.read', 'patient/Observation.read'],
        tenantId: 'default',
        patientContext: '3',
      },
    };
    const { reply } = makeMockReply();
    expect(enforceFhirScope(request, reply, 'Patient', '3')).toBe(true);
  });

  it('denies bearer without matching scope', () => {
    const request: any = {
      fhirPrincipal: {
        authMethod: 'bearer',
        sub: 'u-1',
        duz: '87',
        userName: 'PROVIDER',
        roles: ['provider'],
        scopes: ['openid', 'patient/Patient.read'],
        tenantId: 'default',
      },
    };
    const { reply, sent } = makeMockReply();
    expect(enforceFhirScope(request, reply, 'MedicationRequest', '3')).toBe(false);
    expect(sent.status).toBe(403);
    expect(sent.body.resourceType).toBe('OperationOutcome');
    expect(sent.body.issue[0].code).toBe('forbidden');
  });

  it('denies patient-scope access to wrong patient', () => {
    const request: any = {
      fhirPrincipal: {
        authMethod: 'bearer',
        sub: 'u-1',
        duz: '87',
        userName: 'PROVIDER',
        roles: ['provider'],
        scopes: ['patient/Patient.read', 'patient/*.read'],
        tenantId: 'default',
        patientContext: '3', // launch context = patient 3
      },
    };
    const { reply, sent } = makeMockReply();
    // Trying to access patient 5 with patient-context 3
    expect(enforceFhirScope(request, reply, 'Patient', '5')).toBe(false);
    expect(sent.status).toBe(403);
    expect(sent.body.issue[0].diagnostics).toContain('patient 3');
  });

  it('allows user-scope access to any patient', () => {
    const request: any = {
      fhirPrincipal: {
        authMethod: 'bearer',
        sub: 'u-1',
        duz: '87',
        userName: 'PROVIDER',
        roles: ['provider'],
        scopes: ['user/Patient.read', 'user/Observation.read'],
        tenantId: 'default',
        patientContext: '3',
      },
    };
    const { reply } = makeMockReply();
    // User-scope: can access any patient
    expect(enforceFhirScope(request, reply, 'Patient', '999')).toBe(true);
  });
});
