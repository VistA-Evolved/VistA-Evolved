/**
 * Phase 45 — Transaction Correctness Engine Unit Tests
 *
 * Tests:
 *   - Envelope builder (control numbers, ISA/GS)
 *   - Transaction store CRUD + state machine transitions
 *   - Translator validation + deterministic X12 build
 *   - Connectivity gates (pre-transmit + ack)
 *   - Retry/DLQ logic
 *   - Reconciliation summary
 *
 * Run: pnpm exec vitest run tests/transaction-correctness.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Envelope + Store
import {
  buildEnvelope,
  nextControlNumber,
  storeTransaction,
  getTransaction,
  getTransactionsByCorrelation,
  getTransactionsBySource,
  transitionTransaction,
  listTransactions,
  getTransactionStats,
  resetTransactionStore,
} from '../src/rcm/transactions/envelope.js';

// Types
import { TRANSACTION_STATE_TRANSITIONS } from '../src/rcm/transactions/types.js';
import type { TransactionState } from '../src/rcm/transactions/types.js';

// Translator
import {
  registerTranslator,
  getTranslator,
  getActiveTranslator,
  listTranslators,
} from '../src/rcm/transactions/translator.js';
import { localScaffoldTranslator } from '../src/rcm/transactions/local-scaffold-translator.js';
import { externalTranslatorAdapter } from '../src/rcm/transactions/external-translator-adapter.js';

// Connectivity
import {
  getConnectivityProfile,
  resetConnectivityProfile,
  checkPreTransmitGates,
  checkAckGates,
  calculateRetryDelay,
  shouldRetry,
  processRetry,
  getDLQTransactions,
  retryFromDLQ,
  getConnectivityHealth,
} from '../src/rcm/transactions/connectivity.js';

// Reconciliation
import {
  buildReconciliationSummary,
  buildReconciliationStats,
} from '../src/rcm/transactions/reconciliation.js';

// Domain (for reconciliation tests)
import { createDraftClaim } from '../src/rcm/domain/claim.js';
import { storeClaim, resetClaimStore } from '../src/rcm/domain/claim-store.js';

// Audit (reset between tests)
import { resetRcmAudit } from '../src/rcm/audit/rcm-audit.js';

/* ─── Setup ──────────────────────────────────────────────────── */

beforeEach(() => {
  resetTransactionStore();
  resetConnectivityProfile();
  resetClaimStore();
  resetRcmAudit();
  // Re-register translators
  registerTranslator(localScaffoldTranslator);
  registerTranslator(externalTranslatorAdapter);
});

/* ─── Control Numbers ────────────────────────────────────────── */

describe('Control Numbers', () => {
  it('generates monotonically increasing control numbers per pair', () => {
    const c1 = nextControlNumber('SENDER1', 'RECV1');
    const c2 = nextControlNumber('SENDER1', 'RECV1');
    const c3 = nextControlNumber('SENDER1', 'RECV1');

    expect(Number(c1)).toBeLessThan(Number(c2));
    expect(Number(c2)).toBeLessThan(Number(c3));
  });

  it('pads control numbers to 9 digits', () => {
    const c = nextControlNumber('A', 'B');
    expect(c).toHaveLength(9);
    expect(c).toBe('000000001');
  });

  it('maintains separate counters per sender/receiver pair', () => {
    const c1a = nextControlNumber('SENDER1', 'RECV_A');
    const c1b = nextControlNumber('SENDER1', 'RECV_B');
    const c2a = nextControlNumber('SENDER1', 'RECV_A');

    expect(c1a).toBe('000000001');
    expect(c1b).toBe('000000001');
    expect(c2a).toBe('000000002');
  });
});

/* ─── Envelope Builder ───────────────────────────────────────── */

