/**
 * LOA Store — Phase 94: PH HMO Workflow Automation
 *
 * In-memory store for LOA (Letter of Authorization) requests.
 * Follows the same pattern as claim-store.ts (Phase 38) and
 * imaging-worklist.ts (Phase 23).
 *
 * Migration plan:
 * 1. Current: In-memory Map<> store (resets on API restart)
 * 2. Next: Persist to VistA scheduling/pre-auth files via custom M routine
 * 3. Future: PostgreSQL overlay for lifecycle beyond VistA's native tracking
 * 4. Production: VistA-native + overlay with EDI 278 support
 *
 * This is orchestration metadata, NOT clinical truth.
 * VistA encounters/orders remain the authoritative source.
 */

import { randomUUID } from "node:crypto";
import type {
  LoaRequest,
  LoaStatus,
  LoaSubmissionMode,
  LoaChecklistItem,
  LoaAttachment,
  LoaAuditEntry,
} from "./loa-types.js";

/* ── Store ──────────────────────────────────────────────────── */

const loaStore = new Map<string, LoaRequest>();
const tenantLoaIndex = new Map<string, Set<string>>();

/* ── Create ─────────────────────────────────────────────────── */

export function createLoaRequest(params: {
  tenantId: string;
  patientDfn: string;
  patientName?: string;
  encounterDate: string;
  encounterIen?: string;
  diagnosisCodes?: LoaRequest["diagnosisCodes"];
  procedureCodes?: LoaRequest["procedureCodes"];
  providerName?: string;
  providerDuz?: string;
  facilityName?: string;
  payerId: string;
  payerName?: string;
  memberId?: string;
  submissionMode: LoaSubmissionMode;
  portalUrl?: string;
  createdBy: string;
}): LoaRequest {
  const now = new Date().toISOString();
  const id = randomUUID();

  const defaultChecklist: LoaChecklistItem[] = [
    { id: "chk-1", label: "Verify patient HMO membership and card number", completed: false },
    { id: "chk-2", label: "Confirm diagnosis codes from VistA encounter", completed: false },
    { id: "chk-3", label: "Confirm procedure codes from VistA order", completed: false },
    { id: "chk-4", label: "Attach clinical justification (if required)", completed: false },
    { id: "chk-5", label: "Submit LOA request to payer", completed: false },
    { id: "chk-6", label: "Record LOA reference number", completed: false },
  ];

  if (params.submissionMode === "portal" && params.portalUrl) {
    defaultChecklist.splice(4, 0, {
      id: "chk-portal",
      label: `Open provider portal: ${params.portalUrl}`,
      completed: false,
    });
  }

  const loa: LoaRequest = {
    id,
    tenantId: params.tenantId,
    status: "draft",
    submissionMode: params.submissionMode,
    patientDfn: params.patientDfn,
    patientName: params.patientName,
    encounterDate: params.encounterDate,
    encounterIen: params.encounterIen,
    diagnosisCodes: params.diagnosisCodes ?? [],
    procedureCodes: params.procedureCodes ?? [],
    providerName: params.providerName,
    providerDuz: params.providerDuz,
    facilityName: params.facilityName,
    payerId: params.payerId,
    payerName: params.payerName,
    memberId: params.memberId,
    attachments: [],
    checklist: defaultChecklist,
    portalUrl: params.portalUrl,
    auditTrail: [{
      timestamp: now,
      action: "loa.created",
      actor: params.createdBy,
      toStatus: "draft",
      detail: "LOA request created",
    }],
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  loaStore.set(id, loa);
  if (!tenantLoaIndex.has(params.tenantId)) {
    tenantLoaIndex.set(params.tenantId, new Set());
  }
  tenantLoaIndex.get(params.tenantId)!.add(id);

  return loa;
}

/* ── Read ───────────────────────────────────────────────────── */

export function getLoaRequest(id: string): LoaRequest | undefined {
  return loaStore.get(id);
}

export function listLoaRequests(
  tenantId: string,
  filters?: {
    status?: LoaStatus;
    payerId?: string;
    patientDfn?: string;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  },
): { loas: LoaRequest[]; total: number } {
  const ids = tenantLoaIndex.get(tenantId);
  if (!ids) return { loas: [], total: 0 };

  let result = Array.from(ids)
    .map(id => loaStore.get(id)!)
    .filter(Boolean)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if (filters?.status) result = result.filter(l => l.status === filters.status);
  if (filters?.payerId) result = result.filter(l => l.payerId === filters.payerId);
  if (filters?.patientDfn) result = result.filter(l => l.patientDfn === filters.patientDfn);
  if (filters?.assignedTo) result = result.filter(l => l.assignedTo === filters.assignedTo);

  const total = result.length;
  const offset = filters?.offset ?? 0;
  const limit = filters?.limit ?? 50;

  return { loas: result.slice(offset, offset + limit), total };
}

export function getLoaStats(tenantId: string): Record<string, number> {
  const ids = tenantLoaIndex.get(tenantId);
  if (!ids) return {};
  const stats: Record<string, number> = {};
  for (const id of ids) {
    const l = loaStore.get(id);
    if (l) stats[l.status] = (stats[l.status] ?? 0) + 1;
  }
  return stats;
}

/* ── Update ─────────────────────────────────────────────────── */

export function transitionLoa(
  id: string,
  toStatus: LoaStatus,
  actor: string,
  detail?: string,
  extra?: {
    loaReferenceNumber?: string;
    approvedDate?: string;
    expirationDate?: string;
    denialReason?: string;
  },
): LoaRequest {
  const loa = loaStore.get(id);
  if (!loa) throw new Error(`LOA not found: ${id}`);

  // Import transition check inline to avoid circular
  const transitions: Record<LoaStatus, LoaStatus[]> = {
    draft:     ["submitted", "cancelled"],
    submitted: ["pending", "approved", "denied", "cancelled"],
    pending:   ["approved", "denied", "expired", "cancelled"],
    approved:  ["expired"],
    denied:    ["draft"],
    expired:   ["draft"],
    cancelled: [],
  };

  if (!transitions[loa.status]?.includes(toStatus)) {
    throw new Error(`Invalid LOA transition: ${loa.status} -> ${toStatus}`);
  }

  const now = new Date().toISOString();
  const updated: LoaRequest = {
    ...loa,
    status: toStatus,
    updatedAt: now,
    loaReferenceNumber: extra?.loaReferenceNumber ?? loa.loaReferenceNumber,
    approvedDate: extra?.approvedDate ?? loa.approvedDate,
    expirationDate: extra?.expirationDate ?? loa.expirationDate,
    denialReason: extra?.denialReason ?? loa.denialReason,
    auditTrail: [
      ...loa.auditTrail,
      {
        timestamp: now,
        action: `loa.${toStatus}`,
        actor,
        fromStatus: loa.status,
        toStatus,
        detail,
      },
    ],
  };

  loaStore.set(id, updated);
  return updated;
}

export function updateLoaChecklist(
  id: string,
  checklistItemId: string,
  completed: boolean,
  actor: string,
): LoaRequest {
  const loa = loaStore.get(id);
  if (!loa) throw new Error(`LOA not found: ${id}`);

  const now = new Date().toISOString();
  const updated: LoaRequest = {
    ...loa,
    updatedAt: now,
    checklist: loa.checklist.map(item =>
      item.id === checklistItemId
        ? { ...item, completed, completedAt: completed ? now : undefined, completedBy: completed ? actor : undefined }
        : item,
    ),
    auditTrail: [
      ...loa.auditTrail,
      {
        timestamp: now,
        action: "loa.checklist_updated",
        actor,
        detail: `Checklist item ${checklistItemId} ${completed ? "completed" : "unchecked"}`,
      },
    ],
  };

  loaStore.set(id, updated);
  return updated;
}

export function addLoaAttachment(
  id: string,
  attachment: LoaAttachment,
  actor: string,
): LoaRequest {
  const loa = loaStore.get(id);
  if (!loa) throw new Error(`LOA not found: ${id}`);

  const now = new Date().toISOString();
  const updated: LoaRequest = {
    ...loa,
    updatedAt: now,
    attachments: [...loa.attachments, attachment],
    auditTrail: [
      ...loa.auditTrail,
      {
        timestamp: now,
        action: "loa.attachment_added",
        actor,
        detail: `Attachment added: ${attachment.filename} (${attachment.category})`,
      },
    ],
  };

  loaStore.set(id, updated);
  return updated;
}

export function assignLoa(id: string, assignedTo: string, actor: string): LoaRequest {
  const loa = loaStore.get(id);
  if (!loa) throw new Error(`LOA not found: ${id}`);

  const now = new Date().toISOString();
  const updated: LoaRequest = {
    ...loa,
    assignedTo,
    updatedAt: now,
    auditTrail: [
      ...loa.auditTrail,
      {
        timestamp: now,
        action: "loa.assigned",
        actor,
        detail: `Assigned to ${assignedTo}`,
      },
    ],
  };

  loaStore.set(id, updated);
  return updated;
}
