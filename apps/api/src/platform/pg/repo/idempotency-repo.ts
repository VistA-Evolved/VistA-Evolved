/**
 * PG-backed idempotency repository.
 *
 * Persists the request deduplication keys used by middleware/idempotency.ts
 * so retried writes remain safe across API restarts and multi-instance
 * deployments.
 */

import { and, eq, lt } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { idempotencyKey } from '../pg-schema.js';

function decodeBody(body: string | null): unknown {
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export async function upsertKey(data: {
  tenantId: string;
  key: string;
  method: string;
  path: string;
  statusCode: number;
  responseBody: string | null;
  createdAt: number;
  expiresAt: number;
}): Promise<void> {
  const db = getPgDb();
  const values = {
    tenantId: data.tenantId,
    key: data.key,
    method: data.method,
    path: data.path,
    statusCode: data.statusCode > 0 ? data.statusCode : null,
    responseBody: decodeBody(data.responseBody),
    expiresAt: new Date(data.expiresAt),
  };

  await db
    .insert(idempotencyKey)
    .values({
      ...values,
      createdAt: new Date(data.createdAt),
    })
    .onConflictDoUpdate({
      target: [idempotencyKey.tenantId, idempotencyKey.key],
      set: values,
    });
}

export async function findByKey(
  tenantId: string,
  key: string
): Promise<
  | {
      tenantId: string;
      key: string;
      method: string;
      path: string;
      statusCode: number;
      responseBody: string | null;
      createdAt: number;
      expiresAt: number;
    }
  | undefined
> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(idempotencyKey)
    .where(and(eq(idempotencyKey.tenantId, tenantId), eq(idempotencyKey.key, key)))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;

  return {
    tenantId: row.tenantId,
    key: row.key,
    method: row.method,
    path: row.path,
    statusCode: row.statusCode ?? 0,
    responseBody: row.responseBody == null ? null : JSON.stringify(row.responseBody),
    createdAt: new Date(row.createdAt).getTime(),
    expiresAt: new Date(row.expiresAt).getTime(),
  };
}

export async function deleteKey(tenantId: string, key: string): Promise<void> {
  const db = getPgDb();
  await db
    .delete(idempotencyKey)
    .where(and(eq(idempotencyKey.tenantId, tenantId), eq(idempotencyKey.key, key)));
}

export async function pruneExpiredKeys(): Promise<void> {
  const db = getPgDb();
  await db.delete(idempotencyKey).where(lt(idempotencyKey.expiresAt, new Date()));
}