describe('Envelope Builder', () => {
  it('builds a valid envelope with ISA and GS', () => {
    const env = buildEnvelope({
      transactionSet: '837P',
      senderId: 'SENDER1',
      receiverId: 'RECV1',
    });

    expect(env.transactionId).toMatch(/^txn-/);
    expect(env.transactionSet).toBe('837P');
    expect(env.isa.senderId).toHaveLength(15);
    expect(env.isa.senderQualifier).toBe('ZZ');
    expect(env.isa.usageIndicator).toBe('T');
    expect(env.gs.functionalCode).toBe('HC');
    expect(env.gs.versionCode).toBe('005010X222A1');
    expect(env.correlationId).toBeTruthy();
    expect(env.idempotencyKey).toHaveLength(32);
    expect(env.direction).toBe('outbound');
  });

  it('sets correct GS codes per transaction type', () => {
    const env270 = buildEnvelope({ transactionSet: '270', senderId: 'S', receiverId: 'R' });
    expect(env270.gs.functionalCode).toBe('HS');

    const env835 = buildEnvelope({ transactionSet: '835', senderId: 'S', receiverId: 'R' });
    expect(env835.gs.functionalCode).toBe('HP');

    const env999 = buildEnvelope({ transactionSet: '999', senderId: 'S', receiverId: 'R' });
    expect(env999.gs.functionalCode).toBe('FA');
  });

  it('propagates sourceId and sourceType', () => {
    const env = buildEnvelope({
      transactionSet: '837P',
      senderId: 'S',
      receiverId: 'R',
      sourceId: 'claim-123',
      sourceType: 'claim',
    });
    expect(env.sourceId).toBe('claim-123');
    expect(env.sourceType).toBe('claim');
  });
});

/* ─── Transaction Store ──────────────────────────────────────── */

describe('Transaction Store', () => {
  it('stores and retrieves a transaction', () => {
    const env = buildEnvelope({ transactionSet: '837P', senderId: 'S', receiverId: 'R' });
    const record = storeTransaction(env, 'ISA*test~');

    const fetched = getTransaction(record.id);
    expect(fetched).toBeTruthy();
    expect(fetched!.state).toBe('created');
    expect(fetched!.x12Payload).toBe('ISA*test~');
  });

  it('indexes by correlation ID', () => {
    const env1 = buildEnvelope({
      transactionSet: '837P',
      senderId: 'S',
      receiverId: 'R',
      correlationId: 'corr-abc',
    });
    const env2 = buildEnvelope({
      transactionSet: '999',
      senderId: 'R',
      receiverId: 'S',
      correlationId: 'corr-abc',
    });
    storeTransaction(env1);
    storeTransaction(env2);

    const correlated = getTransactionsByCorrelation('corr-abc');
    expect(correlated).toHaveLength(2);
  });

  it('indexes by source ID', () => {
    const env = buildEnvelope({
      transactionSet: '837P',
      senderId: 'S',
      receiverId: 'R',
      sourceId: 'claim-x',
    });
    storeTransaction(env);

    const bySource = getTransactionsBySource('claim-x');
    expect(bySource).toHaveLength(1);
    expect(bySource[0].envelope.sourceId).toBe('claim-x');
  });

  it('lists transactions with filters', () => {
    const env1 = buildEnvelope({ transactionSet: '837P', senderId: 'S', receiverId: 'R' });
    const env2 = buildEnvelope({ transactionSet: '270', senderId: 'S', receiverId: 'R' });
    storeTransaction(env1);
    storeTransaction(env2);

    const all = listTransactions({});
    expect(all).toHaveLength(2);

    const only837 = listTransactions({ transactionSet: '837P' });
    expect(only837).toHaveLength(1);
    expect(only837[0].envelope.transactionSet).toBe('837P');
  });

  it('computes statistics', () => {
    const env = buildEnvelope({ transactionSet: '837P', senderId: 'S', receiverId: 'R' });
    storeTransaction(env);

    const stats = getTransactionStats();
    expect(stats.total).toBe(1);
    expect(stats.byState['created']).toBe(1);
    expect(stats.byTransactionSet['837P']).toBe(1);
  });
});

/* ─── State Machine ──────────────────────────────────────────── */

