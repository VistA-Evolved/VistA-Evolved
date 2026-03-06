/**
 * Module Guard Middleware — Phase 37C.
 *
 * Fastify onRequest hook that checks whether the incoming route belongs to
 * an enabled module for the requesting tenant. Routes belonging to disabled
 * modules are rejected with 403.
 *
 * Bypass routes (health, auth, etc.) are never blocked.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { getModuleDefinition, isRouteAllowed, resolveModuleForRoute } from '../modules/module-registry.js';
import { log } from '../lib/logger.js';
import { isPgConfigured } from '../platform/pg/pg-db.js';
import { getEnabledModuleIds, listTenantModules } from '../platform/pg/repo/module-repo.js';

/* ------------------------------------------------------------------ */
/* Bypass patterns — never blocked by module guard                     */
/* ------------------------------------------------------------------ */

const BYPASS_PATTERNS = [
  /^\/health$/,
  /^\/ready$/,
  /^\/version$/,
  /^\/metrics/,
  /^\/auth\//,
  /^\/api\/modules/,
  /^\/api\/capabilities/,
  /^\/api\/adapters/,
  /^\/api\/marketplace/,
  /^\/admin\/modules/, // Phase 109: Module entitlement admin routes
  /^\/posture\//, // Phase 107: Infrastructure posture routes
];

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Fastify onRequest hook — module-level route guard.
 * Must be called inside the handler body or added globally via addHook.
 */
export async function moduleGuardHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const path = request.url.split('?')[0]; // strip query params

  // Bypass infrastructure routes
  for (const pattern of BYPASS_PATTERNS) {
    if (pattern.test(path)) return;
  }

  // Prefer the request-scoped tenant resolved by tenant middleware.
  const session = (request as any).session;
  const tenantId = (request as any).tenantId || session?.tenantId || 'default';

  // In PG-backed deployments, enforce module entitlements from the DB instead
  // of the legacy in-memory override map. Fall back to registry logic if PG
  // is not configured or the DB path is unavailable.
  if (isPgConfigured()) {
    const moduleId = resolveModuleForRoute(path);
    if (!moduleId) return;

    const def = getModuleDefinition(moduleId);
    if (def?.alwaysEnabled) return;

    try {
      const tenantModules = await listTenantModules(tenantId);
      if (tenantModules.length === 0) {
        return;
      }

      const enabledModules = await getEnabledModuleIds(tenantId);
      if (!enabledModules.includes(moduleId)) {
        log.warn('Route blocked by DB-backed module guard', {
          path,
          tenantId,
          module: moduleId,
        });

        reply.code(403).send({
          ok: false,
          code: 'MODULE_DISABLED',
          error: 'Module not enabled',
          module: moduleId,
          message: `Module '${moduleId}' (${def?.name || moduleId}) is not enabled for this facility.`,
        });
        return;
      }

      return;
    } catch (error) {
      log.warn('DB-backed module guard unavailable, falling back to registry', {
        path,
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Check module enablement
  const result = isRouteAllowed(path, tenantId);
  if (!result.allowed) {
    log.warn('Route blocked by module guard', {
      path,
      tenantId,
      module: result.moduleId || 'unknown',
      reason: result.reason,
    });

    reply.code(403).send({
      ok: false,
      code: 'MODULE_DISABLED',
      error: 'Module not enabled',
      module: result.moduleId || 'unknown',
      message: result.reason || `Module is not enabled for this deployment.`,
    });
    return;
  }
}
