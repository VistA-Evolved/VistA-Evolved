/**
 * Evidence Repository (PostgreSQL) -- payer evidence snapshot management
 *
 * Phase 102: Migrate Prototype Stores to PlatformStore
 *
 * Mirrors apps/api/src/platform/db/repo/evidence-repo.ts using Postgres.
 */

import { randomUUID } from 'node:crypto';
import { eq, or, isNull, desc, and } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { payerEvidenceSnapshot, payerAuditEvent } from '../pg-schema.js';

export type EvidenceRow = typeof payerEvidenceSnapshot.$inferSelect;

export async function findEvidenceById(id: string): Promise<EvidenceRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(payerEvidenceSnapshot)
    .where(eq(payerEvidenceSnapshot.id, id));
  return rows[0];
}

export async function findEvidenceByIdForTenant(
  tenantId: string,
  id: string
): Promise<EvidenceRow | undefined> {
  const row = await findEvidenceById(id);
  if (!row) return undefined;
  if (row.tenantId !== null && row.tenantId !== tenantId) return undefined;
  return row;
}

export async function listEvidence(tenantId?: string | null): Promise<EvidenceRow[]> {
  const db = getPgDb();
  if (tenantId) {
    return db
      .select()
      .from(payerEvidenceSnapshot)
      .where(
        or(eq(payerEvidenceSnapshot.tenantId, tenantId), isNull(payerEvidenceSnapshot.tenantId))
      )
      .orderBy(desc(payerEvidenceSnapshot.ingestedAt));
  }
  return db.select().from(payerEvidenceSnapshot).orderBy(desc(payerEvidenceSnapshot.ingestedAt));
}

export async function listEvidenceByStatus(
  status: string,
  tenantId?: string | null
): Promise<EvidenceRow[]> {
  const db = getPgDb();
  if (tenantId) {
    return db
      .select()
      .from(payerEvidenceSnapshot)
      .where(
        and(
          eq(payerEvidenceSnapshot.status, status),
          or(
            eq(payerEvidenceSnapshot.tenantId, tenantId),
            isNull(payerEvidenceSnapshot.tenantId)
          )
        )
      )
      .orderBy(desc(payerEvidenceSnapshot.ingestedAt));
  }
  return db
    .select()
    .from(payerEvidenceSnapshot)
    .where(eq(payerEvidenceSnapshot.status, status))
    .orderBy(desc(payerEvidenceSnapshot.ingestedAt));
}

export async function insertEvidence(data: {
  sourceType: string;
  sourceUrl?: string;
  asOfDate: string;
  sha256: string;
  storedPath?: string;
  parserVersion?: string;
  payerCount?: number;
  tenantId?: string | null;
}): Promise<EvidenceRow> {
  const db = getPgDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  await db.insert(payerEvidenceSnapshot).values({
    id,
    tenantId: data.tenantId ?? null,
    sourceType: data.sourceType,
    sourceUrl: data.sourceUrl ?? null,
    asOfDate: new Date(data.asOfDate),
    sha256: data.sha256,
    storedPath: data.storedPath ?? null,
    parserVersion: data.parserVersion ?? '1.0.0',
    status: 'pending',
    payerCount: data.payerCount ?? null,
    ingestedAt: new Date(now),
  });

  // Audit
  await db.insert(payerAuditEvent).values({
    id: randomUUID(),
    tenantId: data.tenantId ?? null,
    actorType: 'system',
    actorId: null,
    entityType: 'evidence_snapshot',
    entityId: id,
    action: 'create',
    beforeJson: null,
    afterJson: { id, sourceType: data.sourceType, sha256: data.sha256 },
    reason: 'Evidence snapshot ingested',
    evidenceSnapshotId: id,
    createdAt: new Date(now),
  });

  return (await findEvidenceById(id))!;
}

export async function updateEvidenceStatus(
  id: string,
  status: 'pending' | 'promoted' | 'superseded',
  reason: string,
  actor?: string
): Promise<EvidenceRow | null> {
  const db = getPgDb();
  const before = await findEvidenceById(id);
  if (!before) return null;

  const now = new Date().toISOString();

  await db
    .update(payerEvidenceSnapshot)
    .set({ status } as any)
    .where(eq(payerEvidenceSnapshot.id, id));

  const after = await findEvidenceById(id);

  // Audit
  await db.insert(payerAuditEvent).values({
    id: randomUUID(),
    tenantId: before.tenantId ?? null,
    actorType: actor ? 'user' : 'system',
    actorId: actor ?? null,
    entityType: 'evidence_snapshot',
    entityId: id,
    action: 'promote',
    beforeJson: JSON.parse(JSON.stringify(before)),
    afterJson: after ? JSON.parse(JSON.stringify(after)) : null,
    reason,
    evidenceSnapshotId: id,
    createdAt: new Date(now),
  });

  return after ?? null;
}
