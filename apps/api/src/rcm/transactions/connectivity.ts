/**
 * CORE-Style Connectivity Rules — Engineering Gates
 *
 * Phase 45: Implements practical engineering gates inspired by CAQH CORE
 * operating rules. Does NOT embed copyrighted CORE rule text — references
 * operating rule numbers only.
 *
 * Gates:
 *   - Required acknowledgements tracked (999, 277CA)
 *   - Retry/backoff with configurable policy
 *   - Timeouts per transaction type
 *   - Dead-letter queue (DLQ) for unrecoverable failures
 *   - Standardized error payloads
 *   - "Safe harbor" connection profile
 */

import type { ConnectivityProfile } from './types.js';
import type { X12TransactionSet } from '../edi/types.js';
import type { TransactionRecord } from './types.js';
import { getTransaction, transitionTransaction, listTransactions } from './envelope.js';

/* ── Default Connectivity Profile ────────────────────────────── */

const DEFAULT_PROFILE: ConnectivityProfile = {
  version: '1.0.0',

  operatingRuleReferences: [
    'CAQH CORE 270: Connectivity Rule',
    'CAQH CORE 250: Claim Status Rule',
    'CAQH CORE 258: Eligibility Response Time Rule',
    'CAQH CORE 260: ERA/EFT Operating Rules',
    'CAQH CORE 382: Claims Rule',
  ],

  ackRequirements: {
    require999: true,
    require277CA: true,
    ack999TimeoutMs: 24 * 60 * 60 * 1000,    // 24 hours per CORE
    ack277CATimeoutMs: 48 * 60 * 60 * 1000,   // 48 hours
  },

  retryPolicy: {
    maxRetries: 3,
    initialDelayMs: 5_000,        // 5 seconds
    maxDelayMs: 300_000,          // 5 minutes
    backoffMultiplier: 2.0,
    retryableErrors: [
      'TIMEOUT',
      'CONNECTION_REFUSED',
      'CONNECTION_RESET',
      'SOCKET_HANG_UP',
      'HTTP_502',
      'HTTP_503',
      'HTTP_504',
    ],
  },

  timeouts: {
    connectTimeoutMs: 30_000,      // 30 seconds
    readTimeoutMs: 120_000,        // 2 minutes
    totalTimeoutMs: 300_000,       // 5 minutes
  },

  dlqPolicy: {
    maxRetries: 3,                 // After 3 total retries, move to DLQ
    moveToLDQAfterFailures: 3,
    alertOnDLQ: true,
  },

  responseWindows: {
    '837P': { expectedResponseTimeMs: 20_000, maxWaitTimeMs: 24 * 60 * 60 * 1000, description: 'Claim submission: 999 within 24h' },
    '837I': { expectedResponseTimeMs: 20_000, maxWaitTimeMs: 24 * 60 * 60 * 1000, description: 'Institutional claim: 999 within 24h' },
    '270':  { expectedResponseTimeMs: 20_000, maxWaitTimeMs: 20_000, description: 'CORE 258: Real-time eligibility response within 20s' },
    '271':  { expectedResponseTimeMs: 20_000, maxWaitTimeMs: 20_000, description: 'Eligibility response' },
    '276':  { expectedResponseTimeMs: 20_000, maxWaitTimeMs: 20_000, description: 'Claim status: real-time expected within 20s' },
    '277':  { expectedResponseTimeMs: 20_000, maxWaitTimeMs: 86_400_000, description: 'Claim status response' },
    '835':  { expectedResponseTimeMs: 86_400_000, maxWaitTimeMs: 30 * 86_400_000, description: 'ERA: within payment cycle' },
    '999':  { expectedResponseTimeMs: 86_400_000, maxWaitTimeMs: 86_400_000, description: 'Implementation ack within 24h' },
    '997':  { expectedResponseTimeMs: 86_400_000, maxWaitTimeMs: 86_400_000, description: 'Functional ack within 24h' },
    'TA1':  { expectedResponseTimeMs: 86_400_000, maxWaitTimeMs: 86_400_000, description: 'Interchange ack within 24h' },
    '275':  { expectedResponseTimeMs: 86_400_000, maxWaitTimeMs: 86_400_000, description: 'Attachment' },
    '278':  { expectedResponseTimeMs: 120_000, maxWaitTimeMs: 2 * 86_400_000, description: 'Prior auth: 2 min real-time, 2 day async' },
  },

  errorStandards: {
    includeSegmentReference: true,
    includeElementPosition: true,
    normalizeErrorCodes: true,
  },
};

let activeProfile: ConnectivityProfile = { ...DEFAULT_PROFILE };

/* ── Profile management ──────────────────────────────────────── */

export function getConnectivityProfile(): ConnectivityProfile {
  return { ...activeProfile };
}

