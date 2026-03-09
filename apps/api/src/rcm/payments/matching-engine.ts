/**
 * Matching + Reconciliation Engine (Phase 92)
 *
 * Deterministic matching rules for remittance lines → claim cases.
 * Three-tier strategy:
 *   1. Exact match by internal claim ID
 *   2. Match by (payerId + externalClaimRef + serviceDate + amount tolerance)
 *   3. Fallback to "needs_review" queue
 *
 * On match:
 *   - Updates RemittanceLine match status
 *   - Posts payment to ClaimCase via transitionClaimCase()
 *   - Records PaymentPostingEvent
 *   - Checks for underpayment
 *
 * Evidence-first: posting always references the batch/file as evidence.
 */

import type { RemittanceBatch, RemittanceLine } from './payment-types.js';
import {
  updateLine,
  getAllLinesForBatch,
  updateBatch,
  getBatch,
  getLine,
  recordPosting,
  createUnderpayment,
} from './payment-store.js';
import {
  getClaimCase,
  transitionClaimCase,
  listClaimCases,
  updateClaimCase,
} from '../claims/claim-store.js';
import type { ClaimCase } from '../claims/claim-types.js';

/* ── Configuration ─────────────────────────────────────────── */

/** Amount tolerance for fuzzy matching (cents) */
const AMOUNT_TOLERANCE_CENTS = 100; // $1.00

/** Underpayment threshold: flag if paid < (charged * threshold) */
const UNDERPAYMENT_THRESHOLD = 0.9; // 90% — shortfall > 10% flagged

/* ── Match Result ──────────────────────────────────────────── */

export interface MatchResult {
  lineId: string;
  matchStatus: 'matched' | 'needs_review';
  matchedClaimCaseId?: string;
  matchMethod?: 'exact_id' | 'external_ref' | 'fuzzy' | 'manual';
  matchConfidence: number;
  underpaymentCreated: boolean;
  postingCreated: boolean;
  error?: string;
}

export interface BatchMatchResult {
  batchId: string;
  totalLines: number;
  matched: number;
  needsReview: number;
  errors: string[];
  results: MatchResult[];
}

/* ── Core Matching ─────────────────────────────────────────── */

/**
 * Run matching for all unmatched lines in a batch.
 * Deterministic: same input always produces the same output.
 */
export function matchBatch(batchId: string, actor: string): BatchMatchResult {
  const batch = getBatch(batchId);
  if (!batch) {
    return {
      batchId,
      totalLines: 0,
      matched: 0,
      needsReview: 0,
      errors: ['Batch not found'],
      results: [],
    };
  }

  const allLines = getAllLinesForBatch(batchId);
  const unmatchedLines = allLines.filter(
    (l) => l.matchStatus === 'unmatched' || l.matchStatus === 'needs_review'
  );

  const results: MatchResult[] = [];
  let matched = 0;
  let needsReview = 0;
  const errors: string[] = [];

  for (const line of unmatchedLines) {
    const result = matchSingleLine(line, batch, actor);
    results.push(result);
    if (result.matchStatus === 'matched') matched++;
    else needsReview++;
    if (result.error) errors.push(result.error);
  }

  // Update batch status
  const totalMatched = (batch.matchedCount ?? 0) + matched;
  const totalNeedsReview = needsReview;
  const totalUnmatched = allLines.length - totalMatched - totalNeedsReview;

  let newStatus: RemittanceBatch['status'] = batch.status;
  if (totalMatched === allLines.length) {
    newStatus = 'matched';
  } else if (totalMatched > 0) {
    newStatus = totalNeedsReview > 0 ? 'needs_review' : 'partially_matched';
  } else if (totalNeedsReview > 0) {
    newStatus = 'needs_review';
  }

  updateBatch(batchId, {
    status: newStatus,
    matchedCount: totalMatched,
    unmatchedCount: totalUnmatched,
    needsReviewCount: totalNeedsReview,
  });

  return {
    batchId,
    totalLines: unmatchedLines.length,
    matched,
    needsReview,
    errors,
    results,
  };
}

/**
 * Match a single remittance line to a claim case.
 */
