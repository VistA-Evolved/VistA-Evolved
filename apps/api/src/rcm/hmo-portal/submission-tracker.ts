/**
 * Submission Tracker — Phase 97
 *
 * In-memory store for HMO submission lifecycle tracking.
 * Follows the Phase 23 imaging worklist / Phase 38 claim store pattern:
 * in-memory Map that resets on API restart, with documented migration path.
 *
 * Migration plan (when VistA IB data is available):
 *   1. Read from VistA IB charge status via RPC
 *   2. Overlay HMO-specific statuses (portal tracking) in-memory
 *   3. Post back to VistA IB when claim is approved
 *   4. Full ledger posting via VistA AR
 */

import { randomBytes } from "node:crypto";
import type { HmoSubmissionRecord, HmoSubmissionStatus } from "./types.js";
import { isValidHmoTransition } from "./types.js";

/* ── In-Memory Store ────────────────────────────────────────── */

const submissions = new Map<string, HmoSubmissionRecord>();

/* Phase 146: DB repo wiring */
let hmoSubDbRepo: { upsert(d: any): Promise<any>; update?(id: string, u: any): Promise<any> } | null = null;
export function initHmoSubmissionStoreRepo(repo: typeof hmoSubDbRepo): void { hmoSubDbRepo = repo; }

/* ── ID Generation ──────────────────────────────────────────── */

function newSubmissionId(): string {
  return `hsub-${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
}

/* ── CRUD ───────────────────────────────────────────────────── */

export function createSubmission(params: {
  payerId: string;
  payerName: string;
  claimId?: string;
  loaRequestId?: string;
  actor: string;
}): HmoSubmissionRecord {
  const now = new Date().toISOString();
  const record: HmoSubmissionRecord = {
    id: newSubmissionId(),
    payerId: params.payerId,
    payerName: params.payerName,
    claimId: params.claimId,
    loaRequestId: params.loaRequestId,
    status: "draft",
    staffNotes: [],
    exportFiles: [],
    timeline: [],
    createdAt: now,
    updatedAt: now,
  };
  submissions.set(record.id, record);

  // Phase 146: Write-through to PG
  hmoSubDbRepo?.upsert({ id: record.id, tenantId: (record as any).tenantId ?? 'default', claimId: (record as any).claimId ?? '', payerId: (record as any).payerId ?? '', status: record.status, submittedAt: record.createdAt }).catch(() => {});

  return record;
}

export function getSubmission(id: string): HmoSubmissionRecord | undefined {
  return submissions.get(id);
}

export function listSubmissions(filter?: {
  payerId?: string;
  status?: HmoSubmissionStatus;
  claimId?: string;
  loaRequestId?: string;
}): HmoSubmissionRecord[] {
  let records = Array.from(submissions.values());
  if (filter?.payerId) records = records.filter((r) => r.payerId === filter.payerId);
  if (filter?.status) records = records.filter((r) => r.status === filter.status);
  if (filter?.claimId) records = records.filter((r) => r.claimId === filter.claimId);
  if (filter?.loaRequestId) records = records.filter((r) => r.loaRequestId === filter.loaRequestId);
  return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function transitionSubmission(
  id: string,
  toStatus: HmoSubmissionStatus,
  actor: string,
  detail?: string,
): { ok: boolean; record?: HmoSubmissionRecord; error?: string } {
  const record = submissions.get(id);
  if (!record) return { ok: false, error: "Submission not found." };

  if (!isValidHmoTransition(record.status, toStatus)) {
    return {
      ok: false,
      error: `Invalid transition: ${record.status} → ${toStatus}`,
    };
  }

  const now = new Date().toISOString();
  const updated: HmoSubmissionRecord = {
    ...record,
    status: toStatus,
    updatedAt: now,
    timeline: [
      ...record.timeline,
      {
        timestamp: now,
        fromStatus: record.status,
        toStatus,
        actor,
        detail,
      },
    ],
  };
  submissions.set(id, updated);
  return { ok: true, record: updated };
}

export function updateSubmissionFields(
  id: string,
  fields: Partial<
    Pick<
      HmoSubmissionRecord,
      | "portalRef"
      | "loaReferenceNumber"
      | "loaPacketId"
      | "claimPacketId"
      | "claimId"
      | "loaRequestId"
      | "denialReason"
      | "denialCode"
    >
  >,
): { ok: boolean; record?: HmoSubmissionRecord; error?: string } {
  const record = submissions.get(id);
  if (!record) return { ok: false, error: "Submission not found." };

  const now = new Date().toISOString();
  const updated: HmoSubmissionRecord = {
    ...record,
    ...fields,
    updatedAt: now,
  };
  submissions.set(id, updated);
  return { ok: true, record: updated };
}

export function addStaffNote(
  id: string,
  note: string,
): { ok: boolean; error?: string } {
  const record = submissions.get(id);
  if (!record) return { ok: false, error: "Submission not found." };

  record.staffNotes.push(`[${new Date().toISOString()}] ${note}`);
  record.updatedAt = new Date().toISOString();
  return { ok: true };
}

export function addExportFile(
  id: string,
  filename: string,
): { ok: boolean; error?: string } {
  const record = submissions.get(id);
  if (!record) return { ok: false, error: "Submission not found." };

  record.exportFiles.push(filename);
  record.updatedAt = new Date().toISOString();
  return { ok: true };
}

/* ── Summary Stats ──────────────────────────────────────────── */

export function getSubmissionStats(): Record<HmoSubmissionStatus, number> {
  const stats: Partial<Record<HmoSubmissionStatus, number>> = {};
  for (const record of submissions.values()) {
    stats[record.status] = (stats[record.status] ?? 0) + 1;
  }
  // Ensure all statuses present
  const allStatuses: HmoSubmissionStatus[] = [
    "draft", "loa_pending", "loa_approved", "loa_denied",
    "claim_prepared", "claim_exported", "claim_submitted_manual",
    "claim_processing", "claim_approved", "claim_denied",
    "remittance_received", "posted_to_vista",
  ];
  for (const s of allStatuses) {
    if (!(s in stats)) stats[s] = 0;
  }
  return stats as Record<HmoSubmissionStatus, number>;
}

/* ── Reset (testing only) ───────────────────────────────────── */

export function _resetSubmissionStore(): void {
  submissions.clear();
}