describe('Transaction State Machine', () => {
  it('allows valid transitions', () => {
    const env = buildEnvelope({ transactionSet: '837P', senderId: 'S', receiverId: 'R' });
    const record = storeTransaction(env, 'ISA*test~');

    // created → serialized
    const r1 = transitionTransaction(record.id, 'serialized');
    expect(r1).toBeTruthy();
    expect(r1!.state).toBe('serialized');

    // serialized → validated
    const r2 = transitionTransaction(record.id, 'validated');
    expect(r2).toBeTruthy();
    expect(r2!.state).toBe('validated');
  });

  it('rejects invalid transitions', () => {
    const env = buildEnvelope({ transactionSet: '837P', senderId: 'S', receiverId: 'R' });
    const record = storeTransaction(env);

    // created → reconciled is not allowed
    const result = transitionTransaction(record.id, 'reconciled');
    expect(result).toBeNull();
  });

  it('tracks errors on failed transitions', () => {
    const env = buildEnvelope({ transactionSet: '837P', senderId: 'S', receiverId: 'R' });
    const record = storeTransaction(env);

    // Walk to transmitted then fail
    transitionTransaction(record.id, 'serialized');
    transitionTransaction(record.id, 'validated');
    transitionTransaction(record.id, 'queued');
    transitionTransaction(record.id, 'transmitted');
    const failed = transitionTransaction(record.id, 'failed', {
      error: { code: 'TIMEOUT', description: 'Connection timed out', severity: 'error' },
    });

    expect(failed).toBeTruthy();
    expect(failed!.state).toBe('failed');
    expect(failed!.errors).toHaveLength(1);
    expect(failed!.errors[0].code).toBe('TIMEOUT');
  });

  it('sets completedAt on terminal states', () => {
    const env = buildEnvelope({ transactionSet: '837P', senderId: 'S', receiverId: 'R' });
    const record = storeTransaction(env);

    transitionTransaction(record.id, 'serialized');
    transitionTransaction(record.id, 'validated');
    transitionTransaction(record.id, 'queued');
    transitionTransaction(record.id, 'transmitted');
    transitionTransaction(record.id, 'ack_pending');
    transitionTransaction(record.id, 'ack_accepted');
    transitionTransaction(record.id, 'response_pending');
    transitionTransaction(record.id, 'response_received');
    const reconciled = transitionTransaction(record.id, 'reconciled');

    expect(reconciled).toBeTruthy();
    expect(reconciled!.completedAt).toBeTruthy();
  });

  it('verifies all states have defined transitions', () => {
    const allStates: TransactionState[] = [
      'created',
      'serialized',
      'validated',
      'queued',
      'transmitted',
      'ack_pending',
      'ack_accepted',
      'ack_rejected',
      'response_pending',
      'response_received',
      'reconciled',
      'failed',
      'cancelled',
      'dlq',
    ];
    for (const state of allStates) {
      expect(TRANSACTION_STATE_TRANSITIONS[state]).toBeDefined();
    }
  });
});

/* ─── Translator ─────────────────────────────────────────────── */

describe('Translator Registry', () => {
  it('registers and retrieves translators', () => {
    const all = listTranslators();
    expect(all.length).toBeGreaterThanOrEqual(2);

    const local = getTranslator('local-scaffold');
    expect(local).toBeTruthy();
    expect(local!.name).toContain('Local Scaffold Translator');
  });

  it('active translator is local-scaffold when external is not configured', () => {
    const active = getActiveTranslator();
    expect(active).toBeTruthy();
    expect(active!.id).toBe('local-scaffold');
  });

  it('local translator is always available', () => {
    expect(localScaffoldTranslator.isAvailable()).toBe(true);
  });

  it('external translator is unavailable without env vars', () => {
    expect(externalTranslatorAdapter.isAvailable()).toBe(false);
  });
});

describe('Local Scaffold Translator — Validation', () => {
  it('validates 837P required fields', () => {
    const errors = localScaffoldTranslator.validate('837P', {
      submitterInfo: { npi: '1234567890' },
      billingProvider: { npi: '0987654321' },
      subscriber: { memberId: 'MEM001' },
      claimInfo: { claimId: 'CLM-1' },
      diagnoses: [{ code: 'A01.0' }],
      serviceLines: [{ procedureCode: '99213', chargeAmountCents: 10000 }],
    });
    expect(errors).toHaveLength(0);
  });

  it('catches missing required fields', () => {
    const errors = localScaffoldTranslator.validate('837P', {
      submitterInfo: {},
      billingProvider: {},
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e: any) => e.field?.includes('submitterInfo.npi'))).toBe(true);
  });

  it('validates 270 required fields', () => {
    const errors = localScaffoldTranslator.validate('270', {
      informationSource: { payerId: 'P1' },
      informationReceiver: { npi: 'N1' },
      subscriber: { memberId: 'M1' },
    });
    expect(errors).toHaveLength(0);
  });
});

