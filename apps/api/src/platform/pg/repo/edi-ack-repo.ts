/**
 * PG EDI Ack Repository — Async durable 999/277CA acks + 276/277 status
 *
 * Phase 126: RCM Durability Wave (Map stores -> Postgres)
 *
 * NEW repo (no SQLite predecessor for these tables).
 * Provides CRUD for edi_acknowledgement and edi_claim_status tables.
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { getPgDb } from "../pg-db.js";
import { pgEdiAck, pgEdiClaimStatus } from "../pg-schema.js";

export type EdiAckRow = typeof pgEdiAck.$inferSelect;
export type EdiClaimStatusRow = typeof pgEdiClaimStatus.$inferSelect;

/* ── Acknowledgements ──────────────────────────────────────── */

export async function insertAck(data: {
  id: string;
  tenantId: string;
  type: string;
  disposition: string;
  claimId?: string;
  originalControlNumber: string;
  ackControlNumber: string;
  payerId?: string;
  payerName?: string;
  errorsJson?: string;
  rawPayload?: string;
  idempotencyKey: string;
  receivedAt: string;
  processedAt: string;
  createdAt: string;
}): Promise<EdiAckRow> {
  const db = getPgDb();
  await db.insert(pgEdiAck).values({
    id: data.id,
    tenantId: data.tenantId,
    type: data.type,
    disposition: data.disposition,
    claimId: data.claimId ?? null,
    originalControlNumber: data.originalControlNumber,
    ackControlNumber: data.ackControlNumber,
    payerId: data.payerId ?? null,
    payerName: data.payerName ?? null,
    errorsJson: data.errorsJson ?? "[]",
    rawPayload: data.rawPayload ?? null,
    idempotencyKey: data.idempotencyKey,
    receivedAt: data.receivedAt,
    processedAt: data.processedAt,
    createdAt: data.createdAt,
  });
  const row = await findAckById(data.id);
  return row!;
}

export async function findAckById(id: string): Promise<EdiAckRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgEdiAck).where(eq(pgEdiAck.id, id));
  return rows[0];
}

export async function findAckByIdempotencyKey(
  tenantId: string,
  idempotencyKey: string,
): Promise<EdiAckRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgEdiAck)
    .where(and(eq(pgEdiAck.tenantId, tenantId), eq(pgEdiAck.idempotencyKey, idempotencyKey)));
  return rows[0];
}

export async function findAcksByClaimId(claimId: string): Promise<EdiAckRow[]> {
  const db = getPgDb();
  return db.select().from(pgEdiAck)
    .where(eq(pgEdiAck.claimId, claimId))
    .orderBy(desc(pgEdiAck.receivedAt));
}

export async function listAcks(
  tenantId: string,
  opts?: { type?: string; disposition?: string; claimId?: string; limit?: number; offset?: number },
): Promise<{ rows: EdiAckRow[]; total: number }> {
  const db = getPgDb();
  const conditions = [eq(pgEdiAck.tenantId, tenantId)];
  if (opts?.type) conditions.push(eq(pgEdiAck.type, opts.type));
  if (opts?.disposition) conditions.push(eq(pgEdiAck.disposition, opts.disposition));
  if (opts?.claimId) conditions.push(eq(pgEdiAck.claimId, opts.claimId));

  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(pgEdiAck).where(and(...conditions));
  const total = countResult[0]?.count ?? 0;

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const rows = await db.select().from(pgEdiAck)
    .where(and(...conditions))
    .orderBy(desc(pgEdiAck.receivedAt))
    .limit(limit)
    .offset(offset);

  return { rows, total };
}

export async function countAcks(tenantId: string): Promise<number> {
  const db = getPgDb();
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(pgEdiAck).where(eq(pgEdiAck.tenantId, tenantId));
  return result[0]?.count ?? 0;
}

/* ── Claim Status Updates ──────────────────────────────────── */

export async function insertStatusUpdate(data: {
  id: string;
  tenantId: string;
  claimId?: string;
  payerClaimId?: string;
  categoryCode: string;
  statusCode: string;
  statusDescription: string;
  effectiveDate?: string;
  checkDate?: string;
  totalCharged?: number;
  totalPaid?: number;
  payerId?: string;
  payerName?: string;
  rawPayload?: string;
  idempotencyKey: string;
  receivedAt: string;
  createdAt: string;
}): Promise<EdiClaimStatusRow> {
  const db = getPgDb();
  await db.insert(pgEdiClaimStatus).values({
    id: data.id,
    tenantId: data.tenantId,
    claimId: data.claimId ?? null,
    payerClaimId: data.payerClaimId ?? null,
    categoryCode: data.categoryCode,
    statusCode: data.statusCode,
    statusDescription: data.statusDescription,
    effectiveDate: data.effectiveDate ?? null,
    checkDate: data.checkDate ?? null,
    totalCharged: data.totalCharged ?? null,
    totalPaid: data.totalPaid ?? null,
    payerId: data.payerId ?? null,
    payerName: data.payerName ?? null,
    rawPayload: data.rawPayload ?? null,
    idempotencyKey: data.idempotencyKey,
    receivedAt: data.receivedAt,
    createdAt: data.createdAt,
  });
  const row = await findStatusUpdateById(data.id);
  return row!;
}

export async function findStatusUpdateById(id: string): Promise<EdiClaimStatusRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgEdiClaimStatus).where(eq(pgEdiClaimStatus.id, id));
  return rows[0];
}

export async function findStatusByIdempotencyKey(
  tenantId: string,
  idempotencyKey: string,
): Promise<EdiClaimStatusRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgEdiClaimStatus)
    .where(and(eq(pgEdiClaimStatus.tenantId, tenantId), eq(pgEdiClaimStatus.idempotencyKey, idempotencyKey)));
  return rows[0];
}

export async function findStatusesByClaimId(claimId: string): Promise<EdiClaimStatusRow[]> {
  const db = getPgDb();
  return db.select().from(pgEdiClaimStatus)
    .where(eq(pgEdiClaimStatus.claimId, claimId))
    .orderBy(desc(pgEdiClaimStatus.receivedAt));
}

export async function listStatusUpdates(
  tenantId: string,
  opts?: { categoryCode?: string; claimId?: string; limit?: number; offset?: number },
): Promise<{ rows: EdiClaimStatusRow[]; total: number }> {
  const db = getPgDb();
  const conditions = [eq(pgEdiClaimStatus.tenantId, tenantId)];
  if (opts?.categoryCode) conditions.push(eq(pgEdiClaimStatus.categoryCode, opts.categoryCode));
  if (opts?.claimId) conditions.push(eq(pgEdiClaimStatus.claimId, opts.claimId));

  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(pgEdiClaimStatus).where(and(...conditions));
  const total = countResult[0]?.count ?? 0;

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const rows = await db.select().from(pgEdiClaimStatus)
    .where(and(...conditions))
    .orderBy(desc(pgEdiClaimStatus.receivedAt))
    .limit(limit)
    .offset(offset);

  return { rows, total };
}

export async function countStatusUpdates(tenantId: string): Promise<number> {
  const db = getPgDb();
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(pgEdiClaimStatus).where(eq(pgEdiClaimStatus.tenantId, tenantId));
  return result[0]?.count ?? 0;
}