export function updateConnectivityProfile(partial: Partial<ConnectivityProfile>): ConnectivityProfile {
  activeProfile = { ...activeProfile, ...partial };
  return { ...activeProfile };
}

export function resetConnectivityProfile(): void {
  activeProfile = { ...DEFAULT_PROFILE };
}

/* ── Enforcement Gates ───────────────────────────────────────── */

export interface GateCheckResult {
  gate: string;
  passed: boolean;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

/**
 * Check all connectivity gates for a transaction before transmission.
 */
export function checkPreTransmitGates(
  transactionSet: X12TransactionSet,
  x12Payload: string,
): GateCheckResult[] {
  const results: GateCheckResult[] = [];

  // Gate 1: X12 payload not empty
  results.push({
    gate: 'payload_present',
    passed: x12Payload.length > 0,
    message: x12Payload.length > 0 ? 'X12 payload present' : 'X12 payload is empty',
    severity: x12Payload.length > 0 ? 'info' : 'error',
  });

  // Gate 2: ISA envelope present
  const hasISA = x12Payload.startsWith('ISA');
  results.push({
    gate: 'isa_envelope',
    passed: hasISA,
    message: hasISA ? 'ISA envelope present' : 'Missing ISA envelope',
    severity: hasISA ? 'info' : 'error',
  });

  // Gate 3: IEA trailer present
  const hasIEA = x12Payload.includes('IEA');
  results.push({
    gate: 'iea_trailer',
    passed: hasIEA,
    message: hasIEA ? 'IEA trailer present' : 'Missing IEA trailer',
    severity: hasIEA ? 'info' : 'error',
  });

  // Gate 4: Segment terminator consistency
  const segments = x12Payload.split('~').filter(s => s.trim());
  const hasSegments = segments.length >= 4; // Minimum: ISA, GS, ST, SE (or equivalent)
  results.push({
    gate: 'segment_count',
    passed: hasSegments,
    message: hasSegments ? `${segments.length} segments present` : 'Too few segments',
    severity: hasSegments ? 'info' : 'error',
  });

  // Gate 5: Usage indicator is Test unless explicitly production
  const usageMatch = x12Payload.match(/ISA\*[^~]*\*([TP])\*/);
  const isTest = !usageMatch || usageMatch[1] === 'T';
  results.push({
    gate: 'usage_indicator',
    passed: true, // Always passes — just informational
    message: isTest ? 'Usage indicator: T (Test)' : 'WARNING: Usage indicator: P (Production)',
    severity: isTest ? 'info' : 'warning',
  });

  // Gate 6: Response window configured
  const window = activeProfile.responseWindows[transactionSet];
  results.push({
    gate: 'response_window',
    passed: !!window,
    message: window ? `Response window: ${window.description}` : `No response window configured for ${transactionSet}`,
    severity: window ? 'info' : 'warning',
  });

  return results;
}

/**
 * Check ack status gates for a transmitted transaction.
 */
export function checkAckGates(transactionId: string): GateCheckResult[] {
  const results: GateCheckResult[] = [];
  const txn = getTransaction(transactionId);

  if (!txn) {
    results.push({ gate: 'transaction_exists', passed: false, message: 'Transaction not found', severity: 'error' });
    return results;
  }

  results.push({ gate: 'transaction_exists', passed: true, message: `Transaction ${transactionId} found`, severity: 'info' });

  // Check if 999 is required and received
  if (activeProfile.ackRequirements.require999) {
    const is999Expected = ['837P', '837I', '270', '276'].includes(txn.envelope.transactionSet);
    if (is999Expected) {
      const ack999Received = txn.state === 'ack_accepted' || txn.state === 'ack_rejected';
      const timeSinceTransmit = txn.envelope.sentAt
        ? Date.now() - new Date(txn.envelope.sentAt).getTime()
        : 0;
      const timedOut = timeSinceTransmit > activeProfile.ackRequirements.ack999TimeoutMs;

      results.push({
        gate: 'ack_999_received',
        passed: ack999Received,
        message: ack999Received
          ? `999 acknowledgement received (${txn.state})`
          : timedOut
            ? '999 acknowledgement OVERDUE'
            : '999 acknowledgement pending',
        severity: ack999Received ? 'info' : timedOut ? 'error' : 'warning',
      });
    }
  }

  // Check retry status
  if (txn.retryCount > 0) {
    const withinLimit = txn.retryCount <= activeProfile.retryPolicy.maxRetries;
    results.push({
      gate: 'retry_within_limit',
      passed: withinLimit,
      message: `Retry count: ${txn.retryCount}/${activeProfile.retryPolicy.maxRetries}`,
      severity: withinLimit ? 'warning' : 'error',
    });
  }

  // Check DLQ status
  results.push({
    gate: 'not_in_dlq',
    passed: txn.state !== 'dlq',
    message: txn.state === 'dlq' ? 'Transaction in dead-letter queue' : 'Not in DLQ',
    severity: txn.state === 'dlq' ? 'error' : 'info',
  });

  return results;
}

/* ── Retry Logic ─────────────────────────────────────────────── */

/**
 * Calculate the next retry delay using exponential backoff.
 */
export function calculateRetryDelay(retryCount: number): number {
  const policy = activeProfile.retryPolicy;
  const delay = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, retryCount);
  return Math.min(delay, policy.maxDelayMs);
}

