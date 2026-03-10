/**
 * Unified Audit Query -- Phase 48.
 *
 * Provides a single query API across the 3 audit stores:
 *   1. Immutable Audit (general auth/security/write events)
 *   2. Imaging Audit (imaging-specific events)
 *   3. RCM Audit (claim/EDI/connector events)
 *
 * Also bridges audit event counts to Prometheus metrics.
 */

import { log } from './logger.js';
import { getCurrentTraceId } from '../telemetry/tracing.js';
import {
  queryImmutableAudit,
  getImmutableAuditStats,
  type ImmutableAuditEntry,
} from './immutable-audit.js';
import {
  queryImagingAudit,
  getChainStats as getImagingChainStats,
  type ImagingAuditEntry,
} from '../services/imaging-audit.js';
import {
  getRcmAuditEntries,
  getRcmAuditStats,
  type RcmAuditEntry,
} from '../rcm/audit/rcm-audit.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type AuditSource = 'general' | 'imaging' | 'rcm';

export interface UnifiedAuditEntry {
  source: AuditSource;
  seq: number;
  timestamp: string;
  action: string;
  actor?: string;
  outcome?: string;
  detail?: unknown;
  traceId?: string;
  hash?: string;
}

export interface UnifiedAuditQuery {
  /** Filter by audit source(s). Default: all. */
  sources?: AuditSource[];
  /** Filter by action prefix (e.g., "auth." or "claim."). */
  actionPrefix?: string;
  /** Filter by actor (DUZ or system name). */
  actor?: string;
  /** Only entries after this ISO timestamp. */
  since?: string;
  /** Max entries per source. Default: 100. */
  limit?: number;
}

export interface UnifiedAuditStats {
  general: { totalEntries: number; chainValid?: boolean };
  imaging: { totalEntries: number; chainValid?: boolean };
  rcm: { totalEntries: number; chainValid?: boolean };
  combined: number;
}

/* ------------------------------------------------------------------ */
/* Query                                                               */
/* ------------------------------------------------------------------ */

/**
 * Query across all (or selected) audit stores, returning unified entries
 * sorted by timestamp descending.
 */
export function queryUnifiedAudit(query: UnifiedAuditQuery = {}): UnifiedAuditEntry[] {
  const sources = query.sources ?? ['general', 'imaging', 'rcm'];
  const limit = query.limit ?? 100;
  const results: UnifiedAuditEntry[] = [];

  if (sources.includes('general')) {
    try {
      const entries = queryImmutableAudit({
        actionPrefix: query.actionPrefix,
        actorId: query.actor,
        since: query.since,
        limit,
      });
      for (const e of entries) {
        results.push(mapGeneralEntry(e));
      }
    } catch (err) {
      log.warn('Failed to query general audit', { error: (err as Error).message });
    }
  }

  if (sources.includes('imaging')) {
    try {
      const { entries } = queryImagingAudit({
        actorDuz: query.actor,
        since: query.since,
        limit,
      });
      for (const e of entries) {
        results.push(mapImagingEntry(e));
      }
    } catch (err) {
      log.warn('Failed to query imaging audit', { error: (err as Error).message });
    }
  }

  if (sources.includes('rcm')) {
    try {
      const { items } = getRcmAuditEntries({
        since: query.since,
        limit,
      });
      for (const e of items) {
        results.push(mapRcmEntry(e));
      }
    } catch (err) {
      log.warn('Failed to query RCM audit', { error: (err as Error).message });
    }
  }

  // Sort by timestamp descending, then return up to the overall limit
  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return results.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

export function getUnifiedAuditStats(): UnifiedAuditStats {
  const general = getImmutableAuditStats();
  const imaging = getImagingChainStats();
  const rcm = getRcmAuditStats();

  return {
    general: { totalEntries: general.totalEntries, chainValid: general.chainValid },
    imaging: { totalEntries: imaging.totalEntries, chainValid: imaging.chainValid },
    rcm: { totalEntries: rcm.total, chainValid: rcm.chainValid },
    combined: general.totalEntries + imaging.totalEntries + rcm.total,
  };
}

/* ------------------------------------------------------------------ */
/* Mappers                                                             */
/* ------------------------------------------------------------------ */

function mapGeneralEntry(e: ImmutableAuditEntry): UnifiedAuditEntry {
  return {
    source: 'general',
    seq: e.seq,
    timestamp: e.timestamp,
    action: e.action,
    actor: e.actorId,
    outcome: e.outcome,
    detail: e.detail,
    traceId: (e as unknown as Record<string, unknown>).traceId as string | undefined,
    hash: e.hash,
  };
}

function mapImagingEntry(e: ImagingAuditEntry): UnifiedAuditEntry {
  return {
    source: 'imaging',
    seq: e.seq,
    timestamp: e.timestamp,
    action: e.action,
    actor: e.actorDuz,
    outcome: e.outcome,
    detail: (e as unknown as Record<string, unknown>).detail as unknown,
    traceId: (e as unknown as Record<string, unknown>).traceId as string | undefined,
    hash: e.hash,
  };
}

function mapRcmEntry(e: RcmAuditEntry): UnifiedAuditEntry {
  return {
    source: 'rcm',
    seq: e.seq,
    timestamp: e.timestamp,
    action: e.action,
    actor: e.userId,
    outcome: undefined,
    detail: e.detail,
    traceId: (e as unknown as Record<string, unknown>).traceId as string | undefined,
    hash: e.hash,
  };
}

/**
 * Attach trace ID to any audit detail object. Call this before appending
 * to any audit store so that distributed traces correlate with audit entries.
 */
export function withTraceId<T extends Record<string, unknown>>(
  detail: T
): T & { traceId?: string } {
  const traceId = getCurrentTraceId();
  if (traceId) return { ...detail, traceId };
  return detail;
}
