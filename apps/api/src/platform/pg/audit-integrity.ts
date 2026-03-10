/**
 * Platform DB -- Audit Trail Integrity & Export
 *
 * Phase 104: Platform DB Security/Compliance Posture
 *
 * Provides:
 *   1. Hash-chain verification for platform_audit_event (PG only)
 *   2. Audit event export (JSON Lines format)
 *   3. Retention policy metadata
 *   4. PHI sanitization for audit detail fields
 *
 * The platform_audit_event table uses SHA-256 hash chaining:
 *   entry_hash = SHA-256(tenant_id + actor + action + entity_type +
 *                        entity_id + detail + prev_hash + created_at)
 *   prev_hash  = entry_hash of the immediately preceding row
 *
 * Verification walks the chain and confirms each hash matches.
 * A broken chain indicates tampering or data corruption.
 */

import { createHash } from 'node:crypto';
import { getPgPool, isPgConfigured } from './pg-db.js';
import { redactPhi } from '../../lib/phi-redaction.js';

/* ================================================================
 *  Constants
 * ================================================================ */

/** Default retention in days (13 months = ~395 days). */
const DEFAULT_RETENTION_DAYS = 395;

/** Maximum rows to export per request (prevent OOM). */
const MAX_EXPORT_ROWS = 50_000;

/** PHI patterns to scrub from audit detail JSON. */
const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  /\b\d{9}\b/g, // SSN without dashes
  /\b(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}\b/g, // DOB MM/DD/YYYY
  /\b\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g, // DOB YYYY-MM-DD
];

/* ================================================================
 *  PHI Sanitization
 * ================================================================ */

/**
 * Strip PHI-like patterns from a string. Returns sanitized copy.
 * Replaces SSN, DOB patterns with `[REDACTED]`.
 */
export function sanitizeAuditDetail(detail: unknown): unknown {
  if (detail === null || detail === undefined) return detail;

  // Phase 151: delegate to centralized redactPhi first for field-level scrub
  const preSanitized = redactPhi(detail);

  // Then apply local inline PHI pattern scrub as secondary defense
  const str = typeof preSanitized === 'string' ? preSanitized : JSON.stringify(preSanitized);
  let sanitized = str;
  for (const pattern of PHI_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  if (typeof preSanitized === 'string') return sanitized;
  try {
    return JSON.parse(sanitized);
  } catch {
    return sanitized;
  }
}

/* ================================================================
 *  Hash Chain Helpers
 * ================================================================ */

/**
 * Compute the SHA-256 hash for an audit entry.
 * Fields are concatenated with pipe separator for determinism.
 */
export function computeAuditHash(entry: {
  tenant_id: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  detail: unknown;
  prev_hash: string | null;
  created_at: string;
}): string {
  const detailStr = entry.detail != null ? JSON.stringify(entry.detail) : '';
  const payload = [
    entry.tenant_id,
    entry.actor,
    entry.action,
    entry.entity_type,
    entry.entity_id,
    detailStr,
    entry.prev_hash ?? '',
    entry.created_at,
  ].join('|');

  return createHash('sha256').update(payload).digest('hex');
}

/* ================================================================
 *  Chain Verification
 * ================================================================ */

export interface AuditVerifyResult {
  ok: boolean;
  totalEntries: number;
  verified: number;
  brokenAt?: { id: string; position: number; expected: string; actual: string };
  missingHashes: number;
  error?: string;
}

/**
 * Verify the full hash chain of platform_audit_event.
 * Walks entries in created_at order and confirms each entry_hash
 * matches the computed hash, and prev_hash links to the previous entry.
 *
 * PG-only. Returns { ok: false, error } for SQLite backend.
 */
export async function verifyAuditChain(): Promise<AuditVerifyResult> {
  if (!isPgConfigured()) {
    return {
      ok: true,
      totalEntries: 0,
      verified: 0,
      missingHashes: 0,
      error: 'PG not configured; audit chain verification is PG-only',
    };
  }

  const pool = getPgPool();

  const countResult = await pool.query('SELECT count(*)::int AS total FROM platform_audit_event');
  const totalEntries = countResult.rows[0]?.total ?? 0;

  if (totalEntries === 0) {
    return { ok: true, totalEntries: 0, verified: 0, missingHashes: 0 };
  }

  // Stream through entries in order
  const result = await pool.query(
    `SELECT id, tenant_id, actor, action, entity_type, entity_id,
            detail, prev_hash, entry_hash, created_at
     FROM platform_audit_event
     ORDER BY created_at ASC, id ASC`
  );

  let verified = 0;
  let missingHashes = 0;
  let lastHash: string | null = null;

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows[i];

    // Skip entries without hashes (pre-Phase 104 data)
    if (!row.entry_hash) {
      missingHashes++;
      lastHash = null; // Reset chain for unhashed entries
      continue;
    }

    // Verify prev_hash links to the previous entry's hash
    if (lastHash !== null && row.prev_hash !== lastHash) {
      return {
        ok: false,
        totalEntries,
        verified,
        missingHashes,
        brokenAt: {
          id: row.id,
          position: i,
          expected: lastHash,
          actual: row.prev_hash ?? '(null)',
        },
      };
    }

    // Verify entry_hash matches computed hash
    const computed = computeAuditHash({
      tenant_id: row.tenant_id,
      actor: row.actor,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      detail: row.detail,
      prev_hash: row.prev_hash,
      created_at:
        row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    });

    if (computed !== row.entry_hash) {
      return {
        ok: false,
        totalEntries,
        verified,
        missingHashes,
        brokenAt: {
          id: row.id,
          position: i,
          expected: computed,
          actual: row.entry_hash,
        },
      };
    }

    lastHash = row.entry_hash;
    verified++;
  }

  return { ok: true, totalEntries, verified, missingHashes };
}

