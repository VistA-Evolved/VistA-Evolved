/**
 * LOA Engine -- Phase 110
 *
 * Domain logic for LOA lifecycle:
 *   draft -> pending_review -> submitted -> approved | denied -> appealed -> expired -> closed
 *
 * Validates FSM transitions, generates print-ready LOA packets,
 * and integrates with the LOA adapter for payer communication.
 */

import {
  getLoaRequestById,
  transitionLoaStatus,
  markPacketGenerated,
  listAttachments,
  type LoaRequestRow,
  type LoaAttachmentRow,
} from "./loa-repo.js";
import { getLoaAdapter, type LoaAdapterResult } from "./loa-adapter.js";

/* ------------------------------------------------------------------ */
/* FSM Definition                                                      */
/* ------------------------------------------------------------------ */

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["pending_review", "closed"],
  pending_review: ["submitted", "draft", "closed"],
  submitted: ["approved", "denied", "closed"],
  approved: ["expired", "closed"],
  denied: ["appealed", "closed"],
  appealed: ["submitted", "approved", "denied", "closed"],
  expired: ["closed"],
  closed: [],
};

export function isValidTransition(currentStatus: string, newStatus: string): boolean {
  return (VALID_TRANSITIONS[currentStatus] || []).includes(newStatus);
}

export function getValidNextStatuses(currentStatus: string): string[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

/* ------------------------------------------------------------------ */
/* Status Transition                                                   */
/* ------------------------------------------------------------------ */

export interface TransitionInput {
  tenantId: string;
  loaId: string;
  newStatus: string;
  authorizationNumber?: string;
  approvedUnits?: number;
  approvedFrom?: string;
  approvedThrough?: string;
  denialReason?: string;
}

export interface TransitionResult {
  ok: boolean;
  loa?: LoaRequestRow;
  error?: string;
}

export async function transitionLoa(input: TransitionInput): Promise<TransitionResult> {
  const loa = await getLoaRequestById(input.tenantId, input.loaId);
  if (!loa) return { ok: false, error: "LOA request not found" };

  if (!isValidTransition(loa.status, input.newStatus)) {
    return {
      ok: false,
      error: `Invalid transition: ${loa.status} -> ${input.newStatus}. Valid: ${getValidNextStatuses(loa.status).join(", ")}`,
    };
  }

  const updated = await transitionLoaStatus(input.tenantId, input.loaId, input.newStatus, {
    authorizationNumber: input.authorizationNumber,
    approvedUnits: input.approvedUnits,
    approvedFrom: input.approvedFrom,
    approvedThrough: input.approvedThrough,
    denialReason: input.denialReason,
  });

  return { ok: true, loa: updated || undefined };
}

/* ------------------------------------------------------------------ */
/* Packet Generation                                                   */
/* ------------------------------------------------------------------ */

export interface LoaPacket {
  loaId: string;
  generatedAt: string;
  patient: { dfn: string; name: string | null };
  payer: { id: string; name: string | null };
  encounter?: { ien: string };
  order?: { ien: string };
  loaType: string;
  urgency: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
  clinicalSummary: string | null;
  requestedServiceDesc: string | null;
  requestedBy: string;
  requestedAt: string;
  attachments: Array<{
    type: string;
    fileName: string;
    mimeType: string;
    description: string | null;
  }>;
}

export async function generatePacket(tenantId: string, loaId: string): Promise<{ ok: boolean; packet?: LoaPacket; error?: string }> {
  const loa = await getLoaRequestById(tenantId, loaId);
  if (!loa) return { ok: false, error: "LOA request not found" };

  // Only draft and pending_review can generate packets
  if (!["draft", "pending_review"].includes(loa.status)) {
    return { ok: false, error: `Cannot generate packet in status '${loa.status}'. Must be draft or pending_review.` };
  }

  const attachments = await listAttachments(loaId);

  const packet: LoaPacket = {
    loaId: loa.id,
    generatedAt: new Date().toISOString(),
    patient: { dfn: loa.patientDfn, name: loa.patientName },
    payer: { id: loa.payerId, name: loa.payerName },
    encounter: loa.encounterIen ? { ien: loa.encounterIen } : undefined,
    order: loa.orderIen ? { ien: loa.orderIen } : undefined,
    loaType: loa.loaType,
    urgency: loa.urgency,
    diagnosisCodes: loa.diagnosisCodes,
    procedureCodes: loa.procedureCodes,
    clinicalSummary: loa.clinicalSummary,
    requestedServiceDesc: loa.requestedServiceDesc,
    requestedBy: loa.requestedBy,
    requestedAt: loa.requestedAt,
    attachments: attachments.map((a: LoaAttachmentRow) => ({
      type: a.attachmentType,
      fileName: a.fileName,
      mimeType: a.mimeType,
      description: a.description,
    })),
  };

  await markPacketGenerated(tenantId, loaId);

  return { ok: true, packet };
}

/* ------------------------------------------------------------------ */
/* Adapter-delegated Operations                                        */
/* ------------------------------------------------------------------ */

/**
 * Submit LOA to payer via the configured adapter.
 * Transitions status from pending_review -> submitted on success.
 */
export async function submitLoa(tenantId: string, loaId: string): Promise<TransitionResult> {
  const loa = await getLoaRequestById(tenantId, loaId);
  if (!loa) return { ok: false, error: "LOA request not found" };

  if (loa.status !== "pending_review") {
    return { ok: false, error: `Cannot submit LOA in status '${loa.status}'. Must be pending_review.` };
  }

  const adapter = getLoaAdapter();
  const result: LoaAdapterResult = await adapter.submitLOA(loa);

  if (!result.ok) {
    return { ok: false, error: result.error || "Adapter submission failed" };
  }

  const updated = await transitionLoaStatus(tenantId, loaId, "submitted", {
    authorizationNumber: result.trackingNumber,
  });

  return { ok: true, loa: updated || undefined };
}

/**
 * Check LOA status with payer via the configured adapter.
 */
export async function checkLoaStatus(tenantId: string, loaId: string): Promise<{ ok: boolean; adapterStatus?: string; error?: string }> {
  const loa = await getLoaRequestById(tenantId, loaId);
  if (!loa) return { ok: false, error: "LOA request not found" };

  if (!["submitted", "appealed"].includes(loa.status)) {
    return { ok: false, error: `Cannot check status for LOA in status '${loa.status}'.` };
  }

  const adapter = getLoaAdapter();
  const result = await adapter.checkLOAStatus(loa);

  return { ok: result.ok, adapterStatus: result.status, error: result.error };
}

/**
 * Get payer-specific LOA requirements via the configured adapter.
 */
export async function getPayerRequirements(payerId: string): Promise<{ ok: boolean; requirements?: string[]; error?: string }> {
  const adapter = getLoaAdapter();
  const result = await adapter.getRequirements(payerId);
  return { ok: result.ok, requirements: result.requirements, error: result.error };
}
