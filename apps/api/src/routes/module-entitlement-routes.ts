/**
 * Module Entitlement Routes -- Phase 109
 *
 * Admin routes for module entitlement management:
 *   GET    /admin/modules/entitlements       — List tenant module entitlements
 *   POST   /admin/modules/entitlements       — Toggle module for tenant
 *   POST   /admin/modules/entitlements/seed  — Seed baseline modules
 *   GET    /admin/modules/catalog            — Full module catalog from DB
 *   GET    /admin/modules/feature-flags      — List feature flags for tenant
 *   POST   /admin/modules/feature-flags      — Upsert a feature flag
 *   DELETE /admin/modules/feature-flags      — Delete a feature flag
 *   GET    /admin/modules/audit              — Module audit trail
 *
 * All routes require admin auth (enforced by AUTH_RULES in security.ts).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import { log } from "../lib/logger.js";
import {
  listModuleCatalog,
  listTenantModules,
  setModuleEnabled,
  getEnabledModuleIds,
  seedTenantModules,
  getModuleCatalogEntry,
  listTenantFeatureFlags,
  upsertTenantFeatureFlag,
  deleteTenantFeatureFlag,
  appendModuleAudit,
  listModuleAuditLog,
  countModuleAuditLog,
  isModuleEnabledForTenant,
} from "../platform/db/repo/module-repo.js";
import { getEnabledModules as getSkuEnabledModules } from "../modules/module-registry.js";

export default async function moduleEntitlementRoutes(
  server: FastifyInstance
): Promise<void> {

  // Scoped error handler -- catch DB errors and return clean 500 responses
  server.setErrorHandler((error, _request, reply) => {
    const msg = error instanceof Error ? error.message : String(error);
    log.error("Module entitlement route error", { error: msg });
    reply.code(500).send({ ok: false, error: "Internal server error" });
  });

  /* ---------------------------------------------------------------- */
  /* Module Catalog                                                    */
  /* ---------------------------------------------------------------- */

  /** GET /admin/modules/catalog — Full module catalog from DB. */
  server.get(
    "/admin/modules/catalog",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = requireSession(request, reply);
      if (!session) return;

      const catalog = listModuleCatalog();
      return { ok: true, modules: catalog, count: catalog.length };
    }
  );

  /* ---------------------------------------------------------------- */
  /* Tenant Module Entitlements                                        */
  /* ---------------------------------------------------------------- */

  /** GET /admin/modules/entitlements — List module entitlements for a tenant. */
  server.get(
    "/admin/modules/entitlements",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = requireSession(request, reply);
      if (!session) return;

      const tenantId =
        (request.query as any)?.tenantId || session.tenantId || "default";
      const entitlements = listTenantModules(tenantId);
      const enabledIds = getEnabledModuleIds(tenantId);

      return {
        ok: true,
        tenantId,
        entitlements,
        enabledModuleIds: enabledIds,
      };
    }
  );

  /** POST /admin/modules/entitlements — Toggle a module for a tenant. */
  server.post(
    "/admin/modules/entitlements",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = requireSession(request, reply);
      if (!session) return;

      const body = (request.body as any) || {};
      const {
        tenantId = session.tenantId || "default",
        moduleId,
        enabled,
        planTier = "base",
        reason,
      } = body;

      if (!moduleId || typeof enabled !== "boolean") {
        return reply.code(400).send({
          ok: false,
          error: "moduleId (string) and enabled (boolean) are required",
        });
      }

      // Validate module exists in catalog
      const catalogEntry = getModuleCatalogEntry(moduleId);
      if (!catalogEntry) {
        return reply.code(404).send({
          ok: false,
          error: `Module '${moduleId}' not found in catalog`,
        });
      }

      // Cannot disable always-enabled modules
      if (catalogEntry.alwaysEnabled && !enabled) {
        return reply.code(400).send({
          ok: false,
          error: `Module '${moduleId}' is always-enabled and cannot be disabled`,
        });
      }

      // Capture before state
      const before = isModuleEnabledForTenant(tenantId, moduleId);

      // Apply change
      const result = setModuleEnabled(
        tenantId,
        moduleId,
        enabled,
        session.duz,
        planTier
      );

      // Audit log
      appendModuleAudit({
        tenantId,
        actorId: session.duz,
        actorType: "user",
        entityType: "module",
        entityId: moduleId,
        action: enabled ? "enable" : "disable",
        beforeJson: JSON.stringify({ enabled: before }),
        afterJson: JSON.stringify({ enabled, planTier }),
        reason: reason || null,
      });

      log.info("Module entitlement changed", {
        tenantId,
        moduleId,
        enabled,
        actor: session.duz,
      });

      return { ok: true, entitlement: result };
    }
  );

  /** POST /admin/modules/entitlements/seed — Seed baseline modules for a tenant. */
  server.post(
    "/admin/modules/entitlements/seed",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = requireSession(request, reply);
      if (!session) return;

      const body = (request.body as any) || {};
      const tenantId = body.tenantId || session.tenantId || "default";

      // Use SKU-enabled modules as baseline
      const skuModules = getSkuEnabledModules(tenantId);
      const seeded = seedTenantModules(tenantId, skuModules, session.duz);

      // Audit
      appendModuleAudit({
        tenantId,
        actorId: session.duz,
        actorType: "user",
        entityType: "entitlement",
        entityId: "baseline-seed",
        action: "create",
        beforeJson: null,
        afterJson: JSON.stringify({ modules: skuModules, seeded }),
        reason: "Baseline seed from SKU profile",
      });

      return {
        ok: true,
        tenantId,
        modulesSeeded: seeded,
        totalEnabled: getEnabledModuleIds(tenantId).length,
      };
    }
  );

  /* ---------------------------------------------------------------- */
  /* Feature Flags                                                     */
  /* ---------------------------------------------------------------- */

  /** GET /admin/modules/feature-flags — List feature flags for a tenant. */
  server.get(
    "/admin/modules/feature-flags",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = requireSession(request, reply);
      if (!session) return;

      const tenantId =
        (request.query as any)?.tenantId || session.tenantId || "default";
      const flags = listTenantFeatureFlags(tenantId);

      return { ok: true, tenantId, flags, count: flags.length };
    }
  );

  /** POST /admin/modules/feature-flags — Upsert a feature flag. */
  server.post(
    "/admin/modules/feature-flags",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = requireSession(request, reply);
      if (!session) return;

      const body = (request.body as any) || {};
      const {
        tenantId = session.tenantId || "default",
        flagKey,
        flagValue,
        moduleId,
        description,
        reason,
      } = body;

      if (!flagKey || flagValue === undefined) {
        return reply.code(400).send({
          ok: false,
          error: "flagKey (string) and flagValue (string) are required",
        });
      }

      // Capture before state
      const before = listTenantFeatureFlags(tenantId).find(
        (f) => f.flagKey === flagKey
      );

      const result = upsertTenantFeatureFlag(
        tenantId,
        flagKey,
        String(flagValue),
        moduleId,
        description
      );

      // Audit
      appendModuleAudit({
        tenantId,
        actorId: session.duz,
        actorType: "user",
        entityType: "feature_flag",
        entityId: flagKey,
        action: before ? "update" : "create",
        beforeJson: before ? JSON.stringify(before) : null,
        afterJson: JSON.stringify(result),
        reason: reason || null,
      });

      return { ok: true, flag: result };
    }
  );

  /** DELETE /admin/modules/feature-flags — Remove a feature flag. */
  server.delete(
    "/admin/modules/feature-flags",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = requireSession(request, reply);
      if (!session) return;

      const body = (request.body as any) || {};
      const {
        tenantId = session.tenantId || "default",
        flagKey,
        reason,
      } = body;

      if (!flagKey) {
        return reply.code(400).send({
          ok: false,
          error: "flagKey is required",
        });
      }

      const before = listTenantFeatureFlags(tenantId).find(
        (f) => f.flagKey === flagKey
      );

      const deleted = deleteTenantFeatureFlag(tenantId, flagKey);

      if (deleted) {
        appendModuleAudit({
          tenantId,
          actorId: session.duz,
          actorType: "user",
          entityType: "feature_flag",
          entityId: flagKey,
          action: "delete",
          beforeJson: before ? JSON.stringify(before) : null,
          afterJson: null,
          reason: reason || null,
        });
      }

      return { ok: true, deleted };
    }
  );

  /* ---------------------------------------------------------------- */
  /* Audit Log                                                         */
  /* ---------------------------------------------------------------- */

  /** GET /admin/modules/audit — Module audit trail for a tenant. */
  server.get(
    "/admin/modules/audit",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = requireSession(request, reply);
      if (!session) return;

      const query = (request.query as any) || {};
      const tenantId = query.tenantId || session.tenantId || "default";
      const limit = Math.min(parseInt(query.limit) || 100, 500);
      const offset = parseInt(query.offset) || 0;

      const entries = listModuleAuditLog(tenantId, limit, offset);
      const total = countModuleAuditLog(tenantId);

      return {
        ok: true,
        tenantId,
        entries,
        total,
        limit,
        offset,
      };
    }
  );
}
