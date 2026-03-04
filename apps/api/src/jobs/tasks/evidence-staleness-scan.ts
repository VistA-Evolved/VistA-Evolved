/**
 * Task: evidence_staleness_scan — Phase 116
 *
 * Scans the integration evidence registry for stale entries
 * (evidence older than the configured threshold) and optionally
 * flags them for re-verification.
 *
 * Payload (no PHI):
 *   { tenantId, staleAfterDays, autoFlag }
 *
 * Idempotent: re-flagging already-flagged evidence is a no-op.
 */

import type { EvidenceStalenessScanPayload } from '../registry.js';
import { log } from '../../lib/logger.js';

/**
 * Scan evidence entries for staleness.
 *
 * Strategy:
 *  1. List all evidence entries
 *  2. Identify entries whose updatedAt is older than staleAfterDays
 *  3. If autoFlag is true, update their status to "stale"
 *  4. Log results for operator visibility
 */
export async function handleEvidenceStalenessScan(payload: Record<string, unknown>): Promise<void> {
  const p = payload as EvidenceStalenessScanPayload;
  const { tenantId, staleAfterDays, autoFlag } = p;

  log.info('evidence_staleness_scan: starting', {
    tenantId,
    staleAfterDays,
    autoFlag,
  });

  const { listAll, updateEvidence } = await import('../../rcm/evidence/evidence-registry-repo.js');

  // 1. Fetch all evidence for tenant (always scoped — no cross-tenant scan)
  const allEvidence = await listAll(tenantId);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - staleAfterDays);
  const cutoffIso = cutoffDate.toISOString();

  // 2. Identify stale entries
  const staleEntries = allEvidence.filter((ev) => {
    // Skip already-stale entries
    if (ev.status === 'stale') return false;
    // Compare updatedAt to cutoff
    const updatedAt = ev.updatedAt ?? ev.createdAt;
    return updatedAt && updatedAt < cutoffIso;
  });

  log.info('evidence_staleness_scan: scan complete', {
    total: allEvidence.length,
    staleCount: staleEntries.length,
    cutoffDate: cutoffIso,
  });

  if (staleEntries.length === 0) {
    log.debug('evidence_staleness_scan: no stale entries found');
    return;
  }

  // 3. Auto-flag if enabled
  if (autoFlag) {
    let flagged = 0;
    for (const ev of staleEntries) {
      try {
        await updateEvidence(ev.id, { status: 'stale' });
        flagged++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log.warn('evidence_staleness_scan: failed to flag entry', {
          evidenceId: ev.id,
          error: errMsg,
        });
      }
    }
    log.info('evidence_staleness_scan: flagged stale entries', {
      flagged,
      total: staleEntries.length,
    });
  } else {
    log.info('evidence_staleness_scan: autoFlag disabled, stale entries logged only', {
      staleIds: staleEntries.slice(0, 20).map((e) => e.id),
    });
  }
}
