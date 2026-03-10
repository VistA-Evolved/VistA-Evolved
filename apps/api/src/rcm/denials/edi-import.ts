/**
 * EDI 835 Remittance -> Denial Intake -- Phase 98
 *
 * Parses structured JSON representing 835 remittance data and
 * creates DenialCase records for any denied line items.
 *
 * This does NOT parse raw X12 wire format directly. The input is
 * a structured JSON representation that can come from:
 * 1. Our existing remit-processor.ts output
 * 2. An external parser's JSON export
 * 3. Manual structured entry
 *
 * Raw X12 parsing is integration-pending -- requires a streaming
 * X12 parser (MIT-licensed) to be added in a future phase.
 */

import { createHash } from 'node:crypto';
import { createDenialCaseWithProvenance, addDenialAction } from './denial-store.js';
import type { Import835BatchInput } from './types.js';

export interface ImportResult {
  ok: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  denialIds: string[];
  importFileHash: string | null;
}

/**
 * Import denial cases from structured 835 remittance data.
 *
 * Each entry with denial codes creates a DenialCase with source=EDI_835.
 * Entries without denial codes are skipped (they are normal payments).
 */
export async function importRemittanceDenials(
  input: Import835BatchInput,
  actor: string,
  tenantId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    ok: true,
    imported: 0,
    skipped: 0,
    errors: [],
    denialIds: [],
    importFileHash: input.importFileHash ?? null,
  };

  // Compute content hash for provenance
  const contentHash = createHash('sha256').update(JSON.stringify(input.entries)).digest('hex');

  const importTimestamp = new Date().toISOString();

  for (let i = 0; i < input.entries.length; i++) {
    const entry = input.entries[i];

    try {
      // Only create denial if there are denial codes
      if (!entry.denialCodes || entry.denialCodes.length === 0) {
        result.skipped++;
        continue;
      }

      const denial = await createDenialCaseWithProvenance(
        {
          tenantId,
          claimRef: entry.claimRef,
          payerId: entry.payerId,
          patientDfn: entry.patientDfn,
          denialSource: 'EDI_835',
          denialCodes: entry.denialCodes,
          billedAmount: entry.billedAmount,
          paidAmount: entry.paidAmount,
          allowedAmount: entry.allowedAmount,
          adjustmentAmount: entry.adjustmentAmount,
          receivedDate: entry.receivedDate ?? importTimestamp,
        },
        {
          importFileHash: contentHash,
          importTimestamp,
          importParserVersion: input.parserVersion,
        },
        actor
      );

      // Add supplementary import action with entry-level detail
      await addDenialAction(tenantId, denial.id, actor, 'IMPORT', {
        source: 'EDI_835',
        importFileHash: contentHash,
        entryIndex: i,
        remittanceRef: entry.remittanceRef ?? null,
      });

      result.denialIds.push(denial.id);
      result.imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Entry ${i}: ${msg}`);
    }
  }

  if (result.errors.length > 0) {
    result.ok = result.imported > 0; // partial success OK
  }

  return result;
}
