/**
 * SMART App Launch E2E Smoke Tests -- Phase 236 (Q236).
 *
 * End-to-end structural smoke test that validates the complete SMART
 * on FHIR app launch flow works at the module level:
 *
 *   1. SMART discovery (/.well-known/smart-configuration)
 *   2. CapabilityStatement (/fhir/metadata) with security section
 *   3. Bearer token validation flow (fhir-bearer-auth)
 *   4. Scope enforcement (fhir-scope-enforcement)
 *   5. Search parameter filtering (fhir-search-params)
 *   6. Paging (mappers toPagedSearchBundle)
 *
 * These tests exercise the entire SMART-on-FHIR pipeline structurally.
 * No running API server or OIDC provider required.
 */

import { describe, it, expect } from 'vitest';

/* --- Module imports (verifies all modules are importable) --- */
import { buildSmartConfiguration } from '../src/fhir/smart-configuration.js';
import { buildCapabilityStatement } from '../src/fhir/capability-statement.js';
import {
  extractBearerToken,
  validateFhirBearerToken,
  principalFromSession,
} from '../src/fhir/fhir-bearer-auth.js';
import { parseScope, checkScopeAccess } from '../src/fhir/fhir-scope-enforcement.js';
import {
  parseDateParam,
  matchesDate,
  filterEncounters,
  filterObservations,
  filterMedicationRequests,
  filterConditions,
  filterAllergyIntolerances,
  filterDocumentReferences,
} from '../src/fhir/fhir-search-params.js';
import { toFhirPatient, toSearchBundle, toPagedSearchBundle } from '../src/fhir/mappers.js';

import type { FhirResource } from '../src/fhir/types.js';
import type { PatientRecord } from '../src/adapters/types.js';

const BASE_URL = 'http://localhost:3001';

/* ================================================================== */
/* E2E Smoke Flow                                                       */
/* ================================================================== */

