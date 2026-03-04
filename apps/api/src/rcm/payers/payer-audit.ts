/**
 * Payer Audit — Phase 95: Payer Registry Persistence + Audit
 *
 * Hash-chained, append-only, PHI-safe audit trail for payer registry
 * changes. Follows the same pattern as rcm-audit.ts (Phase 38) and
 * immutable-audit.ts (Phase 35).
 *
 * Every change to payer capabilities, tasks, evidence, status, or
 * adapter enablement generates an audit event with:
 *   - actor, timestamp, tenantId
 *   - before/after snapshot
 *   - reason text
 *   - evidence link (if applicable)
 *   - SHA-256 hash chain link
 *
 * Storage: append-only JSONL file + in-memory ring buffer.
 * Production: migrate to INSERT-only DB table.
 */

import { createHash } from 'node:crypto';
import { sanitizeAuditDetail as centralSanitize } from '../../lib/phi-redaction.js';
import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname_resolved =
  typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(__dirname_resolved, '..', '..', '..', '..', '..');
const AUDIT_DIR = join(REPO_ROOT, 'logs');
const AUDIT_FILE = join(AUDIT_DIR, 'payer-audit.jsonl');

/* ── Types ──────────────────────────────────────────────────── */

export type PayerAuditAction =
  | 'payer.imported'
  | 'payer.capabilities_updated'
  | 'payer.tasks_updated'
  | 'payer.status_changed'
  | 'payer.evidence_added'
  | 'payer.evidence_removed'
  | 'payer.tenant_override_set'
  | 'payer.tenant_override_removed'
  | 'payer.adapter_enabled'
  | 'payer.adapter_disabled'
  | 'payer.registry_imported'
  | 'payer.registry_validated'
  | 'payer.watcher_triggered';

export interface PayerAuditEvent {
  id: string;
  timestamp: string;
  action: PayerAuditAction;
  actor: string;
  tenantId: string;
  payerId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  evidenceLink?: string;
  detail?: string;
  /** SHA-256 hash of this entry (includes prevHash for chain) */
  hash: string;
  /** Hash of previous entry for chain verification */
  prevHash: string;
}

/* ── Store ──────────────────────────────────────────────────── */

const MAX_RING_SIZE = 10_000;
const auditRing: PayerAuditEvent[] = [];
let lastHash = 'GENESIS';
let counter = 0;

/* ── Helpers ────────────────────────────────────────────────── */

function sanitizeDetail(detail: unknown): unknown {
  if (detail === null || detail === undefined) return detail;
  if (typeof detail === 'string') {
    // For string detail: run inline PHI pattern scrub
    return detail
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN-REDACTED]')
      .replace(/\b\d{4}-\d{2}-\d{2}T/g, '[DATE]T');
  }
  if (typeof detail === 'object') {
    // Phase 151: delegate to centralized PHI sanitizer for objects
    return centralSanitize(detail as Record<string, unknown>) ?? detail;
  }
  return detail;
}

function computeHash(entry: Omit<PayerAuditEvent, 'hash'>): string {
  const payload = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    action: entry.action,
    actor: entry.actor,
    tenantId: entry.tenantId,
    payerId: entry.payerId,
    before: entry.before,
    after: entry.after,
    reason: entry.reason,
    prevHash: entry.prevHash,
  });
  return createHash('sha256').update(payload).digest('hex');
}

function ensureAuditDir(): void {
  if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true });
}

/* ── Append ─────────────────────────────────────────────────── */

