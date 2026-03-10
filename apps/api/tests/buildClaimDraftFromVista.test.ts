/**
 * buildClaimDraftFromVista.test.ts -- Phase 42 Unit Tests
 *
 * Tests the claim draft builder with stubbed VistA responses.
 * No real VistA connection needed.
 */

import { describe, it, expect } from 'vitest';
import {
  buildClaimDraftFromVista,
  getVistaCoverage,
  parseEncounters,
  parseDiagnoses,
  parseProcedures,
  parseInsurance,
  type RpcCaller,
  type ClaimDraftResult,
} from '../src/rcm/vistaBindings/buildClaimDraftFromVista.js';

/* -- Stub RPC Caller ---------------------------------------- */

function createStubRpc(responses: Record<string, string[]>): RpcCaller {
  return {
    async call(rpcName: string, _params: string[]): Promise<string[]> {
      return responses[rpcName] ?? [];
    },
  };
}

function createFailingRpc(failRpc: string): RpcCaller {
  return {
    async call(rpcName: string, _params: string[]): Promise<string[]> {
      if (rpcName === failRpc) throw new Error(`RPC ${rpcName} failed`);
      return [];
    },
  };
}

/* -- Parser Tests ------------------------------------------- */

describe('parseEncounters', () => {
  it('parses visit lines', () => {
    const lines = [
      '100^3250115^DR OFFICE^MEDICINE^OUTPATIENT^COMPLETE',
      '101^3250120^LAB^LAB WORK^OUTPATIENT^COMPLETE',
    ];
    const result = parseEncounters(lines);
    expect(result).toHaveLength(2);
    expect(result[0].visitIen).toBe('100');
    expect(result[0].dateTime).toBe('3250115');
    expect(result[0].location).toBe('DR OFFICE');
    expect(result[1].visitIen).toBe('101');
  });

  it('filters empty lines', () => {
    const lines = ['', '  ', '100^3250115^CLINIC^SVC^OUT^OK'];
    expect(parseEncounters(lines)).toHaveLength(1);
  });

  it('returns empty for no data', () => {
    expect(parseEncounters([])).toHaveLength(0);
  });
});

describe('parseDiagnoses', () => {
  it('parses diagnosis lines with qualifiers', () => {
    const lines = ['J06.9^ACUTE UPPER RESPIRATORY INFECTION', 'E11.9^TYPE 2 DIABETES MELLITUS'];
    const result = parseDiagnoses(lines, '100');
    expect(result).toHaveLength(2);
    expect(result[0].code).toBe('J06.9');
    expect(result[0].qualifier).toBe('principal');
    expect(result[1].qualifier).toBe('other');
    expect(result[0].visitIen).toBe('100');
  });

  it('filters empty diagnosis lines', () => {
    expect(parseDiagnoses(['', '  '], '100')).toHaveLength(0);
  });
});

describe('parseProcedures', () => {
  it('parses procedure lines', () => {
    const lines = ['99213^OFFICE VISIT LEVEL 3^25', '36415^VENIPUNCTURE^'];
    const result = parseProcedures(lines, '100');
    expect(result).toHaveLength(2);
    expect(result[0].cptCode).toBe('99213');
    expect(result[0].modifiers).toEqual(['25']);
    expect(result[1].cptCode).toBe('36415');
    expect(result[1].modifiers).toEqual([]);
  });
});

describe('parseInsurance', () => {
  it('parses insurance lines', () => {
    const lines = ['1^BLUE CROSS^GRP001^SUB123^20250101^20261231^ACTIVE'];
    const result = parseInsurance(lines);
    expect(result).toHaveLength(1);
    expect(result[0].insuranceName).toBe('BLUE CROSS');
    expect(result[0].subscriberId).toBe('SUB123');
  });

  it('handles missing fields', () => {
    const lines = ['1^MEDICARE^^^'];
    const result = parseInsurance(lines);
    expect(result).toHaveLength(1);
    expect(result[0].groupNumber).toBe('');
  });
});

/* -- Builder Tests ------------------------------------------ */

