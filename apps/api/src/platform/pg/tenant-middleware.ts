/**
 * Platform DB — Tenant Middleware for Fastify
 *
 * Phase 101: Platform Data Architecture Convergence
 *
 * Extracts tenant_id from request headers or session and makes it
 * available via request.tenantId for downstream route handlers.
 *
 * Tenant resolution order:
 *   1. X-Tenant-Id header (admin/service-to-service)
 *   2. Session data (if authenticated)
 *   3. Falls back to 'default' (single-tenant mode)
 *
 * This is a Fastify decorateRequest + onRequest hook.
 */

import { FastifyInstance, FastifyRequest } from "fastify";

// Extend Fastify request with tenantId
declare module "fastify" {
  interface FastifyRequest {
    tenantId: string;
  }
}

/**
 * Register the tenant resolution hook on a Fastify server instance.
 * Must be called AFTER auth middleware (so session is available).
 */
export function registerTenantHook(server: FastifyInstance): void {
  // Decorate request with default tenantId
  server.decorateRequest("tenantId", "default");

  server.addHook("onRequest", async (request: FastifyRequest) => {
    // Priority 1: Explicit header (for admin/service calls)
    const headerTenant = request.headers["x-tenant-id"];
    if (typeof headerTenant === "string" && headerTenant.trim().length > 0) {
      // Basic validation: no SQL injection chars
      if (!/[';\\]/.test(headerTenant)) {
        request.tenantId = headerTenant.trim();
        return;
      }
    }

    // Priority 2: Session-derived tenant (if session middleware set it)
    const session = (request as any).session;
    if (session?.tenantId && typeof session.tenantId === "string") {
      request.tenantId = session.tenantId;
      return;
    }

    // Priority 3: Default tenant
    request.tenantId = "default";
  });
}
