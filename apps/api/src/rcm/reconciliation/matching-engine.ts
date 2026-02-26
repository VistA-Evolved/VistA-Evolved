/**
 * Reconciliation Matching Engine — Phase 99
 *
 * Deterministic matching: payment records → claim references.
 * Three-tier strategy (no AI):
 *   1. Exact match by claimRef
 *   2. Match by traceNumber / checkNumber
 *   3. Fuzzy match by patient + service date + amount tolerance
 *
 * Produces match confidence scores and flags low-confidence for review.
 * Auto-detects underpayments based on billed vs paid threshold.
 */

import {
  getPaymentById,
  updatePaymentStatus,
  createMatch,
  createUnderpaymentCase,
  listPaymentsByImport,
} from "./recon-store.js";
import type {
  PaymentRecord,
} from "./types.js";

/* ── Configuration ─────────────────────────────────────────── */

/** Amount tolerance for fuzzy matching (cents) */
const AMOUNT_TOLERANCE_CENTS = 100; // $1.00

/** Underpayment threshold: flag if paid < (billed * threshold) */
const UNDERPAYMENT_THRESHOLD = 0.90; // 90% — shortfall > 10% flagged

/** Minimum confidence to auto-match */
const AUTO_MATCH_CONFIDENCE = 80;

/* ── Match Result Types ────────────────────────────────────── */

export interface SingleMatchResult {
  paymentId: string;
  matched: boolean;
  matchId?: string;
  matchConfidence: number;
  matchMethod?: string;
  underpaymentCreated: boolean;
  underpaymentId?: string;
  error?: string;
}

export interface BatchMatchResult {
  importId: string;
  totalLines: number;
  matched: number;
  needsReview: number;
  unmatched: number;
  underpayments: number;
  errors: string[];
  results: SingleMatchResult[];
}

/* ── Known Claims Registry (simple in-memory for matching) ─── */

/**
 * Simple claim reference registry for matching.
 * In production, this queries VistA IB/AR or the Phase 91 claim store.
 * For now, we match by claimRef string equality against payment records.
 */
interface KnownClaim {
  claimRef: string;
  payerId?: string;
  totalChargeCents?: number;
  serviceDate?: string;
  patientDfn?: string;
}

const knownClaims = new Map<string, KnownClaim>();

export function registerKnownClaim(claim: KnownClaim): void {
  knownClaims.set(claim.claimRef, claim);
}

export function clearKnownClaims(): void {
  knownClaims.clear();
}

/* ── Core Matching Logic ───────────────────────────────────── */

/**
 * Attempt to match a single payment record.
 * Returns match result and optionally creates underpayment.
 */
export function matchPayment(payment: PaymentRecord): SingleMatchResult {
  try {
    // Tier 1: Exact claimRef match
    const exactClaim = knownClaims.get(payment.claimRef);
    if (exactClaim) {
      return createMatchAndCheck(payment, exactClaim, "EXACT_CLAIM_REF", 100);
    }

    // Tier 2: Match by trace number if available
    if (payment.traceNumber) {
      for (const claim of knownClaims.values()) {
        if (claim.claimRef === payment.traceNumber) {
          return createMatchAndCheck(payment, claim, "TRACE_NUMBER", 90);
        }
      }
    }

    // Tier 3: Fuzzy match by payer + amount tolerance + service date
    if (payment.serviceDate) {
      for (const claim of knownClaims.values()) {
        if (claim.payerId !== payment.payerId) continue;
        if (claim.serviceDate !== payment.serviceDate) continue;

        if (claim.totalChargeCents !== undefined) {
          const diff = Math.abs(claim.totalChargeCents - payment.billedAmountCents);
          if (diff <= AMOUNT_TOLERANCE_CENTS) {
            return createMatchAndCheck(payment, claim, "PATIENT_DOS_AMOUNT", 60);
          }
        }
      }
    }

    // No match found — mark as unmatched
    updatePaymentStatus(payment.id, "UNMATCHED");
    return {
      paymentId: payment.id,
      matched: false,
      matchConfidence: 0,
      underpaymentCreated: false,
    };
  } catch (err) {
    return {
      paymentId: payment.id,
      matched: false,
      matchConfidence: 0,
      underpaymentCreated: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Run matching for all payment records in an import batch.
 */
export function matchImportBatch(importId: string): BatchMatchResult {
  const payments = listPaymentsByImport(importId);
  const results: SingleMatchResult[] = [];
  let matched = 0;
  let needsReview = 0;
  let unmatched = 0;
  let underpayments = 0;
  const errors: string[] = [];

  for (const payment of payments) {
    if (payment.status !== "IMPORTED") continue; // skip already processed

    const result = matchPayment(payment);
    results.push(result);

    if (result.error) errors.push(result.error);

    if (result.matched && result.matchConfidence >= AUTO_MATCH_CONFIDENCE) {
      matched++;
    } else if (result.matched) {
      needsReview++;
    } else {
      unmatched++;
    }

    if (result.underpaymentCreated) underpayments++;
  }

  return {
    importId,
    totalLines: payments.length,
    matched,
    needsReview,
    unmatched,
    underpayments,
    errors,
    results,
  };
}

/* ── Internal Helpers ──────────────────────────────────────── */

/**
 * Run batch matching for a given import and return a simplified result.
 * Used by remittance-import-job.ts for background processing.
 */
export function runBatchMatch(importId: string): { attempted: number; matched: number; errors: string[] } {
  const batch = matchImportBatch(importId);
  return {
    attempted: batch.totalLines,
    matched: batch.matched + batch.needsReview,
    errors: batch.errors,
  };
}

/* ── Internal Helpers ──────────────────────────────────────── */

function createMatchAndCheck(
  payment: PaymentRecord,
  claim: KnownClaim,
  method: string,
  confidence: number,
): SingleMatchResult {
  const matchStatus = confidence >= AUTO_MATCH_CONFIDENCE ? "AUTO_MATCHED" : "REVIEW_REQUIRED";
  const paymentStatus = confidence >= AUTO_MATCH_CONFIDENCE ? "MATCHED" : "IMPORTED";

  // Create reconciliation match record
  const match = createMatch({
    paymentId: payment.id,
    claimRef: claim.claimRef,
    matchConfidence: confidence,
    matchMethod: method,
    matchStatus,
  });

  // Update payment status
  updatePaymentStatus(payment.id, paymentStatus as any);

  // Check for underpayment
  let underpaymentCreated = false;
  let underpaymentId: string | undefined;

  const expectedCents = claim.totalChargeCents ?? payment.billedAmountCents;
  if (payment.paidAmountCents < expectedCents * UNDERPAYMENT_THRESHOLD) {
    const up = createUnderpaymentCase({
      claimRef: claim.claimRef,
      paymentId: payment.id,
      payerId: payment.payerId,
      expectedAmountModel: claim.totalChargeCents ? "CONTRACT_MODEL" : "BILLED_AMOUNT",
      expectedAmountCents: expectedCents,
      paidAmountCents: payment.paidAmountCents,
    });
    underpaymentCreated = true;
    underpaymentId = up.id;
  }

  return {
    paymentId: payment.id,
    matched: true,
    matchId: match.id,
    matchConfidence: confidence,
    matchMethod: method,
    underpaymentCreated,
    underpaymentId,
  };
}
