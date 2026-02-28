/**
 * RCM Audit Trail — Hash-Chained, PHI-Safe
 *
 * Every claim lifecycle transition, EDI submission, validation result,
 * and remittance posting is recorded in an append-only, hash-chained
 * audit log. PHI is sanitized before storage.
 *
 * Follows the same pattern as imaging-audit.ts (Phase 24) and
 * immutable-audit.ts (Phase 35).
 *
 * Phase 38 — RCM + Payer Connectivity
 * Phase 113B — Added JSONL file sink with hash-chain continuity across restart
 */

import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ─── File sink configuration (Phase 113B) ───────────────────── */

const __dirname_resolved = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(__dirname_resolved, '..', '..', '..', '..', '..');
const DEFAULT_AUDIT_FILE = join(REPO_ROOT, 'logs', 'rcm-audit.jsonl');
const AUDIT_FILE = process.env.RCM_AUDIT_FILE || DEFAULT_AUDIT_FILE;
const AUDIT_DIR = dirname(AUDIT_FILE);

function ensureAuditDir(): void {
  if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true });
}

/**
 * Recover the last hash from the existing JSONL file on startup.
 * Only reads the LAST line — does NOT load the whole file.
 */
function recoverLastHash(): string {
  try {
    if (!existsSync(AUDIT_FILE)) return '0'.repeat(64);
    const content = readFileSync(AUDIT_FILE, 'utf-8');
    const lines = content.trimEnd().split('\n');
    const lastLine = lines[lines.length - 1];
    if (!lastLine) return '0'.repeat(64);
    const entry = JSON.parse(lastLine);
    if (entry && typeof entry.hash === 'string') return entry.hash;
  } catch {
    // Corrupt or empty file — start fresh
  }
  return '0'.repeat(64);
}

function appendToFile(entry: RcmAuditEntry): void {
  try {
    ensureAuditDir();
    appendFileSync(AUDIT_FILE, JSON.stringify(entry) + '\n', 'utf-8');
  } catch {
    // Non-fatal: file write failure doesn't block operation
  }
}

/* ─── Types ──────────────────────────────────────────────────────── */