function matchSingleLine(line: RemittanceLine, batch: RemittanceBatch, actor: string): MatchResult {
  // Strategy 1: Exact match by internal claim ID
  if (line.claimId) {
    const claim = getClaimCase(line.claimId, batch.tenantId);
    if (claim) {
      return applyMatch(line, claim, batch, actor, 'exact_id', 100);
    }
  }

  // Strategy 2: Match by external ref + payer + service date + amount
  if (line.externalClaimRef) {
    const candidate = findByExternalRef(
      batch.tenantId,
      batch.payerId,
      line.externalClaimRef,
      line.serviceDate,
      line.amountBilled
    );
    if (candidate) {
      return applyMatch(line, candidate, batch, actor, 'external_ref', 85);
    }
  }

  // Strategy 3: Fuzzy match by payer + service date + amount tolerance
  const fuzzyCandidate = findByFuzzy(
    batch.tenantId,
    batch.payerId,
    line.serviceDate,
    line.amountBilled
  );
  if (fuzzyCandidate) {
    return applyMatch(line, fuzzyCandidate, batch, actor, 'fuzzy', 60);
  }

  // No match — needs review
  updateLine(line.id, { matchStatus: 'needs_review' });
  return {
    lineId: line.id,
    matchStatus: 'needs_review',
    matchConfidence: 0,
    underpaymentCreated: false,
    postingCreated: false,
  };
}

/* ── Match Application ─────────────────────────────────────── */

function applyMatch(
  line: RemittanceLine,
  claim: ClaimCase,
  batch: RemittanceBatch,
  actor: string,
  method: MatchResult['matchMethod'] & string,
  confidence: number
): MatchResult {
  // Update line
  updateLine(line.id, {
    matchStatus: 'matched',
    matchedClaimCaseId: claim.id,
    matchConfidence: confidence,
    matchMethod: method,
    paidAt: new Date().toISOString(),
  });

  // Determine payment status
  const isPaidFull = line.amountPaid >= claim.totalCharge;
  const toStatus = isPaidFull ? 'paid_full' : 'paid_partial';

  // Try to transition claim (requires evidence)
  let postingCreated = false;
  const evidenceRef = batch.fileChecksum || batch.fileUri || `batch:${batch.id}`;
  const evidenceDetail = {
    evidenceRef,
    payerClaimNumber: line.externalClaimRef,
    batchId: batch.id,
    lineId: line.id,
  };

  // States that can be transitioned toward paid
  const directPayableStates = ['payer_acknowledged'];
  const needsAckFirstStates = ['submitted_electronic', 'submitted_portal', 'submitted_manual'];
  const needsSubmitFirstStates = ['exported'];

  const currentStatus = claim.lifecycleStatus;
  let canProceed = false;

  if (directPayableStates.includes(currentStatus)) {
    // Direct transition to paid
    canProceed = true;
  } else if (needsAckFirstStates.includes(currentStatus)) {
    // Two-step: submitted → payer_acknowledged → paid
    const ackResult = transitionClaimCase(
      batch.tenantId,
      claim.id,
      'payer_acknowledged',
      actor,
      evidenceDetail
    );
    canProceed = ackResult.ok;
  } else if (needsSubmitFirstStates.includes(currentStatus)) {
    // Three-step: exported → submitted_electronic → payer_acknowledged → paid
    const subResult = transitionClaimCase(
      batch.tenantId,
      claim.id,
      'submitted_electronic',
      actor,
      evidenceDetail
    );
    if (subResult.ok) {
      const ackResult = transitionClaimCase(
        batch.tenantId,
        claim.id,
        'payer_acknowledged',
        actor,
        evidenceDetail
      );
      canProceed = ackResult.ok;
    }
  }

  if (canProceed) {
    const transResult = transitionClaimCase(
      batch.tenantId,
      claim.id,
      toStatus as any,
      actor,
      evidenceDetail
    );

    if (transResult.ok) {
      // Update claim financial fields
      updateClaimCase(batch.tenantId, claim.id, {
        paidAmount: (claim.paidAmount ?? 0) + line.amountPaid,
        adjustmentAmount: (claim.adjustmentAmount ?? 0) + line.amountAdjusted,
        patientResponsibility: (claim.patientResponsibility ?? 0) + line.patientResponsibility,
        remitDate: new Date().toISOString(),
        payerClaimNumber: line.externalClaimRef ?? claim.payerClaimNumber,
      });

      // Record posting event
      recordPosting({
        claimCaseId: claim.id,
        batchId: batch.id,
        lineId: line.id,
        tenantId: batch.tenantId,
        actorUserId: actor,
        postedAt: new Date().toISOString(),
        fromStatus: currentStatus,
        toStatus,
        deltaAmounts: {
          paidAmount: line.amountPaid,
          adjustmentAmount: line.amountAdjusted,
          patientResponsibility: line.patientResponsibility,
        },
        evidenceRef,
      });
      postingCreated = true;
    }
  }

  // Underpayment detection
  let underpaymentCreated = false;
  if (claim.totalCharge > 0 && line.amountPaid < claim.totalCharge * UNDERPAYMENT_THRESHOLD) {
    const shortfall = claim.totalCharge - line.amountPaid;
    createUnderpayment({
      tenantId: batch.tenantId,
      claimCaseId: claim.id,
      batchId: batch.id,
      lineId: line.id,
      expectedAmount: claim.totalCharge,
      paidAmount: line.amountPaid,
      shortfallAmount: shortfall,
      shortfallPercent: Math.round((shortfall / claim.totalCharge) * 100),
      payerId: batch.payerId,
      payerName: batch.payerName,
    });
    underpaymentCreated = true;
  }

  return {
    lineId: line.id,
    matchStatus: 'matched',
    matchedClaimCaseId: claim.id,
    matchMethod: method,
    matchConfidence: confidence,
    underpaymentCreated,
    postingCreated,
  };
}

