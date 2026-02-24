/**
 * Store Resolver — Selects PG or SQLite backend automatically
 *
 * Phase 102: Migrate Prototype Stores to PlatformStore
 * Phase 117: STORE_BACKEND env var + session/workqueue resolution
 *
 * STORE_BACKEND controls the backend:
 *   "auto"   (default) — PG if PLATFORM_PG_URL is set, else SQLite
 *   "pg"     — Force PG (fails fast if PLATFORM_PG_URL missing)
 *   "sqlite" — Force SQLite (local dev)
 *
 * All functions are async (Promises). When PG is configured, delegates
 * to PG repos. Otherwise, wraps synchronous SQLite repo calls in
 * Promise.resolve() for API compatibility.
 *
 * Usage:
 *   import { store } from "../platform/store-resolver.js";
 *   const payer = await store.payerRepo.findPayerById(id);
 *
 * Routes can import `store` and use identical function signatures
 * regardless of which backend is active. The `store.backend` property
 * indicates which backend is in use ("pg" | "sqlite").
 */

import { isPgConfigured } from "./pg/pg-db.js";

// SQLite repos (sync)
import * as sqlitePayerRepo from "./db/repo/payer-repo.js";
import * as sqliteTenantPayerRepo from "./db/repo/tenant-payer-repo.js";
import * as sqliteCapabilityRepo from "./db/repo/capability-repo.js";
import * as sqliteTaskRepo from "./db/repo/task-repo.js";
import * as sqliteEvidenceRepo from "./db/repo/evidence-repo.js";
import * as sqliteAuditRepo from "./db/repo/audit-repo.js";

// PG repos (async)
import * as pgPayerRepo from "./pg/repo/payer-repo.js";
import * as pgTenantPayerRepo from "./pg/repo/tenant-payer-repo.js";
import * as pgCapabilityRepo from "./pg/repo/capability-repo.js";
import * as pgTaskRepo from "./pg/repo/task-repo.js";
import * as pgEvidenceRepo from "./pg/repo/evidence-repo.js";
import * as pgAuditRepo from "./pg/repo/audit-repo.js";

/* ----------------------------------------------------------------
 *  STORE_BACKEND resolution (Phase 117)
 * ---------------------------------------------------------------- */

export type StoreBackend = "pg" | "sqlite";

/**
 * Determine which backend to use based on STORE_BACKEND env var.
 *
 * "auto" (default): PG if PLATFORM_PG_URL is set, else SQLite.
 * "pg": Force PG — throws if PLATFORM_PG_URL missing.
 * "sqlite": Force SQLite.
 */
export function resolveBackend(): StoreBackend {
  const env = (process.env.STORE_BACKEND || "auto").toLowerCase().trim();

  if (env === "pg") {
    if (!isPgConfigured()) {
      throw new Error(
        "STORE_BACKEND=pg but PLATFORM_PG_URL is not set. " +
        "Set PLATFORM_PG_URL or use STORE_BACKEND=auto."
      );
    }
    return "pg";
  }

  if (env === "sqlite") {
    return "sqlite";
  }

  // auto: prefer PG when configured
  return isPgConfigured() ? "pg" : "sqlite";
}

/* ----------------------------------------------------------------
 *  Async wrappers for SQLite repos (sync → Promise)
 * ---------------------------------------------------------------- */

const sqlitePayerRepoAsync = {
  findPayerById: (id: string) =>
    Promise.resolve(sqlitePayerRepo.findPayerById(id)),
  listPayers: (filters?: Parameters<typeof sqlitePayerRepo.listPayers>[0]) =>
    Promise.resolve(sqlitePayerRepo.listPayers(filters)),
  insertPayer: (...args: Parameters<typeof sqlitePayerRepo.insertPayer>) =>
    Promise.resolve(sqlitePayerRepo.insertPayer(...args)),
  updatePayer: (...args: Parameters<typeof sqlitePayerRepo.updatePayer>) =>
    Promise.resolve(sqlitePayerRepo.updatePayer(...args)),
  deactivatePayer: (...args: Parameters<typeof sqlitePayerRepo.deactivatePayer>) =>
    Promise.resolve(sqlitePayerRepo.deactivatePayer(...args)),
  getPayerCount: () =>
    Promise.resolve(sqlitePayerRepo.getPayerCount()),
};

const sqliteAuditRepoAsync = {
  getAuditForEntity: (...args: Parameters<typeof sqliteAuditRepo.getAuditForEntity>) =>
    Promise.resolve(sqliteAuditRepo.getAuditForEntity(...args)),
  getAuditForPayer: (...args: Parameters<typeof sqliteAuditRepo.getAuditForPayer>) =>
    Promise.resolve(sqliteAuditRepo.getAuditForPayer(...args)),
  getAuditForTenant: (...args: Parameters<typeof sqliteAuditRepo.getAuditForTenant>) =>
    Promise.resolve(sqliteAuditRepo.getAuditForTenant(...args)),
  getRecentAudit: (...args: Parameters<typeof sqliteAuditRepo.getRecentAudit>) =>
    Promise.resolve(sqliteAuditRepo.getRecentAudit(...args)),
  getAuditStats: () =>
    Promise.resolve(sqliteAuditRepo.getAuditStats()),
  searchAudit: (...args: Parameters<typeof sqliteAuditRepo.searchAudit>) =>
    Promise.resolve(sqliteAuditRepo.searchAudit(...args)),
};

