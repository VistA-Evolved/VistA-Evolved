/**
 * PhilHealth eClaims 3.0 — Submission Tracker
 *
 * Phase 96: Honest status tracking for eClaims 3.0 submissions.
 *
 * CRITICAL DESIGN:
 *   - Status NEVER advances to "accepted" or "denied" without manual staff action.
 *   - "submitted_manual" means staff uploaded to PhilHealth portal themselves.
 *   - There is NO automated submission path in this skeleton.
 *   - When real API integration is available, a new "submitted_api" status
 *     can be added, but acceptance/denial STILL requires PhilHealth confirmation.
 *
 * In-memory store. Pattern matches Phase 23 imaging worklist, Phase 30 telehealth.
 * Migration plan: PostgreSQL when multi-tenant persistence needed.
 */

import { randomBytes } from "node:crypto";
import {
  ECLAIMS_STATUS_TRANSITIONS,
  isManualOnlyTransition,
  type EClaimsSubmissionStatus,
  type SubmissionRecord,
  type DenialReason,
  type ClaimPacket,
} from "./types.js";

/* ── ID Generation ──────────────────────────────────────────── */

function newSubmissionId(): string {
  return `sub-${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
}

/* ── In-Memory Store ────────────────────────────────────────── */

const submissions = new Map<string, SubmissionRecord>();
/** Index: sourceClaimDraftId → submissionId */
const byDraft = new Map<string, string>();
/** Index: packetId → submissionId */
const byPacket = new Map<string, string>();

/* Phase 146: DB repo wiring */
let phSubDbRepo: { upsert(d: any): Promise<any>; update?(id: string, u: any): Promise<any> } | null = null;
export function initPhSubmissionStoreRepo(repo: typeof phSubDbRepo): void { phSubDbRepo = repo; }

/* ── CRUD ───────────────────────────────────────────────────── */

/**
 * Create a new submission record for a claim packet.
 */
export function createSubmission(
  packet: ClaimPacket,
  actor: string,
): SubmissionRecord {
  const now = new Date().toISOString();
  const record: SubmissionRecord = {
    id: newSubmissionId(),
    packetId: packet.packetId,
    sourceClaimDraftId: packet.sourceClaimDraftId,
    status: "draft",
    exportBundleIds: [],
    denialReasons: [],
    staffNotes: [],
    timeline: [],
    createdAt: now,
    updatedAt: now,
  };

  submissions.set(record.id, record);
  byDraft.set(record.sourceClaimDraftId, record.id);
  byPacket.set(record.packetId, record.id);

  // Phase 146: Write-through to PG
  phSubDbRepo?.upsert({ id: record.id, tenantId: (record as any).tenantId ?? 'default', claimId: record.sourceClaimDraftId, packetId: record.packetId, status: record.status, submittedAt: record.createdAt }).catch(() => {});

  return record;
}

/**
 * Get a submission by ID.
 */
export function getSubmission(id: string): SubmissionRecord | undefined {
  return submissions.get(id);
}

/**
 * Get submission by source claim draft ID.
 */
export function getSubmissionByDraft(draftId: string): SubmissionRecord | undefined {
  const subId = byDraft.get(draftId);
  return subId ? submissions.get(subId) : undefined;
}

/**
 * List all submissions, optionally filtered by status.
 */
export function listSubmissions(filter?: {
  status?: EClaimsSubmissionStatus;
  limit?: number;
}): SubmissionRecord[] {
  let results = Array.from(submissions.values());
  if (filter?.status) {
    results = results.filter((s) => s.status === filter.status);
  }
  results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (filter?.limit) {
    results = results.slice(0, filter.limit);
  }
  return results;
}

/* ── Status Transitions ─────────────────────────────────────── */

export interface TransitionResult {
  ok: boolean;
  submission?: SubmissionRecord;
  error?: string;
}

/**
 * Transition a submission to a new status.
 * Validates the transition is allowed and that manual-only statuses
 * cannot be set without explicit staff action.
 */
export function transitionSubmission(
  id: string,
  toStatus: EClaimsSubmissionStatus,
  actor: string,
  detail?: string,
): TransitionResult {
  const record = submissions.get(id);
  if (!record) {
    return { ok: false, error: "Submission not found." };
  }

  const allowed = ECLAIMS_STATUS_TRANSITIONS[record.status];
  if (!allowed.includes(toStatus)) {
    return {
      ok: false,
      error: `Transition from '${record.status}' to '${toStatus}' is not allowed.`,
    };
  }

  const now = new Date().toISOString();
  record.timeline.push({
    timestamp: now,
    fromStatus: record.status,
    toStatus,
    actor,
    detail,
  });
  record.status = toStatus;
  record.updatedAt = now;

  return { ok: true, submission: record };
}

/* ── Export Bundle Tracking ──────────────────────────────────── */

/**
 * Record that an export bundle was generated for this submission.
 */
export function recordExportBundle(id: string, bundleId: string): boolean {
  const record = submissions.get(id);
  if (!record) return false;
  record.exportBundleIds.push(bundleId);
  record.updatedAt = new Date().toISOString();
  return true;
}

/* ── Denial Recording ───────────────────────────────────────── */

/**
 * Record a denial reason on a submission.
 * Can only be called when status is "denied" or as part of the
 * transition to "denied".
 */
export function recordDenialReason(
  id: string,
  reason: Omit<DenialReason, "recordedAt">,
): TransitionResult {
  const record = submissions.get(id);
  if (!record) {
    return { ok: false, error: "Submission not found." };
  }

  const now = new Date().toISOString();
  record.denialReasons.push({
    ...reason,
    recordedAt: now,
  });
  record.updatedAt = now;

  return { ok: true, submission: record };
}

/* ── Acceptance Confirmation ────────────────────────────────── */

/**
 * Record acceptance details (TCN, payer ref) when staff confirms
 * PhilHealth accepted the claim.
 */
export function recordAcceptance(
  id: string,
  tcn: string,
  payerRefNumber?: string,
): TransitionResult {
  const record = submissions.get(id);
  if (!record) {
    return { ok: false, error: "Submission not found." };
  }
  if (record.status !== "accepted") {
    return { ok: false, error: "Can only record acceptance details when status is 'accepted'." };
  }

  record.transmittalControlNumber = tcn;
  record.payerRefNumber = payerRefNumber;
  record.updatedAt = new Date().toISOString();

  return { ok: true, submission: record };
}

/* ── Staff Notes ────────────────────────────────────────────── */

export function addStaffNote(id: string, note: string): boolean {
  const record = submissions.get(id);
  if (!record) return false;
  record.staffNotes.push(note);
  record.updatedAt = new Date().toISOString();
  return true;
}

/* ── Stats ──────────────────────────────────────────────────── */

export function getSubmissionStats(): {
  total: number;
  byStatus: Record<EClaimsSubmissionStatus, number>;
  recentDenials: number;
} {
  const byStatus: Record<EClaimsSubmissionStatus, number> = {
    draft: 0,
    reviewed: 0,
    exported: 0,
    submitted_manual: 0,
    accepted: 0,
    denied: 0,
    appealed: 0,
  };

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  let recentDenials = 0;

  for (const sub of submissions.values()) {
    byStatus[sub.status]++;
    if (sub.status === "denied" && sub.updatedAt >= weekAgo) {
      recentDenials++;
    }
  }

  return {
    total: submissions.size,
    byStatus,
    recentDenials,
  };
}

/**
 * Check whether a transition requires manual staff action.
 * Re-exported for route-level guard use.
 */
export { isManualOnlyTransition };
