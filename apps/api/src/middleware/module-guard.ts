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
import { isRouteAllowed } from '../modules/module-registry.js';
import { log } from '../lib/logger.js';

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

  // Extract tenant from session or use default
  const session = (request as any).session;
  const tenantId = session?.tenantId || 'default';

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
