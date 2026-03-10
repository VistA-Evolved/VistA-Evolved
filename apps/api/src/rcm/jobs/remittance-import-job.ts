/**
 * Remittance Import Job -- Phase 142: RCM Operational Excellence
 *
 * Background job that processes an ERA 835 import:
 *   1. Parse the remittance batch from job payload
 *   2. Create payment records via recon-store
 *   3. Run matching engine to link payments to claims
 *   4. Auto-detect underpayments (paid < expected threshold)
 *   5. Create underpayment cases for review
 *
 * Runs as REMITTANCE_IMPORT job type in the durable queue.
 * No external payer calls -- processes already-received remittance data.
 */

import { appendRcmAudit } from '../audit/rcm-audit.js';
import { log } from '../../lib/logger.js';
import type { RcmJobType } from './queue.js';

/* -- Config -------------------------------------------------- */

/** Underpayment threshold: if paid < (billed * threshold), flag as underpayment */
const UNDERPAYMENT_THRESHOLD = parseFloat(process.env.RCM_UNDERPAYMENT_THRESHOLD ?? '0.95') || 0.95;

const REMITTANCE_IMPORT_INTERVAL_MS =
  parseInt(process.env.RCM_REMITTANCE_IMPORT_INTERVAL_MS ?? '1800000', 10) || 1_800_000; // 30 min
const REMITTANCE_IMPORT_RATE_LIMIT =
  parseInt(process.env.RCM_REMITTANCE_IMPORT_RATE_LIMIT ?? '10', 10) || 10;

export const REMITTANCE_IMPORT_JOB_TYPE: RcmJobType = 'REMITTANCE_IMPORT';

/* -- Result Types -------------------------------------------- */

export interface RemittanceImportResult {
  processedAt: string;
  importId: string | null;
  paymentRecordsCreated: number;
  matchesAttempted: number;
  matchesSucceeded: number;
  underpaymentCasesCreated: number;
  errors: string[];
}

/* -- Handler ------------------------------------------------- */

/**
 * Process a remittance import job.
 * Payload should contain:
 *   - entries: Array of payment line items (claimRef, payerId, amounts, etc.)
 *   - sourceType: "EDI_835" | "MANUAL" | "OTHER"
 *   - originalFilename: optional
 *   - parserVersion: optional (default "1.0.0")
 *   - importedBy: actor who triggered the import
 */