export function appendPayerAudit(params: {
  action: PayerAuditAction;
  actor: string;
  tenantId?: string;
  payerId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  evidenceLink?: string;
  detail?: string;
}): PayerAuditEvent {
  counter++;
  const now = new Date().toISOString();

  const entry: Omit<PayerAuditEvent, 'hash'> = {
    id: `paudit-${counter}-${now.replace(/[:.]/g, '')}`,
    timestamp: now,
    action: params.action,
    actor: params.actor,
    tenantId: params.tenantId ?? 'global',
    payerId: params.payerId,
    before: sanitizeDetail(params.before),
    after: sanitizeDetail(params.after),
    reason: params.reason,
    evidenceLink: params.evidenceLink,
    detail:
      typeof params.detail === 'string'
        ? (sanitizeDetail(params.detail) as string | undefined)
        : params.detail,
    prevHash: lastHash,
  };

  const hash = computeHash(entry);
  const event: PayerAuditEvent = { ...entry, hash };

  // Ring buffer
  auditRing.push(event);
  if (auditRing.length > MAX_RING_SIZE) {
    auditRing.shift();
  }

  lastHash = hash;

  // Append to file
  try {
    ensureAuditDir();
    appendFileSync(AUDIT_FILE, JSON.stringify(event) + '\n', 'utf-8');
  } catch {
    // Non-fatal: file write failure doesn't block operation
  }

  return event;
}

/* ── Query ──────────────────────────────────────────────────── */

export function getPayerAuditTrail(
  payerId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): { events: PayerAuditEvent[]; total: number } {
  const filtered = auditRing.filter((e) => e.payerId === payerId);
  filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const total = filtered.length;
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? 50;

  return { events: filtered.slice(offset, offset + limit), total };
}

export function getPayerAuditByTenant(
  tenantId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): { events: PayerAuditEvent[]; total: number } {
  const filtered = auditRing.filter((e) => e.tenantId === tenantId);
  filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const total = filtered.length;
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? 50;

  return { events: filtered.slice(offset, offset + limit), total };
}

export function getAllPayerAudit(options?: {
  action?: PayerAuditAction;
  limit?: number;
  offset?: number;
}): { events: PayerAuditEvent[]; total: number } {
  let filtered = [...auditRing];
  if (options?.action) {
    filtered = filtered.filter((e) => e.action === options.action);
  }
  filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const total = filtered.length;
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? 100;

  return { events: filtered.slice(offset, offset + limit), total };
}

/* ── Verify chain ───────────────────────────────────────────── */

export function verifyPayerAuditChain(): {
  ok: boolean;
  checked: number;
  brokenAt?: number;
  message: string;
} {
  if (auditRing.length === 0) {
    return { ok: true, checked: 0, message: 'Empty audit trail' };
  }

  for (let i = 0; i < auditRing.length; i++) {
    const entry = auditRing[i];
    const expectedHash = computeHash({
      id: entry.id,
      timestamp: entry.timestamp,
      action: entry.action,
      actor: entry.actor,
      tenantId: entry.tenantId,
      payerId: entry.payerId,
      before: entry.before,
      after: entry.after,
      reason: entry.reason,
      evidenceLink: entry.evidenceLink,
      detail: entry.detail,
      prevHash: entry.prevHash,
    });

    if (entry.hash !== expectedHash) {
      return { ok: false, checked: i, brokenAt: i, message: `Hash mismatch at index ${i}` };
    }

    if (i > 0 && entry.prevHash !== auditRing[i - 1].hash) {
      return {
        ok: false,
        checked: i,
        brokenAt: i,
        message: `Chain break at index ${i}: prevHash mismatch`,
      };
    }
  }

  return {
    ok: true,
    checked: auditRing.length,
    message: `Chain verified: ${auditRing.length} entries`,
  };
}

/* ── Stats ──────────────────────────────────────────────────── */

export function getPayerAuditStats(): {
  total: number;
  byAction: Record<string, number>;
  lastEventAt: string | null;
} {
  const byAction: Record<string, number> = {};
  for (const e of auditRing) {
    byAction[e.action] = (byAction[e.action] ?? 0) + 1;
  }

  return {
    total: auditRing.length,
    byAction,
    lastEventAt: auditRing.length > 0 ? auditRing[auditRing.length - 1].timestamp : null,
  };
}
