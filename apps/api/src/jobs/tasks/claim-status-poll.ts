/**
 * Task: claim_status_poll — Phase 116
 *
 * Polls pending claim status checks from the SQLite store and
 * processes them via the appropriate payer adapter.
 *
 * Payload (no PHI):
 *   { tenantId, payerId?, claimRef?, batchSize }
 *
 * At-least-once semantics: duplicate status polls are safe —
 * the adapter returns current status which is idempotent.
 */

import type { ClaimStatusPollPayload } from "../registry.js";
import { log } from "../../lib/logger.js";

/**
 * Process a batch of pending claim status checks.
 *
 * Strategy:
 *  1. Query pending claim status checks from the store
 *  2. For each, invoke the payer adapter's checkClaimStatus
 *  3. Log results (store update deferred to future phase)
 */
export async function handleClaimStatusPoll(
  payload: Record<string, unknown>,
): Promise<void> {
  const p = payload as ClaimStatusPollPayload;
  const { tenantId, payerId, claimRef, batchSize } = p;

  log.info("claim_status_poll: starting", { tenantId, payerId, batchSize });

  const { listClaimStatusChecks } = await import(
    "../../rcm/eligibility/store.js"
  );
  const { getPayerAdapterForMode } = await import(
    "../../rcm/adapters/payer-adapter.js"
  );

  // 1. Fetch pending status checks
  const { items: pending } = await listClaimStatusChecks({
    claimRef,
    tenantId,
    limit: batchSize,
    offset: 0,
  });

  if (pending.length === 0) {
    log.debug("claim_status_poll: no pending checks", { tenantId });
    return;
  }

  // 2. Get adapter — use sandbox mode for now (mode derived from payer config in future)
  const adapter = getPayerAdapterForMode("sandbox");
  if (!adapter) {
    log.warn("claim_status_poll: no adapter for sandbox mode");
    return;
  }

  // 3. Process each pending check
  let processed = 0;
  let failed = 0;

  for (const check of pending) {
    try {
      const response = await adapter.pollClaimStatus({
        claimId: check.claimRef,
        payerId: check.payerId,
        tenantId,
      });

      processed++;
      log.debug("claim_status_poll: check processed", {
        checkId: check.id,
        claimStatus: response.status,
      });
    } catch (err) {
      failed++;
      const errMsg = err instanceof Error ? err.message : String(err);
      log.warn("claim_status_poll: check failed", {
        checkId: check.id,
        error: errMsg,
      });
    }
  }

  log.info("claim_status_poll: batch complete", {
    tenantId,
    total: pending.length,
    processed,
    failed,
  });
}