describe('buildClaimDraftFromVista', () => {
  const fullStub = createStubRpc({
    'ORWPCE VISIT': [
      '100^3250115^DR OFFICE^MEDICINE^OUTPATIENT^COMPLETE',
      '101^3250120^LAB^LAB WORK^OUTPATIENT^COMPLETE',
    ],
    'IBCN INSURANCE QUERY': ['1^BLUE CROSS^GRP001^SUB123^20250101^20261231^ACTIVE'],
    'ORWPCE DIAG': ['J06.9^ACUTE URI^', 'E11.9^DIABETES TYPE 2^'],
    'ORWPCE PROC': ['99213^OFFICE VISIT L3^25'],
  });

  it('builds claim drafts from encounters', async () => {
    const result = await buildClaimDraftFromVista(fullStub, '3', 'test-actor');
    expect(result.ok).toBe(true);
    expect(result.encountersFound).toBe(2);
    expect(result.candidates.length).toBeGreaterThan(0);
  });

  it('populates claim with diagnoses and procedures', async () => {
    const result = await buildClaimDraftFromVista(fullStub, '3', 'test-actor', {
      encounterId: '100',
    });
    expect(result.candidates).toHaveLength(1);
    const c = result.candidates[0];
    expect(c.claim.diagnoses.length).toBeGreaterThan(0);
    expect(c.claim.lines.length).toBeGreaterThan(0);
    expect(c.claim.payerName).toBe('BLUE CROSS');
    expect(c.claim.subscriberId).toBe('SUB123');
  });

  it('annotates missing IB charges', async () => {
    const result = await buildClaimDraftFromVista(fullStub, '3', 'test-actor', {
      encounterId: '100',
    });
    const c = result.candidates[0];
    expect(c.missingFields).toContain('ibChargeAmount');
    expect(c.sourceMissing.find((s) => s.field === 'ibChargeAmount')).toBeTruthy();
  });

  it('annotates missing insurance when absent', async () => {
    const noInsRpc = createStubRpc({
      'ORWPCE VISIT': ['100^3250115^DR OFFICE^MED^OUT^OK'],
      'IBCN INSURANCE QUERY': [],
      'ORWPCE DIAG': [],
      'ORWPCE PROC': [],
    });
    const result = await buildClaimDraftFromVista(noInsRpc, '3', 'test-actor');
    const c = result.candidates[0];
    expect(c.missingFields).toContain('subscriberId');
    expect(c.missingFields).toContain('payerName');
  });

  it('annotates missing diagnoses and procedures', async () => {
    const emptyRpc = createStubRpc({
      'ORWPCE VISIT': ['100^3250115^DR OFFICE^MED^OUT^OK'],
      'IBCN INSURANCE QUERY': ['1^AETNA^^^'],
      'ORWPCE DIAG': [],
      'ORWPCE PROC': [],
    });
    const result = await buildClaimDraftFromVista(emptyRpc, '3', 'test-actor');
    const c = result.candidates[0];
    expect(c.missingFields).toContain('diagnoses');
    expect(c.missingFields).toContain('procedures');
  });

  it('returns empty when no encounters found', async () => {
    const emptyRpc = createStubRpc({ 'ORWPCE VISIT': [] });
    const result = await buildClaimDraftFromVista(emptyRpc, '3', 'test-actor');
    expect(result.ok).toBe(true);
    expect(result.candidates).toHaveLength(0);
    expect(result.encountersFound).toBe(0);
  });

  it('handles encounter fetch failure gracefully', async () => {
    const failRpc = createFailingRpc('ORWPCE VISIT');
    const result = await buildClaimDraftFromVista(failRpc, '3', 'test-actor');
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Failed to fetch encounters');
  });

  it('handles insurance failure gracefully', async () => {
    const failInsRpc: RpcCaller = {
      async call(rpcName: string): Promise<string[]> {
        if (rpcName === 'IBCN INSURANCE QUERY') throw new Error('timeout');
        if (rpcName === 'ORWPCE VISIT') return ['100^3250115^CLINIC^SVC^OUT^OK'];
        return [];
      },
    };
    const result = await buildClaimDraftFromVista(failInsRpc, '3', 'test-actor');
    expect(result.ok).toBe(true);
    expect(result.errors).toContain('Insurance query failed -- proceeding without coverage data');
  });

  it('filters by date range', async () => {
    const result = await buildClaimDraftFromVista(fullStub, '3', 'test-actor', {
      dateFrom: '3250118',
    });
    // Only the second encounter (3250120) should match
    expect(result.candidates.length).toBeLessThanOrEqual(1);
  });

  it('tracks RPCs called', async () => {
    const result = await buildClaimDraftFromVista(fullStub, '3', 'test-actor', {
      encounterId: '100',
    });
    expect(result.rpcsCalled).toContain('ORWPCE VISIT');
    expect(result.rpcsCalled).toContain('IBCN INSURANCE QUERY');
  });

  it('claim has draft status', async () => {
    const result = await buildClaimDraftFromVista(fullStub, '3', 'test-actor', {
      encounterId: '100',
    });
    expect(result.candidates[0].claim.status).toBe('draft');
  });

  it('claim has audit trail', async () => {
    const result = await buildClaimDraftFromVista(fullStub, '3', 'test-actor', {
      encounterId: '100',
    });
    expect(result.candidates[0].claim.auditTrail.length).toBeGreaterThan(0);
    expect(result.candidates[0].claim.auditTrail[0].action).toBe('claim.created');
  });
});

