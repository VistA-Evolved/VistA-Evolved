/**
 * global-routing.ts -- Global Routing Service
 *
 * Phase 329 (W15-P3)
 *
 * Per-region ingress with DNS-based failover (per ADR-GLOBAL-ROUTING).
 * Resolves tenant from subdomain or path prefix, looks up placement,
 * and determines routing target. Provides DNS record management model
 * and failover controls.
 *
 * Tenant identification:
 *   1. Subdomain: <tenant>.api.example.com
 *   2. Path prefix: api.example.com/t/<tenant>/...
 *   3. Header: X-Tenant-Id (internal/service-to-service)
 */

import { randomUUID } from "node:crypto";
import {
  getTenantPlacement,
  getCluster,
  type TenantPlacement,
  type PlatformCluster,
} from "./multi-cluster-registry.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export type DnsRecordType = "A" | "AAAA" | "CNAME";
export type FailoverStatus = "normal" | "failover_in_progress" | "failed_over" | "rollback_in_progress";

export interface TenantDnsRecord {
  id: string;
  tenantId: string;
  subdomain: string;           // e.g., "acme" → acme.api.example.com
  recordType: DnsRecordType;
  targetValue: string;         // IP or CNAME
  region: string;
  ttlSeconds: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegionalIngress {
  id: string;
  region: string;
  clusterId: string;
  endpoint: string;            // IP or hostname of the regional ingress
  healthEndpoint: string;      // URL for health probing
  healthy: boolean;
  lastHealthCheck: string | null;
  tlsCertRef: string;          // reference to TLS cert/secret
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface FailoverEvent {
  id: string;
  tenantId: string;
  fromRegion: string;
  toRegion: string;
  fromClusterId: string;
  toClusterId: string;
  status: FailoverStatus;
  reason: string;
  dnsUpdateLatencyMs: number | null;
  startedAt: string;
  completedAt: string | null;
  actor: string;
}

export interface RouteResolutionResult {
  resolved: boolean;
  tenantId: string | null;
  source: "subdomain" | "path_prefix" | "header" | "default" | "none";
  placement: TenantPlacement | null;
  cluster: PlatformCluster | null;
  ingress: RegionalIngress | null;
  failoverStatus: FailoverStatus;
  latencyMs: number;
}

export interface RoutingConfig {
  baseDomain: string;          // e.g., "api.example.com"
  defaultRegion: string;
  defaultTtlSeconds: number;
  failoverTtlSeconds: number;  // lower TTL during failover
  pathPrefixEnabled: boolean;
  headerRoutingEnabled: boolean;
}

// ─── Configuration ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG: RoutingConfig = {
  baseDomain: process.env.ROUTING_BASE_DOMAIN || "api.vista-evolved.local",
  defaultRegion: process.env.ROUTING_DEFAULT_REGION || "us-east-1",
  defaultTtlSeconds: parseInt(process.env.ROUTING_DEFAULT_TTL || "60", 10),
  failoverTtlSeconds: parseInt(process.env.ROUTING_FAILOVER_TTL || "15", 10),
  pathPrefixEnabled: true,
  headerRoutingEnabled: true,
};

let routingConfig: RoutingConfig = { ...DEFAULT_CONFIG };

export function getRoutingConfig(): RoutingConfig {
  return { ...routingConfig };
}

export function updateRoutingConfig(update: Partial<RoutingConfig>): RoutingConfig {
  routingConfig = { ...routingConfig, ...update };
  return { ...routingConfig };
}

// ─── In-Memory Stores ───────────────────────────────────────────────────────

const dnsRecordStore = new Map<string, TenantDnsRecord>();        // id → record
const dnsByTenant = new Map<string, string>();                     // tenantId → dns record id
const ingressStore = new Map<string, RegionalIngress>();           // id → ingress
const ingressByRegion = new Map<string, string>();                 // region → ingress id
const failoverStore = new Map<string, FailoverEvent>();            // id → event
const failoverByTenant = new Map<string, string>();                // tenantId → latest failover id

const routingAudit: Array<{
  ts: string;
  action: string;
  actor: string;
  detail: Record<string, unknown>;
}> = [];
const MAX_AUDIT = 10_000;

// ─── Tenant Resolution ─────────────────────────────────────────────────────

/**
 * Extract tenant ID from an incoming request.
 * Priority: subdomain > path prefix > header > default tenant.
 */
export function resolveTenantFromRequest(
  host: string | undefined,
  url: string,
  headers: Record<string, string | undefined>,
): { tenantId: string; source: RouteResolutionResult["source"] } {
  // 1. Subdomain extraction
  if (host) {
    const baseDomain = routingConfig.baseDomain.toLowerCase();
    const hostLower = host.toLowerCase().split(":")[0]; // strip port
    if (hostLower.endsWith(`.${baseDomain}`) && hostLower !== baseDomain) {
      const tenantId = hostLower.slice(0, -(baseDomain.length + 1));
      if (tenantId && !tenantId.includes(".")) {
        return { tenantId, source: "subdomain" };
      }
    }
  }

  // 2. Path prefix: /t/<tenant>/...
  if (routingConfig.pathPrefixEnabled) {
    const pathMatch = url.match(/^\/t\/([a-zA-Z0-9_-]+)(\/|$)/);
    if (pathMatch) {
      return { tenantId: pathMatch[1], source: "path_prefix" };
    }
  }

  // 3. Header: X-Tenant-Id
  if (routingConfig.headerRoutingEnabled && headers["x-tenant-id"]) {
    return { tenantId: headers["x-tenant-id"], source: "header" };
  }

  // 4. Default tenant
  return { tenantId: "default", source: "default" };
}

/**
 * Full route resolution: tenant → placement → cluster → ingress.
 */
export function resolveRoute(
  host: string | undefined,
  url: string,
  headers: Record<string, string | undefined>,
): RouteResolutionResult {
  const start = Date.now();

  const { tenantId, source } = resolveTenantFromRequest(host, url, headers);

  if (!tenantId || tenantId === "default") {
    return {
      resolved: true,
      tenantId: "default",
      source,
      placement: null,
      cluster: null,
      ingress: getDefaultIngress(),
      failoverStatus: "normal",
      latencyMs: Date.now() - start,
    };
  }

  const placement = getTenantPlacement(tenantId);
  if (!placement) {
    return {
      resolved: false,
      tenantId,
      source,
      placement: null,
      cluster: null,
      ingress: null,
      failoverStatus: "normal",
      latencyMs: Date.now() - start,
    };
  }

  const cluster = getCluster(placement.clusterId);
  const ingress = cluster ? getIngressForRegion(cluster.region) : null;

  // Check failover status
  const failoverId = failoverByTenant.get(tenantId);
  const failoverEvent = failoverId ? failoverStore.get(failoverId) : undefined;
  const failoverStatus: FailoverStatus =
    failoverEvent && failoverEvent.status !== "normal"
      ? failoverEvent.status
      : "normal";

  return {
    resolved: true,
    tenantId,
    source,
    placement,
    cluster: cluster || null,
    ingress: ingress || null,
    failoverStatus,
    latencyMs: Date.now() - start,
  };
}

// ─── Ingress Management ────────────────────────────────────────────────────

export function registerIngress(input: {
  region: string;
  clusterId: string;
  endpoint: string;
  healthEndpoint?: string;
  tlsCertRef?: string;
  metadata?: Record<string, string>;
}, actor: string): RegionalIngress {
  const existing = Array.from(ingressStore.values()).find(
    (i) => i.region === input.region
  );
  if (existing) {
    throw Object.assign(
      new Error(`Ingress for region "${input.region}" already exists (id=${existing.id})`),
      { statusCode: 409 },
    );
  }

  const ingress: RegionalIngress = {
    id: randomUUID(),
    region: input.region,
    clusterId: input.clusterId,
    endpoint: input.endpoint,
    healthEndpoint: input.healthEndpoint || `http://${input.endpoint}/health`,
    healthy: true,
    lastHealthCheck: null,
    tlsCertRef: input.tlsCertRef || "",
    metadata: input.metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  ingressStore.set(ingress.id, ingress);
  ingressByRegion.set(ingress.region, ingress.id);
  appendAudit("ingress.register", actor, { region: ingress.region, endpoint: ingress.endpoint });
  return ingress;
}

export function listIngresses(): RegionalIngress[] {
  return Array.from(ingressStore.values()).sort((a, b) => a.region.localeCompare(b.region));
}

export function getIngress(id: string): RegionalIngress | undefined {
  return ingressStore.get(id);
}

export function getIngressForRegion(region: string): RegionalIngress | undefined {
  const id = ingressByRegion.get(region);
  return id ? ingressStore.get(id) : undefined;
}

function getDefaultIngress(): RegionalIngress | null {
  const id = ingressByRegion.get(routingConfig.defaultRegion);
  return id ? ingressStore.get(id) || null : null;
}

export function updateIngressHealth(
  region: string,
  healthy: boolean,
): RegionalIngress | undefined {
  const id = ingressByRegion.get(region);
  if (!id) return undefined;
  const ingress = ingressStore.get(id);
  if (!ingress) return undefined;

  ingress.healthy = healthy;
  ingress.lastHealthCheck = new Date().toISOString();
  ingress.updatedAt = new Date().toISOString();
  ingressStore.set(id, ingress);
  return ingress;
}

// ─── DNS Record Management ─────────────────────────────────────────────────

export function createDnsRecord(input: {
  tenantId: string;
  targetValue: string;
  region: string;
  recordType?: DnsRecordType;
  ttlSeconds?: number;
}, actor: string): TenantDnsRecord {
  const existing = dnsByTenant.get(input.tenantId);
  if (existing) {
    throw Object.assign(
      new Error(`DNS record for tenant "${input.tenantId}" already exists`),
      { statusCode: 409 },
    );
  }

  const record: TenantDnsRecord = {
    id: randomUUID(),
    tenantId: input.tenantId,
    subdomain: input.tenantId, // tenant slug = subdomain
    recordType: input.recordType || "CNAME",
    targetValue: input.targetValue,
    region: input.region,
    ttlSeconds: input.ttlSeconds || routingConfig.defaultTtlSeconds,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dnsRecordStore.set(record.id, record);
  dnsByTenant.set(input.tenantId, record.id);
  appendAudit("dns.create", actor, { tenantId: input.tenantId, target: input.targetValue });
  return record;
}

export function getDnsRecord(tenantId: string): TenantDnsRecord | undefined {
  const id = dnsByTenant.get(tenantId);
  return id ? dnsRecordStore.get(id) : undefined;
}

export function listDnsRecords(filters?: {
  tenantId?: string;
  region?: string;
  active?: boolean;
}): TenantDnsRecord[] {
  let results = Array.from(dnsRecordStore.values());
  if (filters?.tenantId) results = results.filter((r) => r.tenantId === filters.tenantId);
  if (filters?.region) results = results.filter((r) => r.region === filters.region);
  if (filters?.active !== undefined) results = results.filter((r) => r.active === filters.active);
  return results.sort((a, b) => a.subdomain.localeCompare(b.subdomain));
}

export function updateDnsTarget(
  tenantId: string,
  targetValue: string,
  ttlSeconds?: number,
  actor?: string,
): TenantDnsRecord {
  const id = dnsByTenant.get(tenantId);
  if (!id) throw Object.assign(new Error("DNS record not found"), { statusCode: 404 });
  const record = dnsRecordStore.get(id)!;

  record.targetValue = targetValue;
  if (ttlSeconds !== undefined) record.ttlSeconds = ttlSeconds;
  record.updatedAt = new Date().toISOString();
  dnsRecordStore.set(id, record);
  appendAudit("dns.update", actor || "system", { tenantId, target: targetValue, ttl: record.ttlSeconds });
  return record;
}

// ─── Failover Management ────────────────────────────────────────────────────

export function initiateFailover(input: {
  tenantId: string;
  toRegion: string;
  reason: string;
}, actor: string): FailoverEvent {
  const placement = getTenantPlacement(input.tenantId);
  if (!placement) {
    throw Object.assign(
      new Error(`No active placement for tenant "${input.tenantId}"`),
      { statusCode: 404 },
    );
  }

  // Check if already failing over
  const existingId = failoverByTenant.get(input.tenantId);
  if (existingId) {
    const existing = failoverStore.get(existingId);
    if (existing && (existing.status === "failover_in_progress" || existing.status === "rollback_in_progress")) {
      throw Object.assign(
        new Error(`Failover already in progress for tenant "${input.tenantId}"`),
        { statusCode: 409 },
      );
    }
  }

  const fromCluster = getCluster(placement.clusterId);
  if (!fromCluster) {
    throw Object.assign(new Error("Source cluster not found"), { statusCode: 500 });
  }

  const event: FailoverEvent = {
    id: randomUUID(),
    tenantId: input.tenantId,
    fromRegion: fromCluster.region,
    toRegion: input.toRegion,
    fromClusterId: fromCluster.id,
    toClusterId: "", // resolved during failover execution
    status: "failover_in_progress",
    reason: input.reason,
    dnsUpdateLatencyMs: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    actor,
  };

  failoverStore.set(event.id, event);
  failoverByTenant.set(input.tenantId, event.id);

  // Update DNS to failover TTL
  const dnsRecord = getDnsRecord(input.tenantId);
  if (dnsRecord) {
    updateDnsTarget(input.tenantId, dnsRecord.targetValue, routingConfig.failoverTtlSeconds, "system");
  }

  appendAudit("failover.initiate", actor, {
    tenantId: input.tenantId,
    fromRegion: fromCluster.region,
    toRegion: input.toRegion,
    reason: input.reason,
  });

  return event;
}

export function completeFailover(
  failoverId: string,
  toClusterId: string,
  newDnsTarget: string,
  actor: string,
  tenantId?: string,
): FailoverEvent {
  const event = failoverStore.get(failoverId);
  if (!event) throw Object.assign(new Error("Failover event not found"), { statusCode: 404 });
  if (tenantId && event.tenantId !== tenantId) {
    throw Object.assign(new Error("Failover event not found"), { statusCode: 404 });
  }
  if (event.status !== "failover_in_progress") {
    throw Object.assign(new Error(`Cannot complete failover in status: ${event.status}`), { statusCode: 400 });
  }

  const dnsStart = Date.now();

  // Update DNS record to point to new region
  try {
    updateDnsTarget(event.tenantId, newDnsTarget, routingConfig.defaultTtlSeconds, "system");
  } catch {
    // DNS record might not exist yet — create it
    const toCluster = getCluster(toClusterId);
    if (toCluster) {
      try {
        createDnsRecord({
          tenantId: event.tenantId,
          targetValue: newDnsTarget,
          region: event.toRegion,
        }, "system");
      } catch { /* best effort */ }
    }
  }

  event.toClusterId = toClusterId;
  event.dnsUpdateLatencyMs = Date.now() - dnsStart;
  event.status = "failed_over";
  event.completedAt = new Date().toISOString();
  failoverStore.set(failoverId, event);

  appendAudit("failover.complete", actor, {
    tenantId: event.tenantId,
    toClusterId,
    dnsLatencyMs: event.dnsUpdateLatencyMs,
  });

  return event;
}

export function getFailoverEvent(id: string): FailoverEvent | undefined {
  return failoverStore.get(id);
}

export function getFailoverEventForTenant(
  tenantId: string,
  id: string
): FailoverEvent | undefined {
  const event = failoverStore.get(id);
  if (!event || event.tenantId !== tenantId) return undefined;
  return event;
}

export function getLatestFailover(tenantId: string): FailoverEvent | undefined {
  const id = failoverByTenant.get(tenantId);
  return id ? failoverStore.get(id) : undefined;
}

export function listFailovers(
  filters?: { tenantId?: string; status?: FailoverStatus },
): FailoverEvent[] {
  let results = Array.from(failoverStore.values());
  if (filters?.tenantId) results = results.filter((f) => f.tenantId === filters.tenantId);
  if (filters?.status) results = results.filter((f) => f.status === filters.status);
  return results.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

// ─── Routing Summary ────────────────────────────────────────────────────────

export function getRoutingSummary(tenantId?: string): {
  config: RoutingConfig;
  ingressCount: number | null;
  healthyIngresses: number | null;
  dnsRecordCount: number;
  activeDnsRecords: number;
  failoverCount: number;
  activeFailovers: number;
} {
  let healthyIngresses: number | null = null;
  let ingressCount: number | null = null;
  if (!tenantId) {
    healthyIngresses = 0;
    for (const i of ingressStore.values()) if (i.healthy) healthyIngresses++;
    ingressCount = ingressStore.size;
  }

  let activeDns = 0;
  for (const r of dnsRecordStore.values()) {
    if (tenantId && r.tenantId !== tenantId) continue;
    if (r.active) activeDns++;
  }

  let activeFailovers = 0;
  for (const f of failoverStore.values()) {
    if (tenantId && f.tenantId !== tenantId) continue;
    if (f.status === "failover_in_progress" || f.status === "rollback_in_progress") {
      activeFailovers++;
    }
  }

  const dnsRecordCount = tenantId
    ? Array.from(dnsRecordStore.values()).filter((record) => record.tenantId === tenantId).length
    : dnsRecordStore.size;
  const failoverCount = tenantId
    ? Array.from(failoverStore.values()).filter((event) => event.tenantId === tenantId).length
    : failoverStore.size;

  return {
    config: routingConfig,
    ingressCount,
    healthyIngresses,
    dnsRecordCount,
    activeDnsRecords: activeDns,
    failoverCount,
    activeFailovers,
  };
}

// ─── Audit ──────────────────────────────────────────────────────────────────

function appendAudit(action: string, actor: string, detail: Record<string, unknown>): void {
  routingAudit.push({ ts: new Date().toISOString(), action, actor, detail });
  if (routingAudit.length > MAX_AUDIT) routingAudit.splice(0, routingAudit.length - MAX_AUDIT);
}

export function getRoutingAuditLog(limit = 100, offset = 0, tenantId?: string): typeof routingAudit {
  const scoped = tenantId
    ? routingAudit.filter((entry) => entry.detail?.tenantId === tenantId)
    : routingAudit;
  return scoped.slice().reverse().slice(offset, offset + limit);
}
