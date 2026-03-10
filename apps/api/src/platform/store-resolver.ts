/**
 * Store Resolver -- PG-only backend
 *
 * Phase 102: Migrate Prototype Stores to PlatformStore
 * Phase 117: STORE_BACKEND env var + session/workqueue resolution
 * Phase 125: Postgres-only data plane enforcement for rc/prod
 * Phase 173: Removed all SQLite code -- PG is the sole backend
 *
 * PostgreSQL is required. PLATFORM_PG_URL must be set.
 *
 * Usage:
 *   import { store } from "../platform/store-resolver.js";
 *   const payer = await store.payerRepo.findPayerById(id);
 */

import { isPgConfigured } from './pg/pg-db.js';
import { requiresPg } from './runtime-mode.js';

// PG repos
import * as pgPayerRepo from './pg/repo/payer-repo.js';
import * as pgTenantPayerRepo from './pg/repo/tenant-payer-repo.js';
import * as pgCapabilityRepo from './pg/repo/capability-repo.js';
import * as pgTaskRepo from './pg/repo/task-repo.js';
import * as pgEvidenceRepo from './pg/repo/evidence-repo.js';
import * as pgAuditRepo from './pg/repo/audit-repo.js';

/* ----------------------------------------------------------------
 *  Backend type (PG-only)
 * ---------------------------------------------------------------- */

export type StoreBackend = 'pg';

/**
 * Returns "pg". Throws if PLATFORM_PG_URL is not configured.
 */
export function resolveBackend(): StoreBackend {
  // Phase 125: In rc/prod modes, PG is mandatory via runtime-mode contract
  if (requiresPg() && !isPgConfigured()) {
    throw new Error(
      'PLATFORM_PG_URL is not set. PostgreSQL is required in rc/prod mode. ' +
        'Set PLATFORM_PG_URL to enable the data store.'
    );
  }
  if (!isPgConfigured()) {
    throw new Error(
      'PLATFORM_PG_URL is not set. PostgreSQL is required. ' +
        'Set PLATFORM_PG_URL to enable the data store.'
    );
  }
  return 'pg';
}

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
 * Resolve the PG store backend.
 * Call once at route initialization or per-request.
 */
export function resolveStore(): ResolvedStore {
  resolveBackend(); // validates PG is configured

  return {
    backend: 'pg',
    payerRepo: pgPayerRepo,
    auditRepo: pgAuditRepo,
    capabilityRepo: pgCapabilityRepo,
    taskRepo: pgTaskRepo,
    evidenceRepo: pgEvidenceRepo,
    tenantPayerRepo: pgTenantPayerRepo,
  };
}

/** Convenience: pre-resolved store instance (re-evaluates on each access). */
export const store = new Proxy({} as ResolvedStore, {
  get(_target, prop: string) {
    return resolveStore()[prop as keyof ResolvedStore];
  },
});
