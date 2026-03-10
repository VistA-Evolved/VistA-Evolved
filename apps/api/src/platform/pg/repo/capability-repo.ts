/**
 * Capability Repository (PostgreSQL) -- payer capability matrix
 *
 * Phase 102: Migrate Prototype Stores to PlatformStore
 *
 * Mirrors apps/api/src/platform/db/repo/capability-repo.ts using Postgres.
 * Every update MUST include a reason string -- enforced at repo layer.
 */

import { randomUUID } from 'node:crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { payerCapability, payerAuditEvent } from '../pg-schema.js';

export type CapabilityRow = typeof payerCapability.$inferSelect;

/** Standard capability keys (kept in sync with SQLite repo) */
export const STANDARD_CAPABILITY_KEYS = [
  // Core operational (Phase 95B)
  'loa',
  'eligibility',
  'claimsSubmission',
  'claimStatus',
  'remittance',
  'memberPortal',
  'providerPortal',
  // Operational detail (Phase 97B)
  'loa_submission_method',
  'loa_turnaround_days',
  'claim_packet_format',
  'claim_deadline_days',
  'preauth_portal_url',
  'claims_portal_url',
  'soa_frequency',
  'denial_appeal_window_days',
  'provider_enrollment_required',
  'accreditation_type',
] as const;

export async function listCapabilities(
  payerId: string,
  tenantId?: string | null
): Promise<CapabilityRow[]> {
  const db = getPgDb();
  if (tenantId) {
    // Return tenant-scoped + global capabilities
    const all = await db.select().from(payerCapability).where(eq(payerCapability.payerId, payerId));
    return all.filter((c) => c.tenantId === tenantId || c.tenantId === null);
  }
  // Global only
  return db
    .select()
    .from(payerCapability)
    .where(and(eq(payerCapability.payerId, payerId), isNull(payerCapability.tenantId)));
}

export async function setCapability(params: {
  payerId: string;
  capabilityKey: string;
  value: string;
  confidence?: string;
  tenantId?: string | null;
  evidenceSnapshotId?: string | null;
  reason: string;
  actor?: string;
}): Promise<CapabilityRow> {
  if (!params.reason || params.reason.trim().length === 0) {
    throw new Error('Capability updates require a non-empty reason string');
  }

  const db = getPgDb();
  const now = new Date().toISOString();
  const tenantId = params.tenantId ?? null;

  // Find existing
  const conditions = [
    eq(payerCapability.payerId, params.payerId),
    eq(payerCapability.capabilityKey, params.capabilityKey),
  ];
  if (tenantId) {
    conditions.push(eq(payerCapability.tenantId, tenantId));
  } else {
    conditions.push(isNull(payerCapability.tenantId));
  }

  const existing = await db
    .select()
    .from(payerCapability)
    .where(and(...conditions));
  const before = existing[0];

  if (before) {
    // Update
    await db
      .update(payerCapability)
      .set({
        value: params.value,
        confidence: params.confidence ?? before.confidence,
        reason: params.reason,
        evidenceSnapshotId: params.evidenceSnapshotId ?? before.evidenceSnapshotId,
        updatedAt: new Date(now),
      } as any)
      .where(eq(payerCapability.id, before.id));

    const afterRows = await db
      .select()
      .from(payerCapability)
      .where(eq(payerCapability.id, before.id));
    const after = afterRows[0]!;

    // Audit
    await db.insert(payerAuditEvent).values({
      id: randomUUID(),
      tenantId,
      actorType: params.actor ? 'user' : 'system',
      actorId: params.actor ?? null,
      entityType: 'payer_capability',
      entityId: before.id,
      action: 'update',
      beforeJson: JSON.parse(JSON.stringify(before)),
      afterJson: JSON.parse(JSON.stringify(after)),
      reason: params.reason,
      evidenceSnapshotId: params.evidenceSnapshotId ?? null,
      createdAt: new Date(now),
    });

    return after;
  } else {
    // Insert
    const id = randomUUID();
    await db.insert(payerCapability).values({
      id,
      tenantId,
      payerId: params.payerId,
      capabilityKey: params.capabilityKey,
      value: params.value,
      confidence: params.confidence ?? 'unknown',
      reason: params.reason,
      evidenceSnapshotId: params.evidenceSnapshotId ?? null,
      updatedAt: new Date(now),
    });

    const created = await db.select().from(payerCapability).where(eq(payerCapability.id, id));

    // Audit
    await db.insert(payerAuditEvent).values({
      id: randomUUID(),
      tenantId,
      actorType: params.actor ? 'user' : 'system',
      actorId: params.actor ?? null,
      entityType: 'payer_capability',
      entityId: id,
      action: 'create',
      beforeJson: null,
      afterJson: JSON.parse(JSON.stringify(created[0])),
      reason: params.reason,
      evidenceSnapshotId: params.evidenceSnapshotId ?? null,
      createdAt: new Date(now),
    });

    return created[0]!;
  }
}

export async function bulkSetCapabilities(
  payerId: string,
  capabilities: Array<{ key: string; value: string; confidence?: string }>,
  evidenceSnapshotId: string | null,
  reason: string,
  actor?: string
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const cap of capabilities) {
    const existing = (await listCapabilities(payerId)).find((c) => c.capabilityKey === cap.key);
    await setCapability({
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
