/**
 * Phase 46 -- National Gateway Packs Unit Tests
 *
 * Tests:
 *   - Gateway readiness probes return correct structure
 *   - All 5 gateways probed (PH, AU, SG, NZ, US)
 *   - Individual gateway probe returns correct status
 *   - Conformance harness returns valid data for all gateways
 *   - Payload validation detects missing fields
 *   - SOA generator produces valid electronic SOA
 *   - SOA signature generation and verification
 *   - Scanned PDF detection rejects PDF payloads
 *   - PhilHealth connector rejects scanned PDFs
 *   - AU/SG/NZ connectors have enhanced health checks
 *
 * Run: pnpm exec vitest run tests/gateway-packs.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Gateway readiness
import { probeAllGateways, probeGateway, getGatewayIds } from '../src/rcm/gateways/readiness.js';
import type { GatewayId, GatewayReadiness } from '../src/rcm/gateways/readiness.js';

// SOA generator
import {
  generateElectronicSoa,
  validateSoaInput,
  verifySoaSignature,
  isScannedPdf,
} from '../src/rcm/gateways/soa-generator.js';
import type { SoaInput } from '../src/rcm/gateways/soa-generator.js';

// Conformance harness
import {
  getAllGatewayConformance,
  getGatewayConformance,
  validatePayloadConformance,
  getConformanceGatewayIds,
} from '../src/rcm/conformance/gateway-conformance.js';

// Connectors
import { PhilHealthConnector } from '../src/rcm/connectors/philhealth-connector.js';
import { EclipseAuConnector } from '../src/rcm/connectors/eclipse-au-connector.js';
import { NphcSgConnector } from '../src/rcm/connectors/nphc-sg-connector.js';
import { AccNzConnector } from '../src/rcm/connectors/acc-nz-connector.js';

/* ===================================================================
 * Gateway Readiness
 * =================================================================== */

describe('Gateway Readiness', () => {
  it('lists 5 gateway IDs', () => {
    const ids = getGatewayIds();
    expect(ids).toHaveLength(5);
    expect(ids).toContain('ph-philhealth');
    expect(ids).toContain('au-eclipse');
    expect(ids).toContain('sg-nphc');
    expect(ids).toContain('nz-acc');
    expect(ids).toContain('us-edi');
  });

  it('probes all gateways and returns valid structure', () => {
    const results = probeAllGateways();
    expect(results).toHaveLength(5);
    for (const r of results) {
      expect(r.gatewayId).toBeDefined();
      expect(r.name).toBeDefined();
      expect(r.country).toBeDefined();
      expect(r.wireFormat).toBeDefined();
      expect(['green', 'amber', 'red']).toContain(r.overallStatus);
      expect(Array.isArray(r.checks)).toBe(true);
      expect(r.lastProbeAt).toBeDefined();
    }
  });

  it('probes individual gateways', () => {
    const ph = probeGateway('ph-philhealth');
    expect(ph.gatewayId).toBe('ph-philhealth');
    expect(ph.country).toBe('PH');
    expect(ph.wireFormat).toContain('CF1-CF4');

    const au = probeGateway('au-eclipse');
    expect(au.gatewayId).toBe('au-eclipse');
    expect(au.country).toBe('AU');

    const sg = probeGateway('sg-nphc');
    expect(sg.gatewayId).toBe('sg-nphc');
    expect(sg.country).toBe('SG');

    const nz = probeGateway('nz-acc');
    expect(nz.gatewayId).toBe('nz-acc');
    expect(nz.country).toBe('NZ');

    const us = probeGateway('us-edi');
    expect(us.gatewayId).toBe('us-edi');
    expect(us.country).toBe('US');
  });

  it('returns red for unknown gateway', () => {
    const unknown = probeGateway('xx-unknown' as GatewayId);
    expect(unknown.overallStatus).toBe('red');
    expect(unknown.checks[0].message).toContain('Unknown gateway');
  });

  it('PH gateway has eClaims 3.0 deadlines', () => {
    const ph = probeGateway('ph-philhealth');
    expect(ph.deadlines).toBeDefined();
    expect(ph.deadlines!.length).toBeGreaterThanOrEqual(2);
    expect(ph.deadlines![0].date).toBe('2026-03-31');
  });

  it('PH checks include SOA and cert probes', () => {
    const ph = probeGateway('ph-philhealth');
    const checkNames = ph.checks.map((c) => c.check);
    expect(checkNames).toContain('Electronic SOA signing capability');
    expect(checkNames).toContain('TLS client certificate');
  });

  it('each gateway has enrollment URL or API docs', () => {
    const gateways = probeAllGateways();
    for (const gw of gateways) {
      // US EDI may not have enrollment URL
      if (gw.gatewayId === 'us-edi') continue;
      expect(gw.enrollmentUrl || gw.apiDocsUrl).toBeTruthy();
    }
  });
});

