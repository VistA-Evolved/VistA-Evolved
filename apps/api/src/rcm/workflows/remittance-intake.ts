/**
 * Remittance Intake — Phase 94: PH HMO Workflow Automation
 *
 * Secure remittance/EOB intake flow for PH HMO payers.
 *
 * Since many PH HMOs provide remittance as PDFs, emails, or SOA
 * (Statement of Account) documents, this module provides:
 *   1. Secure file upload + associate to claim
 *   2. Minimal metadata storage (no inline PHI)
 *   3. Payment posting assist with underpayment flagging
 *
 * No OCR required. Future OCR is opt-in and auditable.
 *
 * Storage: In-memory store (resets on API restart).
 * Production migration: External object store (S3/GCS) for blobs,
 * VistA AR (^PRCA(430)) for posting.
 *
 * This is orchestration metadata, NOT the authoritative billing ledger.
 * VistA AR remains the source of truth for posted payments.
 */

import { randomUUID } from "node:crypto";

/* ── Types ──────────────────────────────────────────────────── */

export type RemittanceDocType = "eob" | "soa" | "check_image" | "payment_advice" | "other";

export type RemittanceStatus =
  | "uploaded"        // file received
  | "tagged"          // payer identified + associated to claim(s)
  | "reviewed"        // billing staff reviewed amounts
  | "posted"          // payment posted to VistA AR (or marked for posting)
  | "disputed";       // underpayment or discrepancy flagged

export interface RemittanceLineItem {
  claimId?: string;
  claimReference?: string;    // payer's claim tracking number
  billedAmount: number;       // in cents
  allowedAmount: number;      // in cents
  paidAmount: number;         // in cents
  adjustmentAmount: number;   // in cents
  patientResponsibility: number; // in cents
  denialReasonCode?: string;
  denialReasonText?: string;
}

export interface RemittanceDocument {
  id: string;
  tenantId: string;
  status: RemittanceStatus;

  // Payer
  payerId: string;
  payerName?: string;

  // Document
  docType: RemittanceDocType;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  /** Opaque storage reference — blob stored securely, not inline */
  storageRef: string;

  // Parsed data (manual entry by billing staff)
  checkNumber?: string;
  checkDate?: string;
  totalPaid: number;            // in cents
  lineItems: RemittanceLineItem[];

  // Payment posting
  postedToVista: boolean;
  vistaArIen?: string;          // ^PRCA(430,IEN) if posted
  postingNotes?: string;

  // Underpayment flagging
  underpaymentFlagged: boolean;
  underpaymentAmount?: number;  // in cents (billed - allowed - adj)
  underpaymentNotes?: string;

  // Audit
  auditTrail: Array<{
    timestamp: string;
    action: string;
    actor: string;
    detail?: string;
  }>;

  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
}

/* ── DB repo interface (Phase 146: durable remit doc storage) ── */

interface RemitDocRepo {
  insert(data: any): Promise<any>;
  upsert(data: any): Promise<any>;
  findById(id: string): Promise<any>;
  update(id: string, updates: any): Promise<any>;
}

let dbRepo: RemitDocRepo | null = null;

export function initRemitIntakeRepo(repo: RemitDocRepo): void {
  dbRepo = repo;
}

/* ── Store (cache — PG is truth when wired) ─────────────── */

const remitDocStore = new Map<string, RemittanceDocument>();
const tenantRemitIndex = new Map<string, Set<string>>();

/* ── Create ─────────────────────────────────────────────────── */

export function createRemittanceDocument(params: {
  tenantId: string;
  payerId: string;
  payerName?: string;
  docType: RemittanceDocType;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageRef: string;
  uploadedBy: string;
}): RemittanceDocument {
  const now = new Date().toISOString();
  const id = randomUUID();

  const doc: RemittanceDocument = {
    id,
    tenantId: params.tenantId,
    status: "uploaded",
    payerId: params.payerId,
    payerName: params.payerName,
    docType: params.docType,
    filename: params.filename,
    mimeType: params.mimeType,
    sizeBytes: params.sizeBytes,
    storageRef: params.storageRef,
    totalPaid: 0,
    lineItems: [],
    postedToVista: false,
    underpaymentFlagged: false,
    auditTrail: [{
      timestamp: now,
      action: "remit.uploaded",
      actor: params.uploadedBy,
      detail: `File uploaded: ${params.filename}`,
    }],
    uploadedBy: params.uploadedBy,
    uploadedAt: now,
    updatedAt: now,
  };

  remitDocStore.set(id, doc);
  if (!tenantRemitIndex.has(params.tenantId)) {
    tenantRemitIndex.set(params.tenantId, new Set());
  }
  tenantRemitIndex.get(params.tenantId)!.add(id);

  // Phase 146: Write-through to PG
  dbRepo?.upsert({ id, tenantId: params.tenantId, source: params.uploadedBy, fileName: params.filename, contentType: params.mimeType, status: 'received', createdAt: now }).catch(() => {});

  return doc;
}

/* ── Read ───────────────────────────────────────────────────── */

export function getRemittanceDocument(id: string): RemittanceDocument | undefined {
  return remitDocStore.get(id);
}