/* ── Lookup Strategies ─────────────────────────────────────── */

function findByExternalRef(
  tenantId: string,
  payerId: string,
  externalRef: string,
  serviceDate?: string,
  amountBilled?: number
): ClaimCase | undefined {
  const { items } = listClaimCases({ tenantId, payerId, limit: 500 });

  for (const claim of items) {
    if (claim.payerClaimNumber === externalRef) {
      // Optionally verify service date
      if (serviceDate && claim.dateOfService !== serviceDate) continue;
      return claim;
    }
  }
  return undefined;
}

function findByFuzzy(
  tenantId: string,
  payerId: string,
  serviceDate?: string,
  amountBilled?: number
): ClaimCase | undefined {
  if (!serviceDate || !amountBilled) return undefined;

  const { items } = listClaimCases({ tenantId, payerId, limit: 500 });

  for (const claim of items) {
    if (claim.dateOfService !== serviceDate) continue;
    if (Math.abs(claim.totalCharge - amountBilled) <= AMOUNT_TOLERANCE_CENTS) {
      // Don't match already-paid claims
      if (claim.lifecycleStatus === 'paid_full' || claim.lifecycleStatus === 'closed') continue;
      return claim;
    }
  }
  return undefined;
}

/* ── Manual Link ───────────────────────────────────────────── */

/**
 * Manually link a remittance line to a claim case.
 * Used from the reconciliation worklist UI.
 */
export function manualLinkLine(lineId: string, claimCaseId: string, actor: string): MatchResult {
  const line = getLine(lineId);

  if (!line) {
    return {
      lineId,
      matchStatus: 'needs_review',
      matchConfidence: 0,
      underpaymentCreated: false,
      postingCreated: false,
      error: 'Line not found',
    };
  }

  const claim = getClaimCase(claimCaseId, line.tenantId);
  if (!claim) {
    return {
      lineId,
      matchStatus: 'needs_review',
      matchConfidence: 0,
      underpaymentCreated: false,
      postingCreated: false,
      error: 'Claim case not found',
    };
  }

  const batch = getBatch(line.batchId);
  if (!batch) {
    return {
      lineId,
      matchStatus: 'needs_review',
      matchConfidence: 0,
      underpaymentCreated: false,
      postingCreated: false,
      error: 'Batch not found',
    };
  }

  // Update line to manually linked
  updateLine(lineId, {
    matchStatus: 'manually_linked',
    matchedClaimCaseId: claimCaseId,
    matchConfidence: 100,
    matchMethod: 'manual',
    paidAt: new Date().toISOString(),
  });

  // Apply the match (same logic as auto-match)
  const result = applyMatch(line, claim, batch, actor, 'manual', 100);

  // Update batch counts
  const currentBatch = getBatch(line.batchId);
  if (currentBatch) {
    updateBatch(line.batchId, {
      matchedCount: (currentBatch.matchedCount ?? 0) + 1,
      needsReviewCount: Math.max(0, (currentBatch.needsReviewCount ?? 0) - 1),
    });
  }

  return result;
}

/* ── CSV Parser ────────────────────────────────────────────── */

/**
 * Parse a simple CSV remittance file into RemittanceLine objects.
 * Expected columns: claimId?, externalClaimRef?, patientRef?, amountBilled, amountPaid,
 *                   amountAdjusted?, patientResponsibility?, serviceDate?, procedureCode?,
 *                   adjustmentReasonCodes?, reasonText?
 *
 * Returns parsed lines + any parse errors.
 */
