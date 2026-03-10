/**
 * Feature Flag Evaluation Routes (Phase 285)
 *
 * Runtime flag evaluation endpoints. Separate from the CRUD endpoints
 * in module-entitlement-routes.ts (which manage flag definitions).
 * These routes evaluate flags against a given context.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { getFeatureFlagProvider } from '../flags/types.js';
import type { FlagContext } from '../flags/types.js';

function resolveTenantId(request: any, explicitTenantId?: unknown): string | null {
  const bodyTenantId =
    typeof explicitTenantId === 'string' && explicitTenantId.trim() ? explicitTenantId.trim() : null;
  const headerTenantId = request?.headers?.['x-tenant-id'];
  const headerTenant =
    typeof headerTenantId === 'string' && headerTenantId.trim() ? headerTenantId.trim() : null;
  const requestTenantId =
    typeof request?.tenantId === 'string' && request.tenantId.trim() ? request.tenantId.trim() : null;
  const sessionTenantId =
    typeof request?.session?.tenantId === 'string' && request.session.tenantId.trim()
      ? request.session.tenantId.trim()
      : null;
  return bodyTenantId || headerTenant || requestTenantId || sessionTenantId || null;
}

function requireTenantId(
  request: FastifyRequest,
  reply: FastifyReply,
  explicitTenantId?: unknown
): string | null {
  const tenantId = resolveTenantId(request, explicitTenantId);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

export default async function flagEvalRoutes(server: FastifyInstance): Promise<void> {
  /** POST /admin/flags/evaluate -- Evaluate a single flag. */
  server.post('/admin/flags/evaluate', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const provider = getFeatureFlagProvider();
    if (!provider) {
      return reply.code(503).send({
        ok: false,
        error: 'Feature flag provider not initialized',
      });
    }

    const body = (request.body as any) || {};
    const { flagKey, tenantId, userId, properties } = body;

    if (!flagKey) {
      return reply.code(400).send({
        ok: false,
        error: 'flagKey is required',
      });
    }

    const resolvedTenantId = requireTenantId(request, reply, tenantId);
    if (!resolvedTenantId) return;

    const context: FlagContext = {
      tenantId: resolvedTenantId,
      userId: userId || session.duz,
      properties: properties || {},
    };

    const result = await provider.isEnabled(flagKey, context);
    return { ok: true, flagKey, result };
  });

  /** POST /admin/flags/evaluate-all -- Bulk-evaluate multiple flags. */
  server.post('/admin/flags/evaluate-all', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const provider = getFeatureFlagProvider();
    if (!provider) {
      return reply.code(503).send({
        ok: false,
        error: 'Feature flag provider not initialized',
      });
    }

    const body = (request.body as any) || {};
    const { flagKeys, tenantId, userId, properties } = body;

    if (!Array.isArray(flagKeys) || flagKeys.length === 0) {
      return reply.code(400).send({
        ok: false,
        error: 'flagKeys (string[]) is required',
      });
    }

    const resolvedTenantId = requireTenantId(request, reply, tenantId);
    if (!resolvedTenantId) return;

    const context: FlagContext = {
      tenantId: resolvedTenantId,
      userId: userId || session.duz,
      properties: properties || {},
    };

    const results = await provider.evaluateAll(flagKeys, context);
    return { ok: true, results };
  });

  /** POST /admin/flags/variant -- Get variant for a flag. */
  server.post('/admin/flags/variant', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const provider = getFeatureFlagProvider();
    if (!provider) {
      return reply.code(503).send({
        ok: false,
        error: 'Feature flag provider not initialized',
      });
    }

    const body = (request.body as any) || {};
    const { flagKey, tenantId, userId, properties } = body;

    if (!flagKey) {
      return reply.code(400).send({
        ok: false,
        error: 'flagKey is required',
      });
    }

    const resolvedTenantId = requireTenantId(request, reply, tenantId);
    if (!resolvedTenantId) return;

    const context: FlagContext = {
      tenantId: resolvedTenantId,
      userId: userId || session.duz,
      properties: properties || {},
    };

    const result = await provider.getVariant(flagKey, context);
    return { ok: true, flagKey, result };
  });

  /** GET /admin/flags/health -- Provider health check. */
  server.get('/admin/flags/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const provider = getFeatureFlagProvider();
    if (!provider) {
      return {
        ok: false,
        provider: null,
        healthy: false,
        error: 'Feature flag provider not initialized',
      };
    }

    const healthy = await provider.healthCheck();
    return {
      ok: true,
      provider: provider.providerType,
      healthy,
    };
  });
}
