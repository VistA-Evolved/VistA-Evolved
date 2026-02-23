/**
 * Platform DB — Tenant Context Manager
 *
 * Phase 101: Platform Data Architecture Convergence
 *
 * Provides tenant-scoped query helpers that automatically inject
 * tenant_id into all operations. This is the PRIMARY enforcement
 * mechanism for data isolation — RLS is defense-in-depth.
 *
 * Usage:
 *   const ctx = createTenantContext('tenant-abc');
 *   const payers = await ctx.query((db) =>
 *     db.select().from(pgSchema.payer).where(eq(pgSchema.payer.tenantId, ctx.tenantId))
 *   );
 *
 * The context also sets the Postgres session variable for RLS:
 *   SET LOCAL app.current_tenant_id = 'tenant-abc'
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { getPgPool, type PgDb } from "./pg-db.js";

export interface TenantContext {
  /** The tenant ID for this context. */
  tenantId: string;

  /**
   * Execute a query function within tenant scope.
   * Sets the Postgres session variable before running the callback.
   */
  query: <T>(fn: (db: PgDb) => T | Promise<T>) => Promise<T>;

  /**
   * Execute raw SQL within tenant scope.
   * Automatically sets app.current_tenant_id for the transaction.
   */
  rawQuery: <T = any>(sql: string, params?: any[]) => Promise<T[]>;

  /**
   * Execute a transactional block within tenant scope.
   * BEGIN + SET LOCAL + callback + COMMIT (or ROLLBACK on error).
   */
  transaction: <T>(fn: (db: PgDb) => T | Promise<T>) => Promise<T>;
}

/**
 * Create a tenant-scoped context for database operations.
 * All queries run through this context get tenant_id enforcement.
 *
 * @param tenantId - The tenant identifier. Must not be empty.
 * @throws Error if tenantId is empty or contains SQL injection patterns.
 */
export function createTenantContext(tenantId: string): TenantContext {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error("tenantId must not be empty");
  }

  // Basic SQL injection guard (defense-in-depth; parameterized queries are the real protection)
  if (/[';\\]/.test(tenantId)) {
    throw new Error("tenantId contains invalid characters");
  }

  return {
    tenantId,

    async query<T>(fn: (db: PgDb) => T | Promise<T>): Promise<T> {
      const pool = getPgPool();
      const client = await pool.connect();
      try {
        // Set tenant context for RLS (transaction-local)
        await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
        // Create a Drizzle instance bound to THIS client (not the pool)
        // so that RLS context set above applies to all queries in the callback.
        const db = drizzle(client as any) as unknown as PgDb;
        return await fn(db);
      } finally {
        client.release();
      }
    },

    async rawQuery<T = any>(sql: string, params?: any[]): Promise<T[]> {
      const pool = getPgPool();
      const client = await pool.connect();
      try {
        await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
        const result = await client.query(sql, params);
        return result.rows as T[];
      } finally {
        client.release();
      }
    },

    async transaction<T>(fn: (db: PgDb) => T | Promise<T>): Promise<T> {
      const pool = getPgPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
        // Create a Drizzle instance bound to THIS client (not the pool)
        // so that BEGIN + RLS context apply to all queries in the callback.
        const db = drizzle(client as any) as unknown as PgDb;
        const result = await fn(db);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

/**
 * Default tenant context for single-tenant (dev/sandbox) mode.
 * Uses 'default' as the tenant ID.
 */
export function defaultTenantContext(): TenantContext {
  return createTenantContext("default");
}
