/**
 * Phase 44 — Payer Directory Engine Unit Tests
 *
 * Tests:
 *   - Authoritative importers produce valid payers
 *   - Normalization pipeline deduplicates and merges
 *   - Diff engine detects added/removed/modified
 *   - Routing engine resolves correct connector
 *   - Routing returns ROUTE_NOT_FOUND with remediation
 *   - Enrollment packet CRUD
 *   - Directory refresh end-to-end
 *
 * Run: pnpm exec vitest run tests/payer-directory.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Importers
import {
  runAllImporters, runImportersByCountry, listImporters, getImporter,
} from '../src/rcm/payerDirectory/importers/index.js';

// Normalization
import {
  normalizeImportResults, computeDiff, runDirectoryRefresh,
  getDirectoryPayer, listDirectoryPayers, getDirectoryStats, getRefreshHistory,
  getEnrollmentPacket, upsertEnrollmentPacket, listEnrollmentPackets,
  resetDirectoryStore,
} from '../src/rcm/payerDirectory/normalization.js';

// Routing
import { resolveRoute, isRouteNotFound } from '../src/rcm/payerDirectory/routing.js';

// Types
import type { DirectoryPayer, ImportResult, EnrollmentPacket } from '../src/rcm/payerDirectory/types.js';

// Payer registry (needed for routing fallback)
import { initPayerRegistry } from '../src/rcm/payer-registry/registry.js';

/* ─── Setup ──────────────────────────────────────────────────────── */

beforeEach(() => {
  resetDirectoryStore();
  initPayerRegistry();
});

/* ─── Importers ──────────────────────────────────────────────────── */

describe('Payer Directory Importers', () => {
  it('lists all registered importers', () => {
    const importers = listImporters();
    expect(importers.length).toBeGreaterThanOrEqual(6);
    for (const imp of importers) {
      expect(imp.id).toBeTruthy();
      expect(imp.name).toBeTruthy();
      expect(imp.country).toBeTruthy();
    }
  });

  it('getImporter returns importer by id', () => {
    const imp = getImporter('PH_InsuranceCommission_HMO');
    expect(imp).toBeDefined();
    expect(imp!.country).toBe('PH');
  });

  it('getImporter returns undefined for unknown id', () => {
    expect(getImporter('nonexistent')).toBeUndefined();
  });

  it('runs all importers and produces results', () => {
    const results = runAllImporters();
    expect(results.length).toBeGreaterThanOrEqual(6);
    for (const r of results) {
      expect(r.importerId).toBeTruthy();
      expect(r.payers.length).toBeGreaterThan(0);
    }
  });

  it('runs importers by country (PH)', () => {
    const results = runImportersByCountry('PH');
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const r of results) {
      // All payers from PH importers should be PH
      for (const p of r.payers) {
        expect(p.country).toBe('PH');
      }
    }
  });

  it('PH importer includes PhilHealth national payer', () => {
    const results = runImportersByCountry('PH');
    const allPayers = results.flatMap(r => r.payers);
    const philhealth = allPayers.find(p => p.payerId === 'PH-PHILHEALTH');
    expect(philhealth).toBeDefined();
    expect(philhealth!.payerType).toBe('NATIONAL');
  });

  it('AU importer includes Medicare AU', () => {
    const results = runImportersByCountry('AU');
    const allPayers = results.flatMap(r => r.payers);
    const medicare = allPayers.find(p => p.payerId === 'AU-MEDICARE');
    expect(medicare).toBeDefined();
    expect(medicare!.payerType).toBe('NATIONAL');
  });

  it('US importer includes federal payers', () => {
    const results = runImportersByCountry('US');
    const allPayers = results.flatMap(r => r.payers);
    expect(allPayers.find(p => p.payerId === 'US-MEDICARE-A')).toBeDefined();
    expect(allPayers.find(p => p.payerId === 'US-MEDICARE-B')).toBeDefined();
    expect(allPayers.find(p => p.payerId === 'US-MEDICAID')).toBeDefined();
  });
});

/* ─── Normalization ──────────────────────────────────────────────── */

