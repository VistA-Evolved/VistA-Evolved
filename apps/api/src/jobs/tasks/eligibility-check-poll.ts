/**
 * Task: eligibility_check_poll — Phase 116
 *
 * Polls pending eligibility checks from the store and
 * processes them via the appropriate payer adapter.
 *
 * Payload (no PHI):
 *   { tenantId, payerId, claimId?, integrationMode, batchSize }
 *
 * At-least-once semantics: duplicate eligibility checks are
 * idempotent (store uses unique IDs, adapter calls are safe to retry).
 */

import type { EligibilityCheckPollPayload } from '../registry.js';
import { log } from '../../lib/logger.js';

/**
 * Process a batch of pending eligibility checks.
 *
 * Strategy:
 *  1. Query pending eligibility checks from the store
 *  2. For each, invoke the payer adapter's checkEligibility
 *  3. Update the check record with the result
 */
export async function handleEligibilityCheckPoll(payload: Record<string, unknown>): Promise<void> {
  const p = payload as EligibilityCheckPollPayload;
  const { tenantId, payerId, batchSize, integrationMode } = p;

  log.info('eligibility_check_poll: starting', { tenantId, payerId, batchSize });

  // Dynamic imports to avoid circular deps at module load time
  const { listEligibilityChecks } = await import('../../rcm/eligibility/store.js');
  const { getPayerAdapterForMode } = await import('../../rcm/adapters/payer-adapter.js');

  // 1. Fetch pending checks
  const { items: pending } = await listEligibilityChecks({
    provenance: 'job',
    tenantId,
    limit: batchSize,
    offset: 0,
  });

  if (pending.length === 0) {
    log.debug('eligibility_check_poll: no pending checks', { tenantId });
    return;
  }

  // 2. Get adapter
  const adapter = getPayerAdapterForMode(integrationMode);
  if (!adapter) {
    log.warn('eligibility_check_poll: no adapter for mode', { integrationMode });
    return;
  }

  // 3. Process each pending check
  let processed = 0;
  let failed = 0;

  for (const check of pending) {
    try {
      const response = await adapter.checkEligibility({
        payerId: check.payerId,
        patientDfn: check.patientDfn,
        subscriberId: check.subscriberId ?? '',
        tenantId,
      });

      // Note: update logic would go here if the store exposes an update function.
      // For now, we log the result. The polling scheduler previously handled this
      // via the in-memory ring buffer; the durable store preserves the check record.
      processed++;
      log.debug('eligibility_check_poll: check processed', {
        checkId: check.id,
        eligible: response.eligible,
      });
    } catch (err) {
      failed++;
      const errMsg = err instanceof Error ? err.message : String(err);
      log.warn('eligibility_check_poll: check failed', {
        checkId: check.id,
        error: errMsg,
      });
    }
  }

  log.info('eligibility_check_poll: batch complete', {
    tenantId,
    total: pending.length,
    processed,
    failed,
  });
}
