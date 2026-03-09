/**
 * Tenant Security Routes — Phase 342 (W16-P6).
 *
 * Admin-only endpoints for per-tenant security posture configuration.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireRole, requireSession } from '../auth/auth-routes.js';
import {
  getTenantSecurityPolicy,
  updateTenantSecurityPolicy,
  listTenantSecurityPolicies,
  getTenantPolicyChangeLog,
  deleteTenantSecurityPolicy,
} from '../auth/tenant-security-policy.js';

function resolveTenantId(request: FastifyRequest): string | null {
  const sessionTenantId =
    typeof (request as any)?.session?.tenantId === 'string' &&
    (request as any).session.tenantId.trim().length > 0
      ? (request as any).session.tenantId.trim()
      : undefined;
  const requestTenantId =
    typeof (request as any)?.tenantId === 'string' && (request as any).tenantId.trim().length > 0
      ? (request as any).tenantId.trim()
      : undefined;
  return sessionTenantId || requestTenantId || null;
}

function requireTenantId(request: FastifyRequest, reply: FastifyReply): string | null {
  const tenantId = resolveTenantId(request);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

export async function tenantSecurityRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /tenant-security/policies — List all tenant security policies.
   */
  app.get('/tenant-security/policies', async (_request: FastifyRequest, reply: FastifyReply) => {
    const request = _request;
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const policies = listTenantSecurityPolicies().filter((policy) => policy.tenantId === tenantId);
    return reply.send({ ok: true, policies, total: policies.length });
  });

  /**
   * GET /tenant-security/policies/:tenantId — Get policy for a specific tenant.
   */
  app.get(
    '/tenant-security/policies/:tenantId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      requireRole(session, ['admin'], reply);
      const { tenantId: requestedTenantId } = request.params as { tenantId: string };
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      if (requestedTenantId !== tenantId) {
        reply.code(404);
        return reply.send({ ok: false, error: 'policy_not_found' });
      }
      const policy = getTenantSecurityPolicy(tenantId);
      return reply.send({ ok: true, policy });
    }
  );

  /**
   * PUT /tenant-security/policies/:tenantId — Update tenant security policy.
   */
  app.put(
    '/tenant-security/policies/:tenantId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      requireRole(session, ['admin'], reply);
      const { tenantId: requestedTenantId } = request.params as { tenantId: string };
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      if (requestedTenantId !== tenantId) {
        reply.code(404);
        return reply.send({ ok: false, error: 'policy_not_found' });
      }
      const body = (request.body as Record<string, unknown>) || {};
      const updatedBy = session?.userName || session?.duz || 'admin';

      const { policy, changes } = updateTenantSecurityPolicy(tenantId, body, updatedBy);
      return reply.send({ ok: true, policy, changes });
    }
  );

  /**
   * DELETE /tenant-security/policies/:tenantId — Reset to defaults.
   */
  app.delete(
    '/tenant-security/policies/:tenantId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      requireRole(session, ['admin'], reply);
      const { tenantId: requestedTenantId } = request.params as { tenantId: string };
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      if (requestedTenantId !== tenantId) {
        reply.code(404);
        return reply.send({ ok: false, error: 'policy_not_found' });
      }
      const deletedBy = session?.userName || session?.duz || 'admin';
      const deleted = deleteTenantSecurityPolicy(tenantId, deletedBy);
      return reply.send({ ok: true, deleted });
    }
  );

  /**
   * GET /tenant-security/changelog — Policy change audit log.
   * Query: ?tenantId=<id> for filtering.
   */
  app.get('/tenant-security/changelog', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const changes = getTenantPolicyChangeLog(tenantId);
    return reply.send({ ok: true, changes, total: changes.length });
  });
}
