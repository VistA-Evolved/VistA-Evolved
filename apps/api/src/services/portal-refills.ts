/**
 * Portal Refill Requests — Phase 32 (VistA-first)
 *
 * Patient-initiated medication refill renewal requests.
 * VistA-first pattern: if PSO RENEW RPC is available, call it;
 * otherwise store with "pending_filing" status and target RPC documented.
 *
 * VistA integration mapping (target):
 * - PSO RENEW: Outpatient Pharmacy refill renewal
 * - PSO PRESCRIPTION STATUS: Check current fill status
 * - ORWPS ACTIVE: Get active medications (already wired)
 *
 * Since PSO RENEW is not available in the WorldVistA sandbox,
 * requests are stored as portal requests with status tracking.
 * The "pending_filing" banner is explicit — no silent failures.
 *
 * Security:
 * - Proxy can request if accessLevel = read_write
 * - Only active medications can be refilled
 * - Rate limited: max 5 refill requests per hour per patient
 * - All requests audited
 */

import { randomBytes } from "node:crypto";
import { portalAudit } from "./portal-audit.js";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type RefillStatus =
  | "requested"
  | "pending_review"
  | "pending_filing"
  | "approved"
  | "denied"
  | "filed_in_vista"
  | "cancelled";

export interface RefillRequest {
  id: string;
  tenantId: string;
  patientDfn: string;
  patientName: string;
  medicationName: string;
  medicationId: string;       // From ORWPS ACTIVE output
  pharmacyType: "outpatient" | "inpatient";
  requestedAt: string;
  updatedAt: string;
  status: RefillStatus;
  statusNote: string;
  /** Who submitted — patient or proxy */
  submittedBy: string;
  submittedByName: string;
  isProxy: boolean;
  /** VistA integration */
  vistaSync: "not_attempted" | "pending_filing" | "filed" | "failed";
  vistaRef: string | null;     // PSO IEN when filed
  targetRpc: string;           // Documents which RPC to use
  /** Review info (clinician action) */
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

/* ------------------------------------------------------------------ */
/* Config                                                               */
/* ------------------------------------------------------------------ */

const MAX_REFILLS_PER_HOUR = 5;
const TARGET_RPC = "PSO RENEW";  // Outpatient Pharmacy renewal

/* ------------------------------------------------------------------ */
/* Store + seed data                                                    */
/* ------------------------------------------------------------------ */

const refillStore = new Map<string, RefillRequest>();
let refillSeq = 0;

/** Rate limiter timestamps per patient */
const refillTimestamps = new Map<string, number[]>();

/* Phase 146: DB repo wiring */
let refillDbRepo: { upsert(d: any): Promise<any>; update?(id: string, u: any): Promise<any> } | null = null;
export function initRefillStoreRepo(repo: typeof refillDbRepo): void { refillDbRepo = repo; }

function persistRefillRow(req: RefillRequest): void {
  refillDbRepo
    ?.upsert({
      id: req.id,
      tenantId: req.tenantId,
      patientDfn: req.patientDfn,
      medicationName: req.medicationName,
      rxNumber: null,
      pharmacy: req.pharmacyType,
      status: req.status,
      requestedAt: req.requestedAt,
      completedAt: req.status === 'approved' || req.status === 'denied' || req.status === 'cancelled' ? req.updatedAt : null,
      createdAt: req.requestedAt,
      updatedAt: req.updatedAt,
    })
    .catch(() => {});
}

function rateLimitKey(tenantId: string, dfn: string): string {
  return `${tenantId}:${dfn}`;
}

function checkRefillRateLimit(tenantId: string, dfn: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const hourAgo = now - 3600000;
  const key = rateLimitKey(tenantId, dfn);
  const timestamps = (refillTimestamps.get(key) || []).filter(t => t > hourAgo);
  refillTimestamps.set(key, timestamps);
  if (timestamps.length >= MAX_REFILLS_PER_HOUR) {
    return { allowed: false, retryAfterMs: timestamps[0] + 3600000 - now };
  }
  return { allowed: true };
}

/** Seed demo refill requests for dev patient */
function seedDemoRefills() {
  const now = new Date();
  const demos: Partial<RefillRequest>[] = [
    {
      patientDfn: "100022", patientName: "CARTER,DAVID",
      medicationName: "LISINOPRIL 10MG TAB", medicationId: "med-1001",
      status: "approved", statusNote: "Approved by pharmacy",
      vistaSync: "pending_filing", submittedBy: "100022", submittedByName: "CARTER,DAVID", isProxy: false,
    },
    {
      patientDfn: "100022", patientName: "CARTER,DAVID",
      medicationName: "METFORMIN 500MG TAB", medicationId: "med-1002",
      status: "pending_review", statusNote: "Awaiting pharmacist review",
      vistaSync: "not_attempted", submittedBy: "100022", submittedByName: "CARTER,DAVID", isProxy: false,
    },
  ];

  for (const d of demos) {
    const id = `refill-${++refillSeq}-${randomBytes(4).toString("hex")}`;
    refillStore.set(id, {
      id,
      tenantId: "default",
      patientDfn: d.patientDfn!,
      patientName: d.patientName!,
      medicationName: d.medicationName!,
      medicationId: d.medicationId!,
      pharmacyType: "outpatient",
      requestedAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      status: d.status!,
      statusNote: d.statusNote!,
      submittedBy: d.submittedBy!,
      submittedByName: d.submittedByName!,
      isProxy: d.isProxy!,
      vistaSync: d.vistaSync!,
      vistaRef: null,
      targetRpc: TARGET_RPC,
      reviewedBy: d.status === "approved" ? "duz-87" : null,
      reviewedAt: d.status === "approved" ? new Date().toISOString() : null,
      reviewNote: d.status === "approved" ? "OK to renew" : null,
    });
  }
}

seedDemoRefills();

/* ------------------------------------------------------------------ */
/* Queries                                                              */
/* ------------------------------------------------------------------ */

export function getPatientRefills(tenantId: string, patientDfn: string): RefillRequest[] {
  return [...refillStore.values()]
    .filter(r => r.tenantId === tenantId && r.patientDfn === patientDfn)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export function getRefillRequest(refillId: string, tenantId: string, patientDfn: string): RefillRequest | null {
  const req = refillStore.get(refillId);
  if (!req || req.tenantId !== tenantId || req.patientDfn !== patientDfn) return null;
  return req;
}

/** Staff queue: all pending refill requests across patients */
export function getStaffRefillQueue(): RefillRequest[] {
  return getStaffRefillQueueForTenant("default");
}

export function getStaffRefillQueueForTenant(tenantId: string): RefillRequest[] {
  return [...refillStore.values()]
    .filter(r => r.tenantId === tenantId)
    .filter(r => r.status === "requested" || r.status === "pending_review")
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
}

/* ------------------------------------------------------------------ */
/* Request flow                                                         */
/* ------------------------------------------------------------------ */

export function requestRefill(opts: {
  tenantId: string;
  patientDfn: string;
  patientName: string;
  medicationName: string;
  medicationId: string;
  submittedBy: string;
  submittedByName: string;
  isProxy: boolean;
}): RefillRequest | { error: string } {
  // Rate limit
  const rl = checkRefillRateLimit(opts.tenantId, opts.patientDfn);
  if (!rl.allowed) {
    return { error: `Rate limit exceeded. Try again in ${Math.ceil((rl.retryAfterMs || 0) / 60000)} minutes.` };
  }

  // Check for duplicate pending request
  const existing = [...refillStore.values()].find(
    r => r.tenantId === opts.tenantId &&
         r.patientDfn === opts.patientDfn &&
         r.medicationId === opts.medicationId &&
         ["requested", "pending_review", "pending_filing"].includes(r.status)
  );
  if (existing) {
    return { error: `A refill request for ${opts.medicationName} is already pending (${existing.status}).` };
  }

  const id = `refill-${++refillSeq}-${randomBytes(4).toString("hex")}`;
  const now = new Date().toISOString();

  const req: RefillRequest = {
    id,
    tenantId: opts.tenantId,
    patientDfn: opts.patientDfn,
    patientName: opts.patientName,
    medicationName: opts.medicationName,
    medicationId: opts.medicationId,
    pharmacyType: "outpatient",
    requestedAt: now,
    updatedAt: now,
    status: "requested",
    statusNote: "Request submitted via patient portal. Awaiting pharmacist review.",
    submittedBy: opts.submittedBy,
    submittedByName: opts.submittedByName,
    isProxy: opts.isProxy,
    vistaSync: "not_attempted",
    vistaRef: null,
    targetRpc: TARGET_RPC,
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
  };

  refillStore.set(id, req);

  // Phase 146: Write-through to PG
  persistRefillRow(req);

  // Record rate limit
  const rateKey = rateLimitKey(opts.tenantId, opts.patientDfn);
  const timestamps = refillTimestamps.get(rateKey) || [];
  timestamps.push(Date.now());
  refillTimestamps.set(rateKey, timestamps);

  portalAudit("portal.refill.request" as any, "success", opts.patientDfn, {
    tenantId: opts.tenantId,
    detail: { refillId: id, medication: opts.medicationName, isProxy: opts.isProxy },
  });

  return req;
}

export function cancelRefill(refillId: string, patientDfn: string, tenantId: string = 'default'): RefillRequest | null {
  const req = refillStore.get(refillId);
  if (!req || req.tenantId !== tenantId || req.patientDfn !== patientDfn) return null;
  if (!["requested", "pending_review"].includes(req.status)) return null;

  req.status = "cancelled";
  req.statusNote = "Cancelled by patient.";
  req.updatedAt = new Date().toISOString();

  // Phase 146: Write-through cancel
  if (refillDbRepo?.update) {
    refillDbRepo.update(refillId, {
      status: req.status,
      completedAt: req.updatedAt,
      updatedAt: req.updatedAt,
    }).catch(() => {});
  } else {
    persistRefillRow(req);
  }

  portalAudit("portal.refill.cancel" as any, "success", patientDfn, {
    tenantId,
    detail: { refillId },
  });

  return req;
}

/* ------------------------------------------------------------------ */
/* Staff actions (for CPRS shell)                                       */
/* ------------------------------------------------------------------ */

export function reviewRefill(
  refillId: string,
  action: "approve" | "deny",
  clinicianDuz: string,
  clinicianName: string,
  note: string,
  tenantId: string = 'default',
): RefillRequest | { error: string } {
  const req = refillStore.get(refillId);
  if (!req) return { error: "Refill request not found." };
  if (req.tenantId !== tenantId) return { error: "Refill request not found." };
  if (!["requested", "pending_review"].includes(req.status)) {
    return { error: `Cannot review a refill in status: ${req.status}` };
  }

  const now = new Date().toISOString();
  req.reviewedBy = `duz-${clinicianDuz}`;
  req.reviewedAt = now;
  req.reviewNote = note.slice(0, 500);
  req.updatedAt = now;

  if (action === "approve") {
    req.status = "approved";
    req.statusNote = `Approved by ${clinicianName}. ${note}`;
    // VistA-first: attempt PSO RENEW if available
    // For now, mark as pending_filing since sandbox lacks PSO RENEW
    req.vistaSync = "pending_filing";
  } else {
    req.status = "denied";
    req.statusNote = `Denied by ${clinicianName}. Reason: ${note}`;
    req.vistaSync = "not_attempted";
  }

  // Phase 146: Write-through review
  if (refillDbRepo?.update) {
    refillDbRepo.update(refillId, {
      status: req.status,
      completedAt: req.updatedAt,
      updatedAt: req.updatedAt,
    }).catch(() => {});
  } else {
    persistRefillRow(req);
  }

  return req;
}