/* -- Coverage Tests ----------------------------------------- */

describe('getVistaCoverage', () => {
  it('returns policies when available', async () => {
    const rpc = createStubRpc({
      'IBCN INSURANCE QUERY': ['1^BLUE CROSS^GRP001^SUB123^^'],
    });
    const result = await getVistaCoverage(rpc, '3');
    expect(result.ok).toBe(true);
    expect(result.policies).toHaveLength(1);
  });

  it('handles failure gracefully', async () => {
    const rpc = createFailingRpc('IBCN INSURANCE QUERY');
    const result = await getVistaCoverage(rpc, '3');
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

/* -- No PHI Logging Tests ----------------------------------- */

describe('no PHI in output', () => {
  it('claim draft does not contain SSN, DOB, or patient name in claim ID', async () => {
    const rpc = createStubRpc({
      'ORWPCE VISIT': ['100^3250115^CLINIC^SVC^OUT^OK'],
      'IBCN INSURANCE QUERY': [],
      'ORWPCE DIAG': [],
      'ORWPCE PROC': [],
    });
    const result = await buildClaimDraftFromVista(rpc, '3', 'test-actor');
    const c = result.candidates[0];

    // Claim ID should be a UUID, not containing patient identifiers
    expect(c.claim.id).toMatch(/^[0-9a-f-]{36}$/);
    // patientName should be undefined (not populated from RPC)
    expect(c.claim.patientName).toBeUndefined();
    // patientDob should be undefined
    expect(c.claim.patientDob).toBeUndefined();
  });

  it('errors do not contain credentials or file paths', async () => {
    const rpc = createFailingRpc('ORWPCE VISIT');
    const result = await buildClaimDraftFromVista(rpc, '3', 'test-actor');
    const errStr = result.errors.join(' ');
    expect(errStr).not.toMatch(/PROV123|password|\.env/i);
  });

  it('missingFields use generic labels, no PHI', async () => {
    const rpc = createStubRpc({
      'ORWPCE VISIT': ['100^3250115^CLINIC^SVC^OUT^OK'],
      'IBCN INSURANCE QUERY': [],
      'ORWPCE DIAG': [],
      'ORWPCE PROC': [],
    });
    const result = await buildClaimDraftFromVista(rpc, '3', 'test-actor');
    const c = result.candidates[0];
    for (const m of c.sourceMissing) {
      // Verify no SSN patterns
      expect(m.reason).not.toMatch(/\d{3}-\d{2}-\d{4}/);
      // Verify no patient names
      expect(m.reason).not.toMatch(/PATIENT,/i);
    }
  });
});
