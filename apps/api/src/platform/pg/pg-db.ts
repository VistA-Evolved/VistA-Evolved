/**
 * Platform DB — PostgreSQL Connection Manager
 *
 * Phase 101: Platform Data Architecture Convergence
 *
 * Uses node-postgres (pg) + drizzle-orm/node-postgres.
 * Connection pool with configurable min/max connections.
 *
 * The Postgres DB is OPTIONAL in dev (SQLite remains primary until
 * full migration). Set PLATFORM_PG_URL to enable.
 *
 * Connection string format:
 *   postgresql://ve_api:password@127.0.0.1:5433/ve_platform
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { readFileSync } from "node:fs";
import * as schema from "./pg-schema.js";

const { Pool } = pg;

export type PgDb = ReturnType<typeof drizzle<typeof schema>>;

let pool: pg.Pool | null = null;
let drizzleInstance: PgDb | null = null;

/** Check if Postgres is configured (env var present). */
export function isPgConfigured(): boolean {
  return !!process.env.PLATFORM_PG_URL;
}

/**
 * Get the Drizzle ORM instance backed by Postgres.
 * Creates the pool on first call. Throws if PLATFORM_PG_URL is not set.
 */
export function getPgDb(): PgDb {
  if (drizzleInstance) return drizzleInstance;

  const connectionString = process.env.PLATFORM_PG_URL;
  if (!connectionString) {
    throw new Error(
      "PLATFORM_PG_URL is not set. " +
      "Set it to postgresql://ve_api:password@127.0.0.1:5433/ve_platform " +
      "or start services/platform-db via docker compose."
    );
  }

  const poolMin = Number(process.env.PLATFORM_PG_POOL_MIN) || 2;
  const poolMax = Number(process.env.PLATFORM_PG_POOL_MAX) || 10;
  const statementTimeoutMs = Number(process.env.PLATFORM_PG_STATEMENT_TIMEOUT_MS) || 30_000;
  const idleTxTimeoutMs = Number(process.env.PLATFORM_PG_IDLE_TX_TIMEOUT_MS) || 10_000;

  // TLS/SSL configuration for production
  // PLATFORM_PG_SSL: "true" | "require" | "verify-ca" | "verify-full" | "false"
  // PLATFORM_PG_SSL_CA: path to CA certificate file
  // PLATFORM_PG_SSL_CERT: path to client certificate file (mutual TLS)
  // PLATFORM_PG_SSL_KEY: path to client private key file (mutual TLS)
  let sslConfig: boolean | pg.ConnectionConfig["ssl"] = false;
  const sslMode = process.env.PLATFORM_PG_SSL ?? "";
  if (sslMode === "true" || sslMode === "require") {
    sslConfig = { rejectUnauthorized: false };
  } else if (sslMode === "verify-ca" || sslMode === "verify-full") {
    sslConfig = {
      rejectUnauthorized: true,
      ca: process.env.PLATFORM_PG_SSL_CA
        ? readFileSync(process.env.PLATFORM_PG_SSL_CA, "utf-8")
        : undefined,
      cert: process.env.PLATFORM_PG_SSL_CERT
        ? readFileSync(process.env.PLATFORM_PG_SSL_CERT, "utf-8")
        : undefined,
      key: process.env.PLATFORM_PG_SSL_KEY
        ? readFileSync(process.env.PLATFORM_PG_SSL_KEY, "utf-8")
        : undefined,
    };
  }

  pool = new Pool({
    connectionString,
    min: poolMin,
    max: poolMax,
    // Idle timeout: close connections idle for 30s
    idleTimeoutMillis: 30_000,
    // Connection timeout: fail fast if can't connect in 5s
    connectionTimeoutMillis: 5_000,
    // Statement timeout: kill queries running longer than threshold
    statement_timeout: statementTimeoutMs,
    // Idle in transaction timeout: kill sessions idle inside a BEGIN
    idle_in_transaction_session_timeout: idleTxTimeoutMs,
    // TLS/SSL: configured via PLATFORM_PG_SSL env var
    ...(sslConfig ? { ssl: sslConfig } : {}),
  });

  // Log pool errors (don't crash)
  pool.on("error", (err) => {
    // Use console.error as a fallback — the structured logger may import
    // from modules that depend on this file, creating circular deps.
    console.error("[platform-pg] Pool error:", err.message);
  });

  drizzleInstance = drizzle(pool, { schema });
  return drizzleInstance;
}

/**
 * Get the raw pg.Pool instance (for migrations or raw SQL).
 * Ensures the pool is created first.
 */
export function getPgPool(): pg.Pool {
  if (!pool) {
    getPgDb(); // ensures pool is created
  }
  return pool!;
}

/**
 * Close the Postgres connection pool. Called during graceful shutdown.
 * Safe to call multiple times.
 */
export async function closePgDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    drizzleInstance = null;
  }
}

/**
 * Health check — verify the pool can execute a query.
 * Returns { ok, latencyMs, poolSize, idleCount, waitingCount }.
 */
export async function pgHealthCheck(): Promise<{
  ok: boolean;
  latencyMs?: number;
  poolSize?: number;
  idleCount?: number;
  waitingCount?: number;
  error?: string;
}> {
  if (!pool) {
    return { ok: false, error: "Pool not initialized" };
  }

  const start = Date.now();
  try {
    await pool.query("SELECT 1");
    return {
      ok: true,
      latencyMs: Date.now() - start,
      poolSize: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: err.message };
  }
}
