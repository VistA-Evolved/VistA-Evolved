/**
 * Generic PG Repository — SQL-based CRUD for Phase 146 durability stores
 *
 * Phase 146: Durability Wave 3 — Critical Map Stores to PG
 *
 * Instead of creating individual Drizzle ORM schemas for each of the 30+ new
 * tables, this module provides a generic SQL repo factory. Each store gets a
 * typed interface through a lightweight wrapper over getPgPool().
 *
 * Pattern:
 *   const repo = createPgRepo<MyType>('my_table', ['id', 'tenant_id', 'name', ...]);
 *   await repo.insert({ id: '...', tenantId: '...', name: '...' });
 *   const row = await repo.findById('some-id');
 *   const rows = await repo.findByTenant('default');
 *
 * Column mapping: camelCase JS properties are auto-converted to snake_case SQL columns.
 */

import { getPgPool } from "../pg-db.js";
import { log } from "../../../lib/logger.js";

/* ── Helpers ──────────────────────────────────────────────── */

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function rowToObj<T>(row: Record<string, unknown>): T {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    obj[snakeToCamel(k)] = v;
  }
  return obj as T;
}

function objToRow(data: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      row[camelToSnake(k)] = v;
    }
  }
  return row;
}

/* ── Generic Repo Interface ──────────────────────────────── */

export interface GenericPgRepo<T extends { id: string }> {
  insert(data: Partial<T> & { id: string }): Promise<T | null>;
  upsert(data: Partial<T> & { id: string }): Promise<T | null>;
  findById(id: string): Promise<T | null>;
  findByTenant(tenantId: string, opts?: { limit?: number; offset?: number }): Promise<T[]>;
  findByField(field: string, value: unknown, tenantId?: string): Promise<T[]>;
  update(id: string, updates: Partial<T>): Promise<T | null>;
  deleteById(id: string): Promise<boolean>;
  count(tenantId?: string): Promise<number>;
  query(sql: string, params: unknown[]): Promise<T[]>;
}

/* ── Factory ─────────────────────────────────────────────── */

export function createPgRepo<T extends { id: string }>(
  tableName: string,
): GenericPgRepo<T> {
  const pool = getPgPool();

  async function safeQuery(label: string, fn: () => Promise<any>): Promise<any> {
    try {
      return await fn();
    } catch (err: any) {
      log.warn(`[pg-repo:${tableName}] ${label} failed`, { err: err?.message });
      return null;
    }
  }

  return {
    async insert(data) {
      const row = objToRow(data as Record<string, unknown>);
      const cols = Object.keys(row);
      const vals = Object.values(row);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const colStr = cols.join(", ");

      return safeQuery("insert", async () => {
        await pool.query(
          `INSERT INTO ${tableName} (${colStr}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
          vals,
        );
        return this.findById(data.id);
      });
    },

    async upsert(data) {
      const row = objToRow(data as Record<string, unknown>);
      const cols = Object.keys(row);
      const vals = Object.values(row);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const colStr = cols.join(", ");
      const updateCols = cols
        .filter((c) => c !== "id")
        .map((c) => `${c} = EXCLUDED.${c}`)
        .join(", ");

      return safeQuery("upsert", async () => {
        await pool.query(
          `INSERT INTO ${tableName} (${colStr}) VALUES (${placeholders})
           ON CONFLICT (id) DO UPDATE SET ${updateCols || "id = EXCLUDED.id"}`,
          vals,
        );
        return this.findById(data.id);
      });
    },

    async findById(id) {
      return safeQuery("findById", async () => {
        const res = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
        return res.rows[0] ? rowToObj<T>(res.rows[0]) : null;
      });
    },

    async findByTenant(tenantId, opts) {
      return safeQuery("findByTenant", async () => {
        const limit = opts?.limit ?? 1000;
        const offset = opts?.offset ?? 0;
        const res = await pool.query(
          `SELECT * FROM ${tableName} WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
          [tenantId, limit, offset],
        );
        return (res.rows || []).map((r: any) => rowToObj<T>(r));
      }) ?? [];
    },

    async findByField(field, value, tenantId) {
      const snakeField = camelToSnake(field);
      return safeQuery("findByField", async () => {
        const where = tenantId
          ? `WHERE ${snakeField} = $1 AND tenant_id = $2`
          : `WHERE ${snakeField} = $1`;
        const params = tenantId ? [value, tenantId] : [value];
        const res = await pool.query(`SELECT * FROM ${tableName} ${where}`, params);
        return (res.rows || []).map((r: any) => rowToObj<T>(r));
      }) ?? [];
    },

    async update(id, updates) {
      const row = objToRow(updates as Record<string, unknown>);
      const cols = Object.keys(row);
      if (cols.length === 0) return this.findById(id);
      const sets = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");
      const vals = [id, ...Object.values(row)];

      return safeQuery("update", async () => {
        await pool.query(`UPDATE ${tableName} SET ${sets} WHERE id = $1`, vals);
        return this.findById(id);
      });
    },

    async deleteById(id) {
      return safeQuery("deleteById", async () => {
        const res = await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
        return (res.rowCount ?? 0) > 0;
      }) ?? false;
    },

    async count(tenantId) {
      return safeQuery("count", async () => {
        const where = tenantId ? `WHERE tenant_id = $1` : "";
        const params = tenantId ? [tenantId] : [];
        const res = await pool.query(`SELECT COUNT(*) as cnt FROM ${tableName} ${where}`, params);
        return parseInt(res.rows[0]?.cnt ?? "0", 10);
      }) ?? 0;
    },

    async query(sqlStr, params) {
      return safeQuery("query", async () => {
        const res = await pool.query(sqlStr, params);
        return (res.rows || []).map((r: any) => rowToObj<T>(r));
      }) ?? [];
    },
  };
}
