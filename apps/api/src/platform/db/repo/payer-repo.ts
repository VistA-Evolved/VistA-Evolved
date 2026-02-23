/**
 * Payer Repository — CRUD for the global payer table
 *
 * Phase 95B: Platform Persistence Unification
 */

import { randomUUID } from "node:crypto";
import { eq, like, and, or, sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { payer, payerAuditEvent } from "../schema.js";

export type PayerRow = typeof payer.$inferSelect;
export type PayerInsert = typeof payer.$inferInsert;

/** Normalize aliases from either JSON string or raw array */
function normalizeAliases(aliases: string | string[] | undefined | null): string {
  if (!aliases) return "[]";
  if (typeof aliases === "string") {
    try {
      const parsed = JSON.parse(aliases);
      return JSON.stringify(Array.isArray(parsed) ? parsed : []);
    } catch {
      return "[]";
    }
  }
  return JSON.stringify(aliases);
}

export function findPayerById(id: string): PayerRow | undefined {
  const db = getDb();
  return db.select().from(payer).where(eq(payer.id, id)).get();
}

export function listPayers(filters?: {
  countryCode?: string;
  active?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): { rows: PayerRow[]; total: number } {
  const db = getDb();
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters?.countryCode) {
    conditions.push(eq(payer.countryCode, filters.countryCode));
  }
  if (filters?.active !== undefined) {
    conditions.push(eq(payer.active, filters.active));
  }
  if (filters?.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        like(payer.canonicalName, term),
        like(payer.aliases, term),
        like(payer.id, term),
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const totalResult = db
    .select({ count: sql<number>`count(*)` })
    .from(payer)
    .where(where)
    .get();
  const total = totalResult?.count ?? 0;

  const limit = filters?.limit ?? 100;
  const offset = filters?.offset ?? 0;

  const rows = db.select().from(payer).where(where).limit(limit).offset(offset).all();

  return { rows, total };
}

export function insertPayer(data: Omit<PayerInsert, "createdAt" | "updatedAt">, actor?: string): PayerRow {
  const db = getDb();
  const now = new Date().toISOString();

  const row: PayerInsert = {
    ...data,
    id: data.id || randomUUID(),
    aliases: normalizeAliases(data.aliases),
    createdAt: now,
    updatedAt: now,
  };

  db.insert(payer).values(row).run();

  // Audit
  db.insert(payerAuditEvent).values({
    id: randomUUID(),
    tenantId: null,
    actorType: actor ? "user" : "system",
    actorId: actor ?? null,
    entityType: "payer",
    entityId: row.id!,
    action: "create",
    beforeJson: null,
    afterJson: JSON.stringify(row),
    reason: "Payer created",
    evidenceSnapshotId: null,
    createdAt: now,
  }).run();

  return findPayerById(row.id!)!;
}

export function updatePayer(
  id: string,
  data: Partial<Pick<PayerInsert, "canonicalName" | "aliases" | "countryCode" | "regulatorSource" | "regulatorLicenseNo" | "category" | "integrationMode" | "active">>,
  reason: string,
  actor?: string,
): PayerRow | null {
  const db = getDb();
  const before = findPayerById(id);
  if (!before) return null;

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };

  if (data.canonicalName !== undefined) updates.canonicalName = data.canonicalName;
  if (data.aliases !== undefined) updates.aliases = normalizeAliases(data.aliases);
  if (data.countryCode !== undefined) updates.countryCode = data.countryCode;
  if (data.regulatorSource !== undefined) updates.regulatorSource = data.regulatorSource;
  if (data.regulatorLicenseNo !== undefined) updates.regulatorLicenseNo = data.regulatorLicenseNo;
  if (data.category !== undefined) updates.category = data.category;
  if (data.integrationMode !== undefined) updates.integrationMode = data.integrationMode;
  if (data.active !== undefined) updates.active = data.active ? 1 : 0;

  db.update(payer).set(updates as any).where(eq(payer.id, id)).run();

  const after = findPayerById(id)!;

  // Audit
  db.insert(payerAuditEvent).values({
    id: randomUUID(),
    tenantId: null,
    actorType: actor ? "user" : "system",
    actorId: actor ?? null,
    entityType: "payer",
    entityId: id,
    action: "update",
    beforeJson: JSON.stringify(before),
    afterJson: JSON.stringify(after),
    reason,
    evidenceSnapshotId: null,
    createdAt: now,
  }).run();

  return after;
}

export function deactivatePayer(id: string, reason: string, actor?: string): boolean {
  const result = updatePayer(id, { active: false }, reason, actor);
  return result !== null;
}

export function getPayerCount(): number {
  const db = getDb();
  const result = db.select({ count: sql<number>`count(*)` }).from(payer).get();
  return result?.count ?? 0;
}
