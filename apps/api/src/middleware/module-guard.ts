/**
 * Module Guard Middleware -- Phase 37C.
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
import { getPortalSession } from '../routes/portal-auth.js';
import { getIamSession } from '../portal-iam/portal-iam-routes.js';

/* ------------------------------------------------------------------ */
/* Bypass patterns -- never blocked by module guard                     */
/* ------------------------------------------------------------------ */

const BYPASS_PATTERNS = [
  /^\/health$/,
  /^\/ready$/,
  /^\/version$/,
  /^\/metrics/,
  /^\/vista\/ping$/,
  /^\/vista\/swap-boundary$/,
  /^\/queue\/display\//,
  /^\/auth\//,
  /^\/portal\/auth\//,
  /^\/portal\/iam\/login$/,
  /^\/portal\/iam\/register$/,
  /^\/portal\/iam\/password\/(reset|confirm)$/,
  /^\/intake\//, // Phase 625: intake routes resolve portal/clinician/kiosk auth inside handlers
  /^\/api\/modules/,
  /^\/api\/capabilities/,
  /^\/api\/adapters/,
  /^\/api\/marketplace/,
  /^\/admin\/modules/, // Phase 109: Module entitlement admin routes
  /^\/admin\/provisioning/, // Phase C4: SaaS provisioning admin routes
  /^\/signup\//, // Phase C4: Public signup registration
  /^\/billing\//, // Phase D: Billing routes (plans are public, others are session-gated)
  /^\/posture\//, // Phase 107: Infrastructure posture routes
  /^\/fhir\//, // Phase 178: FHIR R4 gateway (auth handled per-route in security.ts)
  /^\/\.well-known\//, // Phase 179: SMART on FHIR discovery (public per spec)
  /^\/docs\//, // Phase VII: VistA documentation assistant (public reference API)
  /^\/vista-help\//, // VistA help API (public reference)
];

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Fastify onRequest hook -- module-level route guard.
 * Must be called inside the handler body or added globally via addHook.
 */
export async function moduleGuardHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // BUG-067: Don't send a second response if auth gateway already rejected
  if ((request as any)._rejected || reply.sent) return;

  const path = request.url.split('?')[0]; // strip query params

  // Bypass infrastructure routes
  for (const pattern of BYPASS_PATTERNS) {
    if (pattern.test(path)) return;
  }

  // Prefer the request-scoped tenant resolved by tenant middleware.
  const session = (request as any).session;
  const portalSession =
    path.startsWith('/portal/') || path.startsWith('/ai/portal/') ? getPortalSession(request) : null;
  const iamSession = path.startsWith('/portal/iam/') ? getIamSession(request) : null;
  const tenantId =
    (request as any).tenantId ||
    session?.tenantId ||
    iamSession?.tenantId ||
    portalSession?.tenantId ||
    '';
  if (!tenantId) {
    log.warn('Route blocked: tenant context missing', { path });
    (request as any)._rejected = true;
    reply.code(400).send({
      ok: false,
      code: 'TENANT_REQUIRED',
      error: 'Tenant context required',
      message: 'No tenant context was resolved for this request.',
    });
    return;
  }

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
        log.warn('Route blocked: tenant has no entitlement rows', {
          path,
          tenantId,
          module: moduleId,
        });
        (request as any)._rejected = true;
        reply.code(403).send({
          ok: false,
          code: 'TENANT_UNPROVISIONED',
          error: 'Tenant not provisioned',
          module: moduleId,
          message: `Tenant '${tenantId}' has no module entitlement records.`,
        });
        return;
      }

      const enabledModules = await getEnabledModuleIds(tenantId);
      if (!enabledModules.includes(moduleId)) {
        log.warn('Route blocked by DB-backed module guard', {
          path,
          tenantId,
          module: moduleId,
        });

        (request as any)._rejected = true;
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

    (request as any)._rejected = true;
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
