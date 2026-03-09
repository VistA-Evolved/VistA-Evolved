/**
 * Data Rights Operations Service (Phase 375 / W20-P6)
 *
 * Provides:
 * - Retention policy engine (configurable per data class)
 * - Deletion workflow (request -> approve -> execute -> verify)
 * - Legal hold management (freeze deletion for litigation)
 * - Data rights audit trail (hash-chained)
 *
 * All stores in-memory with PG migration targets.
 */

import crypto from "node:crypto";

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */

export type DataClass = "phi" | "pii" | "clinical" | "operational" | "analytics" | "audit" | "imaging" | "financial";
export type RetentionAction = "archive" | "delete" | "anonymize";
export type DeletionStatus = "requested" | "approved" | "executing" | "executed" | "verified" | "rejected" | "blocked_by_hold";
export type LegalHoldStatus = "active" | "released" | "expired";

export interface RetentionPolicy {
  id: string;
  tenantId: string;
  dataClass: DataClass;
  retentionDays: number;
  action: RetentionAction;
  description: string;
  regulatoryBasis: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeletionRequest {
  id: string;
  tenantId: string;
  requestedBy: string;
  dataClass: DataClass;
  subjectId: string;
  reason: string;
  status: DeletionStatus;
  approvedBy: string | null;
  executedAt: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  blockingHoldId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LegalHold {
  id: string;
  tenantId: string;
  caseReference: string;
  dataClasses: DataClass[];
  subjectIds: string[];
  status: LegalHoldStatus;
  reason: string;
  createdBy: string;
  releasedBy: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DataRightsAuditEntry {
  id: string;
  tenantId: string;
  action: string;
  entityType: "retention_policy" | "deletion_request" | "legal_hold";
  entityId: string;
  actor: string;
  detail: string;
  prevHash: string;
  hash: string;
  timestamp: string;
}

/* ================================================================== */
/* Stores                                                              */
/* ================================================================== */

const retentionStore = new Map<string, RetentionPolicy>();
const deletionStore = new Map<string, DeletionRequest>();
const holdStore = new Map<string, LegalHold>();
const auditStore: DataRightsAuditEntry[] = [];

const MAX_STORE_SIZE = 10_000;
const MAX_AUDIT_SIZE = 50_000;

function uid(): string {
  return crypto.randomBytes(12).toString("hex");
}

function now(): string {
  return new Date().toISOString();
}

function boundedSet<T>(store: Map<string, T>, key: string, value: T): void {
  if (store.size >= MAX_STORE_SIZE) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, value);
}

function hashEntry(data: string, prevHash: string): string {
  return crypto.createHash("sha256").update(prevHash + data).digest("hex").slice(0, 32);
}

function appendAudit(
  tenantId: string,
  action: string,
  entityType: DataRightsAuditEntry["entityType"],
  entityId: string,
  actor: string,
  detail: string
): void {
  const lastTenantEntry = [...auditStore].reverse().find((entry) => entry.tenantId === tenantId);
  const prevHash = lastTenantEntry ? lastTenantEntry.hash : "0".repeat(32);
  const entry: DataRightsAuditEntry = {
    id: uid(),
    tenantId,
    action,
    entityType,
    entityId,
    actor,
    detail,
    prevHash,
    hash: hashEntry(`${action}|${entityType}|${entityId}|${actor}|${detail}`, prevHash),
    timestamp: now(),
  };
  if (auditStore.length >= MAX_AUDIT_SIZE) auditStore.shift();
  auditStore.push(entry);
}

/* ================================================================== */
/* Retention Policies                                                  */
/* ================================================================== */

export function createRetentionPolicy(
  tenantId: string,
  input: {
    dataClass: DataClass;
    retentionDays: number;
    action: RetentionAction;
    description: string;
    regulatoryBasis: string;
    actor: string;
  }
): RetentionPolicy {
  const ts = now();
  const policy: RetentionPolicy = {
    id: uid(),
    tenantId,
    dataClass: input.dataClass,
    retentionDays: input.retentionDays,
    action: input.action,
    description: input.description,
    regulatoryBasis: input.regulatoryBasis,
    createdAt: ts,
    updatedAt: ts,
  };
  boundedSet(retentionStore, policy.id, policy);
  appendAudit(tenantId, "create_policy", "retention_policy", policy.id, input.actor, `Created ${input.dataClass} policy: ${input.retentionDays}d ${input.action}`);
  return policy;
}

export function listRetentionPolicies(tenantId: string): RetentionPolicy[] {
  return [...retentionStore.values()].filter((p) => p.tenantId === tenantId);
}

export function getRetentionPolicy(id: string, tenantId?: string): RetentionPolicy | undefined {
  const policy = retentionStore.get(id);
  if (!policy) return undefined;
  if (tenantId && policy.tenantId !== tenantId) return undefined;
  return policy;
}

export function updateRetentionPolicy(
  tenantId: string,
  id: string,
  updates: Partial<Pick<RetentionPolicy, "retentionDays" | "action" | "description">>,
  actor: string
): RetentionPolicy | null {
  const policy = retentionStore.get(id);
  if (!policy || policy.tenantId !== tenantId) return null;
  const updated: RetentionPolicy = {
    ...policy,
    ...updates,
    updatedAt: now(),
  };
  retentionStore.set(id, updated);
  appendAudit(policy.tenantId, "update_policy", "retention_policy", id, actor, `Updated: ${JSON.stringify(updates)}`);
  return updated;
}

export function deleteRetentionPolicy(tenantId: string, id: string, actor: string): boolean {
  const policy = retentionStore.get(id);
  if (!policy || policy.tenantId !== tenantId) return false;
  retentionStore.delete(id);
  appendAudit(policy.tenantId, "delete_policy", "retention_policy", id, actor, "Policy deleted");
  return true;
}

/* ================================================================== */
/* Deletion Requests                                                   */
/* ================================================================== */

export function createDeletionRequest(
  tenantId: string,
  input: {
    requestedBy: string;
    dataClass: DataClass;
    subjectId: string;
    reason: string;
  }
): DeletionRequest {
  // Check for blocking legal holds
  const blockingHold = [...holdStore.values()].find(
    (h) => h.tenantId === tenantId && h.status === "active" &&
      h.dataClasses.includes(input.dataClass) &&
      (h.subjectIds.length === 0 || h.subjectIds.includes(input.subjectId))
  );

  const ts = now();
  const req: DeletionRequest = {
    id: uid(),
    tenantId,
    requestedBy: input.requestedBy,
    dataClass: input.dataClass,
    subjectId: input.subjectId,
    reason: input.reason,
    status: blockingHold ? "blocked_by_hold" : "requested",
    approvedBy: null,
    executedAt: null,
    verifiedAt: null,
    rejectionReason: null,
    blockingHoldId: blockingHold ? blockingHold.id : null,
    createdAt: ts,
    updatedAt: ts,
  };
  boundedSet(deletionStore, req.id, req);
  appendAudit(tenantId, "create_deletion_request", "deletion_request", req.id, input.requestedBy,
    blockingHold ? `Blocked by legal hold ${blockingHold.id}` : `Deletion requested for ${input.dataClass}`);
  return req;
}

export function approveDeletionRequest(tenantId: string, id: string, approvedBy: string): DeletionRequest | null {
  const req = deletionStore.get(id);
  if (!req || req.tenantId !== tenantId || req.status !== "requested") return null;
  const updated: DeletionRequest = { ...req, status: "approved", approvedBy, updatedAt: now() };
  deletionStore.set(id, updated);
  appendAudit(req.tenantId, "approve_deletion", "deletion_request", id, approvedBy, "Deletion approved");
  return updated;
}

export function rejectDeletionRequest(
  tenantId: string,
  id: string,
  rejectedBy: string,
  reason: string
): DeletionRequest | null {
  const req = deletionStore.get(id);
  if (!req || req.tenantId !== tenantId || req.status !== "requested") return null;
  const updated: DeletionRequest = { ...req, status: "rejected", rejectionReason: reason, updatedAt: now() };
  deletionStore.set(id, updated);
  appendAudit(req.tenantId, "reject_deletion", "deletion_request", id, rejectedBy, `Rejected: ${reason}`);
  return updated;
}

export function executeDeletionRequest(tenantId: string, id: string, executor: string): DeletionRequest | null {
  const req = deletionStore.get(id);
  if (!req || req.tenantId !== tenantId || req.status !== "approved") return null;
  const ts = now();
  const updated: DeletionRequest = { ...req, status: "executed", executedAt: ts, updatedAt: ts };
  deletionStore.set(id, updated);
  appendAudit(req.tenantId, "execute_deletion", "deletion_request", id, executor, "Deletion executed");
  return updated;
}

export function verifyDeletionRequest(tenantId: string, id: string, verifier: string): DeletionRequest | null {
  const req = deletionStore.get(id);
  if (!req || req.tenantId !== tenantId || req.status !== "executed") return null;
  const ts = now();
  const updated: DeletionRequest = { ...req, status: "verified", verifiedAt: ts, updatedAt: ts };
  deletionStore.set(id, updated);
  appendAudit(req.tenantId, "verify_deletion", "deletion_request", id, verifier, "Deletion verified");
  return updated;
}

export function getDeletionRequest(id: string, tenantId?: string): DeletionRequest | undefined {
  const req = deletionStore.get(id);
  if (!req) return undefined;
  if (tenantId && req.tenantId !== tenantId) return undefined;
  return req;
}

export function listDeletionRequests(tenantId: string, status?: DeletionStatus): DeletionRequest[] {
  const all = [...deletionStore.values()].filter((r) => r.tenantId === tenantId);
  if (status) return all.filter((r) => r.status === status);
  return all;
}

/* ================================================================== */
/* Legal Holds                                                         */
/* ================================================================== */

export function createLegalHold(
  tenantId: string,
  input: {
    caseReference: string;
    dataClasses: DataClass[];
    subjectIds?: string[];
    reason: string;
    createdBy: string;
    expiresAt?: string;
  }
): LegalHold {
  const ts = now();
  const hold: LegalHold = {
    id: uid(),
    tenantId,
    caseReference: input.caseReference,
    dataClasses: input.dataClasses,
    subjectIds: input.subjectIds || [],
    status: "active",
    reason: input.reason,
    createdBy: input.createdBy,
    releasedBy: null,
    expiresAt: input.expiresAt || null,
    createdAt: ts,
    updatedAt: ts,
  };
  boundedSet(holdStore, hold.id, hold);
  appendAudit(tenantId, "create_hold", "legal_hold", hold.id, input.createdBy,
    `Legal hold for case ${input.caseReference}: ${input.dataClasses.join(", ")}`);
  return hold;
}

export function releaseLegalHold(tenantId: string, id: string, releasedBy: string): LegalHold | null {
  const hold = holdStore.get(id);
  if (!hold || hold.tenantId !== tenantId || hold.status !== "active") return null;
  const updated: LegalHold = { ...hold, status: "released", releasedBy, updatedAt: now() };
  holdStore.set(id, updated);
  appendAudit(hold.tenantId, "release_hold", "legal_hold", id, releasedBy, `Hold released for case ${hold.caseReference}`);
  return updated;
}

export function getLegalHold(id: string, tenantId?: string): LegalHold | undefined {
  const hold = holdStore.get(id);
  if (!hold) return undefined;
  if (tenantId && hold.tenantId !== tenantId) return undefined;
  return hold;
}

export function listLegalHolds(tenantId: string, status?: LegalHoldStatus): LegalHold[] {
  const all = [...holdStore.values()].filter((h) => h.tenantId === tenantId);
  if (status) return all.filter((h) => h.status === status);
  return all;
}

/* ================================================================== */
/* Data Rights Audit Trail                                             */
/* ================================================================== */

export function getDataRightsAudit(tenantId: string, limit: number = 100): DataRightsAuditEntry[] {
  return auditStore.filter((e) => e.tenantId === tenantId).slice(-limit);
}

export function verifyDataRightsAuditChain(
  tenantId?: string
): { valid: boolean; entries: number; brokenAt: number | null } {
  const scopedAudit = tenantId ? auditStore.filter((entry) => entry.tenantId === tenantId) : auditStore;
  if (scopedAudit.length === 0) return { valid: true, entries: 0, brokenAt: null };
  for (let i = 1; i < scopedAudit.length; i++) {
    if (scopedAudit[i].prevHash !== scopedAudit[i - 1].hash) {
      return { valid: false, entries: scopedAudit.length, brokenAt: i };
    }
  }
  return { valid: true, entries: scopedAudit.length, brokenAt: null };
}

/* ================================================================== */
/* Data Rights Summary                                                 */
/* ================================================================== */

export function getDataRightsSummary(tenantId: string): {
  retentionPolicies: number;
  deletionRequests: { total: number; pending: number; executed: number; blocked: number };
  legalHolds: { total: number; active: number };
  auditEntries: number;
} {
  const policies = listRetentionPolicies(tenantId);
  const deletions = listDeletionRequests(tenantId);
  const holds = listLegalHolds(tenantId);
  const audit = getDataRightsAudit(tenantId, 999999);

  return {
    retentionPolicies: policies.length,
    deletionRequests: {
      total: deletions.length,
      pending: deletions.filter((d) => d.status === "requested" || d.status === "approved").length,
      executed: deletions.filter((d) => d.status === "executed" || d.status === "verified").length,
      blocked: deletions.filter((d) => d.status === "blocked_by_hold").length,
    },
    legalHolds: {
      total: holds.length,
      active: holds.filter((h) => h.status === "active").length,
    },
    auditEntries: audit.length,
  };
}