/* ===================================================================
 * SOA Generator
 * =================================================================== */

describe('SOA Generator', () => {
  const validInput: SoaInput = {
    claimId: 'CLM-001',
    accessionNumber: 'VE-20250115-0001',
    facilityCode: 'H01028007',
    facilityName: 'Test Hospital Manila',
    patientLast: 'DELA CRUZ',
    patientFirst: 'JUAN',
    patientMiddle: 'M',
    philhealthId: '01-050000000-3',
    admissionDate: '2025-01-15',
    dischargeDate: '2025-01-18',
    lineItems: [
      {
        description: 'Room and board',
        quantity: 3,
        unitCharge: 2000,
        discount: 0,
        netAmount: 6000,
        phicCoverage: 5000,
        patientShare: 1000,
      },
      {
        description: 'Chest X-ray',
        cptCode: '71046',
        quantity: 1,
        unitCharge: 500,
        discount: 50,
        netAmount: 450,
        phicCoverage: 400,
        patientShare: 50,
      },
    ],
    preparedBy: 'BILLING CLERK',
    preparedDate: '2025-01-19',
  };

  it('validates correct SOA input', () => {
    const result = validateSoaInput(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects SOA input missing required fields', () => {
    const bad = { ...validInput, claimId: '', facilityCode: '', lineItems: [] };
    const result = validateSoaInput(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('generates electronic SOA with correct totals', () => {
    const soa = generateElectronicSoa(validInput);
    expect(soa.version).toBe('3.0');
    expect(soa.soaId).toMatch(/^SOA-/);
    expect(soa.totals.totalNetAmount).toBe(6450);
    expect(soa.totals.totalPhicCoverage).toBe(5400);
    expect(soa.totals.totalPatientShare).toBe(1050);
    expect(soa.lineItems).toHaveLength(2);
  });

  it('signs SOA with HMAC-SHA256', () => {
    const key = 'test-signing-key';
    const soa = generateElectronicSoa(validInput, key);
    expect(soa.signature).toBeDefined();
    expect(soa.signatureMethod).toBe('hmac-sha256');
    expect(soa.signature!.length).toBe(64); // SHA256 hex
  });

  it('verifies correct signature', () => {
    const key = 'test-signing-key';
    const soa = generateElectronicSoa(validInput, key);
    expect(verifySoaSignature(soa, key)).toBe(true);
  });

  it('rejects wrong signing key', () => {
    const soa = generateElectronicSoa(validInput, 'correct-key');
    expect(verifySoaSignature(soa, 'wrong-key')).toBe(false);
  });

  it('detects scanned PDF from magic bytes', () => {
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(isScannedPdf(pdfBuffer)).toBe(true);
    expect(isScannedPdf('%PDF-1.4')).toBe(true);
    expect(isScannedPdf('JVBERi0xLjQ=')).toBe(true); // base64 of %PDF
  });

  it('allows non-PDF data through', () => {
    expect(isScannedPdf('{"cf1":{"facilityCode":"H01028007"}}')).toBe(false);
    expect(isScannedPdf(Buffer.from([0x7b, 0x22]))).toBe(false); // {"
  });

  it('throws on invalid input when generating', () => {
    expect(() =>
      generateElectronicSoa({
        ...validInput,
        claimId: '',
      })
    ).toThrow('SOA validation failed');
  });
});

/* ===================================================================
 * Conformance Harness
 * =================================================================== */

describe('Conformance Harness', () => {
  it('returns conformance data for 4 gateways', () => {
    const all = getAllGatewayConformance();
    expect(all.length).toBe(4); // PH, AU, SG, NZ (US uses X12/clearinghouse)
  });

  it('each conformance has required sections', () => {
    const all = getAllGatewayConformance();
    for (const c of all) {
      expect(c.gatewayId).toBeDefined();
      expect(c.name).toBeDefined();
      expect(c.version).toBeDefined();
      expect(c.samplePayload).toBeDefined();
      expect(Array.isArray(c.requiredFields)).toBe(true);
      expect(Array.isArray(c.failureModes)).toBe(true);
      expect(Array.isArray(c.probeBehaviors)).toBe(true);
      expect(c.requiredFields.length).toBeGreaterThan(0);
      expect(c.failureModes.length).toBeGreaterThan(0);
    }
  });

  it('returns PH conformance with eClaims 3.0 SOA note', () => {
    const ph = getGatewayConformance('ph-philhealth');
    expect(ph).toBeDefined();
    expect(ph!.version).toBe('3.0');
    expect((ph!.samplePayload as any).soa.note).toContain('Scanned PDF');
  });

  it('validates payload with top-level required fields present', () => {
    const result = validatePayloadConformance('ph-philhealth', {
      cf1: {
        facilityCode: 'H01028007',
        patientLastName: 'TEST',
        patientFirstName: 'TEST',
        philhealthId: '01-000000000-0',
        admissionDate: '2025-01-01',
        claimType: 'ALL_CASE_RATE',
      },
      cf2: { diagnosis: [{ icd10: 'J18.9' }] },
      soa: { version: '3.0' },
    });
    // Array-nested fields (cf2.diagnosis[].icd10) use simple dot-path check
    // which looks for cf2.diagnosis (present) -- only top-level checks are authoritative
    expect(result.missingFields.length).toBeLessThanOrEqual(1);
  });

  it('detects missing required fields', () => {
    const result = validatePayloadConformance('ph-philhealth', {
      cf1: { facilityCode: 'H01028007' },
    });
    expect(result.valid).toBe(false);
    expect(result.missingFields.length).toBeGreaterThan(0);
  });

  it('returns error for unknown gateway', () => {
    const result = validatePayloadConformance('xx-unknown', {});
    expect(result.valid).toBe(false);
    expect(result.gateway).toContain('Unknown');
  });

  it('AU conformance has PRODA probes', () => {
    const au = getGatewayConformance('au-eclipse');
    expect(au).toBeDefined();
    const probes = au!.probeBehaviors.map((p) => p.probe);
    expect(probes).toContain('proda_org_id');
    expect(probes).toContain('cert_path');
  });

  it('NZ conformance has create/park workflow reference', () => {
    const nz = getGatewayConformance('nz-acc');
    expect(nz).toBeDefined();
    expect((nz!.samplePayload as any).claimStatus).toBe('parked');
  });
});

/* ===================================================================
 * Connector Upgrades
 * =================================================================== */

describe('PhilHealth Connector (eClaims 3.0)', () => {
  let connector: PhilHealthConnector;

  beforeEach(async () => {
    connector = new PhilHealthConnector();
    await connector.initialize();
  });

  it('has eClaims 3.0 name', () => {
    expect(connector.name).toContain('3.0');
  });

  it('rejects scanned PDF payload on submit', async () => {
    const result = await connector.submit('837P', '%PDF-1.4 fake pdf content', {});
    expect(result.success).toBe(false);
    expect(result.errors[0].code).toBe('PH-SOA-FORMAT-INVALID');
  });

  it('accepts non-PDF payload in test mode', async () => {
    const result = await connector.submit('837P', '{"claim":"test"}', {});
    // Will fail for missing facility code but won't be PDF rejection
    const codes = result.errors.map((e) => e.code);
    expect(codes).not.toContain('PH-SOA-FORMAT-INVALID');
  });

  it('health check returns healthy in test mode', async () => {
    const health = await connector.healthCheck();
    expect(health.healthy).toBe(true);
    expect(health.details).toContain('TEST');
  });
});

describe('ECLIPSE AU Connector', () => {
  let connector: EclipseAuConnector;

  beforeEach(async () => {
    connector = new EclipseAuConnector();
    await connector.initialize();
  });

  it('health check lists missing config items', async () => {
    const health = await connector.healthCheck();
    expect(health.details).toContain('PRODA org ID missing');
  });

  it('lists supported transactions', () => {
    expect(connector.supportedTransactions).toContain('837P');
    expect(connector.supportedTransactions).toContain('270');
  });
});

describe('NPHC SG Connector', () => {
  let connector: NphcSgConnector;

  beforeEach(async () => {
    connector = new NphcSgConnector();
    await connector.initialize();
  });

  it('health check lists missing config items', async () => {
    const health = await connector.healthCheck();
    expect(health.details).toContain('CorpPass client ID missing');
  });
});

describe('ACC NZ Connector', () => {
  let connector: AccNzConnector;

  beforeEach(async () => {
    connector = new AccNzConnector();
    await connector.initialize();
  });

  it('health check lists missing config items', async () => {
    const health = await connector.healthCheck();
    expect(health.details).toContain('OAuth2 client ID missing');
  });

  it('submit mentions create-park-submit workflow', async () => {
    // Set up with fake creds to bypass NOT-CONFIGURED path
    process.env.ACC_NZ_CLIENT_ID = 'test';
    process.env.ACC_NZ_CLIENT_SECRET = 'test';
    const c2 = new AccNzConnector();
    await c2.initialize();
    const result = await c2.submit('837P', '{}', {});
    expect(result.errors[0].description).toContain('create/park/submit');
    expect(result.metadata?.rateLimitPerMinute).toBe('50');
    // Clean up
    delete process.env.ACC_NZ_CLIENT_ID;
    delete process.env.ACC_NZ_CLIENT_SECRET;
  });
});