export type RcmAuditAction =
  | 'claim.created'
  | 'claim.updated'
  | 'claim.validated'
  | 'claim.submitted'
  | 'claim.accepted'
  | 'claim.rejected'
  | 'claim.paid'
  | 'claim.denied'
  | 'claim.appealed'
  | 'claim.closed'
  | 'claim.transition'
  | 'claim.exported'
  | 'claim.ready_to_submit'
  | 'claim.submission_blocked'
  | 'edi.outbound'
  | 'edi.inbound'
  | 'edi.ack'
  | 'edi.error'
  | 'edi.x12_serialized'
  | 'remit.received'
  | 'remit.matched'
  | 'remit.posted'
  | 'eligibility.checked'
  | 'payer.created'
  | 'payer.updated'
  | 'payer.csv_imported'
  | 'validation.run'
  | 'connector.submit'
  | 'connector.response'
  | 'safety.export_only'
  | 'safety.live_enabled'
  | 'job.enqueued'
  | 'job.cancelled'
  | 'job.completed'
  | 'job.failed'
  | 'job.dead_letter'
  | 'era.post_attempted'
  | 'vista.binding_called'
  | 'vista.encounters.read'
  | 'vista.claim-drafts.created'
  | 'vista.coverage.read'
  | 'vista.rpc-check'
  | 'ack.ingested'
  | 'status.ingested'
  | 'workqueue.created'
  | 'workqueue.updated'
  | 'workqueue.resolved'
  | 'rule.created'
  | 'rule.updated'
  | 'rule.deleted'
  | 'rule.evaluated'
  | 'remit.processed'
  | 'remit.denied'
  | 'directory.refreshed'
  | 'directory.import_failed'
  | 'enrollment.created'
  | 'enrollment.updated'
  | 'route.resolved'
  | 'route.not_found'
  | 'transaction.created'
  | 'transaction.transmitted'
  | 'transaction.ack_received'
  | 'transaction.failed'
  | 'transaction.dlq'
  | 'transaction.retried'
  | 'transaction.reconciled'
  | 'connectivity.gate_failed'
  | 'translator.build'
  | 'translator.parse'
  | 'gateway.probe'
  | 'gateway.readiness_checked'
  | 'gateway.conformance_validated'
  | 'gateway.soa_generated'
  | 'gateway.soa_rejected_pdf'
  | 'loa.created'
  | 'loa.updated'
  | 'loa.transition'
  | 'loa.submitted'
  | 'loa.pack_generated'
  | 'loa.attachment_added'
  | 'loa.assigned'
  | 'loa.reminder_sent'
  | 'loa.approved'
  | 'loa.denied'
  | 'loa.cancelled'
  | 'loa.expired'
  | 'denial.created'
  | 'denial.updated'
  | 'denial.triaged'
  | 'denial.appealing'
  | 'denial.resubmitted'
  | 'denial.resolved'
  | 'denial.writeoff'
  | 'denial.closed'
  | 'denial.imported'
  | 'denial.action_added'
  | 'denial.attachment_added'
  | 'denial.packet_generated'
  | 'recon.imported'
  | 'recon.payment_created'
  | 'recon.matched'
  | 'recon.batch_matched'
  | 'recon.confirmed'
  | 'recon.underpayment_created'
  | 'recon.underpayment_updated'
  | 'recon.sent_to_denials'
  | 'claim_status.checked'
  | 'claim_status.scheduled'
  | 'draft.created'
  | 'draft.updated'
  | 'draft.transition'
  | 'draft.scrubbed'
  | 'draft.denial'
  | 'draft.resubmit'
  | 'draft.appeal_packet'
  | 'scrub_rule.created'
  | 'scrub_rule.updated'
  | 'scrub_rule.deleted'
  | 'evidence.gate_blocked'
  | 'evidence.stale_warning'
  | 'denial.followup_flagged'
  | 'remittance.import_processed'
  | 'credential_vault_create'
  | 'credential_vault_update'
  | 'credential_vault_verify'
  | 'credential_document_add'
  | 'credential_document_delete'
  | 'accreditation_create'
  | 'accreditation_update'
  | 'accreditation_verify'
  | 'accreditation_task_create'
  | 'accreditation_task_update'
  | 'accreditation_task_complete'
  | 'accreditation_task_delete';

export interface RcmAuditEntry {
  id: string;
  seq: number;
  action: RcmAuditAction;
  claimId?: string;
  payerId?: string;
  userId?: string;
  patientDfn?: string;
  detail: Record<string, unknown>;
  previousHash: string;
  hash: string;
  timestamp: string;
}

/* ─── PHI sanitization ───────────────────────────────────────────── */

const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/g,                     // SSN
  /\b\d{2}[\/-]\d{2}[\/-]\d{4}\b/g,              // DOB-like dates
  /\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b/g,            // "Last, First" names
];