export interface ParseResult {
  lines: Array<Omit<RemittanceLine, 'id'>>;
  errors: string[];
  totalPaid: number;
  totalBilled: number;
  totalAdjusted: number;
}

export function parseRemittanceCsv(
  csvContent: string,
  batchId: string,
  tenantId: string
): ParseResult {
  const rows = csvContent.trim().split('\n');
  if (rows.length < 2) {
    return {
      lines: [],
      errors: ['CSV must have a header row and at least one data row'],
      totalPaid: 0,
      totalBilled: 0,
      totalAdjusted: 0,
    };
  }

  const header = rows[0].split(',').map((h) =>
    h
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
  );
  const errors: string[] = [];
  const parsed: Array<Omit<RemittanceLine, 'id'>> = [];
  let totalPaid = 0;
  let totalBilled = 0;
  let totalAdjusted = 0;

  const col = (name: string) => header.indexOf(name);

  const amountPaidIdx = col('amountpaid') !== -1 ? col('amountpaid') : col('amount_paid');
  const amountBilledIdx = col('amountbilled') !== -1 ? col('amountbilled') : col('amount_billed');

  if (amountPaidIdx === -1) {
    return {
      lines: [],
      errors: ['Missing required column: amountPaid or amount_paid'],
      totalPaid: 0,
      totalBilled: 0,
      totalAdjusted: 0,
    };
  }

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].split(',').map((c) => c.trim());
    if (cells.length < 2) {
      errors.push(`Row ${i}: too few columns`);
      continue;
    }

    const amtPaid = parseCents(cells[amountPaidIdx]);
    const amtBilled = amountBilledIdx !== -1 ? parseCents(cells[amountBilledIdx]) : 0;
    const amtAdj =
      col('amountadjusted') !== -1 || col('amount_adjusted') !== -1
        ? parseCents(
            cells[col('amountadjusted') !== -1 ? col('amountadjusted') : col('amount_adjusted')]
          )
        : 0;
    const patResp =
      col('patientresponsibility') !== -1 || col('patient_responsibility') !== -1
        ? parseCents(
            cells[
              col('patientresponsibility') !== -1
                ? col('patientresponsibility')
                : col('patient_responsibility')
            ]
          )
        : 0;

    if (isNaN(amtPaid)) {
      errors.push(`Row ${i}: invalid amountPaid`);
      continue;
    }

    totalPaid += amtPaid;
    totalBilled += amtBilled;
    totalAdjusted += amtAdj;

    parsed.push({
      batchId,
      tenantId,
      lineNumber: i,
      claimId: getCellIfPresent(cells, col('claimid') !== -1 ? col('claimid') : col('claim_id')),
      externalClaimRef: getCellIfPresent(
        cells,
        col('externalclaimref') !== -1 ? col('externalclaimref') : col('external_claim_ref')
      ),
      patientRef: getCellIfPresent(
        cells,
        col('patientref') !== -1 ? col('patientref') : col('patient_ref')
      ),
      amountBilled: amtBilled,
      amountPaid: amtPaid,
      amountAdjusted: amtAdj,
      patientResponsibility: patResp,
      serviceDate: getCellIfPresent(
        cells,
        col('servicedate') !== -1 ? col('servicedate') : col('service_date')
      ),
      procedureCode: getCellIfPresent(
        cells,
        col('procedurecode') !== -1 ? col('procedurecode') : col('procedure_code')
      ),
      adjustmentReasonCodes: getCellIfPresent(
        cells,
        col('adjustmentreasoncodes') !== -1
          ? col('adjustmentreasoncodes')
          : col('adjustment_reason_codes')
      )
        ?.split(';')
        .filter(Boolean),
      reasonText: getCellIfPresent(
        cells,
        col('reasontext') !== -1 ? col('reasontext') : col('reason_text')
      ),
      matchStatus: 'unmatched',
    });
  }

  return { lines: parsed, errors, totalPaid, totalBilled, totalAdjusted };
}

function parseCents(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val);
  if (isNaN(n)) return NaN;
  // If value looks like dollars (has decimal or < 10000), convert to cents
  if (val.includes('.') || Math.abs(n) < 10000) {
    return Math.round(n * 100);
  }
  return Math.round(n);
}

function getCellIfPresent(cells: string[], idx: number): string | undefined {
  if (idx < 0 || idx >= cells.length) return undefined;
  const v = cells[idx].trim();
  return v.length > 0 ? v : undefined;
}
