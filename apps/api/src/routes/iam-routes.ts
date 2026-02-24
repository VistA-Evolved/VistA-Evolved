/**
 * IAM Routes — Phase 35.
 *
 * REST endpoints for:
 *   - Immutable audit query/verify/stats
 *   - Policy engine capabilities
 *   - Biometric provider listing
 *   - OIDC configuration (non-sensitive)
 *
 * All routes require session auth; role checks happen inside handlers.
 */

import type { FastifyInstance } from "fastify";
import { requireSession, requireRole } from "../auth/auth-routes.js";
import {
  queryImmutableAudit,
  getImmutableAuditStats,
  verifyAuditChain,
  immutableAudit,
} from "../lib/immutable-audit.js";
import {
  evaluatePolicy,
  getActionsForRoles,
  type PolicyRole,
  type PolicyUser,
} from "../auth/policy-engine.js";
import { getOidcConfig } from "../auth/oidc-provider.js";
import { listBiometricProviders, hasBiometricProviders } from "../auth/biometric/index.js";

export default async function iamRoutes(server: FastifyInstance): Promise<void> {

  /* ---------------------------------------------------------------- */
  /* Immutable Audit endpoints                                        */
  /* ---------------------------------------------------------------- */

  /**
   * GET /iam/audit/events — Query immutable audit events.
   * Requires admin or support role.
   */
  server.get("/iam/audit/events", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin", "support"], reply);

    const query = request.query as Record<string, string>;
    const events = queryImmutableAudit({
      actionPrefix: query.actionPrefix,
      actorId: query.actorId,
      tenantId: query.tenantId,
      since: query.since,
      outcome: query.outcome as any,
      limit: query.limit ? Number(query.limit) : 100,
    });

    immutableAudit("audit.view", "success", {
      sub: session.duz, name: session.userName, roles: [session.role],
    }, {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      tenantId: session.tenantId,
      detail: { query: { actionPrefix: query.actionPrefix, limit: query.limit } },
    });

    return { ok: true, events, count: events.length };
  });

  /**
   * GET /iam/audit/stats — Immutable audit statistics.
   * Requires admin or support role.
   */
  server.get("/iam/audit/stats", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin", "support"], reply);

    const stats = getImmutableAuditStats();
    return { ok: true, stats };
  });

  /**
   * GET /iam/audit/verify — Verify hash chain integrity.
   * Requires admin role only.
   */
  server.get("/iam/audit/verify", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const verification = verifyAuditChain();

    immutableAudit("audit.verify", "success", {
      sub: session.duz, name: session.userName, roles: [session.role],
    }, {
      requestId: (request as any).requestId,
      detail: { action: "chain-verify", result: verification.valid },
    });

    return { ok: true, verification };
  });

  /* ---------------------------------------------------------------- */
  /* Policy engine endpoints                                          */
  /* ---------------------------------------------------------------- */

  /**
   * GET /iam/policy/capabilities — Get actions available to current user.
   * Any authenticated user can query their own capabilities.
   */
  server.get("/iam/policy/capabilities", async (request, reply) => {
    const session = await requireSession(request, reply);

    const actions = getActionsForRoles([session.role as PolicyRole]);
    return {
      ok: true,
      role: session.role,
      actions,
      count: actions.length,
    };
  });

  /**
   * POST /iam/policy/evaluate — Evaluate a policy decision (admin/support only).
   * Used for testing/debugging policies.
   */
  server.post("/iam/policy/evaluate", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin", "support"], reply);

    const body = (request.body as any) || {};
    const action = body.action;
    const roles = body.roles || [session.role];

    if (!action) {
      return reply.code(400).send({ ok: false, error: "action is required" });
    }

    const user: PolicyUser = {
      sub: session.duz,
      name: session.userName,
      roles,
      tenantId: session.tenantId,
    };

    const decision = evaluatePolicy({
      action,
      user,
      resource: body.resource,
    });

    return { ok: true, decision };
  });

  /**
   * GET /iam/policy/roles — Get all role definitions and their permissions.
   * Any authenticated user can view role definitions.
   */
  server.get("/iam/policy/roles", async (request, reply) => {
    const session = await requireSession(request, reply);

    const roles: PolicyRole[] = ["provider", "nurse", "pharmacist", "clerk", "admin", "patient", "support"];
    const roleMap: Record<string, { actions: string[]; count: number }> = {};

    for (const role of roles) {
      const actions = getActionsForRoles([role]);
      roleMap[role] = { actions, count: actions.length };
    }

    return { ok: true, roles: roleMap };
  });

  /* ---------------------------------------------------------------- */
  /* OIDC configuration (non-sensitive)                               */
  /* ---------------------------------------------------------------- */

  /**
   * GET /iam/oidc/config — Get OIDC configuration (non-sensitive).
   * Public endpoint (no auth required) — only returns issuer and enabled status.
   */
  server.get("/iam/oidc/config", async (_request, _reply) => {
    const config = getOidcConfig();
    return {
      ok: true,
      oidc: {
        enabled: config.enabled,
        issuer: config.enabled ? config.issuer : undefined,
        // Never expose client secrets or JWKS URI externally
      },
    };
  });

  /* ---------------------------------------------------------------- */
  /* Biometric provider info                                          */
  /* ---------------------------------------------------------------- */

  /**
   * GET /iam/biometric/providers — List available biometric providers.
   * Any authenticated user can see what's available.
   */
  server.get("/iam/biometric/providers", async (request, reply) => {
    const session = await requireSession(request, reply);

    return {
      ok: true,
      available: hasBiometricProviders(),
      providers: listBiometricProviders(),
    };
  });

  /* ---------------------------------------------------------------- */
  /* Health check                                                     */
  /* ---------------------------------------------------------------- */

  /**
   * GET /iam/health — IAM subsystem health.
   */
  server.get("/iam/health", async (_request, _reply) => {
    const oidcConfig = getOidcConfig();
    return {
      ok: true,
      subsystem: "iam",
      oidcEnabled: oidcConfig.enabled,
      biometricAvailable: hasBiometricProviders(),
      policyEngine: "in-process",
      auditChainValid: verifyAuditChain().valid,
    };
  });
}
