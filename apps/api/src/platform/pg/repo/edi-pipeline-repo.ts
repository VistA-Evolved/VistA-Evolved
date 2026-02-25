/**
 * PG EDI Pipeline Repository — Async durable pipeline entry tracking
 *
 * Phase 126: RCM Durability Wave (Map stores -> Postgres)
 *
 * NEW repo (no SQLite predecessor for this table).
 * Provides CRUD for edi_pipeline_entry table.
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { getPgDb } from "../pg-db.js";
import { pgEdiPipelineEntry } from "../pg-schema.js";

export type EdiPipelineEntryRow = typeof pgEdiPipelineEntry.$inferSelect;

/* ── Create ────────────────────────────────────────────────── */

export async function insertPipelineEntry(data: {
  id: string;
  tenantId: string;
  claimId: string;
  transactionSet: string;
  stage?: string;
  connectorId: string;
  payerId: string;
  outboundPayload?: string;
  inboundPayload?: string;
  errorsJson?: string;
  attempts?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}): Promise<EdiPipelineEntryRow> {
  const db = getPgDb();
  await db.insert(pgEdiPipelineEntry).values({
    id: data.id,
    tenantId: data.tenantId,
    claimId: data.claimId,
    transactionSet: data.transactionSet,
    stage: data.stage ?? "build",
    connectorId: data.connectorId,
    payerId: data.payerId,
    outboundPayload: data.outboundPayload ?? null,
    inboundPayload: data.inboundPayload ?? null,
    errorsJson: data.errorsJson ?? "[]",
    attempts: data.attempts ?? 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    completedAt: data.completedAt ?? null,
  });
  const row = await findEntryById(data.id);
  return row!;
}

/* ── Lookup ────────────────────────────────────────────────── */

export async function findEntryById(id: string): Promise<EdiPipelineEntryRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgEdiPipelineEntry).where(eq(pgEdiPipelineEntry.id, id));
  return rows[0];
}

export async function findEntriesByClaimId(claimId: string): Promise<EdiPipelineEntryRow[]> {
  const db = getPgDb();
  return db.select().from(pgEdiPipelineEntry)
    .where(eq(pgEdiPipelineEntry.claimId, claimId))
    .orderBy(desc(pgEdiPipelineEntry.createdAt));
}

export async function listEntries(
  tenantId: string,
  opts?: { stage?: string; payerId?: string; transactionSet?: string; limit?: number; offset?: number },
): Promise<{ rows: EdiPipelineEntryRow[]; total: number }> {
  const db = getPgDb();
  const conditions = [eq(pgEdiPipelineEntry.tenantId, tenantId)];
  if (opts?.stage) conditions.push(eq(pgEdiPipelineEntry.stage, opts.stage));
  if (opts?.payerId) conditions.push(eq(pgEdiPipelineEntry.payerId, opts.payerId));
  if (opts?.transactionSet) conditions.push(eq(pgEdiPipelineEntry.transactionSet, opts.transactionSet));

  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(pgEdiPipelineEntry).where(and(...conditions));
  const total = countResult[0]?.count ?? 0;

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const rows = await db.select().from(pgEdiPipelineEntry)
    .where(and(...conditions))
    .orderBy(desc(pgEdiPipelineEntry.createdAt))
    .limit(limit)
    .offset(offset);

  return { rows, total };
}

/* ── Update ────────────────────────────────────────────────── */

export async function updateEntry(id: string, updates: Partial<{
  stage: string;
  outboundPayload: string;
  inboundPayload: string;
  errorsJson: string;
  attempts: number;
  completedAt: string;
}>): Promise<EdiPipelineEntryRow | undefined> {
  const db = getPgDb();
  const now = new Date().toISOString();
  await db.update(pgEdiPipelineEntry)
    .set({ ...updates, updatedAt: now } as any)
    .where(eq(pgEdiPipelineEntry.id, id));
  return findEntryById(id);
}

/* ── Count ─────────────────────────────────────────────────── */

export async function countEntries(tenantId: string): Promise<number> {
  const db = getPgDb();
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(pgEdiPipelineEntry).where(eq(pgEdiPipelineEntry.tenantId, tenantId));
  return result[0]?.count ?? 0;
}
