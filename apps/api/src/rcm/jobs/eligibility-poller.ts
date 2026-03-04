/**
 * Eligibility Poller — Phase 69: RCM Ops Excellence v1
 *
 * Periodic polling job that checks patient eligibility with
 * configured payer adapters. Uses the PollingScheduler for
 * rate limiting and interval management.
 *
 * Rate limit: 60 requests/hour (default, configurable via env).
 * Interval: 300s (5 min) between polls.
 *
 * Results are stored in an in-memory ring buffer (not PHI —
 * only eligibility status, payer code, and timestamps).
 */

import type { RcmJobType } from './queue.js';
import { getPayerAdapterForMode, type EligibilityResponse } from '../adapters/payer-adapter.js';
import { log } from '../../lib/logger.js';

/* ── Config ────────────────────────────────────────────────── */

const ELIGIBILITY_RATE_LIMIT = parseInt(process.env.RCM_ELIGIBILITY_RATE_LIMIT ?? '60', 10) || 60;
const ELIGIBILITY_INTERVAL_MS =
  parseInt(process.env.RCM_ELIGIBILITY_INTERVAL_MS ?? '300000', 10) || 300_000;

export const ELIGIBILITY_JOB_TYPE: RcmJobType = 'ELIGIBILITY_CHECK';

/* ── Result Store (ring buffer, no PHI) ────────────────────── */

export interface EligibilityPollResult {
  id: string;
  claimId: string;
  payerCode: string;
  integrationMode: string;
  eligible: boolean | null;
  status: 'completed' | 'failed' | 'pending';
  errorMessage?: string;
  pollTimestamp: string;
  responseMs: number;
}

const MAX_RESULTS = 500;
const results: EligibilityPollResult[] = [];

export function getEligibilityResults(): readonly EligibilityPollResult[] {
  return results;
}

export function getEligibilityResultsSlice(
  offset: number,
  limit: number
): { items: EligibilityPollResult[]; total: number } {
  return {
    items: results.slice(offset, offset + limit),
    total: results.length,
  };
}

function pushResult(r: EligibilityPollResult): void {
  if (results.length >= MAX_RESULTS) results.shift();
  results.push(r);
}

/* ── Poller Handler ────────────────────────────────────────── */

/**
 * Process a single eligibility check job.
 * Called by the PollingScheduler when a job of type ELIGIBILITY_CHECK is dequeued.
 */
export async function handleEligibilityJob(job: {
  id: string;
  payload: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const {
    claimId = 'unknown',
    payerCode = 'unknown',
    integrationMode = 'sandbox',
    patientDfn,
    subscriberId,
  } = job.payload as {
    claimId?: string;
    payerCode?: string;
    integrationMode?: string;
    patientDfn?: string;
    subscriberId?: string;
  };

  const start = Date.now();
  const resultBase = {
    id: `elig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    claimId: String(claimId),
    payerCode: String(payerCode),
    integrationMode: String(integrationMode),
    pollTimestamp: new Date().toISOString(),
  };

  try {
    const adapter = getPayerAdapterForMode(String(integrationMode));
    if (!adapter) {
      const result: EligibilityPollResult = {
        ...resultBase,
        eligible: null,
        status: 'failed',
        errorMessage: `No payer adapter for mode: ${integrationMode}`,
        responseMs: Date.now() - start,
      };
      pushResult(result);
      return result as unknown as Record<string, unknown>;
    }

    const response: EligibilityResponse = await adapter.checkEligibility({
      payerId: String(payerCode),
      patientDfn: String(patientDfn ?? ''),
      subscriberId: String(subscriberId ?? ''),
      tenantId: 'default',
    });

    const result: EligibilityPollResult = {
      ...resultBase,
      eligible: response.eligible,
      status: 'completed',
      responseMs: Date.now() - start,
    };
    pushResult(result);

    log.info(`Eligibility poll completed: ${payerCode}`, {
      claimId,
      eligible: response.eligible,
      responseMs: result.responseMs,
    });

    return result as unknown as Record<string, unknown>;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const result: EligibilityPollResult = {
      ...resultBase,
      eligible: null,
      status: 'failed',
      errorMessage: errMsg,
      responseMs: Date.now() - start,
    };
    pushResult(result);

    log.warn(`Eligibility poll failed: ${payerCode}`, {
      claimId,
      error: errMsg,
    });

    return result as unknown as Record<string, unknown>;
  }
}

/* ── Registration Config ───────────────────────────────────── */

/**
 * Returns the PollingJobConfig for eligibility checking.
 * Wired into the PollingScheduler at startup.
 */
export function getEligibilityPollerConfig() {
  return {
    type: ELIGIBILITY_JOB_TYPE,
    label: 'Eligibility Check Poller',
    intervalMs: ELIGIBILITY_INTERVAL_MS,
    rateLimitPerHour: ELIGIBILITY_RATE_LIMIT,
    enabled: (process.env.RCM_ELIGIBILITY_POLLING ?? 'false') === 'true',
    handler: handleEligibilityJob,
  };
}

export function resetEligibilityResults(): void {
  results.length = 0;
}
