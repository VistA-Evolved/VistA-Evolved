/**
 * rbac.ts -- Unified Role-Based Access Control (Phase 49)
 *
 * Single RBAC layer that consolidates role checks across the entire API.
 * Wraps the policy engine for route-level authorization and provides
 * simple guard functions for route handlers.
 *
 * Design principles:
 *   - Principle of least privilege: deny by default, grant minimum needed
 *   - VistA-first: role mapping aligned with VistA security key concepts
 *   - Unified: one permission check path for all domains (RCM, imaging, analytics, etc.)
 *   - Auditable: every denial is logged to immutable audit trail
 */

import type { FastifyReply } from "fastify";
import type { SessionData, UserRole } from "./session-store.js";
import { evaluatePolicy, type PolicyRole, type PolicyDecision } from "./policy-engine.js";
import { immutableAudit } from "../lib/immutable-audit.js";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Permission definitions                                              */
/* ------------------------------------------------------------------ */

/**
 * Domain-scoped permissions.
 * Each permission maps to a set of roles that may exercise it.
 * Admin always has all permissions (superuser rule in policy engine).
 */
export type RbacPermission =
  // Clinical read
  | "clinical:read"
  // Clinical write
  | "clinical:write"
  // RCM read (view claims, payers, pipeline)
  | "rcm:read"
  // RCM write (create/edit claims, submit, import payers)
  | "rcm:write"
  // RCM admin (payer management, connector config, audit)
  | "rcm:admin"
  // Imaging read
  | "imaging:read"
  // Imaging write (orders, upload)
  | "imaging:write"
  // Imaging admin (device management, audit)
  | "imaging:admin"
  // Analytics read
  | "analytics:read"
  // Analytics admin (export, config)
  | "analytics:admin"
  // Admin operations
  | "admin:system"
  // Audit viewing
  | "audit:read"
  // Telehealth
  | "telehealth:create"
  | "telehealth:join"
  // Portal (patient self-service -- separate domain)
  | "portal:own-data"
  // Migration toolkit (Phase 50)
  | "migration:read"
  | "migration:write"
  | "migration:admin";

/**
 * Role → permission mapping. Principle of least privilege.
 *
 * | Role        | Clinical | RCM      | Imaging  | Analytics | Admin | Audit |
 * |-------------|----------|----------|----------|-----------|-------|-------|
 * | admin       | *        | *        | *        | *         | *     | *     |
 * | provider    | R+W      | R        | R+W      | R         | -     | -     |
 * | nurse       | R+W      | R        | R        | R         | -     | -     |
 * | pharmacist  | R        | R        | R        | R         | -     | -     |
 * | billing     | R        | R+W      | -        | R         | -     | -     |
 * | clerk       | R        | R        | -        | -         | -     | -     |
 * | support     | -        | -        | -        | R         | -     | R     |
 */
const ROLE_PERMISSIONS: Record<UserRole, RbacPermission[]> = {
  admin: [
    "clinical:read", "clinical:write",
    "rcm:read", "rcm:write", "rcm:admin",
    "imaging:read", "imaging:write", "imaging:admin",
    "analytics:read", "analytics:admin",
    "admin:system", "audit:read",
    "telehealth:create", "telehealth:join",
    "migration:read", "migration:write", "migration:admin",
  ],
  provider: [
    "clinical:read", "clinical:write",
    "rcm:read",
    "imaging:read", "imaging:write",
    "analytics:read",
    "telehealth:create", "telehealth:join",
  ],
  nurse: [
    "clinical:read", "clinical:write",
    "rcm:read",
    "imaging:read",
    "analytics:read",
    "telehealth:join",
  ],
  pharmacist: [
    "clinical:read",
    "rcm:read",
    "imaging:read",
    "analytics:read",
  ],
  billing: [
    "clinical:read",
    "rcm:read", "rcm:write",
    "analytics:read",
  ],
  clerk: [
    "clinical:read",
    "rcm:read",
  ],
  support: [
    "analytics:read",
    "audit:read",
  ],
};

/* ------------------------------------------------------------------ */
/* Core check functions                                                */
/* ------------------------------------------------------------------ */

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: RbacPermission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.includes(permission) : false;
}

/**
 * Check if a session has a specific permission.
 */
