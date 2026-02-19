/**
 * Module & Capability API Routes — Phase 37C.
 *
 * Exposes module registry status, capability resolution, and adapter
 * health to admin dashboards and the UI capability-driven rendering.
 *
 * Public routes (session auth):
 *   GET /api/capabilities           — resolved capabilities for this tenant
 *   GET /api/capabilities/summary   — live/pending/disabled counts
 *
 * Admin routes (admin role):
 *   GET  /api/modules/status        — module enablement status
 *   GET  /api/modules/skus          — available SKU profiles
 *   POST /api/modules/override      — per-tenant module override
 *   GET  /api/adapters/health       — adapter health status
 *   GET  /api/adapters/list         — all loaded adapters
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import { log } from "../lib/logger.js";
import {
  getModuleStatus,
  getSkuProfiles,
  getActiveSku,
  setTenantModules,
  validateDependencies,
  getEnabledModules,
} from "../modules/module-registry.js";
import {
  resolveCapabilities,
  getCapabilitySummary,
  getCapabilitiesByModule,
} from "../modules/capability-service.js";
import {
  getAdapterHealth,
  getAllAdapters,
} from "../adapters/adapter-loader.js";

export default async function moduleCapabilityRoutes(server: FastifyInstance): Promise<void> {
  /* ---------------------------------------------------------------- */
  /* Public: Capability resolution (session auth via security.ts)      */
  /* ---------------------------------------------------------------- */

  /** GET /api/capabilities — resolved capabilities for current tenant. */
  server.get("/api/capabilities", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const tenantId = (session as any).tenantId || "default";
    const capabilities = resolveCapabilities(tenantId);

    return {
      ok: true,
      tenantId,
      capabilities,
    };
  });

  /** GET /api/capabilities/summary — live/pending/disabled counts. */
  server.get("/api/capabilities/summary", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const tenantId = (session as any).tenantId || "default";
    const summary = getCapabilitySummary(tenantId);

    return {
      ok: true,
      tenantId,
      summary,
    };
  });

  /** GET /api/capabilities/by-module — grouped capabilities. */
  server.get("/api/capabilities/by-module", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const tenantId = (session as any).tenantId || "default";
    const grouped = getCapabilitiesByModule(tenantId);

    return {
      ok: true,
      tenantId,
      modules: grouped,
    };
  });

  /* ---------------------------------------------------------------- */
  /* Admin: Module status & management                                 */
  /* ---------------------------------------------------------------- */

  /** GET /api/modules/status — module enablement status. */
  server.get("/api/modules/status", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    // Admin check
    if ((session as any).role !== "admin") {
      reply.code(403).send({ ok: false, error: "Admin role required" });
      return;
    }

    const tenantId = ((request.query as any)?.tenantId as string) || "default";
    const status = getModuleStatus(tenantId);
    const depErrors = validateDependencies(getEnabledModules(tenantId));

    return {
      ok: true,
      sku: getActiveSku(),
      tenantId,
      modules: status,
      dependencyErrors: depErrors,
    };
  });

  /** GET /api/modules/skus — available SKU profiles. */
  server.get("/api/modules/skus", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    if ((session as any).role !== "admin") {
      reply.code(403).send({ ok: false, error: "Admin role required" });
      return;
    }

    return {
      ok: true,
      activeSku: getActiveSku(),
      profiles: getSkuProfiles(),
    };
  });

  /** POST /api/modules/override — per-tenant module override. */
  server.post("/api/modules/override", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    if ((session as any).role !== "admin") {
      reply.code(403).send({ ok: false, error: "Admin role required" });
      return;
    }

    const body = (request.body as any) || {};
    const { tenantId, modules } = body;

    if (!tenantId) {
      reply.code(400).send({ ok: false, error: "tenantId is required" });
      return;
    }

    // null → clear overrides, array → set overrides
    if (modules === null || modules === undefined) {
      setTenantModules(tenantId, null);
      log.info("Cleared module overrides for tenant", { tenantId });
      return { ok: true, message: `Overrides cleared for tenant '${tenantId}'` };
    }

    if (!Array.isArray(modules)) {
      reply.code(400).send({ ok: false, error: "modules must be an array or null" });
      return;
    }

    // Validate dependencies before applying
    const depErrors = validateDependencies(modules);
    if (depErrors.length > 0) {
      reply.code(400).send({
        ok: false,
        error: "Dependency validation failed",
        details: depErrors,
      });
      return;
    }

    setTenantModules(tenantId, modules);
    log.info("Applied module overrides for tenant", { tenantId, modules });

    return {
      ok: true,
      message: `Module overrides applied for tenant '${tenantId}'`,
      enabledModules: getEnabledModules(tenantId),
    };
  });

  /* ---------------------------------------------------------------- */
  /* Admin: Adapter health & info                                      */
  /* ---------------------------------------------------------------- */

  /** GET /api/adapters/health — adapter health status. */
  server.get("/api/adapters/health", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    if ((session as any).role !== "admin") {
      reply.code(403).send({ ok: false, error: "Admin role required" });
      return;
    }

    const health = await getAdapterHealth();
    return { ok: true, adapters: health };
  });

  /** GET /api/adapters/list — all loaded adapters. */
  server.get("/api/adapters/list", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    if ((session as any).role !== "admin") {
      reply.code(403).send({ ok: false, error: "Admin role required" });
      return;
    }

    const adapters = getAllAdapters();
    const list = [...adapters.entries()].map(([type, adapter]) => ({
      type,
      implementation: adapter.implementationName,
      isStub: adapter._isStub,
    }));

    return { ok: true, adapters: list };
  });
}
