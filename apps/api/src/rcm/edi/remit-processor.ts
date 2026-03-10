/**
 * RCM -- Remittance (835) Processor (Phase 43)
 *
 * Parses and normalizes 835 remittance advice payloads.
 * Maps CARC/RARC codes to actionable denial workqueue items.
 * Links to claims and transitions lifecycle.
 *
 * Processing flow:
 *   1. Parse normalized 835 input (or raw mock)
 *   2. Create Remittance domain object
 *   3. Auto-match to claim by payerClaimId or controlNumber
 *   4. For denials (CARC CO/PI + denial codes): create workqueue items
 *   5. Transition claim lifecycle (paid/denied)
 *   6. Audit the whole chain
 */

import type { Remittance, RemitServiceLine, RemitAdjustment } from '../domain/remit.js';
import { log } from '../../lib/logger.js';
import {
  storeRemittance,
  matchRemittanceToClaim,
  getClaim,
  updateClaim,
} from '../domain/claim-store.js';
import { transitionClaim } from '../domain/claim.js';
import { createWorkqueueItem } from '../workqueues/workqueue-store.js';
import { appendRcmAudit } from '../audit/rcm-audit.js';
import { lookupCarc, buildActionRecommendation } from '../reference/carc-rarc.js';

/* -- Input Types --------------------------------------------- */

export interface RemitIngestInput {
  /** Payer info */
  payerId: string;
  payerName?: string;

  /** Check/EFT */
  checkNumber?: string;
  checkDate?: string;
  eftTraceNumber?: string;

  /** Amounts (cents) */
  totalCharged: number;
  totalPaid: number;
  totalAdjusted?: number;
  totalPatientResponsibility?: number;

  /** Claim linkage */
  claimId?: string; // our internal ID if known
  payerClaimId?: string; // payer's claim reference number
  patientDfn?: string;
  ediControlNumber?: string; // 835 control number

  /** Service lines with adjustments */
  serviceLines?: RemitServiceLineInput[];

  /** Idempotency */
  idempotencyKey: string;

  /** Raw payload for compliance */
  rawPayload?: string;
  tenantId: string;
}

export interface RemitServiceLineInput {
  lineNumber: number;
  procedureCode: string;
  chargedAmount: number;
  paidAmount: number;
  patientResponsibility?: number;
  adjustments?: Array<{
    groupCode: string;
    reasonCode: string;
    amount: number;
    quantity?: number;
  }>;
  remarkCodes?: string[];
}

export interface RemitIngestResult {
  ok: boolean;
  remittance: Remittance;
  claimMatched: boolean;
  claimTransitioned: boolean;
  workqueueItemsCreated: number;
  idempotent: boolean;
}

/* -- Idempotency Store --------------------------------------- */

const remitIdempotencyIndex = new Map<string, string>(); // key -> remitId
const processedRemittances = new Map<string, Remittance>();

/* Phase 146: DB repo wiring */
let remitProcDbRepo: { upsert(d: any): Promise<any> } | null = null;
export function initRemitProcessorRepo(repo: typeof remitProcDbRepo): void {
  remitProcDbRepo = repo;
}

/* -- Ingestion ----------------------------------------------- */

