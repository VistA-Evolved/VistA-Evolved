/**
 * PayerOps Store — Phase 87: Philippines RCM Foundation
 *
 * In-memory stores for:
 *   - FacilityPayerEnrollment
 *   - LOACase
 *   - CredentialVaultEntry
 *
 * Pattern: matches imaging-worklist.ts / handoff-store.ts (in-memory Map with
 * documented migration plan to VistA-native or DB persistence).
 *
 * Migration plan:
 *   1. In-memory Map (current — resets on API restart)
 *   2. SQLite file-backed (when multi-instance deploy needed)
 *   3. PostgreSQL (when SaaS multi-tenant needed)
 *   4. VistA file-backed (when VistA IB/AR files available in production)
 */

import { randomBytes } from "node:crypto";
import {
  LOA_TRANSITIONS,
  type FacilityPayerEnrollment,
  type EnrollmentStatus,
  type LOACase,
  type LOAStatus,
  type CredentialVaultEntry,
  type CredentialDocType,
} from "./types.js";

/* ── ID generation ──────────────────────────────────────────── */

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
}

/* ── Enrollment Store ───────────────────────────────────────── */

const enrollments = new Map<string, FacilityPayerEnrollment>();

export function createEnrollment(data: {
  facilityId: string;
  facilityName: string;
  payerId: string;
  payerName: string;
  integrationMode?: "manual" | "portal" | "api";
  portalUrl?: string;
  portalInstructions?: string;
  notes?: string;
  actor: string;
}): FacilityPayerEnrollment {
  const id = newId("enr");
  const now = new Date().toISOString();
  const enrollment: FacilityPayerEnrollment = {
    id,
    facilityId: data.facilityId,
    facilityName: data.facilityName,
    payerId: data.payerId,
    payerName: data.payerName,
    status: "not_enrolled",
    credentialVaultRefs: [],
    integrationMode: data.integrationMode || "manual",
    portalUrl: data.portalUrl,
    portalInstructions: data.portalInstructions,
    enrollmentNotes: data.notes,
    timeline: [{
      timestamp: now,
      action: "created",
      actor: data.actor,
      detail: "Enrollment record created",
    }],
    createdAt: now,
    updatedAt: now,
  };
  enrollments.set(id, enrollment);
  return enrollment;
}

export function getEnrollment(id: string): FacilityPayerEnrollment | undefined {
  return enrollments.get(id);
}