export async function handleRemittanceImportJob(job: {
  id: string;
  payload: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const now = new Date().toISOString();
  const result: RemittanceImportResult = {
    processedAt: now,
    importId: null,
    paymentRecordsCreated: 0,
    matchesAttempted: 0,
    matchesSucceeded: 0,
    underpaymentCasesCreated: 0,
    errors: [],
  };

  const {
    entries = [],
    sourceType = 'EDI_835',
    originalFilename,
    parserVersion = '1.0.0',
    importedBy = 'system',
  } = job.payload as {
    entries?: Array<{
      claimRef: string;
      payerId: string;
      billedAmount: number;
      paidAmount: number;
      allowedAmount?: number;
      patientResp?: number;
      adjustmentAmount?: number;
      traceNumber?: string;
      checkNumber?: string;
      postedDate?: string;
      serviceDate?: string;
      patientDfn?: string;
      rawCodes?: Array<{ type: string; code: string; description?: string }>;
    }>;
    sourceType?: string;
    originalFilename?: string;
    parserVersion?: string;
    importedBy?: string;
  };

  if (!Array.isArray(entries) || entries.length === 0) {
    result.errors.push('No entries in payload');
    return result as unknown as Record<string, unknown>;
  }

  const tenantId =
    typeof (job.payload as any)?._tenantId === 'string' &&
    (job.payload as any)._tenantId.trim().length > 0
      ? (job.payload as any)._tenantId.trim()
      : 'default';

  try {
    // Dynamic import to avoid circular dependencies
    const { createRemittanceImport, createPaymentRecord } =
      await import('../reconciliation/recon-store.js');

    // Step 1: Create remittance import record
    const totalPaid = entries.reduce((sum, e) => sum + (e.paidAmount ?? 0), 0);
    const totalBilled = entries.reduce((sum, e) => sum + (e.billedAmount ?? 0), 0);

    const importRecord = await createRemittanceImport({
      tenantId,
      sourceType: sourceType as any,
      lineCount: entries.length,
      totalPaidCents: Math.round(totalPaid * 100),
      totalBilledCents: Math.round(totalBilled * 100),
      importedBy: String(importedBy),
      originalFilename: originalFilename ? String(originalFilename) : undefined,
      parserVersion: parserVersion ? String(parserVersion) : undefined,
    });
    result.importId = importRecord.id;

    // Step 2: Create payment records for each entry
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      try {
        await createPaymentRecord({
          tenantId,
          remittanceImportId: importRecord.id,
          claimRef: entry.claimRef,
          payerId: entry.payerId,
          billedAmountCents: Math.round(entry.billedAmount * 100),
          paidAmountCents: Math.round(entry.paidAmount * 100),
          allowedAmountCents:
            entry.allowedAmount != null ? Math.round(entry.allowedAmount * 100) : undefined,
          patientRespCents:
            entry.patientResp != null ? Math.round(entry.patientResp * 100) : undefined,
          adjustmentAmountCents:
            entry.adjustmentAmount != null ? Math.round(entry.adjustmentAmount * 100) : undefined,
          traceNumber: entry.traceNumber,
          checkNumber: entry.checkNumber,
          postedDate: entry.postedDate,
          serviceDate: entry.serviceDate,
          patientDfn: entry.patientDfn,
          rawCodes: (entry.rawCodes ?? []) as any,
          lineIndex: i,
        });
        result.paymentRecordsCreated++;
      } catch (entryErr) {
        result.errors.push(
          `Entry ${i} (${entry.claimRef}): ${entryErr instanceof Error ? entryErr.message : String(entryErr)}`
        );
      }
    }

    // Step 3: Attempt matching via matching engine
    try {
      const { runBatchMatch } = await import('../reconciliation/matching-engine.js');
      const matchResult = await runBatchMatch(tenantId, importRecord.id);
      result.matchesAttempted = matchResult.attempted;
      result.matchesSucceeded = matchResult.matched;
    } catch (matchErr) {
      result.errors.push(
        `Matching: ${matchErr instanceof Error ? matchErr.message : String(matchErr)}`
      );
    }

    // Step 4: Check for underpayments
    try {
      const underpayments = await detectUnderpayments(tenantId, importRecord.id);
      result.underpaymentCasesCreated = underpayments;
    } catch (upErr) {
      result.errors.push(
        `Underpayment detection: ${upErr instanceof Error ? upErr.message : String(upErr)}`
      );
    }

    // Audit trail
    appendRcmAudit('remittance.import_processed', {
      userId: String(importedBy),
      detail: {
        importId: importRecord.id,
        jobId: job.id,
        entries: entries.length,
        paymentsCreated: result.paymentRecordsCreated,
        matchesAttempted: result.matchesAttempted,
        matchesSucceeded: result.matchesSucceeded,
        underpayments: result.underpaymentCasesCreated,
        errors: result.errors.length,
      },
    });

    log.info('Remittance import job completed', {
      importId: importRecord.id,
      payments: result.paymentRecordsCreated,
      matched: result.matchesSucceeded,
      underpayments: result.underpaymentCasesCreated,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Import failed: ${msg}`);
    log.warn('Remittance import job failed', { error: msg, jobId: job.id });
  }

  return result as unknown as Record<string, unknown>;
}

/**
 * Detect underpayments in a remittance import.
 * For each matched payment where paidAmount < billedAmount * threshold,
 * create an underpayment case.
 */
async function detectUnderpayments(tenantId: string, importId: string): Promise<number> {
  const { listPaymentsByImport, createUnderpaymentCase } =
    await import('../reconciliation/recon-store.js');

  const payments = await listPaymentsByImport(tenantId, importId);
  let created = 0;

  for (const payment of payments) {
    if (
      payment.status === 'MATCHED' &&
      payment.billedAmountCents > 0 &&
      payment.paidAmountCents < payment.billedAmountCents * UNDERPAYMENT_THRESHOLD
    ) {
      try {
        await createUnderpaymentCase({
          tenantId,
          claimRef: payment.claimRef,
          paymentId: payment.id,
          payerId: payment.payerId,
          expectedAmountModel: 'BILLED_AMOUNT',
          expectedAmountCents: payment.billedAmountCents,
          paidAmountCents: payment.paidAmountCents,
        });
        created++;
      } catch {
        // Already exists or other non-fatal creation error
      }
    }
  }

  return created;
}

/* -- Registration Config ------------------------------------- */

/**
 * Returns the PollingJobConfig for remittance import processing.
 * Wired into the PollingScheduler at startup.
 */
export function getRemittanceImportConfig() {
  return {
    type: REMITTANCE_IMPORT_JOB_TYPE,
    label: 'Remittance Import Processor',
    intervalMs: REMITTANCE_IMPORT_INTERVAL_MS,
    rateLimitPerHour: REMITTANCE_IMPORT_RATE_LIMIT,
    enabled: (process.env.RCM_REMITTANCE_IMPORT_ENABLED ?? 'false') === 'true',
    handler: handleRemittanceImportJob,
  };
}