describe('Local Scaffold Translator — Build X12', () => {
  it('builds deterministic X12 for same input', () => {
    const canonical = {
      submitterInfo: {
        npi: '1234567890',
        name: 'TEST SUBMITTER',
        contactName: 'TEST',
        contactPhone: '5551234567',
      },
      billingProvider: {
        npi: '0987654321',
        name: 'TEST PROVIDER',
        taxId: '123456789',
        addressLine1: '123 MAIN',
        city: 'ANYTOWN',
        state: 'CA',
        zip: '90210',
      },
      subscriber: {
        memberId: 'MEM001',
        lastName: 'DOE',
        firstName: 'JOHN',
        dob: '19800101',
        gender: 'M',
        relationshipCode: '18',
      },
      receiverInfo: { name: 'TEST PAYER' },
      claimInfo: {
        claimId: 'CLM-1',
        totalChargeAmount: 100,
        facilityCode: '11',
        frequencyCode: '1',
        providerSignature: true,
        assignmentOfBenefits: true,
        releaseOfInfo: 'Y',
      },
      diagnosisCodes: [{ code: 'A01.0', qualifier: 'ABK', isPrincipal: true }],
      serviceLines: [
        {
          lineNumber: 1,
          procedureCode: '99213',
          chargeAmount: 100,
          units: 1,
          unitType: 'UN',
          serviceDate: '20250101',
          placeOfService: '11',
          diagnosisPointers: [1],
        },
      ],
    };

    const env = buildEnvelope({ transactionSet: '837P', senderId: 'S', receiverId: 'R' });
    const result1 = localScaffoldTranslator.buildX12('837P', canonical, env);
    const result2 = localScaffoldTranslator.buildX12('837P', canonical, env);

    // Same canonical + same envelope => same output
    expect(result1.x12Payload).toBe(result2.x12Payload);
    expect(result1.segmentCount).toBe(result2.segmentCount);
  });
});

describe('Local Scaffold Translator — Parse X12', () => {
  it('parses 999 response', () => {
    const raw =
      'ISA*00*          *00*          *ZZ*RECEIVER       *ZZ*SENDER         *250101*1200*^*00501*000000001*0*T*:~GS*FA*RECEIVER*SENDER*20250101*1200*1*X*005010X231A1~ST*999*0001~AK1*HC*000000001~AK9*A*1*1*1~SE*4*0001~GE*1*1~IEA*1*000000001~';
    const parsed = localScaffoldTranslator.parseX12('999', raw);
    expect(parsed.transactionSet).toBe('999');
    expect(parsed.accepted).toBe(true);
  });

  it('parses rejected 999 response', () => {
    const raw = 'ISA*foo~AK9*R*1*1*0~IEA*1*000000001~';
    const parsed = localScaffoldTranslator.parseX12('999', raw);
    expect(parsed.accepted).toBe(false);
  });
});

/* ─── Connectivity Gates ─────────────────────────────────────── */

describe('Connectivity Gates', () => {
  it('pre-transmit gates pass for valid X12', () => {
    const payload =
      'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *250101*1200*^*00501*000000001*0*T*:~GS*HC*SENDER*RECEIVER*20250101*1200*1*X*005010X222A1~ST*837*0001~SE*2*0001~GE*1*1~IEA*1*000000001~';
    const results = checkPreTransmitGates('837P', payload);
    const errors = results.filter((g) => g.severity === 'error' && !g.passed);
    expect(errors).toHaveLength(0);
  });

  it('pre-transmit gates fail for empty payload', () => {
    const results = checkPreTransmitGates('837P', '');
    const errors = results.filter((g) => !g.passed && g.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((g) => g.gate === 'payload_present')).toBe(true);
  });

  it('pre-transmit gates catch missing ISA', () => {
    const results = checkPreTransmitGates('837P', 'ST*837*0001~SE*2*0001~');
    const isaGate = results.find((g) => g.gate === 'isa_envelope');
    expect(isaGate?.passed).toBe(false);
  });

  it('pre-transmit gates catch missing IEA', () => {
    const results = checkPreTransmitGates('837P', 'ISA*test~ST*837*0001~SE*2*0001~');
    const ieaGate = results.find((g) => g.gate === 'iea_trailer');
    expect(ieaGate?.passed).toBe(false);
  });

  it('ack gates report transaction not found', () => {
    const results = checkAckGates('non-existent-id');
    expect(results.some((g) => g.gate === 'transaction_exists' && !g.passed)).toBe(true);
  });

  it('ack gates pass for created transaction', () => {
    const env = buildEnvelope({ transactionSet: '837P', senderId: 'S', receiverId: 'R' });
    const txn = storeTransaction(env);
    const results = checkAckGates(txn.id);
    expect(results.some((g) => g.gate === 'transaction_exists' && g.passed)).toBe(true);
    expect(results.some((g) => g.gate === 'not_in_dlq' && g.passed)).toBe(true);
  });
});