function sanitizeDetail(detail: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(detail)) {
    const lk = key.toLowerCase();
    // Strip known PHI fields
    if (lk.includes('ssn') || lk.includes('social_security')) {
      sanitized[key] = '[REDACTED-SSN]';
    } else if (lk.includes('dob') || lk.includes('date_of_birth') || lk.includes('birthdate')) {
      sanitized[key] = '[REDACTED-DOB]';
    } else if (lk.includes('patient_name') || lk.includes('patientname')) {
      sanitized[key] = '[REDACTED-NAME]';
    } else if (lk === 'dfn' || lk === 'patientdfn' || lk === 'patient_dfn' || lk === 'mrn') {
      // Phase 151: redact patient identifiers
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      let cleaned = value;
      for (const pattern of PHI_PATTERNS) {
        cleaned = cleaned.replace(pattern, '[REDACTED]');
      }
      sanitized[key] = cleaned;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeDetail(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/* ─── Audit store ────────────────────────────────────────────────── */

const MAX_ENTRIES = 20_000;
const entries: RcmAuditEntry[] = [];
let seq = 0;
let lastHash = recoverLastHash(); // recover from JSONL on startup (Phase 113B)

function computeHash(entry: Omit<RcmAuditEntry, 'hash'>): string {
  const data = JSON.stringify({
    seq: entry.seq,
    action: entry.action,
    claimId: entry.claimId,
    payerId: entry.payerId,
    userId: entry.userId,
    detail: entry.detail,
    previousHash: entry.previousHash,
    timestamp: entry.timestamp,
  });
  return createHash('sha256').update(data).digest('hex');
}

/* ─── Public API ─────────────────────────────────────────────────── */

export function appendRcmAudit(
  action: RcmAuditAction,
  opts: {
    claimId?: string;
    payerId?: string;
    userId?: string;
    patientDfn?: string;
    detail?: Record<string, unknown>;
  } = {},
): RcmAuditEntry {
  seq++;
  const sanitizedDetail = sanitizeDetail(opts.detail ?? {});

  const partial: Omit<RcmAuditEntry, 'hash'> = {
    id: `rcm-audit-${seq}`,
    seq,
    action,
    claimId: opts.claimId,
    payerId: opts.payerId,
    userId: opts.userId,
    patientDfn: opts.patientDfn ? '[DFN]' : undefined, // never store raw DFN
    detail: sanitizedDetail,
    previousHash: lastHash,
    timestamp: new Date().toISOString(),
  };

  const hash = computeHash(partial);
  const entry: RcmAuditEntry = { ...partial, hash };

  entries.push(entry);
  lastHash = hash;

  // Persist to JSONL file (Phase 113B)
  appendToFile(entry);

  // Evict oldest from memory when over capacity
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }

  return entry;
}

export function getRcmAuditEntries(filters?: {
  claimId?: string;
  action?: RcmAuditAction;
  since?: string;
  limit?: number;
  offset?: number;
}): { items: RcmAuditEntry[]; total: number } {
  let items = [...entries];

  if (filters?.claimId) items = items.filter(e => e.claimId === filters.claimId);
  if (filters?.action) items = items.filter(e => e.action === filters.action);
  if (filters?.since) {
    const sinceVal = filters.since;
    items = items.filter(e => e.timestamp >= sinceVal);
  }

  const total = items.length;
  const offset = filters?.offset ?? 0;
  const limit = filters?.limit ?? 50;
  items = items.slice(offset, offset + limit);

  return { items, total };
}

export function verifyRcmAuditChain(): {
  valid: boolean;
  totalEntries: number;
  brokenAt?: number;
} {
  if (entries.length === 0) return { valid: true, totalEntries: 0 };

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const recomputed = computeHash({
      id: entry.id,
      seq: entry.seq,
      action: entry.action,
      claimId: entry.claimId,
      payerId: entry.payerId,
      userId: entry.userId,
      patientDfn: entry.patientDfn,
      detail: entry.detail,
      previousHash: entry.previousHash,
      timestamp: entry.timestamp,
    });

    if (recomputed !== entry.hash) {
      return { valid: false, totalEntries: entries.length, brokenAt: entry.seq };
    }

    if (i > 0 && entry.previousHash !== entries[i - 1].hash) {
      return { valid: false, totalEntries: entries.length, brokenAt: entry.seq };
    }
  }

  return { valid: true, totalEntries: entries.length };
}

export function getRcmAuditStats(): {
  total: number;
  byAction: Record<string, number>;
  chainValid: boolean;
} {
  const byAction: Record<string, number> = {};
  for (const entry of entries) {
    byAction[entry.action] = (byAction[entry.action] ?? 0) + 1;
  }
  const chainResult = verifyRcmAuditChain();
  return { total: entries.length, byAction, chainValid: chainResult.valid };
}

export function resetRcmAudit(): void {
  entries.length = 0;
  seq = 0;
  lastHash = '0'.repeat(64);
}