export function listEnrollments(filter?: {
  facilityId?: string;
  payerId?: string;
  status?: EnrollmentStatus;
}): FacilityPayerEnrollment[] {
  let results = Array.from(enrollments.values());
  if (filter?.facilityId) results = results.filter(e => e.facilityId === filter.facilityId);
  if (filter?.payerId) results = results.filter(e => e.payerId === filter.payerId);
  if (filter?.status) results = results.filter(e => e.status === filter.status);
  return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function updateEnrollmentStatus(
  id: string,
  newStatus: EnrollmentStatus,
  actor: string,
  detail?: string,
): FacilityPayerEnrollment | undefined {
  const enrollment = enrollments.get(id);
  if (!enrollment) return undefined;
  const now = new Date().toISOString();
  enrollment.timeline.push({
    timestamp: now,
    action: `status_change: ${enrollment.status} → ${newStatus}`,
    actor,
    detail,
  });
  enrollment.status = newStatus;
  enrollment.updatedAt = now;
  return enrollment;
}

export function addCredentialRefToEnrollment(
  enrollmentId: string,
  credentialId: string,
): boolean {
  const enrollment = enrollments.get(enrollmentId);
  if (!enrollment) return false;
  if (!enrollment.credentialVaultRefs.includes(credentialId)) {
    enrollment.credentialVaultRefs.push(credentialId);
    enrollment.updatedAt = new Date().toISOString();
  }
  return true;
}

/* ── LOA Case Store ─────────────────────────────────────────── */

const loaCases = new Map<string, LOACase>();

export function createLOACase(data: {
  facilityId: string;
  patientDfn: string;
  encounterIen?: string;
  payerId: string;
  payerName: string;
  memberId?: string;
  planName?: string;
  requestType: LOACase["requestType"];
  requestedServices: LOACase["requestedServices"];
  diagnosisCodes: LOACase["diagnosisCodes"];
  createdBy: string;
}): LOACase {
  const id = newId("loa");
  const now = new Date().toISOString();
  const loaCase: LOACase = {
    id,
    facilityId: data.facilityId,
    patientDfn: data.patientDfn,
    encounterIen: data.encounterIen,
    payerId: data.payerId,
    payerName: data.payerName,
    memberId: data.memberId,
    planName: data.planName,
    requestType: data.requestType,
    requestedServices: data.requestedServices,
    diagnosisCodes: data.diagnosisCodes,
    attachmentRefs: [],
    status: "draft",
    timeline: [{
      timestamp: now,
      fromStatus: undefined,
      toStatus: "draft",
      actor: data.createdBy,
      reason: "LOA case created",
    }],
    submissionMode: "manual",
    createdAt: now,
    updatedAt: now,
    createdBy: data.createdBy,
  };
  loaCases.set(id, loaCase);
  return loaCase;
}

export function getLOACase(id: string): LOACase | undefined {
  return loaCases.get(id);
}

export function listLOACases(filter?: {
  facilityId?: string;
  patientDfn?: string;
  payerId?: string;
  status?: LOAStatus;
}): LOACase[] {
  let results = Array.from(loaCases.values());
  if (filter?.facilityId) results = results.filter(c => c.facilityId === filter.facilityId);
  if (filter?.patientDfn) results = results.filter(c => c.patientDfn === filter.patientDfn);
  if (filter?.payerId) results = results.filter(c => c.payerId === filter.payerId);
  if (filter?.status) results = results.filter(c => c.status === filter.status);
  return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function transitionLOAStatus(
  id: string,
  newStatus: LOAStatus,
  actor: string,
  reason?: string,
): { ok: boolean; error?: string; loaCase?: LOACase } {
  const loa = loaCases.get(id);
  if (!loa) return { ok: false, error: "LOA case not found" };

  const allowed = LOA_TRANSITIONS[loa.status];
  if (!allowed?.includes(newStatus)) {
    return {
      ok: false,
      error: `Cannot transition from "${loa.status}" to "${newStatus}". Allowed: ${allowed?.join(", ") || "none"}`,
    };
  }

  const now = new Date().toISOString();
  loa.timeline.push({
    timestamp: now,
    fromStatus: loa.status,
    toStatus: newStatus,
    actor,
    reason,
  });
  loa.status = newStatus;
  loa.updatedAt = now;
  return { ok: true, loaCase: loa };
}

export function addAttachmentToLOA(loaId: string, credentialId: string): boolean {
  const loa = loaCases.get(loaId);
  if (!loa) return false;
  if (!loa.attachmentRefs.includes(credentialId)) {
    loa.attachmentRefs.push(credentialId);
    loa.updatedAt = new Date().toISOString();
  }
  return true;
}

export function updateLOAPayerRef(
  id: string,
  payerRefNumber: string,
  approvedAmount?: number,
  approvedServices?: string[],
): boolean {
  const loa = loaCases.get(id);
  if (!loa) return false;
  loa.payerRefNumber = payerRefNumber;
  if (approvedAmount !== undefined) loa.approvedAmount = approvedAmount;
  if (approvedServices) loa.approvedServices = approvedServices;
  loa.updatedAt = new Date().toISOString();
  return true;
}

/* ── Credential Vault Store ─────────────────────────────────── */

const credentials = new Map<string, CredentialVaultEntry>();

export function createCredentialEntry(data: {
  facilityId: string;
  docType: CredentialDocType;
  title: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  sizeBytes: number;
  contentHash: string;
  issuedBy?: string;
  issueDate?: string;
  expiryDate?: string;
  renewalReminderDays?: number;
  associatedPayerIds?: string[];
  notes?: string;
  uploadedBy: string;
}): CredentialVaultEntry {
  const id = newId("cred");
  const now = new Date().toISOString();
  const entry: CredentialVaultEntry = {
    id,
    facilityId: data.facilityId,
    docType: data.docType,
    title: data.title,
    fileName: data.fileName,
    mimeType: data.mimeType,
    storagePath: data.storagePath,
    sizeBytes: data.sizeBytes,
    contentHash: data.contentHash,
    issuedBy: data.issuedBy,
    issueDate: data.issueDate,
    expiryDate: data.expiryDate,
    renewalReminderDays: data.renewalReminderDays ?? 30,
    associatedPayerIds: data.associatedPayerIds ?? [],
    notes: data.notes,
    uploadedBy: data.uploadedBy,
    uploadedAt: now,
    updatedAt: now,
  };
  credentials.set(id, entry);
  return entry;
}

export function getCredentialEntry(id: string): CredentialVaultEntry | undefined {
  return credentials.get(id);
}

export function listCredentialEntries(filter?: {
  facilityId?: string;
  docType?: CredentialDocType;
  payerId?: string;
  expiringWithinDays?: number;
}): CredentialVaultEntry[] {
  let results = Array.from(credentials.values());
  if (filter?.facilityId) results = results.filter(c => c.facilityId === filter.facilityId);
  if (filter?.docType) results = results.filter(c => c.docType === filter.docType);
  if (filter?.payerId) results = results.filter(c => c.associatedPayerIds.includes(filter.payerId!));
  if (filter?.expiringWithinDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + filter.expiringWithinDays);
    const cutoffStr = cutoff.toISOString();
    results = results.filter(c => c.expiryDate && c.expiryDate <= cutoffStr);
  }
  return results.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export function deleteCredentialEntry(id: string): boolean {
  return credentials.delete(id);
}

/* ── Renewal Reminder Check ─────────────────────────────────── */

export function getExpiringCredentials(daysAhead: number = 30): CredentialVaultEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return Array.from(credentials.values()).filter(c => {
    if (!c.expiryDate) return false;
    return c.expiryDate.split("T")[0] <= cutoffStr;
  });
}

/* ── Stats ──────────────────────────────────────────────────── */

export function getPayerOpsStats(): {
  enrollments: { total: number; byStatus: Record<string, number> };
  loaCases: { total: number; byStatus: Record<string, number> };
  credentials: { total: number; expiringSoon: number };
} {
  const enrollmentsByStatus: Record<string, number> = {};
  for (const e of enrollments.values()) {
    enrollmentsByStatus[e.status] = (enrollmentsByStatus[e.status] || 0) + 1;
  }

  const loaByStatus: Record<string, number> = {};
  for (const l of loaCases.values()) {
    loaByStatus[l.status] = (loaByStatus[l.status] || 0) + 1;
  }

  return {
    enrollments: { total: enrollments.size, byStatus: enrollmentsByStatus },
    loaCases: { total: loaCases.size, byStatus: loaByStatus },
    credentials: {
      total: credentials.size,
      expiringSoon: getExpiringCredentials(30).length,
    },
  };
}
