/**
 * Idempotency Repository — DB-backed request deduplication
 *
 * Phase 115: Durability Wave 2
 *
 * Stores idempotency keys with cached responses. Uses epoch ms
 * for timestamps (integer columns) for efficient expiry queries.
 */

import { eq, sql, lt } from "drizzle-orm";
import { getDb } from "../db.js";
import { idempotencyKey } from "../schema.js";

export type IdempotencyKeyRow = typeof idempotencyKey.$inferSelect;

/* ── Upsert / Insert ──────────────────────────────────────── */

export function upsertKey(data: {
  compositeKey: string;
  statusCode: number;
  responseBody: string | null;
  createdAt: number;
  expiresAt: number;
}): void {
  const db = getDb();
  // Use INSERT OR REPLACE for upsert semantics
  db.insert(idempotencyKey).values({
    compositeKey: data.compositeKey,
    statusCode: data.statusCode,
    responseBody: data.responseBody,
    createdAt: data.createdAt,
    expiresAt: data.expiresAt,
  }).onConflictDoUpdate({
    target: idempotencyKey.compositeKey,
    set: {
      statusCode: sql`excluded.status_code`,
      responseBody: sql`excluded.response_body`,
      expiresAt: sql`excluded.expires_at`,
    },
  }).run();
}

/* ── Lookup ────────────────────────────────────────────────── */

export function findByKey(compositeKey: string): IdempotencyKeyRow | undefined {
  const db = getDb();
  return db.select().from(idempotencyKey)
    .where(eq(idempotencyKey.compositeKey, compositeKey))
    .get();
}

/* ── Delete ────────────────────────────────────────────────── */

export function deleteKey(compositeKey: string): boolean {
  const db = getDb();
  const result = db.delete(idempotencyKey)
    .where(eq(idempotencyKey.compositeKey, compositeKey))
    .run();
  return result.changes > 0;
}

/* ── Cleanup expired ──────────────────────────────────────── */

export function pruneExpiredKeys(): number {
  const db = getDb();
  const now = Date.now();
  const result = db.delete(idempotencyKey)
    .where(lt(idempotencyKey.expiresAt, now))
    .run();
  return result.changes;
}

/* ── Count ─────────────────────────────────────────────────── */

export function countKeys(): number {
  const db = getDb();
  const result = db.select({ count: sql<number>`count(*)` })
    .from(idempotencyKey)
    .get();
  return result?.count ?? 0;
}
