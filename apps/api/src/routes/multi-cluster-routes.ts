/**
 * multi-cluster-routes.ts -- REST endpoints for Multi-Cluster Registry
 *
 * Phase 328 (W15-P2)
 *
 * All endpoints are admin-only (enforced by AUTH_RULES pattern /platform/clusters/).
 *
 * Routes:
 *   POST   /platform/clusters                           -- register cluster
 *   GET    /platform/clusters                           -- list clusters
 *   GET    /platform/clusters/summary                   -- registry summary
 *   GET    /platform/clusters/:id                       -- get cluster detail
 *   POST   /platform/clusters/:id/status                -- update cluster status
 *   POST   /platform/clusters/:id/metadata              -- update cluster metadata
 *   POST   /platform/clusters/:id/health                -- record health snapshot
 *   GET    /platform/clusters/:id/health                -- get latest health snapshot
 *   GET    /platform/clusters/health                    -- all health snapshots
 *   POST   /platform/tenants/:tenantId/place            -- place tenant
 *   GET    /platform/tenants/:tenantId/placement        -- get tenant placement
 *   DELETE /platform/tenants/:tenantId/placement        -- deactivate placement
 *   POST   /platform/tenants/simulate-placement         -- dry-run placement
 *   GET    /platform/placements                         -- list all placements
 *   GET    /platform/clusters/audit                     -- placement audit log
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { getTenant } from '../config/tenant-config.js';
import {
  registerCluster,
  listClusters,
  getCluster,
  updateClusterStatus,
  updateClusterMetadata,
  recordHealthSnapshot,
  getHealthSnapshot,
  listHealthSnapshots,
  placeTenant,
  getTenantPlacement,
  deactivatePlacement,
  listPlacements,
  simulatePlacement,
  getRegistrySummary,
  getClusterAuditLog,
  type ClusterStatus,
  type PlanTier,
  type PlacementReason,
  type ClusterHealthSnapshot,
} from '../services/multi-cluster-registry.js';

const VALID_STATUSES: ClusterStatus[] = [
  'active',
  'draining',
  'standby',
  'offline',
  'decommissioned',
];
const VALID_PLAN_TIERS: PlanTier[] = ['free', 'starter', 'professional', 'enterprise'];
const VALID_REASONS: PlacementReason[] = [
  'initial',
  'migration',
  'failover',
  'data_residency',
  'manual',
];

function getActor(request: FastifyRequest): string {
  return (request as any).session?.duz || 'unknown';
}

function getSessionTenantId(request: FastifyRequest): string | null {
  const sessionTenantId =
    typeof (request as any).session?.tenantId === 'string' &&
    (request as any).session.tenantId.trim().length > 0
      ? (request as any).session.tenantId.trim()
      : undefined;
  const requestTenantId =
    typeof (request as any).tenantId === 'string' && (request as any).tenantId.trim().length > 0
      ? (request as any).tenantId.trim()
      : undefined;
  return sessionTenantId || requestTenantId || null;
}

function ensureTenantExists(tenantId: string, reply: FastifyReply): boolean {
  if (!getTenant(tenantId)) {
    reply.code(404).send({ ok: false, error: `Tenant '${tenantId}' not found` });
    return false;
  }
  return true;
}

function resolveAdminTargetTenant(
  request: FastifyRequest,
  reply: FastifyReply,
  explicitTenantId?: string,
  reason?: string
): string | undefined {
  const sessionTenantId = getSessionTenantId(request);
  if (!sessionTenantId) {
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return undefined;
  }
  const targetTenantId =
    typeof explicitTenantId === 'string' && explicitTenantId.trim().length > 0
      ? explicitTenantId.trim()
      : sessionTenantId;
  if (!ensureTenantExists(targetTenantId, reply)) return undefined;
  if (targetTenantId !== sessionTenantId && (!reason || !reason.trim())) {
    reply.code(400).send({
      ok: false,
      error: 'reason is required for cross-tenant cluster placement actions',
    });
    return undefined;
  }
  return targetTenantId;
}

export async function multiClusterRoutes(server: FastifyInstance): Promise<void> {
  // --- Cluster CRUD -----------------------------------------------------

  /** POST /platform/clusters -- register a new cluster */
  server.post('/platform/clusters', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const {
      name,
      region,
      regionTier,
      kubeContextRef,
      pgConnectionRef,
      vistaPlacementMode,
      maxTenants,
      metadata,
    } = body;

    if (!name || typeof name !== 'string') {
      return reply.code(400).send({ ok: false, error: 'name is required (string)' });
    }
    if (!region || typeof region !== 'string') {
      return reply.code(400).send({ ok: false, error: 'region is required (string)' });
    }
    if (!kubeContextRef || typeof kubeContextRef !== 'string') {
      return reply.code(400).send({ ok: false, error: 'kubeContextRef is required (string)' });
    }

    try {
      const cluster = registerCluster(
        {
          name,
          region,
          regionTier,
          kubeContextRef,
          pgConnectionRef,
          vistaPlacementMode,
          maxTenants,
          metadata,
        },
        getActor(request)
      );
      return reply.code(201).send({ ok: true, cluster });
    } catch (err: any) {
      return reply
        .code(err.statusCode || 500)
        .send({ ok: false, error: 'Cluster registration failed' });
    }
  });

  /** GET /platform/clusters -- list clusters */
  server.get('/platform/clusters', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const region = query.region as string | undefined;
    const status = query.status as ClusterStatus | undefined;
    if (status && !VALID_STATUSES.includes(status)) {
      return reply
        .code(400)
        .send({ ok: false, error: `Invalid status. Valid: ${VALID_STATUSES.join(', ')}` });
    }
    const clusters = listClusters({ region, status });
    return { ok: true, clusters, count: clusters.length };
  });

  /** GET /platform/clusters/summary -- registry summary */
  server.get(
    '/platform/clusters/summary',
    async (_request: FastifyRequest, _reply: FastifyReply) => {
      return { ok: true, ...getRegistrySummary() };
    }
  );

  /** GET /platform/clusters/health -- all health snapshots */
  server.get(
    '/platform/clusters/health',
    async (_request: FastifyRequest, _reply: FastifyReply) => {
      const snapshots = listHealthSnapshots();
      return { ok: true, snapshots, count: snapshots.length };
    }
  );

  /** GET /platform/clusters/audit -- audit log */
  server.get('/platform/clusters/audit', async (request: FastifyRequest, _reply: FastifyReply) => {
    const query = request.query as any;
    const limit = Math.min(parseInt(query.limit, 10) || 100, 500);
    const offset = parseInt(query.offset, 10) || 0;
    const entries = getClusterAuditLog(limit, offset);
    return { ok: true, entries, count: entries.length };
  });

  /** GET /platform/clusters/:id -- get cluster detail */
  server.get('/platform/clusters/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const cluster = getCluster(id);
    if (!cluster) return reply.code(404).send({ ok: false, error: 'Cluster not found' });
    const health = getHealthSnapshot(id);
    const placements = listPlacements({ clusterId: id, active: true });
    return { ok: true, cluster, health: health || null, activePlacements: placements.length };
  });

  /** POST /platform/clusters/:id/status -- update cluster status */
  server.post(
    '/platform/clusters/:id/status',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const body = (request.body as any) || {};
      const { status } = body;
      if (!status || !VALID_STATUSES.includes(status)) {
        return reply
          .code(400)
          .send({ ok: false, error: `Invalid status. Valid: ${VALID_STATUSES.join(', ')}` });
      }
      try {
        const cluster = updateClusterStatus(id, status, getActor(request));
        return { ok: true, cluster };
      } catch (err: any) {
        return reply
          .code(err.statusCode || 500)
          .send({ ok: false, error: 'Cluster status update failed' });
      }
    }
  );

  /** POST /platform/clusters/:id/metadata -- update cluster metadata */
  server.post(
    '/platform/clusters/:id/metadata',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const body = (request.body as any) || {};
      const { metadata } = body;
      if (!metadata || typeof metadata !== 'object') {
        return reply.code(400).send({ ok: false, error: 'metadata must be an object' });
      }
      try {
        const cluster = updateClusterMetadata(id, metadata, getActor(request));
        return { ok: true, cluster };
      } catch (err: any) {
        return reply
          .code(err.statusCode || 500)
          .send({ ok: false, error: 'Cluster metadata update failed' });
      }
    }
  );

  /** POST /platform/clusters/:id/health -- record health snapshot */
  server.post(
    '/platform/clusters/:id/health',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const cluster = getCluster(id);
      if (!cluster) return reply.code(404).send({ ok: false, error: 'Cluster not found' });

      const body = (request.body as any) || {};
      const snapshot: ClusterHealthSnapshot = {
        clusterId: id,
        timestamp: new Date().toISOString(),
        pgReachable: !!body.pgReachable,
        vistaReachable: !!body.vistaReachable,
        tenantCount: body.tenantCount ?? cluster.currentTenantCount,
        cpuPercent: body.cpuPercent ?? null,
        memoryPercent: body.memoryPercent ?? null,
        requestsPerMinute: body.requestsPerMinute ?? null,
      };
      recordHealthSnapshot(snapshot);
      return reply.code(201).send({ ok: true, snapshot });
    }
  );

  /** GET /platform/clusters/:id/health -- latest health snapshot */
  server.get(
    '/platform/clusters/:id/health',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const snapshot = getHealthSnapshot(id);
      if (!snapshot)
        return reply.code(404).send({ ok: false, error: 'No health data for cluster' });
      return { ok: true, snapshot };
    }
  );

  // --- Tenant Placement -------------------------------------------------

  /** POST /platform/tenants/:tenantId/place -- place tenant onto a cluster */
  server.post(
    '/platform/tenants/:tenantId/place',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const { tenantId: requestedTenantId } = request.params as any;
      const body = (request.body as any) || {};
      const tenantId = resolveAdminTargetTenant(request, reply, requestedTenantId, body.reason);
      if (!tenantId) return reply;

      if (body.planTier && !VALID_PLAN_TIERS.includes(body.planTier)) {
        return reply
          .code(400)
          .send({ ok: false, error: `Invalid planTier. Valid: ${VALID_PLAN_TIERS.join(', ')}` });
      }
      if (body.reason && !VALID_REASONS.includes(body.reason)) {
        return reply
          .code(400)
          .send({ ok: false, error: `Invalid reason. Valid: ${VALID_REASONS.join(', ')}` });
      }

      try {
        const result = placeTenant(
          {
            tenantId,
            preferredRegion: body.preferredRegion,
            countryPack: body.countryPack,
            dataResidencyConstraint: body.dataResidencyConstraint,
            planTier: body.planTier,
            reason: body.reason,
          },
          getActor(request)
        );
        return reply.code(201).send({ ok: true, ...result });
      } catch (err: any) {
        return reply
          .code(err.statusCode || 500)
          .send({ ok: false, error: 'Tenant placement failed' });
      }
    }
  );

  /** GET /platform/tenants/:tenantId/placement -- get active placement */
  server.get(
    '/platform/tenants/:tenantId/placement',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const { tenantId: requestedTenantId } = request.params as any;
      const query = request.query as any;
      const tenantId = resolveAdminTargetTenant(request, reply, requestedTenantId, query.reason);
      if (!tenantId) return reply;
      const placement = getTenantPlacement(tenantId);
      if (!placement)
        return reply.code(404).send({ ok: false, error: 'No active placement for tenant' });
      const cluster = getCluster(placement.clusterId);
      return { ok: true, placement, cluster: cluster || null };
    }
  );

  /** DELETE /platform/tenants/:tenantId/placement -- deactivate placement */
  server.delete(
    '/platform/tenants/:tenantId/placement',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const { tenantId: requestedTenantId } = request.params as any;
      const body = (request.body as any) || {};
      const tenantId = resolveAdminTargetTenant(request, reply, requestedTenantId, body.reason);
      if (!tenantId) return reply;
      const deactivated = deactivatePlacement(tenantId, getActor(request));
      if (!deactivated) {
        return reply.code(404).send({ ok: false, error: 'No active placement to deactivate' });
      }
      return { ok: true, message: `Placement for tenant ${tenantId} deactivated` };
    }
  );

  /** POST /platform/tenants/simulate-placement -- dry-run placement */
  server.post(
    '/platform/tenants/simulate-placement',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const body = (request.body as any) || {};
      const tenantId = resolveAdminTargetTenant(request, reply, body.tenantId, body.reason);
      if (!tenantId) return reply;
      const result = simulatePlacement({
        tenantId,
        preferredRegion: body.preferredRegion,
        countryPack: body.countryPack,
        dataResidencyConstraint: body.dataResidencyConstraint,
        planTier: body.planTier,
      });
      return { ok: true, ...result };
    }
  );

  /** GET /platform/placements -- list all placements */
  server.get('/platform/placements', async (request: FastifyRequest, _reply: FastifyReply) => {
    const query = request.query as any;
    const clusterId = query.clusterId as string | undefined;
    const region = query.region as string | undefined;
    const active = query.active === 'true' ? true : query.active === 'false' ? false : undefined;
    const placements = listPlacements({ clusterId, region, active });
    return { ok: true, placements, count: placements.length };
  });
}

export default multiClusterRoutes;