export function listRemittanceDocuments(
  tenantId: string,
  filters?: {
    status?: RemittanceStatus;
    payerId?: string;
    limit?: number;
    offset?: number;
  },
): { documents: RemittanceDocument[]; total: number } {
  const ids = tenantRemitIndex.get(tenantId);
  if (!ids) return { documents: [], total: 0 };

  let result = Array.from(ids)
    .map(id => remitDocStore.get(id)!)
    .filter(Boolean)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  if (filters?.status) result = result.filter(d => d.status === filters.status);
  if (filters?.payerId) result = result.filter(d => d.payerId === filters.payerId);

  const total = result.length;
  const offset = filters?.offset ?? 0;
  const limit = filters?.limit ?? 50;

  return { documents: result.slice(offset, offset + limit), total };
}

/* ── Tag + Associate ────────────────────────────────────────── */

export function tagRemittanceDocument(
  id: string,
  params: {
    checkNumber?: string;
    checkDate?: string;
    lineItems: RemittanceLineItem[];
    actor: string;
  },
): RemittanceDocument {
  const doc = remitDocStore.get(id);
  if (!doc) throw new Error(`Remittance document not found: ${id}`);

  const totalPaid = params.lineItems.reduce((sum, li) => sum + li.paidAmount, 0);
  const now = new Date().toISOString();

  const updated: RemittanceDocument = {
    ...doc,
    status: "tagged",
    checkNumber: params.checkNumber ?? doc.checkNumber,
    checkDate: params.checkDate ?? doc.checkDate,
    lineItems: params.lineItems,
    totalPaid,
    updatedAt: now,
    auditTrail: [
      ...doc.auditTrail,
      {
        timestamp: now,
        action: "remit.tagged",
        actor: params.actor,
        detail: `Tagged with ${params.lineItems.length} line items, total paid: ${totalPaid}`,
      },
    ],
  };

  remitDocStore.set(id, updated);

  // Phase 146: Write-through tag
  dbRepo?.upsert({ id, tenantId: updated.tenantId ?? 'default', status: updated.status, updatedAt: updated.updatedAt }).catch(() => {});

  return updated;
}

/* ── Review + Underpayment Check ────────────────────────────── */

export function reviewRemittanceDocument(
  id: string,
  actor: string,
): RemittanceDocument {
  const doc = remitDocStore.get(id);
  if (!doc) throw new Error(`Remittance document not found: ${id}`);

  // Check for underpayment
  let totalUnderpayment = 0;
  for (const li of doc.lineItems) {
    const expected = li.billedAmount - li.adjustmentAmount;
    if (li.paidAmount < expected) {
      totalUnderpayment += expected - li.paidAmount;
    }
  }

  const now = new Date().toISOString();
  const updated: RemittanceDocument = {
    ...doc,
    status: totalUnderpayment > 0 ? "disputed" : "reviewed",
    underpaymentFlagged: totalUnderpayment > 0,
    underpaymentAmount: totalUnderpayment > 0 ? totalUnderpayment : undefined,
    updatedAt: now,
    auditTrail: [
      ...doc.auditTrail,
      {
        timestamp: now,
        action: totalUnderpayment > 0 ? "remit.underpayment_flagged" : "remit.reviewed",
        actor,
        detail: totalUnderpayment > 0
          ? `Underpayment detected: ${totalUnderpayment} cents`
          : "Review completed -- amounts match",
      },
    ],
  };

  remitDocStore.set(id, updated);

  // Phase 146: Write-through review
  dbRepo?.upsert({ id, tenantId: updated.tenantId ?? 'default', status: updated.status, updatedAt: updated.updatedAt }).catch(() => {});

  return updated;
}

/* ── Post to VistA (scaffold) ───────────────────────────────── */

export function markAsPosted(
  id: string,
  vistaArIen: string | undefined,
  postingNotes: string,
  actor: string,
): RemittanceDocument {
  const doc = remitDocStore.get(id);
  if (!doc) throw new Error(`Remittance document not found: ${id}`);

  const now = new Date().toISOString();
  const updated: RemittanceDocument = {
    ...doc,
    status: "posted",
    postedToVista: !!vistaArIen,
    vistaArIen,
    postingNotes,
    updatedAt: now,
    auditTrail: [
      ...doc.auditTrail,
      {
        timestamp: now,
        action: "remit.posted",
        actor,
        detail: vistaArIen
          ? `Posted to VistA AR IEN: ${vistaArIen}`
          : `Marked as posted (VistA AR integration pending): ${postingNotes}`,
      },
    ],
  };

  remitDocStore.set(id, updated);

  // Phase 146: Write-through post
  dbRepo?.upsert({ id, tenantId: updated.tenantId ?? 'default', status: updated.status, updatedAt: updated.updatedAt }).catch(() => {});

  return updated;
}

/* ── Stats ──────────────────────────────────────────────────── */

export function getRemittanceStats(tenantId: string): {
  total: number;
  byStatus: Record<string, number>;
  totalPaid: number;
  underpaymentCount: number;
  underpaymentTotal: number;
} {
  const ids = tenantRemitIndex.get(tenantId);
  if (!ids) return { total: 0, byStatus: {}, totalPaid: 0, underpaymentCount: 0, underpaymentTotal: 0 };

  const stats = { total: 0, byStatus: {} as Record<string, number>, totalPaid: 0, underpaymentCount: 0, underpaymentTotal: 0 };

  for (const id of ids) {
    const doc = remitDocStore.get(id);
    if (!doc) continue;
    stats.total++;
    stats.byStatus[doc.status] = (stats.byStatus[doc.status] ?? 0) + 1;
    stats.totalPaid += doc.totalPaid;
    if (doc.underpaymentFlagged) {
      stats.underpaymentCount++;
      stats.underpaymentTotal += doc.underpaymentAmount ?? 0;
    }
  }

  return stats;
}
