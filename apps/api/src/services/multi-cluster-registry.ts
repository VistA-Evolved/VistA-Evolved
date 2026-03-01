/**
 * multi-cluster-registry.ts -- Multi-Cluster Registry & Tenant Placement Service
 *
 * Phase 328 (W15-P2)
 *
 * Manages cluster registration, health tracking, and deterministic tenant placement.
 * In-memory stores + PG-backed for durability. Follows ADR-TENANT-SHARDING and
 * ADR-VISTA-PLACEMENT decisions from Phase 327.
 *
 * Placement policy engine:
 *   Inputs: tenant region preference, country pack, data residency constraints, plan tier
 *   Output: chosen cluster + region
 *   Must be deterministic and testable -- same inputs always produce same output.
 */

import { createHash, randomUUID } from "node:crypto";
import { getPgPool } from "../platform/pg/pg-db.js";
import { isPgConfigured } from "../platform/pg/pg-db.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ClusterStatus = "active" | "draining" | "standby" | "offline" | "decommissioned";
export type PlacementReason = "initial" | "migration" | "failover" | "data_residency" | "manual";
export type RegionTier = "primary" | "secondary" | "dr";
export type PlanTier = "free" | "starter" | "professional" | "enterprise";

export interface PlatformCluster {
  id: string;
  name: string;
  region: string;
  regionTier: RegionTier;
  kubeContextRef: string;
  status: ClusterStatus;
  pgConnectionRef: string;      // logical name for the PG cluster serving this region
  vistaPlacementMode: string;   // "per_tenant" per ADR-VISTA-PLACEMENT
  maxTenants: number;
  currentTenantCount: number;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface TenantPlacement {
  id: string;
  tenantId: string;
  clusterId: string;
  region: string;
  placementReason: PlacementReason;
  dataResidencyConstraint: string | null;  // e.g., "PH", "US", "EU"
  planTier: PlanTier;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlacementRequest {
  tenantId: string;
  preferredRegion?: string;
  countryPack?: string;
  dataResidencyConstraint?: string;
  planTier?: PlanTier;
  reason?: PlacementReason;
}

export interface PlacementResult {
  placement: TenantPlacement;
  chosenCluster: PlatformCluster;
  policyTrace: PolicyTraceEntry[];
}

export interface PolicyTraceEntry {
  step: string;
  input: string;
  decision: string;
}

export interface ClusterHealthSnapshot {
  clusterId: string;
  timestamp: string;
  pgReachable: boolean;
  vistaReachable: boolean;
  tenantCount: number;
  cpuPercent: number | null;     // from external metrics, null if unavailable
  memoryPercent: number | null;
  requestsPerMinute: number | null;
}

// ─── In-Memory Stores ───────────────────────────────────────────────────────

const clusterStore = new Map<string, PlatformCluster>();
const placementStore = new Map<string, TenantPlacement>();      // keyed by placement.id
const placementByTenant = new Map<string, string>();             // tenantId → placement.id (active)
const healthStore = new Map<string, ClusterHealthSnapshot>();    // clusterId → latest snapshot
const auditLog: Array<{ ts: string; action: string; actor: string; detail: Record<string, unknown> }> = [];

// ─── Cluster CRUD ───────────────────────────────────────────────────────────

export function registerCluster(
  input: {
    name: string;
    region: string;
    regionTier?: RegionTier;
    kubeContextRef: string;
    pgConnectionRef?: string;
    vistaPlacementMode?: string;
    maxTenants?: number;
    metadata?: Record<string, string>;
  },
  actor: string,
): PlatformCluster {
  const existing = Array.from(clusterStore.values()).find(
    (c) => c.name === input.name && c.status !== "decommissioned"
  );
  if (existing) {
    throw Object.assign(new Error(`Cluster "${input.name}" already exists (id=${existing.id})`), { statusCode: 409 });
  }

  const cluster: PlatformCluster = {
    id: randomUUID(),
    name: input.name,
    region: input.region,
    regionTier: input.regionTier || "primary",
    kubeContextRef: input.kubeContextRef,
    status: "active",
    pgConnectionRef: input.pgConnectionRef || "",
    vistaPlacementMode: input.vistaPlacementMode || "per_tenant",
    maxTenants: input.maxTenants ?? 200,
    currentTenantCount: 0,
    metadata: input.metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  clusterStore.set(cluster.id, cluster);
  appendAudit("cluster.register", actor, { clusterId: cluster.id, name: cluster.name, region: cluster.region });
  persistCluster(cluster);
  return cluster;
}

export function listClusters(filters?: { region?: string; status?: ClusterStatus }): PlatformCluster[] {
  let results = Array.from(clusterStore.values());
  if (filters?.region) results = results.filter((c) => c.region === filters.region);
  if (filters?.status) results = results.filter((c) => c.status === filters.status);
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export function getCluster(id: string): PlatformCluster | undefined {
  return clusterStore.get(id);
}

export function updateClusterStatus(id: string, status: ClusterStatus, actor: string): PlatformCluster {
  const cluster = clusterStore.get(id);
  if (!cluster) throw Object.assign(new Error("Cluster not found"), { statusCode: 404 });

  const VALID_TRANSITIONS: Record<ClusterStatus, ClusterStatus[]> = {
    active: ["draining", "standby", "offline"],
    draining: ["standby", "offline", "decommissioned"],
    standby: ["active", "offline", "decommissioned"],
    offline: ["active", "standby", "decommissioned"],
    decommissioned: [], // terminal
  };

  if (!VALID_TRANSITIONS[cluster.status]?.includes(status)) {
    throw Object.assign(
      new Error(`Invalid transition: ${cluster.status} → ${status}`),
      { statusCode: 400 },
    );
  }

  const prev = cluster.status;
  cluster.status = status;
  cluster.updatedAt = new Date().toISOString();
  clusterStore.set(id, cluster);
  appendAudit("cluster.status_change", actor, { clusterId: id, from: prev, to: status });
  persistCluster(cluster);
  return cluster;
}

export function updateClusterMetadata(
  id: string,
  metadata: Record<string, string>,
  actor: string,
): PlatformCluster {
  const cluster = clusterStore.get(id);
  if (!cluster) throw Object.assign(new Error("Cluster not found"), { statusCode: 404 });
  cluster.metadata = { ...cluster.metadata, ...metadata };
  cluster.updatedAt = new Date().toISOString();
  clusterStore.set(id, cluster);
  appendAudit("cluster.metadata_update", actor, { clusterId: id });
  persistCluster(cluster);
  return cluster;
}

// ─── Health Snapshots ───────────────────────────────────────────────────────

export function recordHealthSnapshot(snapshot: ClusterHealthSnapshot): void {
  healthStore.set(snapshot.clusterId, snapshot);
}

export function getHealthSnapshot(clusterId: string): ClusterHealthSnapshot | undefined {
  return healthStore.get(clusterId);
}

export function listHealthSnapshots(): ClusterHealthSnapshot[] {
  return Array.from(healthStore.values());
}

// ─── Deterministic Placement Engine ─────────────────────────────────────────

/**
 * Place a tenant onto a cluster. Deterministic: same inputs → same output.
 *
 * Policy steps (in order):
 * 1. Data residency filter — exclude clusters outside residency constraint
 * 2. Region preference — prefer clusters in the requested region
 * 3. Plan tier capacity — enterprise tenants get dedicated-capacity clusters
 * 4. Load balancing — choose the cluster with lowest tenant count ratio
 * 5. Tiebreak — lexicographic by cluster name for determinism
 */
export function placeTenant(request: PlacementRequest, actor: string): PlacementResult {
  const trace: PolicyTraceEntry[] = [];

  // Check for existing active placement
  const existingId = placementByTenant.get(request.tenantId);
  if (existingId) {
    const existing = placementStore.get(existingId);
    if (existing && existing.active) {
      throw Object.assign(
        new Error(`Tenant "${request.tenantId}" already has an active placement (id=${existingId})`),
        { statusCode: 409 },
      );
    }
  }

  let candidates = Array.from(clusterStore.values()).filter(
    (c) => c.status === "active"
  );
  trace.push({ step: "initial_candidates", input: "status=active", decision: `${candidates.length} clusters` });

  if (candidates.length === 0) {
    throw Object.assign(new Error("No active clusters available for placement"), { statusCode: 503 });
  }

  // Step 1: Data residency filter
  if (request.dataResidencyConstraint) {
    const constraint = request.dataResidencyConstraint.toUpperCase();
    const filtered = candidates.filter((c) =>
      c.region.toUpperCase().startsWith(constraint) ||
      (c.metadata["data_residency"] || "").toUpperCase() === constraint
    );
    trace.push({
      step: "data_residency_filter",
      input: constraint,
      decision: filtered.length > 0
        ? `${filtered.length} clusters match residency`
        : `no match — keeping all ${candidates.length}`,
    });
    if (filtered.length > 0) candidates = filtered;
  }

  // Step 2: Region preference
  if (request.preferredRegion) {
    const regionMatch = candidates.filter(
      (c) => c.region.toLowerCase() === request.preferredRegion!.toLowerCase()
    );
    trace.push({
      step: "region_preference",
      input: request.preferredRegion,
      decision: regionMatch.length > 0
        ? `${regionMatch.length} in preferred region`
        : `no match — keeping ${candidates.length} from previous step`,
    });
    if (regionMatch.length > 0) candidates = regionMatch;
  }

  // Step 3: Plan tier capacity — enterprise gets clusters with tier metadata
  const tier = request.planTier || "starter";
  if (tier === "enterprise") {
    const dedicated = candidates.filter((c) => c.metadata["tier"] === "enterprise");
    trace.push({
      step: "plan_tier_filter",
      input: tier,
      decision: dedicated.length > 0
        ? `${dedicated.length} enterprise-tier clusters`
        : `no dedicated — using shared pool`,
    });
    if (dedicated.length > 0) candidates = dedicated;
  } else {
    trace.push({ step: "plan_tier_filter", input: tier, decision: "shared pool (not enterprise)" });
  }

  // Step 4: Load balancing — lowest tenant count ratio
  candidates.sort((a, b) => {
    const ratioA = a.currentTenantCount / Math.max(a.maxTenants, 1);
    const ratioB = b.currentTenantCount / Math.max(b.maxTenants, 1);
    if (ratioA !== ratioB) return ratioA - ratioB;
    // Step 5: Tiebreak — lexicographic
    return a.name.localeCompare(b.name);
  });
  trace.push({
    step: "load_balance_sort",
    input: `${candidates.length} candidates`,
    decision: `chosen: ${candidates[0].name} (${candidates[0].currentTenantCount}/${candidates[0].maxTenants})`,
  });

  const chosenCluster = candidates[0];

  // Check capacity
  if (chosenCluster.currentTenantCount >= chosenCluster.maxTenants) {
    throw Object.assign(
      new Error(`Cluster "${chosenCluster.name}" at capacity (${chosenCluster.maxTenants})`),
      { statusCode: 503 },
    );
  }

  // Create placement record
  const placement: TenantPlacement = {
    id: randomUUID(),
    tenantId: request.tenantId,
    clusterId: chosenCluster.id,
    region: chosenCluster.region,
    placementReason: request.reason || "initial",
    dataResidencyConstraint: request.dataResidencyConstraint || null,
    planTier: tier,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  placementStore.set(placement.id, placement);
  placementByTenant.set(request.tenantId, placement.id);
  chosenCluster.currentTenantCount++;
  clusterStore.set(chosenCluster.id, chosenCluster);

  appendAudit("tenant.placed", actor, {
    tenantId: request.tenantId,
    clusterId: chosenCluster.id,
    region: chosenCluster.region,
    reason: placement.placementReason,
    policyTrace: trace,
  });

  persistPlacement(placement);

  return { placement, chosenCluster, policyTrace: trace };
}

export function getTenantPlacement(tenantId: string): TenantPlacement | undefined {
  const id = placementByTenant.get(tenantId);
  if (!id) return undefined;
  return placementStore.get(id);
}

export function deactivatePlacement(tenantId: string, actor: string): boolean {
  const id = placementByTenant.get(tenantId);
  if (!id) return false;
  const placement = placementStore.get(id);
  if (!placement || !placement.active) return false;

  placement.active = false;
  placement.updatedAt = new Date().toISOString();
  placementStore.set(id, placement);
  placementByTenant.delete(tenantId);

  // Decrement tenant count on cluster
  const cluster = clusterStore.get(placement.clusterId);
  if (cluster && cluster.currentTenantCount > 0) {
    cluster.currentTenantCount--;
    clusterStore.set(cluster.id, cluster);
  }

  appendAudit("tenant.placement_deactivated", actor, { tenantId, placementId: id });
  return true;
}

export function listPlacements(filters?: {
  clusterId?: string;
  region?: string;
  active?: boolean;
}): TenantPlacement[] {
  let results = Array.from(placementStore.values());
  if (filters?.clusterId) results = results.filter((p) => p.clusterId === filters.clusterId);
  if (filters?.region) results = results.filter((p) => p.region === filters.region);
  if (filters?.active !== undefined) results = results.filter((p) => p.active === filters.active);
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─── Placement Simulation (Dry Run) ────────────────────────────────────────

export function simulatePlacement(request: PlacementRequest): {
  wouldPlace: boolean;
  chosenCluster?: PlatformCluster;
  policyTrace: PolicyTraceEntry[];
  reason?: string;
} {
  try {
    // Temporarily allow simulation even if tenant already placed
    const existingId = placementByTenant.get(request.tenantId);
    if (existingId) {
      // Still run the policy engine but note existing placement
      const trace: PolicyTraceEntry[] = [
        { step: "existing_check", input: request.tenantId, decision: "already placed — simulation only" },
      ];

      let candidates = Array.from(clusterStore.values()).filter((c) => c.status === "active");
      if (candidates.length === 0) {
        return { wouldPlace: false, policyTrace: trace, reason: "no active clusters" };
      }

      // Run same filters
      if (request.dataResidencyConstraint) {
        const constraint = request.dataResidencyConstraint.toUpperCase();
        candidates = candidates.filter(
          (c) => c.region.toUpperCase().startsWith(constraint) ||
            (c.metadata["data_residency"] || "").toUpperCase() === constraint
        ) || candidates;
      }
      if (request.preferredRegion) {
        const regionMatch = candidates.filter(
          (c) => c.region.toLowerCase() === request.preferredRegion!.toLowerCase()
        );
        if (regionMatch.length > 0) candidates = regionMatch;
      }
      candidates.sort((a, b) => {
        const ratioA = a.currentTenantCount / Math.max(a.maxTenants, 1);
        const ratioB = b.currentTenantCount / Math.max(b.maxTenants, 1);
        return ratioA !== ratioB ? ratioA - ratioB : a.name.localeCompare(b.name);
      });
      return { wouldPlace: true, chosenCluster: candidates[0], policyTrace: trace };
    }

    // Run full placement logic in trace-only mode
    const result = runPlacementPolicy(request);
    return { wouldPlace: true, chosenCluster: result.cluster, policyTrace: result.trace };
  } catch (err: any) {
    return { wouldPlace: false, policyTrace: [], reason: err.message };
  }
}

function runPlacementPolicy(request: PlacementRequest): {
  cluster: PlatformCluster;
  trace: PolicyTraceEntry[];
} {
  const trace: PolicyTraceEntry[] = [];
  let candidates = Array.from(clusterStore.values()).filter((c) => c.status === "active");
  trace.push({ step: "initial_candidates", input: "status=active", decision: `${candidates.length} clusters` });

  if (candidates.length === 0) {
    throw new Error("No active clusters available");
  }

  if (request.dataResidencyConstraint) {
    const constraint = request.dataResidencyConstraint.toUpperCase();
    const filtered = candidates.filter(
      (c) => c.region.toUpperCase().startsWith(constraint) ||
        (c.metadata["data_residency"] || "").toUpperCase() === constraint
    );
    if (filtered.length > 0) candidates = filtered;
    trace.push({ step: "data_residency_filter", input: constraint, decision: `${candidates.length} after filter` });
  }

  if (request.preferredRegion) {
    const regionMatch = candidates.filter(
      (c) => c.region.toLowerCase() === request.preferredRegion!.toLowerCase()
    );
    if (regionMatch.length > 0) candidates = regionMatch;
    trace.push({ step: "region_preference", input: request.preferredRegion, decision: `${candidates.length} after filter` });
  }

  candidates.sort((a, b) => {
    const ratioA = a.currentTenantCount / Math.max(a.maxTenants, 1);
    const ratioB = b.currentTenantCount / Math.max(b.maxTenants, 1);
    return ratioA !== ratioB ? ratioA - ratioB : a.name.localeCompare(b.name);
  });

  return { cluster: candidates[0], trace };
}

// ─── Registry Summary ───────────────────────────────────────────────────────

export function getRegistrySummary(): {
  totalClusters: number;
  clustersByStatus: Record<string, number>;
  clustersByRegion: Record<string, number>;
  totalPlacements: number;
  activePlacements: number;
} {
  const clustersByStatus: Record<string, number> = {};
  const clustersByRegion: Record<string, number> = {};
  for (const c of clusterStore.values()) {
    clustersByStatus[c.status] = (clustersByStatus[c.status] || 0) + 1;
    clustersByRegion[c.region] = (clustersByRegion[c.region] || 0) + 1;
  }

  let activePlacements = 0;
  for (const p of placementStore.values()) {
    if (p.active) activePlacements++;
  }

  return {
    totalClusters: clusterStore.size,
    clustersByStatus,
    clustersByRegion,
    totalPlacements: placementStore.size,
    activePlacements,
  };
}

// ─── Audit ──────────────────────────────────────────────────────────────────

const MAX_AUDIT = 10_000;

function appendAudit(action: string, actor: string, detail: Record<string, unknown>): void {
  auditLog.push({ ts: new Date().toISOString(), action, actor, detail });
  if (auditLog.length > MAX_AUDIT) auditLog.splice(0, auditLog.length - MAX_AUDIT);
}

export function getClusterAuditLog(limit = 100, offset = 0): typeof auditLog {
  return auditLog.slice().reverse().slice(offset, offset + limit);
}

// ─── PG Persistence (fire-and-forget writes, cache-first reads) ──────────

async function persistCluster(cluster: PlatformCluster): Promise<void> {
  if (!isPgConfigured()) return;
  try {
    const pool = getPgPool();
    await pool.query(
      `INSERT INTO platform_cluster (
        id, name, region, region_tier, kube_context_ref, status,
        pg_connection_ref, vista_placement_mode, max_tenants,
        current_tenant_count, metadata, tenant_id, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (id) DO UPDATE SET
        name=EXCLUDED.name, region=EXCLUDED.region, region_tier=EXCLUDED.region_tier,
        kube_context_ref=EXCLUDED.kube_context_ref, status=EXCLUDED.status,
        pg_connection_ref=EXCLUDED.pg_connection_ref, vista_placement_mode=EXCLUDED.vista_placement_mode,
        max_tenants=EXCLUDED.max_tenants, current_tenant_count=EXCLUDED.current_tenant_count,
        metadata=EXCLUDED.metadata, updated_at=EXCLUDED.updated_at`,
      [
        cluster.id, cluster.name, cluster.region, cluster.regionTier,
        cluster.kubeContextRef, cluster.status, cluster.pgConnectionRef,
        cluster.vistaPlacementMode, cluster.maxTenants, cluster.currentTenantCount,
        JSON.stringify(cluster.metadata), "default",
        cluster.createdAt, cluster.updatedAt,
      ],
    );
  } catch {
    // Fire-and-forget — in-memory is authoritative
  }
}

async function persistPlacement(placement: TenantPlacement): Promise<void> {
  if (!isPgConfigured()) return;
  try {
    const pool = getPgPool();
    await pool.query(
      `INSERT INTO tenant_placement (
        id, tenant_id, cluster_id, region, placement_reason,
        data_residency_constraint, plan_tier, active, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (id) DO UPDATE SET
        cluster_id=EXCLUDED.cluster_id, region=EXCLUDED.region,
        placement_reason=EXCLUDED.placement_reason,
        data_residency_constraint=EXCLUDED.data_residency_constraint,
        plan_tier=EXCLUDED.plan_tier, active=EXCLUDED.active,
        updated_at=EXCLUDED.updated_at`,
      [
        placement.id, placement.tenantId, placement.clusterId,
        placement.region, placement.placementReason,
        placement.dataResidencyConstraint, placement.planTier,
        placement.active, placement.createdAt, placement.updatedAt,
      ],
    );
  } catch {
    // Fire-and-forget
  }
}

// ─── Startup loader (hydrate from PG if available) ──────────────────────────

export async function loadClusterRegistry(): Promise<{ clusters: number; placements: number }> {
  if (!isPgConfigured()) return { clusters: 0, placements: 0 };
  try {
    const pool = getPgPool();

    const clusterRows = await pool.query("SELECT * FROM platform_cluster");
    for (const row of clusterRows.rows) {
      const c: PlatformCluster = {
        id: row.id,
        name: row.name,
        region: row.region,
        regionTier: row.region_tier,
        kubeContextRef: row.kube_context_ref,
        status: row.status,
        pgConnectionRef: row.pg_connection_ref || "",
        vistaPlacementMode: row.vista_placement_mode || "per_tenant",
        maxTenants: row.max_tenants,
        currentTenantCount: row.current_tenant_count,
        metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata || {}),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
      clusterStore.set(c.id, c);
    }

    const placementRows = await pool.query("SELECT * FROM tenant_placement WHERE active = true");
    for (const row of placementRows.rows) {
      const p: TenantPlacement = {
        id: row.id,
        tenantId: row.tenant_id,
        clusterId: row.cluster_id,
        region: row.region,
        placementReason: row.placement_reason,
        dataResidencyConstraint: row.data_residency_constraint,
        planTier: row.plan_tier,
        active: row.active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
      placementStore.set(p.id, p);
      if (p.active) placementByTenant.set(p.tenantId, p.id);
    }

    return { clusters: clusterRows.rows.length, placements: placementRows.rows.length };
  } catch {
    return { clusters: 0, placements: 0 };
  }
}
