/**
 * Platform DB — SQLite Connection Singleton
 *
 * Phase 95B: Platform Persistence Unification
 *
 * Uses better-sqlite3 + drizzle-orm. The DB file lives at
 * data/platform.db (relative to repo root). The path is
 * configurable via PLATFORM_DB_PATH env var.
 *
 * This is a synchronous SQLite driver — no connection pool needed.
 * For Postgres migration, swap this file to use drizzle-orm/node-postgres.
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync } from "node:fs";
import * as schema from "./schema.js";

const __dirname_resolved = typeof __dirname !== "undefined"
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(__dirname_resolved, "..", "..", "..", "..", "..");

function resolveDbPath(): string {
  if (process.env.PLATFORM_DB_PATH) {
    return process.env.PLATFORM_DB_PATH;
  }
  return join(REPO_ROOT, "data", "platform.db");
}

let sqliteInstance: Database.Database | null = null;
let drizzleInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Get the Drizzle ORM instance. Creates the DB file + connection on first call.
 * Thread-safe for single-process Node.js usage (which is our model).
 */
export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (drizzleInstance) return drizzleInstance;

  const dbPath = resolveDbPath();
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  sqliteInstance = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  sqliteInstance.pragma("journal_mode = WAL");
  // Enable foreign keys
  sqliteInstance.pragma("foreign_keys = ON");

  drizzleInstance = drizzle(sqliteInstance, { schema });
  return drizzleInstance;
}

/**
 * Get the raw better-sqlite3 instance (for migrations or raw SQL).
 */
export function getRawDb(): Database.Database {
  if (!sqliteInstance) {
    getDb(); // ensures sqliteInstance is created
  }
  return sqliteInstance!;
}

/**
 * Close the database connection. Called during graceful shutdown.
 */
export function closeDb(): void {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
    drizzleInstance = null;
  }
}

export { schema };
