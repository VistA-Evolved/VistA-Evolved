/**
 * Tenant Security Routes — Phase 342 (W16-P6).
 *
 * Admin-only endpoints for per-tenant security posture configuration.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getTenantSecurityPolicy,
  updateTenantSecurityPolicy,
  listTenantSecurityPolicies,
  getTenantPolicyChangeLog,
  deleteTenantSecurityPolicy,
} from '../auth/tenant-security-policy.js';

export async function tenantSecurityRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /tenant-security/policies — List all tenant security policies.
   */
  app.get('/tenant-security/policies', async (_request: FastifyRequest, reply: FastifyReply) => {
    const policies = listTenantSecurityPolicies();
    return reply.send({ ok: true, policies, total: policies.length });
  });

  /**
   * GET /tenant-security/policies/:tenantId — Get policy for a specific tenant.
   */
  app.get(
    '/tenant-security/policies/:tenantId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.params as { tenantId: string };
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
      const { tenantId } = request.params as { tenantId: string };
      const body = (request.body as Record<string, unknown>) || {};
      const session = (request as any).session;
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
      const { tenantId } = request.params as { tenantId: string };
      const session = (request as any).session;
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
    const query = request.query as { tenantId?: string };
    const changes = getTenantPolicyChangeLog(query.tenantId);
    return reply.send({ ok: true, changes, total: changes.length });
  });
}