describe('Normalization Pipeline', () => {
  it('normalizes import results and deduplicates by payerId', () => {
    const now = new Date().toISOString();
    const source = { authority: 'test', documentTitle: 'test' };
    const results: ImportResult[] = [
      {
        importerId: 'test-a',
        country: 'US',
        importedAt: now,
        source,
        payers: [
          { payerId: 'TEST-1', displayName: 'Test One', country: 'US', payerType: 'PRIVATE', channels: [], supportedTransactions: [], payerIdsByNetwork: {}, integrationMode: 'not_classified', status: 'active', goLiveChecklist: [], contacts: [], createdAt: now, updatedAt: now },
          { payerId: 'TEST-2', displayName: 'Test Two', country: 'US', payerType: 'PRIVATE', channels: [], supportedTransactions: [], payerIdsByNetwork: {}, integrationMode: 'not_classified', status: 'active', goLiveChecklist: [], contacts: [], createdAt: now, updatedAt: now },
        ] as DirectoryPayer[],
        errors: [],
      },
      {
        importerId: 'test-b',
        country: 'US',
        importedAt: now,
        source,
        payers: [
          { payerId: 'TEST-1', displayName: 'Test One Updated', country: 'US', payerType: 'PRIVATE', channels: [{ type: 'EDI_CLEARINGHOUSE', connectorId: 'clearinghouse' }], supportedTransactions: [], payerIdsByNetwork: {}, integrationMode: 'not_classified', status: 'active', goLiveChecklist: [], contacts: [], createdAt: now, updatedAt: now },
        ] as DirectoryPayer[],
        errors: [],
      },
    ];

    const normalized = normalizeImportResults(results);
    expect(normalized.length).toBe(2);
    const test1 = normalized.find(p => p.payerId === 'TEST-1');
    expect(test1).toBeDefined();
    // Should have merged channels
    expect(test1!.channels.length).toBeGreaterThanOrEqual(1);
  });

  it('computeDiff detects added payers', () => {
    const now = new Date().toISOString();
    const newPayers: DirectoryPayer[] = [
      { payerId: 'NEW-1', displayName: 'New Payer', country: 'US', payerType: 'PRIVATE', channels: [], supportedTransactions: [], payerIdsByNetwork: {}, integrationMode: 'not_classified', status: 'active', goLiveChecklist: [], contacts: [], createdAt: now, updatedAt: now } as DirectoryPayer,
    ];
    const diff = computeDiff('test-importer', newPayers);
    expect(diff.added.length).toBe(1);
    expect(diff.added[0].payerId).toBe('NEW-1');
    expect(diff.removed.length).toBe(0);
  });

  it('computeDiff detects removed payers', () => {
    const now = new Date().toISOString();
    const source = { authority: 'test', documentTitle: 'test' };
    // First populate the directory
    const initial: DirectoryPayer[] = [
      { payerId: 'OLD-1', displayName: 'Old Payer', country: 'US', payerType: 'PRIVATE', channels: [], supportedTransactions: [], payerIdsByNetwork: {}, integrationMode: 'not_classified', status: 'active', goLiveChecklist: [], contacts: [], createdAt: now, updatedAt: now } as DirectoryPayer,
    ];
    const results1: ImportResult[] = [{ importerId: 'test', country: 'US', importedAt: now, source, payers: initial, errors: [] }];
    runDirectoryRefresh(results1, 'system');

    // Now compute diff with empty set
    const diff = computeDiff('test', [], [...listDirectoryPayers().payers]);
    expect(diff.removed.length).toBe(1);
  });
});

/* ─── Routing ────────────────────────────────────────────────────── */

describe('Routing Engine', () => {
  it('resolves a route for a known directory payer', () => {
    // Populate directory
    const results = runAllImporters();
    runDirectoryRefresh(results, 'system');

    const route = resolveRoute('PH-PHILHEALTH', 'PH');
    expect(isRouteNotFound(route)).toBe(false);
    if (!isRouteNotFound(route)) {
      expect(route.connectorId).toBeTruthy();
      expect(route.channel).toBeTruthy();
    }
  });

  it('returns ROUTE_NOT_FOUND for unknown payer', () => {
    const route = resolveRoute('UNKNOWN-PAYER-XYZ', 'US');
    expect(isRouteNotFound(route)).toBe(true);
    if (isRouteNotFound(route)) {
      expect(route.code).toBe('ROUTE_NOT_FOUND');
      expect(route.remediation.length).toBeGreaterThan(0);
    }
  });

  it('falls back to jurisdiction default for payer without channels', () => {
    // Populate directory first
    const results = runAllImporters();
    runDirectoryRefresh(results, 'system');

    // Try resolving for a payer with US jurisdiction
    const route = resolveRoute('US-MEDICARE-A', 'US');
    expect(isRouteNotFound(route)).toBe(false);
  });
});

