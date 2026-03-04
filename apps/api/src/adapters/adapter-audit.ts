/**
 * Adapter Write Audit — Phase 436.
 *
 * Centralized audit emitter for clinical adapter write operations.
 * Activates the orphaned write.* immutableAudit actions (defined since Phase 35).
 * All adapter write methods call through here to ensure consistent audit trail.
 */

import { immutableAudit } from '../lib/immutable-audit.js';

export type AdapterWriteAction =
  | 'write.allergy'
  | 'write.vitals'
  | 'write.note'
  | 'write.problem'
  | 'write.medication'
  | 'write.order';

export interface AdapterWriteAuditOpts {
  action: AdapterWriteAction;
  success: boolean;
  /** Provider DUZ */
  duz?: string;
  /** Patient DFN (PHI-safe — automatically redacted by immutableAudit) */
  dfn?: string;
  /** RPC(s) called */
  rpc: string;
  /** Result IEN if successful */
  ien?: string;
  /** Error message if failed */
  errorMessage?: string;
  /** Additional context (adapter name, timing, etc.) */
  extra?: Record<string, unknown>;
}

/**
 * Emit an immutable audit event for an adapter write operation.
 * PHI fields (dfn, patientName, etc.) are automatically sanitized
 * by the immutable-audit layer's sanitizeAuditDetail().
 */
export function auditAdapterWrite(opts: AdapterWriteAuditOpts): void {
  const outcome = opts.success ? 'success' : 'failure';
  const actor = {
    sub: opts.duz ?? 'unknown',
    name: 'adapter-write',
    roles: ['provider'],
  };
  const detail: Record<string, unknown> = {
    source: 'clinical-engine-adapter',
    rpc: opts.rpc,
    ...(opts.ien ? { resultIen: opts.ien } : {}),
    ...(opts.errorMessage ? { error: opts.errorMessage } : {}),
    ...(opts.extra ?? {}),
  };

  immutableAudit(opts.action, outcome, actor, { detail });
}
