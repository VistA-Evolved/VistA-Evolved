/**
 * Capability Repository — payer capability matrix
 *
 * Phase 95B: Platform Persistence Unification
 *
 * Every update MUST include a reason string. This is enforced at the
 * repo layer — callers cannot bypass it.
 */

import { randomUUID } from "node:crypto";
import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "../db.js";
import { payerCapability, payerAuditEvent } from "../schema.js";

export type CapabilityRow = typeof payerCapability.$inferSelect;

/** Standard capability keys (not exhaustive — extensible) */
export const STANDARD_CAPABILITY_KEYS = [
  // Core operational (Phase 95B)
  "loa", "eligibility", "claimsSubmission", "claimStatus",
  "remittance", "memberPortal", "providerPortal",
  // Operational detail (Phase 97B)
  "loa_submission_method",       // portal | email | fax | manual
  "loa_turnaround_days",         // e.g. "3" | "5" | "7" | "unknown"
  "claim_packet_format",         // portal_upload | email_attachment | physical | mixed
  "claim_deadline_days",         // e.g. "30" | "60" | "90" | "unknown"
  "preauth_portal_url",          // portal URL for LOA/preauth (if known)
  "claims_portal_url",           // portal URL for claims submission
  "soa_frequency",               // monthly | quarterly | on_request | unknown
  "denial_appeal_window_days",   // e.g. "30" | "60" | "unknown"
  "provider_enrollment_required", // yes | no | unknown
  "accreditation_type",          // ic_licensed | doh_accredited | both | unknown
] as const;

export function listCapabilities(payerId: string, tenantId?: string | null): CapabilityRow[] {
  const db = getDb();
  if (tenantId) {
    // Return tenant-scoped + global (tenant_id IS NULL) capabilities
    return db.select().from(payerCapability)
      .where(and(
        eq(payerCapability.payerId, payerId),
        // tenant-specific or global
      ))
      .all()
      .filter(c => c.tenantId === tenantId || c.tenantId === null);
  }
  // Global only
  return db.select().from(payerCapability)
    .where(and(eq(payerCapability.payerId, payerId), isNull(payerCapability.tenantId)))
    .all();
}

/**
 * Set or update a capability. REASON is mandatory.
 */
export function setCapability(
  params: {
    payerId: string;
    capabilityKey: string;
    value: string;
    confidence?: string;
    tenantId?: string | null;
    evidenceSnapshotId?: string | null;
    reason: string;   // MANDATORY — enforced here
    actor?: string;
  },
): CapabilityRow {
  if (!params.reason || params.reason.trim().length === 0) {
    throw new Error("Capability updates require a non-empty reason string");
  }

  const db = getDb();
  const now = new Date().toISOString();
  const tenantId = params.tenantId ?? null;

  // Find existing
  const existing = db.select().from(payerCapability)
    .where(and(
      eq(payerCapability.payerId, params.payerId),
      eq(payerCapability.capabilityKey, params.capabilityKey),
      tenantId ? eq(payerCapability.tenantId, tenantId) : isNull(payerCapability.tenantId),
    ))
    .get();

  if (existing) {
    // Update existing
    db.update(payerCapability).set({
      value: params.value,
      confidence: params.confidence ?? existing.confidence,
      evidenceSnapshotId: params.evidenceSnapshotId ?? existing.evidenceSnapshotId,
      reason: params.reason,
      updatedAt: now,
    } as any).where(eq(payerCapability.id, existing.id)).run();

    const after = db.select().from(payerCapability)
      .where(eq(payerCapability.id, existing.id)).get()!;

    // Audit
    db.insert(payerAuditEvent).values({
      id: randomUUID(),
      tenantId,
      actorType: params.actor ? "user" : "system",
      actorId: params.actor ?? null,
      entityType: "payer_capability",
      entityId: existing.id,
      action: "update",
      beforeJson: JSON.stringify(existing),
      afterJson: JSON.stringify(after),
      reason: params.reason,
      evidenceSnapshotId: params.evidenceSnapshotId ?? null,
      createdAt: now,
    }).run();

    return after;
  } else {
    // Insert new
    const id = randomUUID();
    db.insert(payerCapability).values({
      id,
      tenantId,
      payerId: params.payerId,
      capabilityKey: params.capabilityKey,
      value: params.value,
      confidence: params.confidence ?? "unknown",
      evidenceSnapshotId: params.evidenceSnapshotId ?? null,
      reason: params.reason,
      updatedAt: now,
    }).run();

    const created = db.select().from(payerCapability)
      .where(eq(payerCapability.id, id)).get()!;

    // Audit
    db.insert(payerAuditEvent).values({
      id: randomUUID(),
      tenantId,
      actorType: params.actor ? "user" : "system",
      actorId: params.actor ?? null,
      entityType: "payer_capability",
      entityId: id,
      action: "create",
      beforeJson: null,
      afterJson: JSON.stringify(created),
      reason: params.reason,
      evidenceSnapshotId: params.evidenceSnapshotId ?? null,
      createdAt: now,
    }).run();

    return created;
  }
}

/**
 * Bulk-set capabilities for a payer (e.g., from evidence ingest).
 * Returns count of created/updated.
 */
export function bulkSetCapabilities(
  payerId: string,
  capabilities: Array<{ key: string; value: string; confidence?: string }>,
  evidenceSnapshotId: string | null,
  reason: string,
  actor?: string,
): { created: number; updated: number } {
  let created = 0;
  let updated = 0;

  for (const cap of capabilities) {
    const existing = listCapabilities(payerId).find(c => c.capabilityKey === cap.key);
    setCapability({
      payerId,
      capabilityKey: cap.key,
      value: cap.value,
      confidence: cap.confidence,
      evidenceSnapshotId,
      reason,
      actor,
    });
    if (existing) updated++;
    else created++;
  }

  return { created, updated };
}