/* ─── Retry + DLQ ────────────────────────────────────────────── */

describe('Retry + DLQ Logic', () => {
  it('calculates exponential backoff delay', () => {
    const d0 = calculateRetryDelay(0);
    const d1 = calculateRetryDelay(1);
    const d2 = calculateRetryDelay(2);

    expect(d0).toBe(5000); // 5s initial
    expect(d1).toBe(10000); // 5s * 2^1
    expect(d2).toBe(20000); // 5s * 2^2
  });

  it('caps delay at maxDelayMs', () => {
    const d10 = calculateRetryDelay(10);
    expect(d10).toBeLessThanOrEqual(300_000);
  });

  it('moves to DLQ after max retries', () => {
    const env = buildEnvelope({ transactionSet: '837P', senderId: 'S', receiverId: 'R' });
    const txn = storeTransaction(env, 'ISA*test~');

    // Walk to failed state
    transitionTransaction(txn.id, 'serialized');
    transitionTransaction(txn.id, 'validated');
    transitionTransaction(txn.id, 'queued');
    transitionTransaction(txn.id, 'transmitted');

    // Simulate 3 failures (max retries = 3)
    transitionTransaction(txn.id, 'failed', {
      error: { code: 'TIMEOUT', description: 'Timeout', severity: 'error' },
    });

    const decision = shouldRetry(txn.id);
    // retryCount is 1 after first failure
    if (decision.retry) {
      // Retry once more
      transitionTransaction(txn.id, 'queued');
      transitionTransaction(txn.id, 'transmitted');
      transitionTransaction(txn.id, 'failed', {
        error: { code: 'TIMEOUT', description: 'Timeout 2', severity: 'error' },
      });
      transitionTransaction(txn.id, 'queued');
      transitionTransaction(txn.id, 'transmitted');
      transitionTransaction(txn.id, 'failed', {
        error: { code: 'TIMEOUT', description: 'Timeout 3', severity: 'error' },
      });
    }

    const finalDecision = shouldRetry(txn.id);
    expect(finalDecision.moveToDLQ).toBe(true);
    expect(finalDecision.retry).toBe(false);
  });

  it('getDLQTransactions returns only DLQ items', () => {
    const env1 = buildEnvelope({ transactionSet: '837P', senderId: 'S', receiverId: 'R' });
    const txn1 = storeTransaction(env1);
    const env2 = buildEnvelope({ transactionSet: '270', senderId: 'S', receiverId: 'R' });
    storeTransaction(env2);

    // Move txn1 to DLQ
    transitionTransaction(txn1.id, 'serialized');
    transitionTransaction(txn1.id, 'validated');
    transitionTransaction(txn1.id, 'queued');
    transitionTransaction(txn1.id, 'transmitted');
    transitionTransaction(txn1.id, 'failed', {
      error: { code: 'TIMEOUT', description: 'fail', severity: 'error' },
    });
    transitionTransaction(txn1.id, 'dlq', {
      error: { code: 'DLQ', description: 'Moved to DLQ', severity: 'error' },
    });

    const dlq = getDLQTransactions();
    expect(dlq).toHaveLength(1);
    expect(dlq[0].id).toBe(txn1.id);
  });

  it('retryFromDLQ moves transaction back to queued', () => {
    const env = buildEnvelope({ transactionSet: '837P', senderId: 'S', receiverId: 'R' });
    const txn = storeTransaction(env);
    transitionTransaction(txn.id, 'serialized');
    transitionTransaction(txn.id, 'validated');
    transitionTransaction(txn.id, 'queued');
    transitionTransaction(txn.id, 'transmitted');
    transitionTransaction(txn.id, 'failed', {
      error: { code: 'TIMEOUT', description: 'fail', severity: 'error' },
    });
    transitionTransaction(txn.id, 'dlq', {
      error: { code: 'DLQ', description: 'DLQ', severity: 'error' },
    });

    const success = retryFromDLQ(txn.id);
    expect(success).toBe(true);

    const updated = getTransaction(txn.id);
    expect(updated!.state).toBe('queued');
  });
});

