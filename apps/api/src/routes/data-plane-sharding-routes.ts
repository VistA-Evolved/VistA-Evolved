/**
 * data-plane-sharding-routes.ts -- REST endpoints for Data Plane Sharding
 *
 * Phase 330 (W15-P4)
 *
 * Admin-only via AUTH_RULES pattern /platform/shards/.
 *
 * Routes:
 *   POST   /platform/shards                        -- register shard
 *   GET    /platform/shards                        -- list shards
 *   GET    /platform/shards/summary                -- sharding summary
 *   GET    /platform/shards/health                 -- all shard health
 *   GET    /platform/shards/audit                  -- sharding audit log
 *   GET    /platform/shards/:id                    -- get shard
 *   POST   /platform/shards/:id/status             -- update shard status
 *   POST   /platform/shards/:id/health             -- record health probe
 *   GET    /platform/shards/:id/health             -- get shard health
 *
 *   POST   /platform/shards/map-tenant             -- map tenant to shard
 *   GET    /platform/shards/tenant/:tenantId       -- get tenant shard
 *   GET    /platform/shards/mappings               -- list all mappings
 *   POST   /platform/shards/validate-access        -- cross-shard guard check
 *
 *   POST   /platform/shards/migrations             -- create migration plan
 *   GET    /platform/shards/migrations             -- list migration plans
 *   GET    /platform/shards/migrations/:id         -- get migration plan
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { log } from "../lib/logger.js";
import {
  registerShard,
  listShards,
  getShard,
  updateShardStatus,
  recordShardHealth,
  getShardHealth,
  listShardHealth,
  mapTenantToShard,
  getTenantShard,
  listShardMappings,
  validateSameShardAccess,
  createMigrationPlan,
  getMigrationPlan,
  listMigrationPlans,
  getShardingSummary,
  getShardingAuditLog,
  type ShardStatus,
  type ShardHealthProbe,
} from "../services/data-plane-sharding.js";

const VALID_SHARD_STATUSES: ShardStatus[] = ["active", "readonly", "draining", "offline", "promoting"];

function getActor(request: FastifyRequest): string {
  return (request as any).session?.duz || "unknown";
}

export async function dataPlaneShardingRoutes(server: FastifyInstance): Promise<void> {
  // ─── Shard CRUD ───────────────────────────────────────────────────────

  server.post("/platform/shards", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    if (!body.name || !body.region || !body.clusterId || !body.connectionRef) {
      return reply.code(400).send({ ok: false, error: "name, region, clusterId, and connectionRef are required" });
    }
    try {
      const shard = registerShard(body, getActor(request));
      return reply.code(201).send({ ok: true, shard });
    } catch (err: any) {
      log.warn("Shard registration failed", { error: err.message });
      return reply.code(err.statusCode || 500).send({ ok: false, error: "Shard registration failed" });
    }
  });

  server.get("/platform/shards", async (request: FastifyRequest) => {
    const query = request.query as any;
    const shards = listShards({
      region: query.region,
      status: query.status as ShardStatus | undefined,
      replicationRole: query.replicationRole,
    });
    return { ok: true, shards, count: shards.length };
  });

  server.get("/platform/shards/summary", async () => {
    return { ok: true, ...getShardingSummary() };
  });

  server.get("/platform/shards/health", async () => {
    const probes = listShardHealth();
    return { ok: true, probes, count: probes.length };
  });

  server.get("/platform/shards/audit", async (request: FastifyRequest) => {
    const query = request.query as any;
    const limit = Math.min(parseInt(query.limit, 10) || 100, 500);
    const offset = parseInt(query.offset, 10) || 0;
    const entries = getShardingAuditLog(limit, offset);
    return { ok: true, entries, count: entries.length };
  });

  server.get("/platform/shards/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const shard = getShard(id);
    if (!shard) return reply.code(404).send({ ok: false, error: "Shard not found" });
    const health = getShardHealth(id);
    const mappings = listShardMappings({ shardId: id, active: true });
    return { ok: true, shard, health: health || null, activeTenants: mappings.length };
  });

  server.post("/platform/shards/:id/status", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    if (!body.status || !VALID_SHARD_STATUSES.includes(body.status)) {
      return reply.code(400).send({ ok: false, error: `Invalid status. Valid: ${VALID_SHARD_STATUSES.join(", ")}` });
    }
    try {
      const shard = updateShardStatus(id, body.status, getActor(request));
      return { ok: true, shard };
    } catch (err: any) {
      log.warn("Shard status update failed", { error: err.message });
      return reply.code(err.statusCode || 500).send({ ok: false, error: "Shard status update failed" });
    }
  });

  server.post("/platform/shards/:id/health", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const shard = getShard(id);
    if (!shard) return reply.code(404).send({ ok: false, error: "Shard not found" });
    const body = (request.body as any) || {};
    const probe: ShardHealthProbe = {
      shardId: id,
      timestamp: new Date().toISOString(),
      reachable: !!body.reachable,
      replicationLagMs: body.replicationLagMs ?? null,
      connectionPoolActive: body.connectionPoolActive ?? 0,
      connectionPoolIdle: body.connectionPoolIdle ?? 0,
      connectionPoolWaiting: body.connectionPoolWaiting ?? 0,
      avgQueryTimeMs: body.avgQueryTimeMs ?? null,
    };
    recordShardHealth(probe);
    return reply.code(201).send({ ok: true, probe });
  });

  server.get("/platform/shards/:id/health", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const probe = getShardHealth(id);
    if (!probe) return reply.code(404).send({ ok: false, error: "No health data" });
    return { ok: true, probe };
  });

  // ─── Tenant-Shard Mapping ─────────────────────────────────────────────

  server.post("/platform/shards/map-tenant", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    if (!body.tenantId || !body.region) {
      return reply.code(400).send({ ok: false, error: "tenantId and region are required" });
    }
    try {
      const mapping = mapTenantToShard(body, getActor(request));
      return reply.code(201).send({ ok: true, mapping });
    } catch (err: any) {
      log.warn("Tenant-shard mapping failed", { error: err.message });
      return reply.code(err.statusCode || 500).send({ ok: false, error: "Tenant-shard mapping failed" });
    }
  });

  server.get("/platform/shards/tenant/:tenantId", async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as any;
    const result = getTenantShard(tenantId);
    if (!result) return reply.code(404).send({ ok: false, error: "No shard mapping for tenant" });
    return { ok: true, ...result };
  });

  server.get("/platform/shards/mappings", async (request: FastifyRequest) => {
    const query = request.query as any;
    const mappings = listShardMappings({
      shardId: query.shardId,
      region: query.region,
      active: query.active === "true" ? true : query.active === "false" ? false : undefined,
    });
    return { ok: true, mappings, count: mappings.length };
  });

  server.post("/platform/shards/validate-access", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    if (!body.requestingTenantId || !body.targetTenantId) {
      return reply.code(400).send({ ok: false, error: "requestingTenantId and targetTenantId required" });
    }
    const result = validateSameShardAccess(body.requestingTenantId, body.targetTenantId);
    return { ok: true, ...result };
  });

  // ─── Migration Plans ──────────────────────────────────────────────────

  server.post("/platform/shards/migrations", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    if (!body.tenantId || !body.toShardId) {
      return reply.code(400).send({ ok: false, error: "tenantId and toShardId are required" });
    }
    try {
      const plan = createMigrationPlan(body, getActor(request));
      return reply.code(201).send({ ok: true, plan });
    } catch (err: any) {
      log.warn("Migration plan creation failed", { error: err.message });
      return reply.code(err.statusCode || 500).send({ ok: false, error: "Migration plan creation failed" });
    }
  });

  server.get("/platform/shards/migrations", async (request: FastifyRequest) => {
    const query = request.query as any;
    const plans = listMigrationPlans({
      tenantId: query.tenantId,
      status: query.status,
    });
    return { ok: true, plans, count: plans.length };
  });

  server.get("/platform/shards/migrations/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const plan = getMigrationPlan(id);
    if (!plan) return reply.code(404).send({ ok: false, error: "Migration plan not found" });
    return { ok: true, plan };
  });
}

export default dataPlaneShardingRoutes;