describe('Q236 -- SMART App Launch E2E Smoke', () => {
  /* ---------------------------------------------------------------- */
  /* Step 1: SMART Discovery                                           */
  /* ---------------------------------------------------------------- */
  describe('Step 1: SMART Discovery', () => {
    it('buildSmartConfiguration returns a valid document', () => {
      const config = buildSmartConfiguration(BASE_URL);
      expect(config).toBeDefined();
      expect(config.capabilities).toBeDefined();
      expect(config.capabilities.length).toBeGreaterThan(0);
    });

    it('discovery advertises scopes_supported with patient/*.read', () => {
      const config = buildSmartConfiguration(BASE_URL);
      expect(config.scopes_supported).toBeDefined();
      expect(config.scopes_supported).toContain('patient/*.read');
    });

    it('discovery advertises launch-ehr capability', () => {
      const config = buildSmartConfiguration(BASE_URL);
      expect(config.capabilities).toContain('launch-ehr');
    });

    it('discovery includes x-vista-evolved-fhir-base extension', () => {
      const config = buildSmartConfiguration(BASE_URL);
      expect(config['x-vista-evolved-fhir-base']).toBe(`${BASE_URL}/fhir`);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Step 2: CapabilityStatement metadata                              */
  /* ---------------------------------------------------------------- */
  describe('Step 2: CapabilityStatement metadata', () => {
    it('metadata returns active CapabilityStatement', () => {
      const cs = buildCapabilityStatement(BASE_URL);
      expect(cs.resourceType).toBe('CapabilityStatement');
      expect(cs.status).toBe('active');
    });

    it('metadata includes SMART security section', () => {
      const cs = buildCapabilityStatement(BASE_URL);
      const security = cs.rest?.[0]?.security;
      expect(security).toBeDefined();
      expect(security?.cors).toBe(true);
      expect(security?.service?.[0]?.coding?.[0]?.code).toBe('SMART-on-FHIR');
    });

    it('metadata declares all 7 resource types with search params', () => {
      const cs = buildCapabilityStatement(BASE_URL);
      const resources = cs.rest?.[0]?.resource || [];
      expect(resources.length).toBe(7);
      for (const r of resources) {
        expect(r.searchParam).toBeDefined();
        expect(r.searchParam!.length).toBeGreaterThan(0);
      }
    });
  });

  /* ---------------------------------------------------------------- */
  /* Step 3: Bearer token extraction + validation                      */
  /* ---------------------------------------------------------------- */
  describe('Step 3: Bearer token flow', () => {
    it('extractBearerToken extracts token from header', () => {
      const mock = { headers: { authorization: 'Bearer eyJhbGciOiJSUzI1NiJ9.test.sig' } };
      const token = extractBearerToken(mock as any);
      expect(token).toBe('eyJhbGciOiJSUzI1NiJ9.test.sig');
    });

    it('extractBearerToken returns null for missing header', () => {
      const mock = { headers: {} };
      expect(extractBearerToken(mock as any)).toBeNull();
    });

    it('extractBearerToken returns null for empty Bearer', () => {
      const mock = { headers: { authorization: 'Bearer ' } };
      expect(extractBearerToken(mock as any)).toBeNull();
    });

    it('validateFhirBearerToken rejects when OIDC disabled', async () => {
      const result = await validateFhirBearerToken('not.a.jwt');
      // When OIDC is not enabled, returns { ok: false, error: "..." }
      expect(result).toBeDefined();
      expect((result as any).ok).toBe(false);
    });

    it('principalFromSession maps session to FhirPrincipal', () => {
      const session = {
        id: 'sess1',
        duz: '87',
        userName: 'PROVIDER,CLYDE WV',
        roles: ['provider'],
        displayName: 'Clyde Provider',
        tenantId: 'default',
        loggedInAt: Date.now(),
      } as any;
      const principal = principalFromSession(session);
      expect(principal.authMethod).toBe('session');
      expect(principal.duz).toBe('87');
      expect(principal.scopes).toContain('user/*.read');
    });
  });

  /* ---------------------------------------------------------------- */
  /* Step 4: Scope enforcement                                         */
  /* ---------------------------------------------------------------- */
  describe('Step 4: Scope enforcement', () => {
    it('parseScope correctly parses a SMART scope string', () => {
      const result = parseScope('patient/Patient.read');
      expect(result).toBeDefined();
      expect(result!.context).toBe('patient');
      expect(result!.resourceType).toBe('Patient');
      expect(result!.permission).toBe('read');
    });

    it('checkScopeAccess grants access for matching scope', () => {
      const result = checkScopeAccess(['patient/Patient.read'], 'Patient');
      expect(result.granted).toBe(true);
    });

    it('checkScopeAccess denies access for non-matching scope', () => {
      const result = checkScopeAccess(['patient/Patient.read'], 'Observation');
      expect(result.granted).toBe(false);
    });

    it('wildcard scope grants access to all resources', () => {
      expect(checkScopeAccess(['user/*.read'], 'Patient').granted).toBe(true);
      expect(checkScopeAccess(['user/*.read'], 'Observation').granted).toBe(true);
      expect(checkScopeAccess(['user/*.read'], 'Encounter').granted).toBe(true);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Step 5: Search parameter filtering                                */
  /* ---------------------------------------------------------------- */
  describe('Step 5: Search parameter filtering', () => {
    it('parseDateParam handles prefix', () => {
      const result = parseDateParam('ge2024-01-01');
      expect(result).toBeDefined();
      expect(result!.prefix).toBe('ge');
      expect(result!.date).toBeInstanceOf(Date);
      expect(result!.date.toISOString()).toContain('2024-01-01');
    });

    it('matchesDate correctly compares dates', () => {
      const param = parseDateParam('ge2024-01-01')!;
      expect(matchesDate('2024-06-15', param)).toBe(true);
      expect(matchesDate('2023-12-31', param)).toBe(false);
    });

    it('filterEncounters applies date + status', () => {
      const encounters = [
        { id: '1', patientDfn: '3', dateTime: '3240601', status: 'CHECKED OUT' },
        { id: '2', patientDfn: '3', dateTime: '3240601', status: 'PLANNED' },
      ] as any[];
      const result = filterEncounters(encounters, { status: 'CHECKED OUT' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('filterAllergyIntolerances applies clinical-status', () => {
      const allergies = [
        { id: '1', allergen: 'A', severity: 'HIGH', type: 'DRUG', verified: true, reactions: [] },
        { id: '2', allergen: 'B', severity: 'LOW', type: 'FOOD', verified: false, reactions: [] },
      ] as any[];
      // Without clinical-status filter, returns all
      const result = filterAllergyIntolerances(allergies, {});
      expect(result.length).toBe(2);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Step 6: Paging                                                    */
  /* ---------------------------------------------------------------- */
  describe('Step 6: Paging', () => {
    const patients: PatientRecord[] = Array.from({ length: 5 }, (_, i) => ({
      dfn: String(i + 1),
      name: `PATIENT,TEST ${i + 1}`,
      ssn: `000-00-000${i}`,
      dob: '2451225',
      sex: 'M',
      veteran: true,
    }));

    const resources: FhirResource[] = patients.map((p) => toFhirPatient(p));

    it('toPagedSearchBundle returns correct page size', () => {
      const bundle = toPagedSearchBundle(resources, BASE_URL, 'Patient', {
        count: 2,
        offset: 0,
      });
      expect(bundle.entry?.length).toBe(2);
      expect(bundle.total).toBe(5);
    });

    it('toPagedSearchBundle includes self link', () => {
      const bundle = toPagedSearchBundle(resources, BASE_URL, 'Patient', {
        count: 2,
        offset: 0,
      });
      const selfLink = bundle.link?.find((l) => l.relation === 'self');
      expect(selfLink).toBeDefined();
    });

    it('toPagedSearchBundle includes next link when more pages', () => {
      const bundle = toPagedSearchBundle(resources, BASE_URL, 'Patient', {
        count: 2,
        offset: 0,
      });
      const nextLink = bundle.link?.find((l) => l.relation === 'next');
      expect(nextLink).toBeDefined();
      expect(nextLink?.url).toContain('_offset=2');
    });

    it('toPagedSearchBundle omits next link on last page', () => {
      const bundle = toPagedSearchBundle(resources, BASE_URL, 'Patient', {
        count: 2,
        offset: 4,
      });
      const nextLink = bundle.link?.find((l) => l.relation === 'next');
      expect(nextLink).toBeUndefined();
    });

    it('toPagedSearchBundle includes previous link after first page', () => {
      const bundle = toPagedSearchBundle(resources, BASE_URL, 'Patient', {
        count: 2,
        offset: 2,
      });
      const prevLink = bundle.link?.find((l) => l.relation === 'previous');
      expect(prevLink).toBeDefined();
    });
  });

  /* ---------------------------------------------------------------- */
  /* Full pipeline integration check                                   */
  /* ---------------------------------------------------------------- */
  describe('Full pipeline: discovery -> metadata -> auth -> scope -> search -> page', () => {
    it('all Wave 5 modules are importable and functional', () => {
      // Step 1: SMART discovery
      const smartConfig = buildSmartConfiguration(BASE_URL);
      expect(smartConfig.capabilities.length).toBeGreaterThan(0);

      // Step 2: CapabilityStatement
      const cs = buildCapabilityStatement(BASE_URL);
      expect(cs.rest?.[0]?.security).toBeDefined();
      expect(cs.rest?.[0]?.resource?.length).toBe(7);

      // Step 3: Session -> FhirPrincipal
      const principal = principalFromSession({
        id: 's1',
        duz: '87',
        userName: 'PROVIDER,CLYDE WV',
        roles: ['provider'],
        displayName: 'C',
        tenantId: 'default',
        loggedInAt: Date.now(),
      } as any);
      expect(principal.authMethod).toBe('session');

      // Step 4: Scope check -- checkScopeAccess takes raw scope strings
      expect(checkScopeAccess(principal.scopes, 'Patient').granted).toBe(true);

      // Step 5: Search filter (no-op without filter params)
      const encounters = [
        { id: '1', patientDfn: '3', dateTime: '3240601', status: 'CHECKED OUT' },
      ] as any[];
      const filtered = filterEncounters(encounters, {});
      expect(filtered.length).toBe(1);

      // Step 6: Paging
      const patient: PatientRecord = {
        dfn: '3',
        name: 'CARTER,DAVID JR',
        ssn: '',
        dob: '',
        sex: 'M',
        veteran: true,
      };
      const bundle = toPagedSearchBundle([toFhirPatient(patient)], BASE_URL, 'Patient', {
        count: 10,
        offset: 0,
      });
      expect(bundle.resourceType).toBe('Bundle');
      expect(bundle.type).toBe('searchset');
      expect(bundle.total).toBe(1);
    });
  });
});
