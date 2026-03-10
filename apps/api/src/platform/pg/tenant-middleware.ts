/**
 * Platform DB -- Tenant Middleware for Fastify
 *
 * Phase 101: Platform Data Architecture Convergence
 *
 * Extracts tenant_id from request headers or session and makes it
 * available via request.tenantId for downstream route handlers.
 *
 * Tenant resolution order:
 *   1. Session data (if authenticated)
 *   2. X-Tenant-Id header (admin/service-to-service)
 *   3. Leaves the tenant unresolved when neither source is present
 *
 * This is a Fastify decorateRequest + onRequest hook.
 */

import { FastifyInstance, FastifyRequest } from 'fastify';

// Extend Fastify request with tenantId
declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string;
  }
}

/**
 * Register the tenant resolution hook on a Fastify server instance.
 * Must be called AFTER auth middleware (so session is available).
 */
export function registerTenantHook(server: FastifyInstance): void {
  // Decorate request with an empty tenantId so downstream guards can fail closed
  server.decorateRequest('tenantId', '');

  server.addHook('onRequest', async (request: FastifyRequest) => {
    // Priority 1: Session-derived tenant (if session middleware set it)
    const session = (request as any).session;
    if (session?.tenantId && typeof session.tenantId === 'string') {
      request.tenantId = session.tenantId;
      return;
    }

    // Priority 2: Explicit header (for admin/service calls without session)
    const headerTenant = request.headers['x-tenant-id'];
    if (typeof headerTenant === 'string' && headerTenant.trim().length > 0) {
      // Basic validation: no SQL injection chars
      if (!/[';\\]/.test(headerTenant)) {
        request.tenantId = headerTenant.trim();
        return;
      }
    }

    // Priority 3: leave unresolved. Auth and module guards must reject
    // requests that still lack tenant context.
    request.tenantId = '';
  });
}
