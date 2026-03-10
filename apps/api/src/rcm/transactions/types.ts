/**
 * Transaction Correctness Engine -- Types
 *
 * Phase 45: Enterprise-grade transaction envelopes, correlation,
 * idempotency, and lifecycle tracking for X12 EDI transactions.
 *
 * These types wrap existing EDI types with interchange metadata
 * needed for CAQH CORE/CMS operating-rule compliance.
 */

import type { X12TransactionSet, IsaEnvelope, GsEnvelope } from '../edi/types.js';

/* -- Transaction Envelope -------------------------------------- */

export interface TransactionEnvelope {
  /** Unique ID for this transaction instance */
  transactionId: string;

  /** Tenant context for durable multi-tenant storage */
  tenantId: string;

  /** X12 transaction set type */
  transactionSet: X12TransactionSet;

  /** ISA-level interchange metadata */
  isa: IsaEnvelope;

  /** GS-level functional group metadata */
  gs: GsEnvelope;

  /** Our internal correlation ID (links request -> response) */
  correlationId: string;

  /** Idempotency key to prevent duplicate processing */
  idempotencyKey: string;

  /** Auto-incrementing control number (per sender/receiver pair) */
  controlNumber: string;

  /** Sender/receiver identification */
  senderId: string;
  receiverId: string;

  /** Timestamps */
  createdAt: string;
  sentAt?: string;
  ackReceivedAt?: string;
  responseReceivedAt?: string;

  /** Direction of the transaction */
  direction: 'outbound' | 'inbound';

  /** Linked claim/eligibility/status ID */
  sourceId?: string;
  sourceType?: 'claim' | 'eligibility' | 'status_inquiry' | 'prior_auth';
}

/* -- Transaction Lifecycle ------------------------------------- */

export type TransactionState =
  | 'created' // Envelope built, not yet serialized
  | 'serialized' // X12 wire format generated
  | 'validated' // Pre-flight validation passed
  | 'queued' // In outbound queue
  | 'transmitted' // Sent to payer/clearinghouse
  | 'ack_pending' // Awaiting 999/TA1 acknowledgement
  | 'ack_accepted' // 999 accepted
  | 'ack_rejected' // 999 rejected
  | 'response_pending' // Awaiting substantive response (271/277/835)
  | 'response_received' // Got response
  | 'reconciled' // Matched back to source
  | 'failed' // Unrecoverable error
  | 'cancelled' // Manually cancelled
  | 'dlq'; // Moved to dead-letter queue

export const TRANSACTION_STATE_TRANSITIONS: Record<TransactionState, TransactionState[]> = {
  created: ['serialized', 'failed', 'cancelled'],
  serialized: ['validated', 'failed', 'cancelled'],
  validated: ['queued', 'failed', 'cancelled'],
  queued: ['transmitted', 'failed', 'cancelled'],
  transmitted: ['ack_pending', 'failed', 'cancelled'],
  ack_pending: ['ack_accepted', 'ack_rejected', 'failed', 'dlq'],
  ack_accepted: ['response_pending', 'reconciled'],
  ack_rejected: ['queued', 'failed', 'dlq'], // retry or DLQ
  response_pending: ['response_received', 'failed', 'dlq'],
  response_received: ['reconciled', 'failed'],
  reconciled: [], // terminal
  failed: ['queued', 'dlq'], // retry or DLQ
  cancelled: [], // terminal
  dlq: ['queued'], // manual retry from DLQ
};

/* -- Translator types ------------------------------------------ */

export interface TranslatorResult {
  /** The X12 wire-format string */
  x12Payload: string;

  /** Envelope metadata for tracking */
  envelope: TransactionEnvelope;

  /** Segment count (ST-SE) */
  segmentCount: number;

  /** Byte size of the X12 payload */
  byteSize: number;
}

export interface ParsedResponse {
  /** Transaction set of the response */
  transactionSet: X12TransactionSet;

  /** Correlation back to original */
  correlationId?: string;
  referenceControlNumber?: string;

  /** Parsed canonical object */
  canonical: Record<string, unknown>;

  /** Whether the response indicates acceptance */
  accepted: boolean;

  /** Errors from the response */
  errors: Array<{ code: string; description: string; severity: string }>;
}

/* -- Connectivity Profile -------------------------------------- */

export interface ConnectivityProfile {
  /** Profile version */
  version: string;

  /** CAQH CORE operating rule references (by rule number, not copyrighted text) */
  operatingRuleReferences: string[];

  /** Acknowledgement requirements */
  ackRequirements: {
    /** 999 required for all outbound transactions */
    require999: boolean;
    /** 277CA required for 837 claims */
    require277CA: boolean;
    /** Maximum time to wait for 999 (ms) */
    ack999TimeoutMs: number;
    /** Maximum time to wait for 277CA (ms) */
    ack277CATimeoutMs: number;
  };

  /** Retry policy */
  retryPolicy: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    retryableErrors: string[];
  };

  /** Timeout defaults */
  timeouts: {
    connectTimeoutMs: number;
    readTimeoutMs: number;
    totalTimeoutMs: number;
  };

  /** Dead letter queue behavior */
  dlqPolicy: {
    maxRetries: number;
    moveToLDQAfterFailures: number;
    alertOnDLQ: boolean;
  };

  /** Transaction-specific response windows */
  responseWindows: Record<
    X12TransactionSet,
    {
      expectedResponseTimeMs: number;
      maxWaitTimeMs: number;
      description: string;
    }
  >;

  /** Error standardization */
  errorStandards: {
    includeSegmentReference: boolean;
    includeElementPosition: boolean;
    normalizeErrorCodes: boolean;
  };
}

/* -- Reconciliation types -------------------------------------- */

export interface ReconciliationSummary {
  claimId: string;
  claimStatus: string;
  totalCharged: number;
  totalPaid: number;
  totalAdjusted: number;
  patientResponsibility: number;
  paymentStatus: 'full_payment' | 'partial_payment' | 'denied' | 'pending' | 'unknown';

  /** Transaction history */
  transactions: Array<{
    transactionId: string;
    transactionSet: X12TransactionSet;
    state: TransactionState;
    sentAt?: string;
    responseAt?: string;
  }>;

  /** Ack chain */
  acknowledgements: Array<{
    type: string;
    disposition: string;
    receivedAt: string;
    errors: Array<{ code: string; description: string }>;
  }>;

  /** Status updates */
  statusUpdates: Array<{
    categoryCode: string;
    statusCode: string;
    effectiveDate: string;
    description: string;
  }>;

  /** Remittance lines */
  remitLines: Array<{
    procedureCode: string;
    chargedAmount: number;
    paidAmount: number;
    adjustments: Array<{
      groupCode: string;
      reasonCode: string;
      amount: number;
      description?: string;
    }>;
  }>;

  /** Denial summary (if any denials) */
  denialSummary?: {
    primaryReasonCode: string;
    primaryReasonDescription: string;
    allReasonCodes: string[];
    recommendedAction: string;
  };

  /** Timestamps */
  firstSubmittedAt?: string;
  lastAckAt?: string;
  lastStatusAt?: string;
  lastRemitAt?: string;
  reconciledAt?: string;
}

/* -- Transaction store entry ----------------------------------- */

export interface TransactionRecord {
  id: string;
  envelope: TransactionEnvelope;
  state: TransactionState;
  x12Payload?: string;
  responsePayload?: string;
  errors: Array<{ code: string; description: string; severity: string; timestamp: string }>;
  retryCount: number;
  lastRetryAt?: string;
  nextRetryAt?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
