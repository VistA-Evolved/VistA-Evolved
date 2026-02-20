/**
 * Phase 43 — RCM Claim Quality Loop Unit Tests
 *
 * Tests:
 *   - Ack ingestion + idempotency
 *   - Status ingestion + claim lifecycle transitions
 *   - Remittance processing + CARC/RARC lookup
 *   - Workqueue creation + filtering
 *   - Payer rules evaluation
 *   - Reference code lookups
 *
 * Run: pnpm exec vitest run tests/rcm-quality-loop.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Domain
import { createDraftClaim, transitionClaim } from '../src/rcm/domain/claim.js';
import { storeClaim, getClaim, updateClaim, resetClaimStore } from '../src/rcm/domain/claim-store.js';

// Ack/Status processor
import {
  ingestAck, ingestStatusUpdate,
  listAcks, getAck, getAcksForClaim, getAckStats,
  listStatusUpdates, getStatusUpdatesForClaim, getStatusStats,
  resetAckStore, resetStatusStore,
} from '../src/rcm/edi/ack-status-processor.js';

// Remit processor
import {
  ingestRemittance, getRemitProcessorStats, resetRemitProcessor,
} from '../src/rcm/edi/remit-processor.js';

// Workqueues
import {
  createWorkqueueItem, getWorkqueueItem, updateWorkqueueItem,
  listWorkqueueItems, getWorkqueueItemsForClaim, getWorkqueueStats,
  resetWorkqueueStore,
} from '../src/rcm/workqueues/workqueue-store.js';

// Payer rules
import {
  addRule, getRule, listRules, evaluateRules, getRuleStats,
  seedDefaultRules, resetRules,
} from '../src/rcm/rules/payer-rules.js';
import type { PayerRule } from '../src/rcm/rules/payer-rules.js';

// Reference
import { lookupCarc, lookupRarc, buildActionRecommendation, CARC_CODES, RARC_CODES } from '../src/rcm/reference/carc-rarc.js';

// Audit
import { resetRcmAudit } from '../src/rcm/audit/rcm-audit.js';

/* ─── Helpers ────────────────────────────────────────────────── */

function makeClaim(overrides?: Partial<ReturnType<typeof createDraftClaim>>) {
  const claim = createDraftClaim({
    tenantId: 'default',
    patientDfn: '3',
    payerId: 'BCBS',
    dateOfService: '2025-01-15',
    totalCharge: 15000,
    actor: 'test',
    subscriberId: 'SUB123',
    billingProviderNpi: '1234567890',
    diagnoses: [{ code: 'J06.9', codeSystem: 'ICD10', qualifier: 'principal' }],
  });
  storeClaim(claim);
  return claim;
}

function makeSubmittedClaim() {
  const claim = makeClaim();
  const validated = transitionClaim(claim, 'validated', 'test');
  updateClaim(validated);
  const submitted = transitionClaim(validated, 'submitted', 'test');
  updateClaim(submitted);
  return submitted;
}

/* ─── Test Suites ────────────────────────────────────────────── */

