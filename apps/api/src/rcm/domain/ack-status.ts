/**
 * RCM Domain — Acknowledgement & Claim Status Models (Phase 43)
 *
 * Normalized models for:
 *   - 999 Implementation Acknowledgement
 *   - 277CA Claim Acknowledgement
 *   - 276 Claim Status Inquiry
 *   - 277 Claim Status Response
 *
 * All models are X12-agnostic — raw EDI is parsed into these
 * normalized types before storage. The raw payload is preserved
 * separately for audit/compliance.
 */

import { randomUUID } from 'node:crypto';

/* ── Acknowledgement (999 / 277CA) ─────────────────────────── */

export type AckType = '999' | '277CA' | 'TA1';

export type AckDisposition =
  | 'accepted' // A — accepted
  | 'accepted_errors' // E — accepted with errors
  | 'rejected'; // R — rejected

export interface AckError {
  segmentId?: string; // e.g. "CLM", "SV1"
  elementPosition?: string;
  errorCode: string; // IK3/IK4 error code
  description: string;
}

export interface Acknowledgement {
  id: string;
  type: AckType;
  disposition: AckDisposition;

  /** The original claim or interchange this ack refers to */
  claimId?: string; // our internal claim ID
  originalControlNumber: string; // ISA13 or ST02 of the original
  ackControlNumber: string; // this ack's control number

  /** Payer info */
  payerId?: string;
  payerName?: string;

  /** Error details (only for rejected / accepted_errors) */
  errors: AckError[];

  /** Raw payload (preserved for compliance) */
  rawPayload?: string;

  /** Idempotency */
  idempotencyKey: string;

  /** Timestamps */
  receivedAt: string;
  processedAt: string;
  createdAt: string;
}

export function createAck(params: {
  type: AckType;
  disposition: AckDisposition;
  claimId?: string;
  originalControlNumber: string;
  ackControlNumber: string;
  payerId?: string;
  payerName?: string;
  errors?: AckError[];
  rawPayload?: string;
  idempotencyKey: string;
}): Acknowledgement {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    type: params.type,
    disposition: params.disposition,
    claimId: params.claimId,
    originalControlNumber: params.originalControlNumber,
    ackControlNumber: params.ackControlNumber,
    payerId: params.payerId,
    payerName: params.payerName,
    errors: params.errors ?? [],
    rawPayload: params.rawPayload,
    idempotencyKey: params.idempotencyKey,
    receivedAt: now,
    processedAt: now,
    createdAt: now,
  };
}

/* ── Claim Status (276/277) ────────────────────────────────── */

export type StatusCategoryCode =
  | 'A0' // Acknowledgement/Receipt
  | 'A1' // Forwarded to next entity
  | 'A2' // In adjudication
  | 'A3' // Suspended
  | 'A4' // Returned as unprocessable
  | 'A5' // Completed with errors
  | 'F0' // Finalized - adjudication complete, no payment
  | 'F1' // Finalized - payment issued
  | 'F2' // Finalized - denial
  | 'F3' // Finalized - revised
  | 'F4' // Finalized - forwarded for review
  | 'P0' // Pending - review
  | 'P1' // Pending - additional information
  | 'P2' // Pending - provider
  | 'P3' // Pending - patient info
  | 'P4' // Pending - authorization
  | 'R0' // Requests for additional info
  | 'R1' // Request for medical records
  | 'R3' // Replacement
  | 'R4' // Resubmission
  | 'RQ' // Request
  | 'E0' // Response not possible - error on original
  | 'E1' // Response not possible - not found
  | 'D0' // Denied
  | string; // extensible

export interface ClaimStatusUpdate {
  id: string;
  claimId?: string; // our internal claim ID
  payerClaimId?: string; // payer's tracking reference

  /** 277 category + status codes */
  categoryCode: StatusCategoryCode;
  statusCode: string; // specific status (free text from payer)
  statusDescription: string;

  /** Key dates from payer */
  effectiveDate?: string;
  checkDate?: string;
  totalCharged?: number; // cents
  totalPaid?: number; // cents

  /** Payer */
  payerId?: string;
  payerName?: string;

  /** Idempotency */
  idempotencyKey: string;

  /** Raw */
  rawPayload?: string;

  /** Timestamps */
  receivedAt: string;
  createdAt: string;
}

export function createStatusUpdate(params: {
  claimId?: string;
  payerClaimId?: string;
  categoryCode: StatusCategoryCode;
  statusCode: string;
  statusDescription: string;
  effectiveDate?: string;
  checkDate?: string;
  totalCharged?: number;
  totalPaid?: number;
  payerId?: string;
  payerName?: string;
  rawPayload?: string;
  idempotencyKey: string;
}): ClaimStatusUpdate {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    claimId: params.claimId,
    payerClaimId: params.payerClaimId,
    categoryCode: params.categoryCode,
    statusCode: params.statusCode,
    statusDescription: params.statusDescription,
    effectiveDate: params.effectiveDate,
    checkDate: params.checkDate,
    totalCharged: params.totalCharged,
    totalPaid: params.totalPaid,
    payerId: params.payerId,
    payerName: params.payerName,
    rawPayload: params.rawPayload,
    idempotencyKey: params.idempotencyKey,
    receivedAt: now,
    createdAt: now,
  };
}

/* ── Claim History (aggregated timeline) ───────────────────── */

export type ClaimHistoryEventType =
  | 'created'
  | 'validated'
  | 'submitted'
  | 'ack_received'
  | 'status_update'
  | 'remit_received'
  | 'denial'
  | 'appeal'
  | 'resubmission'
  | 'closed'
  | 'note';

export interface ClaimHistoryEvent {
  id: string;
  claimId: string;
  eventType: ClaimHistoryEventType;
  timestamp: string;
  source: string; // 'system' | 'payer' | 'user' | connector id
  summary: string; // human-readable description
  detail?: Record<string, unknown>;
}