export function sessionHasPermission(session: SessionData, permission: RbacPermission): boolean {
  return hasPermission(session.role, permission);
}

/**
 * Get all permissions for a role.
 */
export function getPermissionsForRole(role: UserRole): RbacPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/* ------------------------------------------------------------------ */
/* Route guard helpers                                                 */
/* ------------------------------------------------------------------ */

/**
 * Require a specific permission on a route handler.
 * Returns void on success, sends 403 + throws on failure.
 *
 * Usage:
 *   const session = requireSession(request, reply);
 *   requirePermission(session, "rcm:write", reply);
 */
export function requirePermission(
  session: SessionData,
  permission: RbacPermission,
  reply: FastifyReply,
  meta?: { requestId?: string; sourceIp?: string },
): void {
  if (hasPermission(session.role, permission)) return;

  // Audit the denial
  immutableAudit("policy.denied" as any, "denied", {
    sub: session.duz,
    name: session.userName,
    roles: [session.role],
  }, {
    requestId: meta?.requestId,
    sourceIp: meta?.sourceIp,
    detail: {
      permission,
      role: session.role,
      reason: `Role '${session.role}' lacks permission '${permission}'`,
    },
  });

  log.warn("RBAC denied", {
    duz: session.duz,
    role: session.role,
    permission,
  });

  reply.code(403).send({
    ok: false,
    error: "Insufficient privileges",
    requiredPermission: permission,
  });
  throw new Error(`RBAC: role '${session.role}' lacks '${permission}'`);
}

/**
 * Require any one of the specified permissions.
 */
export function requireAnyPermission(
  session: SessionData,
  permissions: RbacPermission[],
  reply: FastifyReply,
  meta?: { requestId?: string; sourceIp?: string },
): void {
  if (permissions.some((p) => hasPermission(session.role, p))) return;

  immutableAudit("policy.denied" as any, "denied", {
    sub: session.duz,
    name: session.userName,
    roles: [session.role],
  }, {
    requestId: meta?.requestId,
    sourceIp: meta?.sourceIp,
    detail: {
      permissions,
      role: session.role,
      reason: `Role '${session.role}' lacks any of: ${permissions.join(", ")}`,
    },
  });

  log.warn("RBAC denied (any)", {
    duz: session.duz,
    role: session.role,
    permissions,
  });

  reply.code(403).send({
    ok: false,
    error: "Insufficient privileges",
    requiredPermissions: permissions,
  });
  throw new Error(`RBAC: role '${session.role}' lacks any of: ${permissions.join(", ")}`);
}

/**
 * Require admin role specifically.
 */
export function requireAdmin(
  session: SessionData,
  reply: FastifyReply,
  meta?: { requestId?: string; sourceIp?: string },
): void {
  return requirePermission(session, "admin:system", reply, meta);
}

/**
 * Require RCM write access.
 */
export function requireRcmWrite(
  session: SessionData,
  reply: FastifyReply,
  meta?: { requestId?: string; sourceIp?: string },
): void {
  return requirePermission(session, "rcm:write", reply, meta);
}

/**
 * Require RCM admin access.
 */
export function requireRcmAdmin(
  session: SessionData,
  reply: FastifyReply,
  meta?: { requestId?: string; sourceIp?: string },
): void {
  return requirePermission(session, "rcm:admin", reply, meta);
}

/* ------------------------------------------------------------------ */
/* Policy engine bridge                                                */
/* ------------------------------------------------------------------ */

/**
 * Evaluate a policy decision using the full policy engine.
 * This bridges the RBAC layer to the more granular policy engine.
 */
export function evaluateAccess(
  session: SessionData,
  action: string,
  resource?: { tenantId?: string; patientDfn?: string },
): PolicyDecision {
  return evaluatePolicy({
    action,
    user: {
      sub: session.duz,
      name: session.userName,
      roles: [session.role as PolicyRole],
      tenantId: session.tenantId,
    },
    resource,
  });
}

/* ------------------------------------------------------------------ */
/* Introspection (for /auth/permissions endpoint)                      */
/* ------------------------------------------------------------------ */

/**
 * Return all permissions and role mappings for documentation / UI.
 */
export function getRbacMatrix(): Record<string, RbacPermission[]> {
  return { ...ROLE_PERMISSIONS };
}