export async function ingestRemittance(input: RemitIngestInput): Promise<RemitIngestResult> {
  const tenantKey = `${input.tenantId}:${input.idempotencyKey}`;
  // Idempotency check
  const existingId = remitIdempotencyIndex.get(tenantKey);
  if (existingId) {
    const remit = processedRemittances.get(existingId);
    if (remit) {
      return {
        ok: true,
        remittance: remit,
        claimMatched: false,
        claimTransitioned: false,
        workqueueItemsCreated: 0,
        idempotent: true,
      };
    }
  }

  const now = new Date().toISOString();

  // Build service lines
  const serviceLines: RemitServiceLine[] = (input.serviceLines ?? []).map((sl) => ({
    lineNumber: sl.lineNumber,
    procedureCode: sl.procedureCode,
    chargedAmount: sl.chargedAmount,
    paidAmount: sl.paidAmount,
    patientResponsibility: sl.patientResponsibility ?? 0,
    adjustments: (sl.adjustments ?? []).map((adj) => ({
      groupCode: adj.groupCode as RemitAdjustment['groupCode'],
      reasonCode: adj.reasonCode,
      amount: adj.amount,
      quantity: adj.quantity,
      description: lookupCarc(adj.reasonCode)?.description,
    })),
    remarkCodes: sl.remarkCodes,
  }));

  // Calculate totals if not provided
  const totalAdjusted =
    input.totalAdjusted ??
    serviceLines.reduce((sum, sl) => sum + sl.adjustments.reduce((s, a) => s + a.amount, 0), 0);
  const totalPatientResp =
    input.totalPatientResponsibility ??
    serviceLines.reduce((sum, sl) => sum + sl.patientResponsibility, 0);

  const remittance: Remittance = {
    id: `remit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId: input.tenantId,
    status: 'received',
    ediTransactionId: input.ediControlNumber,
    checkNumber: input.checkNumber,
    checkDate: input.checkDate,
    eftTraceNumber: input.eftTraceNumber,
    payerId: input.payerId,
    payerName: input.payerName,
    claimId: input.claimId,
    payerClaimId: input.payerClaimId,
    patientDfn: input.patientDfn,
    totalCharged: input.totalCharged,
    totalPaid: input.totalPaid,
    totalAdjusted: totalAdjusted,
    totalPatientResponsibility: totalPatientResp,
    serviceLines,
    isMock: false,
    importedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  storeRemittance(remittance);
  processedRemittances.set(remittance.id, remittance);
  remitIdempotencyIndex.set(tenantKey, remittance.id);

  // Phase 146: Write-through to PG
  remitProcDbRepo
    ?.upsert({
      id: remittance.id,
      tenantId: remittance.tenantId,
      source: input.idempotencyKey,
      status: 'processed',
      createdAt: new Date().toISOString(),
    })
    .catch((e) => log.warn('PG write-through failed', { error: String(e) }));

  // Auto-match to claim
  let claimMatched = false;
  let claimTransitioned = false;
  let workqueueItemsCreated = 0;

  if (input.claimId) {
    claimMatched = await matchRemittanceToClaim(remittance.id, input.claimId, remittance.tenantId);
  }

  const linkedClaimId = input.claimId ?? undefined;
  if (linkedClaimId) {
    const claim = await getClaim(linkedClaimId, remittance.tenantId);
    if (claim) {
      // Determine if this is a full pay, partial pay, or denial
      const isDenied = input.totalPaid === 0 && input.totalCharged > 0;

      if (isDenied && (claim.status === 'accepted' || claim.status === 'submitted')) {
        const updated = transitionClaim(
          claim,
          'denied',
          'system',
          '835 remittance: zero payment (denied)'
        );
        updated.paidAmount = 0;
        updated.adjustmentAmount = totalAdjusted;
        updated.patientResponsibility = totalPatientResp;
        updated.remitDate = input.checkDate ?? now.slice(0, 10);
        updateClaim(updated);
        claimTransitioned = true;
      } else if (!isDenied && (claim.status === 'accepted' || claim.status === 'submitted')) {
        const updated = transitionClaim(
          claim,
          'paid',
          'system',
          `835 remittance: payment ${input.totalPaid} cents`
        );
        updated.paidAmount = input.totalPaid;
        updated.adjustmentAmount = totalAdjusted;
        updated.patientResponsibility = totalPatientResp;
        updated.remitDate = input.checkDate ?? now.slice(0, 10);
        updateClaim(updated);
        claimTransitioned = true;
      }

      // Create workqueue items for denial/adjustment reason codes
      for (const sl of serviceLines) {
        for (const adj of sl.adjustments) {
          const carc = lookupCarc(adj.reasonCode);
          if (!carc) continue;

          // Denials (group CO or PI with denial category codes)
          if (carc.category === 'denial' && (adj.groupCode === 'CO' || adj.groupCode === 'PI')) {
            const { action, fieldHint } = buildActionRecommendation(adj.reasonCode, sl.remarkCodes);
            await createWorkqueueItem({
              type: 'denial',
              claimId: linkedClaimId,
              payerId: input.payerId,
              payerName: input.payerName,
              reasonCode: adj.reasonCode,
              reasonDescription: carc.description,
              reasonCategory: adj.groupCode,
              recommendedAction: action,
              fieldToFix: fieldHint,
              triggeringRule: `carc_${adj.reasonCode}`,
              sourceType: 'remit_835',
              sourceId: remittance.id,
              sourceTimestamp: now,
              priority: isDenied ? 'critical' : 'high',
              tenantId: remittance.tenantId,
            });
            workqueueItemsCreated++;
          }
        }
      }
    }
  }

  appendRcmAudit('remit.received', {
    claimId: linkedClaimId,
    payerId: input.payerId,
    detail: {
      remittanceId: remittance.id,
      totalPaid: input.totalPaid,
      totalAdjusted: totalAdjusted,
      claimMatched,
      claimTransitioned,
      workqueueItems: workqueueItemsCreated,
    },
  });

  return {
    ok: true,
    remittance,
    claimMatched,
    claimTransitioned,
    workqueueItemsCreated,
    idempotent: false,
  };
}

/* -- Stats --------------------------------------------------- */

export function getRemitProcessorStats(): {
  processed: number;
  matched: number;
  unmatched: number;
} {
  let matched = 0;
  let unmatched = 0;
  for (const r of processedRemittances.values()) {
    if (r.claimId) matched++;
    else unmatched++;
  }
  return { processed: processedRemittances.size, matched, unmatched };
}

export function resetRemitProcessor(): void {
  remitIdempotencyIndex.clear();
  processedRemittances.clear();
}
