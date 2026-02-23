/**
 * Evidence Repository — evidence snapshot storage + queries
 *
 * Phase 95B: Platform Persistence Unification
 */

import { randomUUID } from "node:crypto";
import { eq, or, isNull, desc } from "drizzle-orm";
import { getDb } from "../db.js";
import { payerEvidenceSnapshot, payerAuditEvent } from "../schema.js";

export type EvidenceRow = typeof payerEvidenceSnapshot.$inferSelect;

export function findEvidenceById(id: string): EvidenceRow | undefined {
  const db = getDb();
  return db.select().from(payerEvidenceSnapshot)
    .where(eq(payerEvidenceSnapshot.id, id)).get();
}

/**
 * List evidence snapshots, optionally filtered by tenant.
 * Always includes global (tenant_id IS NULL) snapshots.
 */
export function listEvidence(tenantId?: string | null): EvidenceRow[] {
  const db = getDb();
  if (tenantId) {
    return db.select().from(payerEvidenceSnapshot)
      .where(or(
        eq(payerEvidenceSnapshot.tenantId, tenantId),
        isNull(payerEvidenceSnapshot.tenantId),
      ))
      .orderBy(desc(payerEvidenceSnapshot.ingestedAt))
      .all();
  }
  return db.select().from(payerEvidenceSnapshot)
    .orderBy(desc(payerEvidenceSnapshot.ingestedAt))
    .all();
}

/**
 * List evidence by status (e.g., "pending" for promotion review).
 */
export function listEvidenceByStatus(status: string): EvidenceRow[] {
  const db = getDb();
  return db.select().from(payerEvidenceSnapshot)
    .where(eq(payerEvidenceSnapshot.status, status))
    .orderBy(desc(payerEvidenceSnapshot.ingestedAt))
    .all();
}

/**
 * Insert a new evidence snapshot record.
 */
export function insertEvidence(data: {
  tenantId?: string | null;
  sourceType: string;
  sourceUrl?: string | null;
  asOfDate: string;
  sha256: string;
  storedPath?: string | null;
  parserVersion?: string;
  payerCount?: number | null;
}): EvidenceRow {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.insert(payerEvidenceSnapshot).values({
    id,
    tenantId: data.tenantId ?? null,
    sourceType: data.sourceType,
    sourceUrl: data.sourceUrl ?? null,
    asOfDate: data.asOfDate,
    sha256: data.sha256,
    storedPath: data.storedPath ?? null,
    parserVersion: data.parserVersion ?? "1.0.0",
    status: "pending",
    payerCount: data.payerCount ?? null,
    ingestedAt: now,
  }).run();

  // Audit
  db.insert(payerAuditEvent).values({
    id: randomUUID(),
    tenantId: data.tenantId ?? null,
    actorType: "system",
    actorId: null,
    entityType: "evidence_snapshot",
    entityId: id,
    action: "ingest",
    beforeJson: null,
    afterJson: JSON.stringify({ id, sourceType: data.sourceType, sha256: data.sha256 }),
    reason: "Evidence snapshot ingested",
    evidenceSnapshotId: id,
    createdAt: now,
  }).run();

  return findEvidenceById(id)!;
}

/**
 * Update evidence status (e.g., pending → promoted | superseded).
 */
export function updateEvidenceStatus(
  id: string,
  status: "pending" | "promoted" | "superseded",
  reason: string,
  actor?: string,
): EvidenceRow | null {
  const db = getDb();
  const before = findEvidenceById(id);
  if (!before) return null;

  const now = new Date().toISOString();
  db.update(payerEvidenceSnapshot).set({
    status,
  } as any).where(eq(payerEvidenceSnapshot.id, id)).run();

  const after = findEvidenceById(id)!;

  db.insert(payerAuditEvent).values({
    id: randomUUID(),
    tenantId: before.tenantId,
    actorType: actor ? "user" : "system",
    actorId: actor ?? null,
    entityType: "evidence_snapshot",
    entityId: id,
    action: "promote",
    beforeJson: JSON.stringify(before),
    afterJson: JSON.stringify(after),
    reason,
    evidenceSnapshotId: id,
    createdAt: now,
  }).run();

  return after;
}
