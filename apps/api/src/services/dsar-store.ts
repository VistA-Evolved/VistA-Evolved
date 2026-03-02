/**
 * DSAR (Data Subject Access Request) Store — Phase 496 (W34-P6)
 *
 * In-memory store for DSAR requests following the pattern from
 * Phase 23 (imaging worklist). Supports lifecycle transitions:
 *   pending → processing → fulfilled → exported
 *   pending → denied
 *
 * No PHI stored — only opaque patient references and request metadata.
 */

import { randomBytes } from "node:crypto";

// ── Types ──────────────────────────────────────────────────────

export type DsarType = "access" | "erasure" | "portability" | "rectification" | "restriction";
export type DsarStatus = "pending" | "processing" | "fulfilled" | "exported" | "denied";

export interface DsarRequest {
  id: string;
  tenantId: string;
  requestType: DsarType;
  /** Opaque patient reference — never logged in audit */
  subjectRef: string;
  requestedBy: string;
  requestedAt: string;        // ISO 8601
  status: DsarStatus;
  statusHistory: Array<{ status: DsarStatus; at: string; by: string }>;
  countryPackId: string;
  framework: string;
  rightToErasure: boolean;
  dataPortability: boolean;
  dueDate: string;            // ISO 8601 — regulatory deadline
  fulfilledAt: string | null;
  fulfilledBy: string | null;
  denialReason: string | null;
  exportRef: string | null;   // Reference to export bundle if portability
  metadata: Record<string, unknown>;
}

// ── Store ──────────────────────────────────────────────────────

const MAX_REQUESTS = 50_000;
const store = new Map<string, DsarRequest>();

function enforceMax(): void {
  if (store.size >= MAX_REQUESTS) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
}

// ── CRUD ───────────────────────────────────────────────────────

export function createDsarRequest(
  input: Omit<DsarRequest, "id" | "status" | "statusHistory" | "fulfilledAt" | "fulfilledBy" | "denialReason" | "exportRef">,
): DsarRequest {
  enforceMax();
  const now = new Date().toISOString();
  const req: DsarRequest = {
    ...input,
    id: `dsar-${randomBytes(8).toString("hex")}`,
    status: "pending",
    statusHistory: [{ status: "pending", at: now, by: input.requestedBy }],
    fulfilledAt: null,
    fulfilledBy: null,
    denialReason: null,
    exportRef: null,
  };
  store.set(req.id, req);
  return req;
}

export function getDsarRequest(id: string): DsarRequest | undefined {
  return store.get(id);
}

export function listDsarRequests(tenantId: string, opts?: {
  status?: DsarStatus;
  requestType?: DsarType;
  limit?: number;
}): DsarRequest[] {
  let results = [...store.values()].filter((r) => r.tenantId === tenantId);
  if (opts?.status) results = results.filter((r) => r.status === opts.status);
  if (opts?.requestType) results = results.filter((r) => r.requestType === opts.requestType);
  results.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  return results.slice(0, opts?.limit || 200);
}

export function transitionDsar(
  id: string,
  newStatus: DsarStatus,
  by: string,
  extra?: { denialReason?: string; exportRef?: string },
): DsarRequest | undefined {
  const req = store.get(id);
  if (!req) return undefined;

  // Validate transitions
  const validTransitions: Record<DsarStatus, DsarStatus[]> = {
    pending: ["processing", "denied"],
    processing: ["fulfilled", "denied"],
    fulfilled: ["exported"],
    exported: [],
    denied: [],
  };

  if (!validTransitions[req.status]?.includes(newStatus)) {
    return undefined; // Invalid transition
  }

  const now = new Date().toISOString();
  req.status = newStatus;
  req.statusHistory.push({ status: newStatus, at: now, by });

  if (newStatus === "fulfilled") {
    req.fulfilledAt = now;
    req.fulfilledBy = by;
  }
  if (newStatus === "denied") {
    req.denialReason = extra?.denialReason || "Denied by administrator";
  }
  if (newStatus === "exported") {
    req.exportRef = extra?.exportRef || null;
  }

  store.set(id, req);
  return req;
}

export function getDsarStats(tenantId: string): {
  total: number;
  pending: number;
  processing: number;
  fulfilled: number;
  exported: number;
  denied: number;
} {
  const all = [...store.values()].filter((r) => r.tenantId === tenantId);
  return {
    total: all.length,
    pending: all.filter((r) => r.status === "pending").length,
    processing: all.filter((r) => r.status === "processing").length,
    fulfilled: all.filter((r) => r.status === "fulfilled").length,
    exported: all.filter((r) => r.status === "exported").length,
    denied: all.filter((r) => r.status === "denied").length,
  };
}