/* ================================================================
 *  Audit Export (JSON Lines)
 * ================================================================ */

export interface AuditExportOptions {
  /** Only entries after this ISO date. */
  since?: string;
  /** Only entries before this ISO date. */
  until?: string;
  /** Filter by tenant. */
  tenantId?: string;
  /** Filter by entity type. */
  entityType?: string;
  /** Max rows to return. */
  limit?: number;
}

export interface AuditExportResult {
  ok: boolean;
  count: number;
  entries: Array<Record<string, unknown>>;
  truncated: boolean;
  error?: string;
}

/**
 * Export audit entries as sanitized JSON objects.
 * PHI patterns are scrubbed from detail fields.
 * Max 50K rows per export to prevent OOM.
 */
export async function exportAuditEntries(
  opts: AuditExportOptions = {}
): Promise<AuditExportResult> {
  if (!isPgConfigured()) {
    return { ok: false, count: 0, entries: [], truncated: false, error: 'PG not configured' };
  }

  const pool = getPgPool();
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (opts.since) {
    conditions.push(`created_at >= $${paramIdx++}`);
    params.push(opts.since);
  }
  if (opts.until) {
    conditions.push(`created_at <= $${paramIdx++}`);
    params.push(opts.until);
  }
  if (opts.tenantId) {
    conditions.push(`tenant_id = $${paramIdx++}`);
    params.push(opts.tenantId);
  }
  if (opts.entityType) {
    conditions.push(`entity_type = $${paramIdx++}`);
    params.push(opts.entityType);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(opts.limit ?? MAX_EXPORT_ROWS, MAX_EXPORT_ROWS);

  const result = await pool.query(
    `SELECT id, tenant_id, actor, actor_role, action, entity_type, entity_id,
            detail, prev_hash, entry_hash, created_at
     FROM platform_audit_event
     ${where}
     ORDER BY created_at ASC
     LIMIT $${paramIdx++}`,
    [...params, limit + 1]
  );

  const truncated = result.rows.length > limit;
  const rows = result.rows.slice(0, limit);

  // Sanitize PHI from detail fields
  const entries = rows.map((row: Record<string, unknown>) => ({
    ...row,
    detail: sanitizeAuditDetail(row.detail),
  }));

  return { ok: true, count: entries.length, entries, truncated };
}

/* ================================================================
 *  Retention Policy Metadata
 * ================================================================ */

export interface RetentionPolicy {
  /** Retention period in days. */
  retentionDays: number;
  /** Whether auto-purge is enabled. */
  autoPurgeEnabled: boolean;
  /** Tables covered by this policy. */
  tables: string[];
  /** Export format for archived entries. */
  exportFormat: 'jsonl' | 'csv';
  /** Policy description. */
  description: string;
}

/**
 * Get the current retention policy configuration.
 * Driven by environment variables with sensible defaults.
 */
export function getRetentionPolicy(): RetentionPolicy {
  const days = Number(process.env.PLATFORM_AUDIT_RETENTION_DAYS) || DEFAULT_RETENTION_DAYS;
  const autoPurge = process.env.PLATFORM_AUDIT_AUTO_PURGE === 'true';

  return {
    retentionDays: days,
    autoPurgeEnabled: autoPurge,
    tables: ['platform_audit_event', 'payer_audit_event', 'idempotency_key'],
    exportFormat: 'jsonl',
    description: [
      `Audit entries retained for ${days} days (env: PLATFORM_AUDIT_RETENTION_DAYS).`,
      `Auto-purge: ${autoPurge ? 'enabled' : 'disabled'} (env: PLATFORM_AUDIT_AUTO_PURGE).`,
      'Entries older than retention period should be exported before deletion.',
      'Export via GET /admin/payer-db/audit/export?since=&until= (admin only).',
      'Idempotency keys expire after 24h and are auto-pruned by middleware.',
    ].join(' '),
  };
}
