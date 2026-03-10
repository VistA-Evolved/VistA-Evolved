/**
 * Payer Repository (PostgreSQL) -- CRUD for the global payer table
 *
 * Phase 102: Migrate Prototype Stores to PlatformStore
 * Phase 104: Optimistic concurrency via version column
 *
 * Mirrors apps/api/src/platform/db/repo/payer-repo.ts but uses
 * Postgres via getPgDb() instead of SQLite via getDb().
 */

import { randomUUID } from 'node:crypto';
import { eq, and, or, sql, ilike } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { payer, payerAuditEvent } from '../pg-schema.js';

export type PayerRow = typeof payer.$inferSelect;
export type PayerInsert = typeof payer.$inferInsert;

/** Normalize aliases from either JSON string or raw array */
function normalizeAliases(aliases: unknown): unknown[] {
  if (!aliases) return [];
  if (Array.isArray(aliases)) return aliases;
  if (typeof aliases === 'string') {
    try {
      const parsed = JSON.parse(aliases);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function findPayerById(id: string): Promise<PayerRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(payer).where(eq(payer.id, id));
  return rows[0];
}

export async function listPayers(filters?: {
  countryCode?: string;
  active?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: PayerRow[]; total: number }> {
  const db = getPgDb();
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters?.countryCode) {
    conditions.push(eq(payer.countryCode, filters.countryCode));
  }
  if (filters?.active !== undefined) {
    conditions.push(eq(payer.active, filters.active));
  }
  if (filters?.search) {
    const term = `%${filters.search}%`;
    conditions.push(or(ilike(payer.canonicalName, term), ilike(payer.id, term))!);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payer)
    .where(where);
  const total = countResult[0]?.count ?? 0;

  // Fetch page
  let query = db.select().from(payer).where(where).orderBy(payer.canonicalName);
  if (filters?.limit) {
    query = query.limit(filters.limit) as typeof query;
  }
  if (filters?.offset) {
    query = query.offset(filters.offset) as typeof query;
  }
  const rows = await query;

  return { rows, total };
}

export async function insertPayer(
  data: Partial<PayerInsert> & { id: string; canonicalName: string },
  reason: string,
  actor?: string
): Promise<PayerRow> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const id = data.id;

  await db.insert(payer).values({
    id,
    tenantId: data.tenantId ?? 'default',
    canonicalName: data.canonicalName,
    aliases: normalizeAliases(data.aliases),
    countryCode: data.countryCode ?? 'PH',
    regulatorSource: data.regulatorSource ?? null,
    regulatorLicenseNo: data.regulatorLicenseNo ?? null,
    category: data.category ?? null,
    payerType: data.payerType ?? null,
    integrationMode: data.integrationMode ?? null,
    active: data.active ?? true,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  });

  // Audit trail
  const created = await findPayerById(id);
  await db.insert(payerAuditEvent).values({
    id: randomUUID(),
    tenantId: data.tenantId ?? null,
    actorType: actor ? 'user' : 'system',
    actorId: actor ?? null,
    entityType: 'payer',
    entityId: id,
    action: 'create',
    beforeJson: null,
    afterJson: created ? JSON.parse(JSON.stringify(created)) : null,
    reason,
    evidenceSnapshotId: null,
    createdAt: new Date(now),
  });

  return created!;
}

export async function updatePayer(
  id: string,
  updates: Partial<{
    canonicalName: string;
    aliases: unknown;
    countryCode: string;
    regulatorSource: string | null;
    regulatorLicenseNo: string | null;
    category: string | null;
    payerType: string | null;
    integrationMode: string | null;
    active: boolean;
  }>,
  reason: string,
  actor?: string,
  /** Expected version for optimistic concurrency. If provided, update fails if version doesn't match. */
  expectedVersion?: number
): Promise<PayerRow | null> {
  const db = getPgDb();
  const before = await findPayerById(id);
  if (!before) return null;

  // Optimistic concurrency check
  if (expectedVersion !== undefined) {
    const currentVersion = (before as any).version ?? 1;
    if (currentVersion !== expectedVersion) {
      const err: any = new Error(
        `Optimistic concurrency conflict: expected version ${expectedVersion}, found ${currentVersion}`
      );
      err.code = 'CONCURRENCY_CONFLICT';
      err.statusCode = 409;
      throw err;
    }
  }

  const now = new Date().toISOString();

  // Build the set clause -- use camelCase property names matching Drizzle schema
  const setObj: Record<string, unknown> = {
    updatedAt: new Date(now),
    updatedBy: actor ?? null,
  };
  if (updates.canonicalName !== undefined) setObj.canonicalName = updates.canonicalName;
  if (updates.aliases !== undefined) setObj.aliases = normalizeAliases(updates.aliases);
  if (updates.countryCode !== undefined) setObj.countryCode = updates.countryCode;
  if (updates.regulatorSource !== undefined) setObj.regulatorSource = updates.regulatorSource;
  if (updates.regulatorLicenseNo !== undefined)
    setObj.regulatorLicenseNo = updates.regulatorLicenseNo;
  if (updates.category !== undefined) setObj.category = updates.category;
  if (updates.payerType !== undefined) setObj.payerType = updates.payerType;
  if (updates.integrationMode !== undefined) setObj.integrationMode = updates.integrationMode;
  if (updates.active !== undefined) setObj.active = updates.active;

  // Increment version on every update (Phase 104 optimistic concurrency)
  setObj.version = sql`COALESCE(version, 1) + 1`;

  await db
    .update(payer)
    .set(setObj as any)
    .where(eq(payer.id, id));

  const after = await findPayerById(id);

  // Audit trail
  await db.insert(payerAuditEvent).values({
    id: randomUUID(),
    tenantId: before.tenantId ?? null,
    actorType: actor ? 'user' : 'system',
    actorId: actor ?? null,
    entityType: 'payer',
    entityId: id,
    action: 'update',
    beforeJson: JSON.parse(JSON.stringify(before)),
    afterJson: after ? JSON.parse(JSON.stringify(after)) : null,
    reason,
    evidenceSnapshotId: null,
    createdAt: new Date(now),
  });

  return after ?? null;
}

export async function deactivatePayer(
  id: string,
  reason: string,
  actor?: string
): Promise<PayerRow | null> {
  return updatePayer(id, { active: false }, reason, actor);
}

export async function getPayerCount(): Promise<number> {
  const db = getPgDb();
  const result = await db.select({ count: sql<number>`count(*)::int` }).from(payer);
  return result[0]?.count ?? 0;
}