const sqliteCapabilityRepoAsync = {
  listCapabilities: (...args: Parameters<typeof sqliteCapabilityRepo.listCapabilities>) =>
    Promise.resolve(sqliteCapabilityRepo.listCapabilities(...args)),
  setCapability: (...args: Parameters<typeof sqliteCapabilityRepo.setCapability>) =>
    Promise.resolve(sqliteCapabilityRepo.setCapability(...args)),
  bulkSetCapabilities: (...args: Parameters<typeof sqliteCapabilityRepo.bulkSetCapabilities>) =>
    Promise.resolve(sqliteCapabilityRepo.bulkSetCapabilities(...args)),
  STANDARD_CAPABILITY_KEYS: sqliteCapabilityRepo.STANDARD_CAPABILITY_KEYS,
};

const sqliteTaskRepoAsync = {
  listTasks: (...args: Parameters<typeof sqliteTaskRepo.listTasks>) =>
    Promise.resolve(sqliteTaskRepo.listTasks(...args)),
  findTaskById: (...args: Parameters<typeof sqliteTaskRepo.findTaskById>) =>
    Promise.resolve(sqliteTaskRepo.findTaskById(...args)),
  createTask: (...args: Parameters<typeof sqliteTaskRepo.createTask>) =>
    Promise.resolve(sqliteTaskRepo.createTask(...args)),
  updateTaskStatus: (...args: Parameters<typeof sqliteTaskRepo.updateTaskStatus>) =>
    Promise.resolve(sqliteTaskRepo.updateTaskStatus(...args)),
};

const sqliteEvidenceRepoAsync = {
  findEvidenceById: (...args: Parameters<typeof sqliteEvidenceRepo.findEvidenceById>) =>
    Promise.resolve(sqliteEvidenceRepo.findEvidenceById(...args)),
  listEvidence: (...args: Parameters<typeof sqliteEvidenceRepo.listEvidence>) =>
    Promise.resolve(sqliteEvidenceRepo.listEvidence(...args)),
  listEvidenceByStatus: (...args: Parameters<typeof sqliteEvidenceRepo.listEvidenceByStatus>) =>
    Promise.resolve(sqliteEvidenceRepo.listEvidenceByStatus(...args)),
  insertEvidence: (...args: Parameters<typeof sqliteEvidenceRepo.insertEvidence>) =>
    Promise.resolve(sqliteEvidenceRepo.insertEvidence(...args)),
  updateEvidenceStatus: (...args: Parameters<typeof sqliteEvidenceRepo.updateEvidenceStatus>) =>
    Promise.resolve(sqliteEvidenceRepo.updateEvidenceStatus(...args)),
};

const sqliteTenantPayerRepoAsync = {
  findTenantPayer: (...args: Parameters<typeof sqliteTenantPayerRepo.findTenantPayer>) =>
    Promise.resolve(sqliteTenantPayerRepo.findTenantPayer(...args)),
  listTenantPayers: (...args: Parameters<typeof sqliteTenantPayerRepo.listTenantPayers>) =>
    Promise.resolve(sqliteTenantPayerRepo.listTenantPayers(...args)),
  upsertTenantPayer: (...args: Parameters<typeof sqliteTenantPayerRepo.upsertTenantPayer>) =>
    Promise.resolve(sqliteTenantPayerRepo.upsertTenantPayer(...args)),
};

/* ----------------------------------------------------------------
 *  Store resolver
 * ---------------------------------------------------------------- */

export interface ResolvedStore {
  backend: StoreBackend;
  payerRepo: typeof pgPayerRepo;
  auditRepo: typeof pgAuditRepo;
  capabilityRepo: typeof pgCapabilityRepo;
  taskRepo: typeof pgTaskRepo;
  evidenceRepo: typeof pgEvidenceRepo;
  tenantPayerRepo: typeof pgTenantPayerRepo;
}

/**
 * Resolve the active store backend.
 * Call once at route initialization or per-request.
 */
export function resolveStore(): ResolvedStore {
  const backend = resolveBackend();

  if (backend === "pg") {
    return {
      backend: "pg",
      payerRepo: pgPayerRepo,
      auditRepo: pgAuditRepo,
      capabilityRepo: pgCapabilityRepo,
      taskRepo: pgTaskRepo,
      evidenceRepo: pgEvidenceRepo,
      tenantPayerRepo: pgTenantPayerRepo,
    };
  }

  return {
    backend: "sqlite",
    payerRepo: sqlitePayerRepoAsync as unknown as typeof pgPayerRepo,
    auditRepo: sqliteAuditRepoAsync as unknown as typeof pgAuditRepo,
    capabilityRepo: sqliteCapabilityRepoAsync as unknown as typeof pgCapabilityRepo,
    taskRepo: sqliteTaskRepoAsync as unknown as typeof pgTaskRepo,
    evidenceRepo: sqliteEvidenceRepoAsync as unknown as typeof pgEvidenceRepo,
    tenantPayerRepo: sqliteTenantPayerRepoAsync as unknown as typeof pgTenantPayerRepo,
  };
}

/** Convenience: pre-resolved store instance (re-evaluates on each access). */
export const store = new Proxy({} as ResolvedStore, {
  get(_target, prop: string) {
    return resolveStore()[prop as keyof ResolvedStore];
  },
});
