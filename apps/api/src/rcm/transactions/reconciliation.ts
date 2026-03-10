/**
 * Transaction Reconciliation Engine
 *
 * Phase 45: Builds a complete reconciliation summary for a claim
 * by aggregating transaction history, acks, status updates, and ERA
 * remittance data into a unified view.
 *
 * claim -> transactions -> acks -> statuses -> remit lines -> payment/denial summary
 */

import type { ReconciliationSummary } from './types.js';
import { getTransactionsBySource } from './envelope.js';
import { getClaim } from '../domain/claim-store.js';
import { lookupCarc } from '../reference/carc-rarc.js';

/* -- Reconciliation -------------------------------------------- */

/**
 * Build a complete reconciliation summary for a claim.
 */
export async function buildReconciliationSummary(claimId: string): Promise<ReconciliationSummary | null> {
  const claim = await getClaim(claimId);
  if (!claim) return null;

  // Get all transactions for this claim
  const transactions = getTransactionsBySource(claimId);

  // Extract acks from claim audit trail
  const acknowledgements = extractAcksFromAudit(claim.auditTrail ?? []);

  // Extract status updates from audit
  const statusUpdates = extractStatusesFromAudit(claim.auditTrail ?? []);

  // Build remit lines from claim remittance data
  const remitLines = buildRemitLines(claim as any);

  // Calculate payment totals
  const totalCharged = claim.totalCharge ?? 0;
  const totalPaid = claim.paidAmount ?? 0;
  const totalAdjusted = claim.adjustmentAmount ?? 0;
  const patientResponsibility = claim.patientResponsibility ?? 0;

  // Determine payment status
  const paymentStatus = determinePaymentStatus(claim.status, totalCharged, totalPaid);

  // Build denial summary if applicable
  const denialSummary = buildDenialSummary(claim as any);

  // Find timestamps
  const firstSubmittedAt = findFirstTimestamp(claim.auditTrail ?? [], 'submitted');
  const lastAckAt =
    acknowledgements.length > 0
      ? acknowledgements[acknowledgements.length - 1].receivedAt
      : undefined;
  const lastStatusAt =
    statusUpdates.length > 0 ? statusUpdates[statusUpdates.length - 1].effectiveDate : undefined;

  return {
    claimId,
    claimStatus: claim.status,
    totalCharged,
    totalPaid,
    totalAdjusted,
    patientResponsibility,
    paymentStatus,
    transactions: transactions.map((t) => ({
      transactionId: t.id,
      transactionSet: t.envelope.transactionSet,
      state: t.state,
      sentAt: t.envelope.sentAt,
      responseAt: t.envelope.responseReceivedAt,
    })),
    acknowledgements,
    statusUpdates,
    remitLines,
    denialSummary,
    firstSubmittedAt,
    lastAckAt,
    lastStatusAt,
    reconciledAt:
      claim.status === 'paid' || claim.status === 'denied' || claim.status === 'closed'
        ? new Date().toISOString()
        : undefined,
  };
}

/* -- Helpers ---------------------------------------------------- */

function determinePaymentStatus(
  claimStatus: string,
  totalCharged: number,
  totalPaid: number
): ReconciliationSummary['paymentStatus'] {
  if (claimStatus === 'denied') return 'denied';
  if (claimStatus === 'draft' || claimStatus === 'validated' || claimStatus === 'submitted')
    return 'pending';
  if (totalPaid <= 0) return totalCharged > 0 ? 'denied' : 'unknown';
  if (totalPaid >= totalCharged) return 'full_payment';
  return 'partial_payment';
}

interface AuditEntry {
  action?: string;
  timestamp?: string;
  detail?: string;
  fromStatus?: string;
  toStatus?: string;
}

function extractAcksFromAudit(auditTrail: AuditEntry[]): ReconciliationSummary['acknowledgements'] {
  return auditTrail
    .filter(
      (e) =>
        e.action?.includes('accepted') ||
        e.action?.includes('rejected') ||
        e.detail?.includes('Ack')
    )
    .map((e) => ({
      type: e.detail?.includes('999') ? '999' : e.detail?.includes('277CA') ? '277CA' : 'TA1',
      disposition:
        e.action?.includes('rejected') || e.toStatus === 'rejected' ? 'rejected' : 'accepted',
      receivedAt: e.timestamp ?? new Date().toISOString(),
      errors: [], // Full error details in ack-status-processor
    }));
}

function extractStatusesFromAudit(
  auditTrail: AuditEntry[]
): ReconciliationSummary['statusUpdates'] {
  return auditTrail
    .filter((e) => e.action === 'transition' || e.fromStatus || e.toStatus)
    .map((e) => ({
      categoryCode: mapStatusToCategory(e.toStatus ?? ''),
      statusCode: e.toStatus ?? '',
      effectiveDate: e.timestamp ?? new Date().toISOString(),
      description: e.detail ?? `${e.fromStatus ?? '?'} -> ${e.toStatus ?? '?'}`,
    }));
}