describe('Phase 43 — RCM Claim Quality Loop', () => {
  beforeEach(() => {
    resetClaimStore();
    resetAckStore();
    resetStatusStore();
    resetRemitProcessor();
    resetWorkqueueStore();
    resetRules();
    resetRcmAudit();
  });

  describe('Ack Ingestion', () => {
    it('ingests a 999 accepted ack', () => {
      const result = ingestAck({
        type: '999',
        disposition: 'accepted',
        originalControlNumber: 'CTL001',
        ackControlNumber: 'ACK001',
        idempotencyKey: 'idem-1',
      });
      expect(result.ok).toBe(true);
      expect(result.ack.type).toBe('999');
      expect(result.ack.disposition).toBe('accepted');
      expect(result.idempotent).toBe(false);
    });

    it('prevents duplicate ingestion via idempotency', () => {
      const first = ingestAck({
        type: '999',
        disposition: 'accepted',
        originalControlNumber: 'CTL001',
        ackControlNumber: 'ACK001',
        idempotencyKey: 'idem-dup',
      });
      const second = ingestAck({
        type: '999',
        disposition: 'accepted',
        originalControlNumber: 'CTL001',
        ackControlNumber: 'ACK001',
        idempotencyKey: 'idem-dup',
      });
      expect(second.idempotent).toBe(true);
      expect(second.ack.id).toBe(first.ack.id);
    });

    it('transitions submitted claim to accepted on accepted ack', () => {
      const claim = makeSubmittedClaim();
      ingestAck({
        type: '999',
        disposition: 'accepted',
        originalControlNumber: 'CTL001',
        ackControlNumber: 'ACK001',
        claimId: claim.id,
        idempotencyKey: 'idem-accept',
      });
      const updated = getClaim(claim.id);
      expect(updated?.status).toBe('accepted');
    });

    it('transitions submitted claim to rejected and creates workqueue item', () => {
      const claim = makeSubmittedClaim();
      ingestAck({
        type: '999',
        disposition: 'rejected',
        originalControlNumber: 'CTL001',
        ackControlNumber: 'ACK001',
        claimId: claim.id,
        idempotencyKey: 'idem-reject',
        errors: [{ errorCode: '4', description: 'Procedure code inconsistent with modifier' }],
      });
      const updated = getClaim(claim.id);
      expect(updated?.status).toBe('rejected');

      const wqItems = getWorkqueueItemsForClaim(claim.id);
      expect(wqItems.length).toBeGreaterThanOrEqual(1);
      expect(wqItems[0].type).toBe('rejection');
      expect(wqItems[0].reasonCode).toBe('4');
    });

    it('lists and retrieves acks', () => {
      ingestAck({ type: '999', disposition: 'accepted', originalControlNumber: 'C1', ackControlNumber: 'A1', idempotencyKey: 'k1' });
      ingestAck({ type: '277CA', disposition: 'rejected', originalControlNumber: 'C2', ackControlNumber: 'A2', idempotencyKey: 'k2' });

      const all = listAcks();
      expect(all.total).toBe(2);

      const byType = listAcks({ type: '999' });
      expect(byType.total).toBe(1);

      const stats = getAckStats();
      expect(stats.total).toBe(2);
      expect(stats.byType['999']).toBe(1);
      expect(stats.byType['277CA']).toBe(1);
    });
  });

  describe('Status Ingestion', () => {
    it('ingests a 277 status update', () => {
      const result = ingestStatusUpdate({
        categoryCode: 'A2',
        statusCode: 'in-adjudication',
        statusDescription: 'Claim is being reviewed',
        idempotencyKey: 'stat-1',
      });
      expect(result.ok).toBe(true);
      expect(result.statusUpdate.categoryCode).toBe('A2');
      expect(result.idempotent).toBe(false);
    });

    it('prevents duplicate status ingestion', () => {
      const first = ingestStatusUpdate({
        categoryCode: 'A2', statusCode: 'review', statusDescription: 'In review',
        idempotencyKey: 'stat-dup',
      });
      const second = ingestStatusUpdate({
        categoryCode: 'A2', statusCode: 'review', statusDescription: 'In review',
        idempotencyKey: 'stat-dup',
      });
      expect(second.idempotent).toBe(true);
      expect(second.statusUpdate.id).toBe(first.statusUpdate.id);
    });

    it('transitions claim to denied on F2 category', () => {
      const claim = makeSubmittedClaim();
      // First accept it
      const accepted = transitionClaim(getClaim(claim.id)!, 'accepted', 'test');
      updateClaim(accepted);

      ingestStatusUpdate({
        claimId: claim.id,
        categoryCode: 'F2',
        statusCode: 'denied',
        statusDescription: 'Service not covered',
        idempotencyKey: 'stat-deny',
      });

      const updated = getClaim(claim.id);
      expect(updated?.status).toBe('denied');
    });

    it('creates missing_info workqueue item on P1 category', () => {
      const claim = makeSubmittedClaim();
      ingestStatusUpdate({
        claimId: claim.id,
        categoryCode: 'P1',
        statusCode: 'pending',
        statusDescription: 'Need additional documentation',
        idempotencyKey: 'stat-p1',
      });

      const wqItems = getWorkqueueItemsForClaim(claim.id);
      expect(wqItems.length).toBeGreaterThanOrEqual(1);
      expect(wqItems[0].type).toBe('missing_info');
    });
  });

  describe('Remittance Processing', () => {
    it('ingests a remittance with service lines', () => {
      const result = ingestRemittance({
        payerId: 'BCBS',
        totalCharged: 15000,
        totalPaid: 12000,
        serviceLines: [{
          lineNumber: 1,
          procedureCode: '99213',
          chargedAmount: 15000,
          paidAmount: 12000,
          adjustments: [{ groupCode: 'CO', reasonCode: '45', amount: 3000 }],
        }],
        idempotencyKey: 'remit-1',
      });
      expect(result.ok).toBe(true);
      expect(result.remittance.totalPaid).toBe(12000);
      expect(result.idempotent).toBe(false);
    });

    it('prevents duplicate remittance processing', () => {
      const first = ingestRemittance({
        payerId: 'BCBS', totalCharged: 15000, totalPaid: 12000, idempotencyKey: 'remit-dup',
      });
      const second = ingestRemittance({
        payerId: 'BCBS', totalCharged: 15000, totalPaid: 12000, idempotencyKey: 'remit-dup',
      });
      expect(second.idempotent).toBe(true);
    });

    it('creates denial workqueue items for CARC denial codes', () => {
      const claim = makeSubmittedClaim();
      // Accept the claim first
      const accepted = transitionClaim(getClaim(claim.id)!, 'accepted', 'test');
      updateClaim(accepted);

      ingestRemittance({
        payerId: 'BCBS',
        totalCharged: 15000,
        totalPaid: 0,
        claimId: claim.id,
        serviceLines: [{
          lineNumber: 1,
          procedureCode: '99213',
          chargedAmount: 15000,
          paidAmount: 0,
          adjustments: [{ groupCode: 'CO', reasonCode: '50', amount: 15000 }],
        }],
        idempotencyKey: 'remit-deny',
      });

      const updated = getClaim(claim.id);
      expect(updated?.status).toBe('denied');

      const wqItems = getWorkqueueItemsForClaim(claim.id);
      expect(wqItems.length).toBeGreaterThanOrEqual(1);
      expect(wqItems[0].type).toBe('denial');
      expect(wqItems[0].reasonCode).toBe('50');
      expect(wqItems[0].priority).toBe('critical');
    });
  });

  describe('Workqueue Store', () => {
    it('creates and retrieves workqueue items', () => {
      const item = createWorkqueueItem({
        type: 'denial',
        claimId: 'claim-1',
        reasonCode: '45',
        reasonDescription: 'Charge exceeds fee schedule',
        recommendedAction: 'Write off or appeal',
        sourceType: 'remit_835',
        priority: 'high',
      });
      expect(item.status).toBe('open');

      const retrieved = getWorkqueueItem(item.id);
      expect(retrieved?.reasonCode).toBe('45');
    });

    it('filters by type and status', () => {
      createWorkqueueItem({ type: 'denial', claimId: '1', reasonCode: '50', reasonDescription: 'Not covered', recommendedAction: 'Appeal', sourceType: 'remit_835' });
      createWorkqueueItem({ type: 'rejection', claimId: '2', reasonCode: '4', reasonDescription: 'Modifier error', recommendedAction: 'Fix modifier', sourceType: 'ack_999' });
      createWorkqueueItem({ type: 'missing_info', claimId: '3', reasonCode: 'P1', reasonDescription: 'Need docs', recommendedAction: 'Submit docs', sourceType: 'status_277' });

      const denials = listWorkqueueItems({ type: 'denial' });
      expect(denials.total).toBe(1);

      const all = listWorkqueueItems();
      expect(all.total).toBe(3);
    });

    it('updates status and tracks resolution', () => {
      const item = createWorkqueueItem({ type: 'denial', claimId: '1', reasonCode: '50', reasonDescription: 'Not covered', recommendedAction: 'Appeal', sourceType: 'remit_835' });
      const updated = updateWorkqueueItem(item.id, { status: 'resolved', resolutionNote: 'Resubmitted with modifier 59' });
      expect(updated?.status).toBe('resolved');
    });

    it('returns stats by type, status, and priority', () => {
      createWorkqueueItem({ type: 'denial', claimId: '1', reasonCode: '50', reasonDescription: '', recommendedAction: '', sourceType: 'remit_835', priority: 'critical' });
      createWorkqueueItem({ type: 'rejection', claimId: '2', reasonCode: '4', reasonDescription: '', recommendedAction: '', sourceType: 'ack_999', priority: 'high' });

      const stats = getWorkqueueStats();
      expect(stats.total).toBe(2);
      expect(stats.byType.denial).toBe(1);
      expect(stats.byType.rejection).toBe(1);
      expect(stats.byPriority.critical).toBe(1);
    });
  });

  describe('Payer Rules', () => {
    it('seeds default rules', () => {
      seedDefaultRules();
      const stats = getRuleStats();
      expect(stats.total).toBeGreaterThanOrEqual(9);
      expect(stats.enabled).toBeGreaterThanOrEqual(9);
    });

    it('evaluates field_required rules', () => {
      seedDefaultRules();
      const result = evaluateRules('BCBS', {
        subscriberId: 'ABC123',
        billingProviderNpi: '1234567890',
        diagnoses: ['J06.9'],
        totalCharge: 15000,
        dateOfService: '2025-01-15',
      });
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.passCount).toBeGreaterThan(0);
    });

    it('fails rules for missing required fields', () => {
      seedDefaultRules();
      const result = evaluateRules('BCBS', {
        // Missing subscriberId, billingProviderNpi, diagnoses
        totalCharge: 0,
        dateOfService: '2025-01-15',
      });
      expect(result.failCount).toBeGreaterThan(0);
      const failedRules = result.results.filter(r => !r.passed);
      expect(failedRules.length).toBeGreaterThan(0);
    });

    it('adds and evaluates custom rules', () => {
      const now = new Date().toISOString();
      addRule({
        id: 'test-rule-1',
        payerId: 'AETNA',
        name: 'Test NPI format',
        description: 'NPI must be 10 digits',
        category: 'demographics',
        severity: 'error',
        enabled: true,
        condition: { type: 'field_format', field: 'billingProviderNpi', pattern: '^\\d{10}$' },
        actionOnFail: 'Correct NPI',
        source: 'admin',
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      const pass = evaluateRules('AETNA', { billingProviderNpi: '1234567890' });
      expect(pass.results[0].passed).toBe(true);

      const fail = evaluateRules('AETNA', { billingProviderNpi: 'ABC' });
      expect(fail.results[0].passed).toBe(false);
    });
  });

  describe('CARC/RARC Reference', () => {
    it('looks up CARC codes', () => {
      const entry = lookupCarc('45');
      expect(entry).toBeDefined();
      expect(entry!.description).toContain('fee schedule');
      expect(entry!.category).toBe('adjustment');
    });

    it('looks up RARC codes', () => {
      const entry = lookupRarc('N1');
      expect(entry).toBeDefined();
      expect(entry!.description).toContain('appeal');
    });

    it('builds action recommendations', () => {
      const result = buildActionRecommendation('50', ['N1']);
      expect(result.action).toContain('coverage');
      expect(result.action).toContain('appeal');
    });

    it('has 30+ CARC codes', () => {
      expect(Object.keys(CARC_CODES).length).toBeGreaterThanOrEqual(30);
    });

    it('has 10+ RARC codes', () => {
      expect(Object.keys(RARC_CODES).length).toBeGreaterThanOrEqual(10);
    });
  });
});