/* ─── Connectivity Health ────────────────────────────────────── */

describe('Connectivity Health', () => {
  it('reports healthy when no issues', () => {
    const health = getConnectivityHealth();
    expect(health.status).toBe('healthy');
    expect(health.dlqDepth).toBe(0);
    expect(health.failedCount).toBe(0);
  });

  it('reports degraded when there are DLQ items', () => {
    const env = buildEnvelope({ transactionSet: '837P', senderId: 'S', receiverId: 'R' });
    const txn = storeTransaction(env);
    transitionTransaction(txn.id, 'serialized');
    transitionTransaction(txn.id, 'validated');
    transitionTransaction(txn.id, 'queued');
    transitionTransaction(txn.id, 'transmitted');
    transitionTransaction(txn.id, 'failed', {
      error: { code: 'TIMEOUT', description: 'fail', severity: 'error' },
    });
    transitionTransaction(txn.id, 'dlq', {
      error: { code: 'DLQ', description: 'DLQ', severity: 'error' },
    });

    const health = getConnectivityHealth();
    expect(health.dlqDepth).toBe(1);
    expect(['degraded', 'unhealthy']).toContain(health.status);
  });
});

/* ─── Reconciliation ─────────────────────────────────────────── */

describe('Reconciliation', () => {
  it('builds summary for a non-existent claim gracefully', () => {
    const summary = buildReconciliationSummary('non-existent');
    // Returns null for non-existent claims
    expect(summary).toBeNull();
  });

  it('builds summary for a claim with transactions', () => {
    // Create a claim
    const claim = createDraftClaim({
      tenantId: 'default',
      patientDfn: '3',
      payerId: 'BCBS',
      claimType: '837P',
    });
    storeClaim(claim);

    // Create a transaction linked to this claim
    const env = buildEnvelope({
      transactionSet: '837P',
      senderId: 'S',
      receiverId: 'R',
      sourceId: claim.id,
      sourceType: 'claim',
    });
    storeTransaction(env, 'ISA*test~');

    const summary = buildReconciliationSummary(claim.id);
    expect(summary.claimId).toBe(claim.id);
    expect(summary.transactions).toHaveLength(1);
  });

  it('builds batch reconciliation stats', () => {
    const claim1 = createDraftClaim({
      tenantId: 'default',
      patientDfn: '3',
      payerId: 'BCBS',
      claimType: '837P',
    });
    const claim2 = createDraftClaim({
      tenantId: 'default',
      patientDfn: '4',
      payerId: 'AETNA',
      claimType: '837P',
    });
    storeClaim(claim1);
    storeClaim(claim2);

    const stats = buildReconciliationStats([claim1.id, claim2.id]);
    expect(stats.total).toBe(2);
  });
});

/* ─── Connectivity Profile ───────────────────────────────────── */

describe('Connectivity Profile', () => {
  it('has CAQH CORE rule references', () => {
    const profile = getConnectivityProfile();
    expect(profile.operatingRuleReferences.length).toBeGreaterThan(0);
    expect(profile.operatingRuleReferences.some((r) => r.includes('CAQH CORE'))).toBe(true);
  });

  it('configures ack timeouts', () => {
    const profile = getConnectivityProfile();
    expect(profile.ackRequirements.require999).toBe(true);
    expect(profile.ackRequirements.ack999TimeoutMs).toBe(24 * 60 * 60 * 1000);
    expect(profile.ackRequirements.ack277CATimeoutMs).toBe(48 * 60 * 60 * 1000);
  });

  it('defines response windows for major transaction types', () => {
    const profile = getConnectivityProfile();
    expect(profile.responseWindows['837P']).toBeTruthy();
    expect(profile.responseWindows['270']).toBeTruthy();
    expect(profile.responseWindows['835']).toBeTruthy();
    expect(profile.responseWindows['999']).toBeTruthy();
  });
});