/**
 * Determine if a transaction should be retried or moved to DLQ.
 */
export function shouldRetry(transactionId: string): { retry: boolean; moveToDLQ: boolean; nextDelayMs: number } {
  const txn = getTransaction(transactionId);
  if (!txn) return { retry: false, moveToDLQ: false, nextDelayMs: 0 };

  const policy = activeProfile.retryPolicy;
  const dlqPolicy = activeProfile.dlqPolicy;

  if (txn.retryCount >= dlqPolicy.moveToLDQAfterFailures) {
    return { retry: false, moveToDLQ: true, nextDelayMs: 0 };
  }

  if (txn.retryCount >= policy.maxRetries) {
    return { retry: false, moveToDLQ: true, nextDelayMs: 0 };
  }

  // Check if the last error is retryable
  const lastError = txn.errors[txn.errors.length - 1];
  if (lastError && !policy.retryableErrors.includes(lastError.code)) {
    return { retry: false, moveToDLQ: true, nextDelayMs: 0 };
  }

  return {
    retry: true,
    moveToDLQ: false,
    nextDelayMs: calculateRetryDelay(txn.retryCount),
  };
}

/**
 * Process retry for a failed/rejected transaction.
 */
export function processRetry(transactionId: string): { retried: boolean; movedToDLQ: boolean; nextDelayMs: number } {
  const decision = shouldRetry(transactionId);

  if (decision.moveToDLQ) {
    transitionTransaction(transactionId, 'dlq', {
      error: { code: 'DLQ', description: 'Moved to dead-letter queue after max retries', severity: 'error' },
    });
    return { retried: false, movedToDLQ: true, nextDelayMs: 0 };
  }

  if (decision.retry) {
    transitionTransaction(transactionId, 'queued');
    return { retried: true, movedToDLQ: false, nextDelayMs: decision.nextDelayMs };
  }

  return { retried: false, movedToDLQ: false, nextDelayMs: 0 };
}

/* ── DLQ Management ──────────────────────────────────────────── */

export function getDLQTransactions(): TransactionRecord[] {
  return listTransactions({ state: 'dlq' });
}

export function retryFromDLQ(transactionId: string): boolean {
  const txn = getTransaction(transactionId);
  if (!txn || txn.state !== 'dlq') return false;
  const result = transitionTransaction(transactionId, 'queued');
  return result !== null;
}

/* ── Connectivity Health ─────────────────────────────────────── */

export interface ConnectivityHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  profile: string;
  dlqDepth: number;
  failedCount: number;
  pendingAcks: number;
  overdueAcks: number;
  checks: GateCheckResult[];
}

export function getConnectivityHealth(): ConnectivityHealth {
  const dlq = getDLQTransactions();
  const failed = listTransactions({ state: 'failed' });
  const ackPending = listTransactions({ state: 'ack_pending' });

  const now = Date.now();
  const overdueAcks = ackPending.filter(txn => {
    const sentTime = txn.envelope.sentAt ? new Date(txn.envelope.sentAt).getTime() : txn.createdAt ? new Date(txn.createdAt).getTime() : now;
    const window = activeProfile.responseWindows[txn.envelope.transactionSet];
    return window ? (now - sentTime) > window.maxWaitTimeMs : false;
  });

  const checks: GateCheckResult[] = [];

  checks.push({
    gate: 'dlq_depth',
    passed: dlq.length === 0,
    message: dlq.length === 0 ? 'DLQ empty' : `${dlq.length} transactions in DLQ`,
    severity: dlq.length === 0 ? 'info' : dlq.length > 5 ? 'error' : 'warning',
  });

  checks.push({
    gate: 'overdue_acks',
    passed: overdueAcks.length === 0,
    message: overdueAcks.length === 0 ? 'No overdue acknowledgements' : `${overdueAcks.length} overdue acks`,
    severity: overdueAcks.length === 0 ? 'info' : 'error',
  });

  const status: ConnectivityHealth['status'] =
    dlq.length > 5 || overdueAcks.length > 0 ? 'unhealthy' :
    dlq.length > 0 || failed.length > 3 ? 'degraded' :
    'healthy';

  return {
    status,
    profile: activeProfile.version,
    dlqDepth: dlq.length,
    failedCount: failed.length,
    pendingAcks: ackPending.length,
    overdueAcks: overdueAcks.length,
    checks,
  };
}