function mapStatusToCategory(status: string): string {
  switch (status) {
    case 'submitted':
      return 'A0'; // Receipt
    case 'accepted':
      return 'A1'; // Accepted
    case 'rejected':
      return 'A4'; // Rejected
    case 'paid':
      return 'F0'; // Finalized
    case 'denied':
      return 'A7'; // Denied
    default:
      return 'A2'; // In adjudication
  }
}

function buildRemitLines(claim: Record<string, unknown>): ReconciliationSummary['remitLines'] {
  const remit = claim.remittance as Record<string, unknown> | undefined;
  if (!remit) return [];

  const serviceLines = remit.serviceLines as Array<Record<string, unknown>> | undefined;
  if (!serviceLines || !Array.isArray(serviceLines)) return [];

  return serviceLines.map((line) => ({
    procedureCode: (line.procedureCode as string) ?? '',
    chargedAmount: (line.chargedAmount as number) ?? 0,
    paidAmount: (line.paidAmount as number) ?? 0,
    adjustments: ((line.adjustments as Array<Record<string, unknown>>) ?? []).map((adj) => {
      const reasonCode = (adj.reasonCode as string) ?? '';
      const carcEntry = lookupCarc(reasonCode);
      return {
        groupCode: (adj.groupCode as string) ?? '',
        reasonCode,
        amount: (adj.amount as number) ?? 0,
        description: carcEntry?.description,
      };
    }),
  }));
}

function buildDenialSummary(
  claim: Record<string, unknown>
): ReconciliationSummary['denialSummary'] | undefined {
  if ((claim.status as string) !== 'denied') return undefined;

  const remit = claim.remittance as Record<string, unknown> | undefined;
  if (!remit) {
    return {
      primaryReasonCode: 'UNKNOWN',
      primaryReasonDescription: 'Denied -- no remittance details available',
      allReasonCodes: [],
      recommendedAction: 'Contact payer for denial reason details',
    };
  }

  const serviceLines = remit.serviceLines as Array<Record<string, unknown>> | undefined;
  const allReasonCodes: string[] = [];

  if (serviceLines) {
    for (const line of serviceLines) {
      const adjustments = line.adjustments as Array<Record<string, unknown>> | undefined;
      if (adjustments) {
        for (const adj of adjustments) {
          const code = adj.reasonCode as string;
          if (code && !allReasonCodes.includes(code)) allReasonCodes.push(code);
        }
      }
    }
  }

  const primaryCode = allReasonCodes[0] ?? 'UNKNOWN';
  const carcEntry = lookupCarc(primaryCode);

  return {
    primaryReasonCode: primaryCode,
    primaryReasonDescription: carcEntry?.description ?? 'Unknown denial reason',
    allReasonCodes,
    recommendedAction: carcEntry
      ? `Review CARC ${primaryCode} -- may require corrected claim or appeal`
      : 'Contact payer for denial details',
  };
}

function findFirstTimestamp(auditTrail: AuditEntry[], status: string): string | undefined {
  const entry = auditTrail.find((e) => e.toStatus === status);
  return entry?.timestamp;
}

/* -- Batch Reconciliation -------------------------------------- */

export interface ReconciliationStats {
  total: number;
  fullPayment: number;
  partialPayment: number;
  denied: number;
  pending: number;
  unknown: number;
  totalCharged: number;
  totalPaid: number;
  totalAdjusted: number;
}

/**
 * Build reconciliation stats across multiple claims.
 */
export async function buildReconciliationStats(claimIds: string[]): Promise<ReconciliationStats> {
  const stats: ReconciliationStats = {
    total: 0,
    fullPayment: 0,
    partialPayment: 0,
    denied: 0,
    pending: 0,
    unknown: 0,
    totalCharged: 0,
    totalPaid: 0,
    totalAdjusted: 0,
  };

  for (const id of claimIds) {
    const summary = await buildReconciliationSummary(id);
    if (!summary) continue;

    stats.total++;
    stats.totalCharged += summary.totalCharged;
    stats.totalPaid += summary.totalPaid;
    stats.totalAdjusted += summary.totalAdjusted;

    switch (summary.paymentStatus) {
      case 'full_payment':
        stats.fullPayment++;
        break;
      case 'partial_payment':
        stats.partialPayment++;
        break;
      case 'denied':
        stats.denied++;
        break;
      case 'pending':
        stats.pending++;
        break;
      default:
        stats.unknown++;
        break;
    }
  }

  return stats;
}
