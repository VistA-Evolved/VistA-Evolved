/**
 * data-plane-sharding.ts -- Data Plane Sharding Service
 *
 * Phase 330 (W15-P4)
 *
 * Maps tenants to regional PG clusters (per ADR-TENANT-SHARDING and
 * ADR-MULTI-REGION-POSTGRES). Provides shard-aware connection routing,
 * cross-shard query prohibition, and shard health monitoring.
 *
 * Key decisions:
 * - Per-region DB cluster = "shard" (not per-tenant database)
 * - Active-passive streaming replication within each shard
 * - RLS enforces tenant isolation within a shard
 * - Cross-shard queries are structurally impossible (no cross-pool access)
 */

import { randomUUID } from "node:crypto";
import { isPgConfigured, getPgPool } from "../platform/pg/pg-db.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ShardStatus = "active" | "readonly" | "draining" | "offline" | "promoting";
export type ReplicationRole = "primary" | "standby" | "async_standby";

export interface DataShard {
  id: string;
  name: string;                    // e.g., "shard-us-east-1"
  region: string;
  clusterId: string;               // references platform_cluster
  connectionRef: string;           // logical ref (resolved via env or vault)
  replicationRole: ReplicationRole;
  status: ShardStatus;
  maxTenants: number;
  currentTenantCount: number;
  replicationLagMs: number | null; // populated by health probes
  lastHealthCheck: string | null;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface TenantShardMapping {
  id: string;
  tenantId: string;
  shardId: string;
  region: string;
  active: boolean;
  migrationState: "stable" | "migrating_out" | "migrating_in" | "cutover_pending";
  createdAt: string;
  updatedAt: string;
}

export interface ShardHealthProbe {
  shardId: string;
  timestamp: string;
  reachable: boolean;
  replicationLagMs: number | null;
  connectionPoolActive: number;
  connectionPoolIdle: number;
  connectionPoolWaiting: number;
  avgQueryTimeMs: number | null;
}

export interface ShardMigrationPlan {
  id: string;
  tenantId: string;
  fromShardId: string;
  toShardId: string;
  status: "planned" | "in_progress" | "cutover_pending" | "completed" | "rolled_back";
  steps: ShardMigrationStep[];
  createdAt: string;
  updatedAt: string;
  actor: string;
}

export interface ShardMigrationStep {
  name: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

// ─── In-Memory Stores ───────────────────────────────────────────────────────

const shardStore = new Map<string, DataShard>();
const shardByRegion = new Map<string, string[]>();              // region → shard IDs
const mappingStore = new Map<string, TenantShardMapping>();     // id → mapping
const mappingByTenant = new Map<string, string>();              // tenantId → mapping id (active)
const healthStore = new Map<string, ShardHealthProbe>();        // shardId → latest
const migrationStore = new Map<string, ShardMigrationPlan>();   // id → plan

const auditLog: Array<{ ts: string; action: string; actor: string; detail: Record<string, unknown> }> = [];
const MAX_AUDIT = 10_000;

// ─── Shard CRUD ─────────────────────────────────────────────────────────────

export function registerShard(input: {
  name: string;
  region: string;
  clusterId: string;
  connectionRef: string;
  replicationRole?: ReplicationRole;
  maxTenants?: number;
  metadata?: Record<string, string>;
}, actor: string): DataShard {
  const existing = Array.from(shardStore.values()).find(
    (s) => s.name === input.name && s.status !== "offline"
  );
  if (existing) {
    throw Object.assign(new Error(`Shard "${input.name}" already exists`), { statusCode: 409 });
  }

  const shard: DataShard = {
    id: randomUUID(),
    name: input.name,
    region: input.region,
    clusterId: input.clusterId,
    connectionRef: input.connectionRef,
    replicationRole: input.replicationRole || "primary",
    status: "active",
    maxTenants: input.maxTenants || 500,
    currentTenantCount: 0,
    replicationLagMs: null,
    lastHealthCheck: null,
    metadata: input.metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  shardStore.set(shard.id, shard);

  // Index by region
  const regionShards = shardByRegion.get(shard.region) || [];
  regionShards.push(shard.id);
  shardByRegion.set(shard.region, regionShards);

  appendAudit("shard.register", actor, { shardId: shard.id, name: shard.name, region: shard.region });
  return shard;
}

export function listShards(filters?: {
  region?: string;
  status?: ShardStatus;
  replicationRole?: ReplicationRole;
}): DataShard[] {
  let results = Array.from(shardStore.values());
  if (filters?.region) results = results.filter((s) => s.region === filters.region);
  if (filters?.status) results = results.filter((s) => s.status === filters.status);
  if (filters?.replicationRole) results = results.filter((s) => s.replicationRole === filters.replicationRole);
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export function getShard(id: string): DataShard | undefined {
  return shardStore.get(id);
}

export function updateShardStatus(id: string, status: ShardStatus, actor: string): DataShard {
  const shard = shardStore.get(id);
  if (!shard) throw Object.assign(new Error("Shard not found"), { statusCode: 404 });

  const VALID_TRANSITIONS: Record<ShardStatus, ShardStatus[]> = {
    active: ["readonly", "draining", "offline"],
    readonly: ["active", "draining", "offline"],
    draining: ["offline", "active"],
    offline: ["active", "promoting"],
    promoting: ["active", "offline"],
  };

  if (!VALID_TRANSITIONS[shard.status]?.includes(status)) {
    throw Object.assign(
      new Error(`Invalid shard transition: ${shard.status} -> ${status}`),
      { statusCode: 400 },
    );
  }

  const prev = shard.status;
  shard.status = status;
  shard.updatedAt = new Date().toISOString();
  shardStore.set(id, shard);
  appendAudit("shard.status_change", actor, { shardId: id, from: prev, to: status });
  return shard;
}

// ─── Shard Health ───────────────────────────────────────────────────────────

export function recordShardHealth(probe: ShardHealthProbe): void {
  healthStore.set(probe.shardId, probe);

  // Update shard lag
  const shard = shardStore.get(probe.shardId);
  if (shard) {
    shard.replicationLagMs = probe.replicationLagMs;
    shard.lastHealthCheck = probe.timestamp;
    shardStore.set(probe.shardId, shard);
  }
}

export function getShardHealth(shardId: string): ShardHealthProbe | undefined {
  return healthStore.get(shardId);
}

export function listShardHealth(): ShardHealthProbe[] {
  return Array.from(healthStore.values());
}

// ─── Tenant-Shard Mapping ───────────────────────────────────────────────────

/**
 * Map a tenant to a shard. Shard selection is deterministic:
 * 1. Filter by region matching tenant's placement
 * 2. Exclude draining/offline shards
 * 3. Choose shard with lowest tenant count ratio
 * 4. Tiebreak by shard name
 */
export function mapTenantToShard(input: {
  tenantId: string;
  region: string;
  shardId?: string; // explicit shard override
}, actor: string): TenantShardMapping {
  // Check existing mapping
  const existingId = mappingByTenant.get(input.tenantId);
  if (existingId) {
    const existing = mappingStore.get(existingId);
    if (existing?.active) {
      throw Object.assign(
        new Error(`Tenant "${input.tenantId}" already mapped to shard`),
        { statusCode: 409 },
      );
    }
  }

  let chosenShard: DataShard;

  if (input.shardId) {
    // Explicit shard selection
    const shard = shardStore.get(input.shardId);
    if (!shard) throw Object.assign(new Error("Shard not found"), { statusCode: 404 });
    if (shard.status !== "active") {
      throw Object.assign(new Error(`Shard "${shard.name}" is not active (${shard.status})`), { statusCode: 400 });
    }
    chosenShard = shard;
  } else {
    // Deterministic selection
    const regionShardIds = shardByRegion.get(input.region) || [];
    const candidates = regionShardIds
      .map((id) => shardStore.get(id)!)
      .filter((s) => s && s.status === "active" && s.currentTenantCount < s.maxTenants);

    if (candidates.length === 0) {
      throw Object.assign(
        new Error(`No available shards in region "${input.region}"`),
        { statusCode: 503 },
      );
    }

    candidates.sort((a, b) => {
      const ratioA = a.currentTenantCount / Math.max(a.maxTenants, 1);
      const ratioB = b.currentTenantCount / Math.max(b.maxTenants, 1);
      return ratioA !== ratioB ? ratioA - ratioB : a.name.localeCompare(b.name);
    });

    chosenShard = candidates[0];
  }

  const mapping: TenantShardMapping = {
    id: randomUUID(),
    tenantId: input.tenantId,
    shardId: chosenShard.id,
    region: chosenShard.region,
    active: true,
    migrationState: "stable",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mappingStore.set(mapping.id, mapping);
  mappingByTenant.set(input.tenantId, mapping.id);
  chosenShard.currentTenantCount++;
  shardStore.set(chosenShard.id, chosenShard);

  appendAudit("tenant.shard_mapped", actor, {
    tenantId: input.tenantId,
    shardId: chosenShard.id,
    shardName: chosenShard.name,
    region: chosenShard.region,
  });

  return mapping;
}

export function getTenantShard(tenantId: string): {
  mapping: TenantShardMapping;
  shard: DataShard;
} | undefined {
  const mappingId = mappingByTenant.get(tenantId);
  if (!mappingId) return undefined;
  const mapping = mappingStore.get(mappingId);
  if (!mapping || !mapping.active) return undefined;
  const shard = shardStore.get(mapping.shardId);
  if (!shard) return undefined;
  return { mapping, shard };
}

export function listShardMappings(filters?: {
  shardId?: string;
  region?: string;
  active?: boolean;
}): TenantShardMapping[] {
  let results = Array.from(mappingStore.values());
  if (filters?.shardId) results = results.filter((m) => m.shardId === filters.shardId);
  if (filters?.region) results = results.filter((m) => m.region === filters.region);
  if (filters?.active !== undefined) results = results.filter((m) => m.active === filters.active);
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─── Cross-Shard Query Guard ────────────────────────────────────────────────

/**
 * Validate that a query target is on the same shard as the requesting tenant.
 * Prevents cross-shard data access at the application layer.
 */
export function validateSameShardAccess(
  requestingTenantId: string,
  targetTenantId: string,
): { allowed: boolean; reason: string } {
  if (requestingTenantId === targetTenantId) {
    return { allowed: true, reason: "same tenant" };
  }

  const requestorShard = getTenantShard(requestingTenantId);
  const targetShard = getTenantShard(targetTenantId);

  if (!requestorShard || !targetShard) {
    return { allowed: false, reason: "one or both tenants not shard-mapped" };
  }

  if (requestorShard.shard.id !== targetShard.shard.id) {
    return {
      allowed: false,
      reason: `cross-shard access prohibited: ${requestorShard.shard.name} != ${targetShard.shard.name}`,
    };
  }

  return { allowed: true, reason: "same shard" };
}

// ─── Shard Migration Planning ───────────────────────────────────────────────

const MIGRATION_STEPS: string[] = [
  "validate_target_shard",
  "create_target_schema",
  "start_data_sync",
  "verify_sync_complete",
  "set_source_readonly",
  "final_sync_delta",
  "update_routing",
  "verify_target_serving",
  "cleanup_source",
];

export function createMigrationPlan(input: {
  tenantId: string;
  toShardId: string;
}, actor: string): ShardMigrationPlan {
  const currentMapping = getTenantShard(input.tenantId);
  if (!currentMapping) {
    throw Object.assign(new Error("Tenant has no shard mapping"), { statusCode: 404 });
  }

  const toShard = shardStore.get(input.toShardId);
  if (!toShard) throw Object.assign(new Error("Target shard not found"), { statusCode: 404 });
  if (toShard.status !== "active") {
    throw Object.assign(new Error("Target shard must be active"), { statusCode: 400 });
  }

  if (currentMapping.shard.id === input.toShardId) {
    throw Object.assign(new Error("Tenant already on target shard"), { statusCode: 400 });
  }

  const plan: ShardMigrationPlan = {
    id: randomUUID(),
    tenantId: input.tenantId,
    fromShardId: currentMapping.shard.id,
    toShardId: input.toShardId,
    status: "planned",
    steps: MIGRATION_STEPS.map((name) => ({
      name,
      status: "pending" as const,
      startedAt: null,
      completedAt: null,
      error: null,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    actor,
  };

  migrationStore.set(plan.id, plan);
  appendAudit("shard.migration_planned", actor, {
    tenantId: input.tenantId,
    fromShard: currentMapping.shard.name,
    toShard: toShard.name,
    planId: plan.id,
  });

  return plan;
}

export function getMigrationPlan(id: string): ShardMigrationPlan | undefined {
  return migrationStore.get(id);
}

export function listMigrationPlans(filters?: {
  tenantId?: string;
  status?: string;
}): ShardMigrationPlan[] {
  let results = Array.from(migrationStore.values());
  if (filters?.tenantId) results = results.filter((p) => p.tenantId === filters.tenantId);
  if (filters?.status) results = results.filter((p) => p.status === filters.status);
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─── Summary ────────────────────────────────────────────────────────────────

export function getShardingSummary(): {
  totalShards: number;
  shardsByRegion: Record<string, number>;
  shardsByStatus: Record<string, number>;
  totalMappings: number;
  activeMappings: number;
  activeMigrations: number;
} {
  const shardsByRegion: Record<string, number> = {};
  const shardsByStatus: Record<string, number> = {};
  for (const s of shardStore.values()) {
    shardsByRegion[s.region] = (shardsByRegion[s.region] || 0) + 1;
    shardsByStatus[s.status] = (shardsByStatus[s.status] || 0) + 1;
  }

  let activeMappings = 0;
  for (const m of mappingStore.values()) if (m.active) activeMappings++;

  let activeMigrations = 0;
  for (const p of migrationStore.values()) {
    if (p.status === "in_progress" || p.status === "cutover_pending") activeMigrations++;
  }

  return {
    totalShards: shardStore.size,
    shardsByRegion,
    shardsByStatus,
    totalMappings: mappingStore.size,
    activeMappings,
    activeMigrations,
  };
}

// ─── Audit ──────────────────────────────────────────────────────────────────

function appendAudit(action: string, actor: string, detail: Record<string, unknown>): void {
  auditLog.push({ ts: new Date().toISOString(), action, actor, detail });
  if (auditLog.length > MAX_AUDIT) auditLog.splice(0, auditLog.length - MAX_AUDIT);
}

export function getShardingAuditLog(limit = 100, offset = 0): typeof auditLog {
  return auditLog.slice().reverse().slice(offset, offset + limit);
}
