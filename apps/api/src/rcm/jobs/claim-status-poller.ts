/**
 * Claim-Status Poller — Phase 69: RCM Ops Excellence v1
 *
 * Periodic polling job that checks claim adjudication status
 * with configured payer adapters. Uses the PollingScheduler.
 *
 * Rate limit: 30 requests/hour (default, configurable via env).
 * Interval: 600s (10 min) between polls.
 *
 * Results are stored in an in-memory ring buffer.
 * No PHI in results — only claim ID, payer code, and status.
 */

import type { RcmJobType } from './queue.js';
import { getPayerAdapterForMode, type ClaimStatusResponse } from '../adapters/payer-adapter.js';
import { log } from '../../lib/logger.js';

/* ── Config ────────────────────────────────────────────────── */

const CLAIM_STATUS_RATE_LIMIT = parseInt(process.env.RCM_CLAIM_STATUS_RATE_LIMIT ?? '30', 10) || 30;
const CLAIM_STATUS_INTERVAL_MS =
  parseInt(process.env.RCM_CLAIM_STATUS_INTERVAL_MS ?? '600000', 10) || 600_000;

export const CLAIM_STATUS_JOB_TYPE: RcmJobType = 'STATUS_POLL';

/* ── Result Store (ring buffer, no PHI) ────────────────────── */

export interface ClaimStatusPollResult {
  id: string;
  claimId: string;
  payerCode: string;
  integrationMode: string;
  claimStatus: string | null;
  adjudicationStatus?: string;
  status: 'completed' | 'failed' | 'pending';
  errorMessage?: string;
  pollTimestamp: string;
  responseMs: number;
}

const MAX_RESULTS = 500;
const results: ClaimStatusPollResult[] = [];

export function getClaimStatusResults(): readonly ClaimStatusPollResult[] {
  return results;
}

export function getClaimStatusResultsSlice(
  offset: number,
  limit: number
): { items: ClaimStatusPollResult[]; total: number } {
  return {
    items: results.slice(offset, offset + limit),
    total: results.length,
  };
}

function pushResult(r: ClaimStatusPollResult): void {
  if (results.length >= MAX_RESULTS) results.shift();
  results.push(r);
}

/* ── Poller Handler ────────────────────────────────────────── */

/**
 * Process a single claim status poll job.
 * Called by the PollingScheduler when a job of type STATUS_POLL is dequeued.
 */
export async function handleClaimStatusJob(job: {
  id: string;
  payload: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const {
    claimId = 'unknown',
    payerCode = 'unknown',
    integrationMode = 'sandbox',
    payerClaimId,
  } = job.payload as {
    claimId?: string;
    payerCode?: string;
    integrationMode?: string;
    payerClaimId?: string;
  };

  const start = Date.now();
  const resultBase = {
    id: `cstat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    claimId: String(claimId),
    payerCode: String(payerCode),
    integrationMode: String(integrationMode),
    pollTimestamp: new Date().toISOString(),
  };
  const tenantId = String((job.payload as any)?._tenantId ?? '');

  if (!tenantId) {
    const result: ClaimStatusPollResult = {
      ...resultBase,
      claimStatus: null,
      status: 'failed',
      errorMessage: 'Tenant context missing',
      responseMs: Date.now() - start,
    };
    pushResult(result);
    return result as unknown as Record<string, unknown>;
  }

  try {
    const adapter = getPayerAdapterForMode(String(integrationMode));
    if (!adapter) {
      const result: ClaimStatusPollResult = {
        ...resultBase,
        claimStatus: null,
        status: 'failed',
        errorMessage: `No payer adapter for mode: ${integrationMode}`,
        responseMs: Date.now() - start,
      };
      pushResult(result);
      return result as unknown as Record<string, unknown>;
    }

    const response: ClaimStatusResponse = await adapter.pollClaimStatus({
      claimId: String(claimId),
      payerClaimId: String(payerClaimId ?? ''),
      payerId: String(payerCode),
      tenantId,
    });

    const result: ClaimStatusPollResult = {
      ...resultBase,
      claimStatus: response.status,
      adjudicationStatus: response.adjudicationDate,
      status: 'completed',
      responseMs: Date.now() - start,
    };
    pushResult(result);

    log.info(`Claim status poll completed: ${payerCode}`, {
      claimId,
      claimStatus: response.status,
      responseMs: result.responseMs,
    });

    return result as unknown as Record<string, unknown>;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const result: ClaimStatusPollResult = {
      ...resultBase,
      claimStatus: null,
      status: 'failed',
      errorMessage: errMsg,
      responseMs: Date.now() - start,
    };
    pushResult(result);

    log.warn(`Claim status poll failed: ${payerCode}`, {
      claimId,
      error: errMsg,
    });

    return result as unknown as Record<string, unknown>;
  }
}

/* ── Registration Config ───────────────────────────────────── */

/**
 * Returns the PollingJobConfig for claim status polling.
 * Wired into the PollingScheduler at startup.
 */
export function getClaimStatusPollerConfig() {
  return {
    type: CLAIM_STATUS_JOB_TYPE,
    label: 'Claim Status Poller',
    intervalMs: CLAIM_STATUS_INTERVAL_MS,
    rateLimitPerHour: CLAIM_STATUS_RATE_LIMIT,
    enabled: (process.env.RCM_CLAIM_STATUS_POLLING ?? 'false') === 'true',
    handler: handleClaimStatusJob,
  };
}

export function resetClaimStatusResults(): void {
  results.length = 0;
}
