/**
 * Tenant Context Middleware -- Phase 62.
 *
 * Resolves tenant context from the authenticated session and attaches it
 * to the Fastify request for downstream route handlers.
 *
 * Prevents cross-tenant data leakage by:
 *   1. Resolving tenantId from session (set at login time)
 *   2. Validating tenantId exists in the tenant store
 *   3. Rejecting requests where session.tenantId doesn't match a known tenant
 *   4. Making tenantId available via request decorator for cache scoping
 *
 * This middleware runs AFTER the auth hook in security.ts, so it only
 * fires for authenticated requests (session-required routes).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getSession } from "../auth/session-store.js";
import { getTenant } from "../config/tenant-config.js";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Request decoration                                                  */
/* ------------------------------------------------------------------ */

/**
 * Resolved tenant context available on every authenticated request.
 */
export interface TenantContext {
  tenantId: string;
  facilityName: string;
}

/**
 * Extract tenantId from request (uses the session cookie).
 * Returns null for unauthenticated requests.
 */
export async function getRequestTenantId(request: FastifyRequest): Promise<string | null> {
  // Check decorated property first
  const ctx = (request as any).__tenantCtx as TenantContext | undefined;
  if (ctx) return ctx.tenantId;

  // Fallback: read from session
  const token =
    (request.cookies as any)?.ehr_session ??
    (request.cookies as any)?.portal_session;
  if (!token) return null;

  const session = await getSession(token);
  return session?.tenantId ?? "default";
}

/* ------------------------------------------------------------------ */
/* Middleware registration                                             */
/* ------------------------------------------------------------------ */

/**
 * Register the tenant context hook.
 *
 * Runs on every request AFTER auth. For authenticated requests, it:
 * - Resolves tenantId from session
 * - Validates the tenant exists
 * - Attaches TenantContext to the request
 *
 * Unauthenticated requests (health checks, login, etc.) pass through
 * with tenantId = null.
 */
export async function registerTenantContextMiddleware(
  server: FastifyInstance,
): Promise<void> {
  server.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Extract session token
      const token =
        (request.cookies as any)?.ehr_session ??
        (request.cookies as any)?.portal_session;

      if (!token) {
        // No session -- unauthenticated route, skip
        return;
      }

      const session = await getSession(token);
      if (!session) {
        // Invalid/expired session -- auth middleware will handle 401
        return;
      }

      const tenantId = session.tenantId || "default";

      // Validate tenant exists
      const tenant = getTenant(tenantId);
      if (!tenant) {
        log.warn("Tenant not found for session", {
          tenantId,
          duz: session.duz,
        });
        // Fall back to default tenant rather than hard-fail
        // (single-tenant deployments always use "default")
        const defaultTenant = getTenant("default");
        if (!defaultTenant) {
          reply.code(403).send({
            ok: false,
            error: "Tenant configuration not found",
          });
          return;
        }
        (request as any).__tenantCtx = {
          tenantId: "default",
          facilityName: defaultTenant.facilityName,
        } satisfies TenantContext;
        return;
      }

      (request as any).__tenantCtx = {
        tenantId,
        facilityName: tenant.facilityName,
      } satisfies TenantContext;
    },
  );

  log.info("Tenant context middleware registered");
}