/* ─── Enrollment Packets ─────────────────────────────────────────── */

describe('Enrollment Packets', () => {
  it('creates and retrieves enrollment packet', () => {
    const now = new Date().toISOString();
    const packet: EnrollmentPacket = {
      payerId: 'TEST-PAYER',
      orgIdentifiers: { npi: '1234567890', taxId: '12-3456789' },
      certRequirements: ['SFTP key exchange'],
      goLiveChecklist: [{ step: 'Test submission', required: true, completed: false }],
      contacts: [{ name: 'John', role: 'EDI Manager', email: 'john@example.com' }],
      testingSteps: ['Submit test 837P'],
      enrollmentStatus: 'NOT_STARTED',
      createdAt: now,
      updatedAt: now,
    };

    upsertEnrollmentPacket(packet);
    const retrieved = getEnrollmentPacket('TEST-PAYER');
    expect(retrieved).toBeDefined();
    expect(retrieved!.orgIdentifiers.npi).toBe('1234567890');
    expect(retrieved!.enrollmentStatus).toBe('NOT_STARTED');
  });

  it('updates enrollment packet', () => {
    const now = new Date().toISOString();
    upsertEnrollmentPacket({
      payerId: 'UPD-PAYER',
      orgIdentifiers: { npi: '111' },
      certRequirements: [],
      goLiveChecklist: [],
      contacts: [],
      testingSteps: [],
      enrollmentStatus: 'NOT_STARTED',
      createdAt: now,
      updatedAt: now,
    });

    upsertEnrollmentPacket({
      payerId: 'UPD-PAYER',
      orgIdentifiers: { npi: '222' },
      certRequirements: ['cert'],
      goLiveChecklist: [],
      contacts: [],
      testingSteps: [],
      enrollmentStatus: 'TESTING',
      createdAt: now,
      updatedAt: now,
    });

    const pkt = getEnrollmentPacket('UPD-PAYER');
    expect(pkt!.enrollmentStatus).toBe('TESTING');
    expect(pkt!.orgIdentifiers.npi).toBe('222');
  });

  it('lists enrollment packets with filters', () => {
    const now = new Date().toISOString();
    upsertEnrollmentPacket({
      payerId: 'LIVE-1', orgIdentifiers: { npi: '111' },
      certRequirements: [], goLiveChecklist: [], contacts: [], testingSteps: [],
      enrollmentStatus: 'LIVE', createdAt: now, updatedAt: now,
    });
    upsertEnrollmentPacket({
      payerId: 'TEST-1', orgIdentifiers: { npi: '222' },
      certRequirements: [], goLiveChecklist: [], contacts: [], testingSteps: [],
      enrollmentStatus: 'TESTING', createdAt: now, updatedAt: now,
    });

    const all = listEnrollmentPackets();
    expect(all.total).toBe(2);

    const liveOnly = listEnrollmentPackets({ status: 'LIVE' });
    expect(liveOnly.total).toBe(1);
    expect(liveOnly.packets[0].payerId).toBe('LIVE-1');
  });
});

/* ─── Directory Refresh End-to-End ───────────────────────────────── */

describe('Directory Refresh', () => {
  it('full refresh populates directory and records history', () => {
    const importResults = runAllImporters();
    const result = runDirectoryRefresh(importResults, 'system');

    expect(result.normalized.length).toBeGreaterThan(0);
    expect(result.applied).toBeGreaterThan(0);

    const stats = getDirectoryStats();
    expect(stats.total).toBeGreaterThan(0);
    expect(Object.keys(stats.byCountry).length).toBeGreaterThan(0);

    const history = getRefreshHistory();
    expect(history.length).toBeGreaterThan(0);
  });

  it('resetDirectoryStore clears everything', () => {
    const importResults = runAllImporters();
    runDirectoryRefresh(importResults, 'system');
    expect(getDirectoryStats().total).toBeGreaterThan(0);

    resetDirectoryStore();
    expect(getDirectoryStats().total).toBe(0);
    expect(getRefreshHistory().length).toBe(0);
  });
});
