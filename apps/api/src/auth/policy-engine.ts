/**
 * Policy-Based Authorization Engine — Phase 35.
 *
 * Evaluates access control decisions using a role-based + attribute-based
 * policy model. Compatible with OPA policy structure but evaluated in-process
 * for zero-latency decisions in dev. Production can delegate to OPA sidecar.
 *
 * Design principles:
 *   - Default DENY: all actions denied unless explicitly allowed
 *   - VistA-first: RPC Broker context checks remain authoritative for clinical ops
 *   - Break-glass: scaffold for emergency access override (always audited)
 *   - Tenant isolation: cross-tenant access always denied
 *   - Every route declares an "action" string; policy engine evaluates allow/deny
 *
 * Roles: provider, nurse, pharmacist, clerk, admin, patient, support
 */

import { log } from "../lib/logger.js";
import { immutableAudit, type ImmutableAuditAction } from "../lib/immutable-audit.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type PolicyRole = "provider" | "nurse" | "pharmacist" | "clerk" | "admin" | "patient" | "support";

export interface PolicyUser {
  /** VistA DUZ or OIDC sub */
  sub: string;
  /** Display name */
  name: string;
  /** Assigned roles */
  roles: PolicyRole[];
  /** Tenant identifier */
  tenantId: string;
  /** Facility station */
  facilityStation?: string;
  /** Break-glass active */
  breakGlass?: boolean;
  /** Break-glass expiration (epoch ms) */
  breakGlassExpiresAt?: number;
  /** Patient DFN (for patient portal users) */
  patientDfn?: string;
}

export interface PolicyResource {
  /** Tenant owning the resource */
  tenantId?: string;
  /** Patient DFN involved (if applicable) */
  patientDfn?: string;
  /** Environment (dev/staging/production) */
  environment?: string;
}

export interface PolicyInput {
  /** The action being requested */
  action: string;
  /** The requesting user */
  user: PolicyUser;
  /** The target resource */
  resource?: PolicyResource;
}

export interface PolicyDecision {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Reason for denial (if denied) */
  reason?: string;
  /** Which policy rule matched */
  matchedRule?: string;
  /** Evaluation time in ms */
  evaluationTimeMs: number;
}

/* ------------------------------------------------------------------ */
/* Policy definitions                                                  */
/* ------------------------------------------------------------------ */

/**
 * Action → required roles mapping.
 * Wildcards: "clinical.*" means any action starting with "clinical."
 *
 * If an action is not listed, it defaults to DENY (unless admin).
 */
const ROLE_ACTION_MAP: Record<string, PolicyRole[]> = {
  // PHI read actions
  "phi.patient-search": ["provider", "nurse", "pharmacist", "clerk", "admin", "support"],
  "phi.patient-list": ["provider", "nurse", "pharmacist", "clerk", "admin", "support"],
  "phi.patient-select": ["provider", "nurse", "pharmacist", "clerk", "admin"],
  "phi.demographics-view": ["provider", "nurse", "pharmacist", "clerk", "admin"],
  "phi.allergies-view": ["provider", "nurse", "pharmacist", "admin"],
  "phi.vitals-view": ["provider", "nurse", "pharmacist", "admin"],
  "phi.notes-view": ["provider", "nurse", "pharmacist", "admin"],
  "phi.medications-view": ["provider", "nurse", "pharmacist", "admin"],
  "phi.problems-view": ["provider", "nurse", "pharmacist", "admin"],
  "phi.labs-view": ["provider", "nurse", "pharmacist", "admin"],
  "phi.reports-view": ["provider", "nurse", "pharmacist", "admin"],
  "phi.imaging-view": ["provider", "nurse", "pharmacist", "admin"],

  // Clinical write actions
  "clinical.allergy-add": ["provider", "admin"],
  "clinical.vitals-add": ["provider", "nurse", "admin"],
  "clinical.note-create": ["provider", "nurse", "admin"],
  "clinical.medication-add": ["provider", "pharmacist", "admin"],
  "clinical.problem-add": ["provider", "admin"],
  "clinical.order-sign": ["provider", "admin"],
  "clinical.order-release": ["provider", "admin"],
  "clinical.draft-create": ["provider", "nurse", "admin"],
  "clinical.draft-submit": ["provider", "nurse", "admin"],
  "clinical.draft-delete": ["provider", "nurse", "admin"],

  // Imaging actions
  "imaging.view": ["provider", "nurse", "pharmacist", "admin"],
  "imaging.order": ["provider", "admin"],
  "imaging.upload": ["admin"],
  "imaging.device-manage": ["admin"],

  // Admin actions
  "admin.config": ["admin"],
  "admin.tenant": ["admin"],
  "admin.user-manage": ["admin"],
  "admin.system": ["admin"],

  // Audit actions
  "audit.view": ["admin", "support"],
  "audit.query": ["admin", "support"],
  "audit.export": ["admin"],

  // System actions
  "system.health": ["admin", "support"],
  "system.metrics": ["admin", "support"],
  "system.interop": ["admin"],

  // Portal actions (patient self-service)
  "portal.own-data": ["patient"],
  "portal.messaging": ["patient"],
  "portal.appointments": ["patient"],
  "portal.refills": ["patient"],

  // Telehealth
  "telehealth.create": ["provider", "admin"],
  "telehealth.join": ["provider", "nurse", "admin", "patient"],
  "telehealth.manage": ["admin"],

  // Analytics
  "analytics.view": ["provider", "nurse", "pharmacist", "admin"],
  "analytics.export": ["admin"],
  "analytics.config": ["admin"],

  // Reporting
  "report.generate": ["provider", "nurse", "admin"],
  "report.export": ["admin"],
};

/**
 * Route → action mapping.
 * Maps API URL patterns to policy action strings.
 */
export const ROUTE_ACTION_MAP: Record<string, string> = {
  // Auth (no policy check — handled by auth gateway)
  "/auth/login": "auth.login",
  "/auth/logout": "auth.logout",
  "/auth/session": "auth.session",

  // Patient operations
  "/vista/patient-search": "phi.patient-search",
  "/vista/default-patient-list": "phi.patient-list",
  "/vista/patient-demographics": "phi.demographics-view",
  "/vista/allergies": "phi.allergies-view",
  "/vista/vitals": "phi.vitals-view",
  "/vista/notes": "phi.notes-view",
  "/vista/medications": "phi.medications-view",
  "/vista/problems": "phi.problems-view",
  "/vista/labs": "phi.labs-view",

  // Clinical writes
  "/vista/add-allergy": "clinical.allergy-add",
  "/vista/add-vitals": "clinical.vitals-add",
  "/vista/add-note": "clinical.note-create",
  "/vista/add-medication": "clinical.medication-add",
  "/vista/add-problem": "clinical.problem-add",

  // Imaging
  "/imaging/studies": "imaging.view",
  "/imaging/order": "imaging.order",

  // Admin
  "/admin/my-tenant": "phi.patient-list",  // Any authenticated user
  "/admin/tenants": "admin.tenant",
  "/admin/sessions": "admin.system",

  // Audit
  "/audit/events": "audit.view",
  "/audit/stats": "audit.view",

  // Analytics
  "/analytics/events": "analytics.view",
  "/analytics/aggregated": "analytics.view",
  "/analytics/export": "analytics.export",

  // Reports
  "/reports/clinical": "report.generate",
  "/reports/export": "report.export",

  // Telehealth
  "/telehealth/rooms": "telehealth.create",

  // System
  "/vista/interop/telemetry": "system.interop",
};

/* ------------------------------------------------------------------ */
/* Policy evaluation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Evaluate a policy decision for the given input.
 * Default-deny: returns denied unless a matching allow rule is found.
 */
export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  const start = performance.now();

  // Rule 0: Admin can do anything
  if (input.user.roles.includes("admin")) {
    return {
      allowed: true,
      matchedRule: "admin-superuser",
      evaluationTimeMs: performance.now() - start,
    };
  }

  // Rule 1: Tenant isolation
  if (
    input.resource?.tenantId &&
    input.user.tenantId &&
    input.resource.tenantId !== input.user.tenantId
  ) {
    return {
      allowed: false,
      reason: "Cross-tenant access denied",
      matchedRule: "tenant-isolation",
      evaluationTimeMs: performance.now() - start,
    };
  }

  // Rule 2: Break-glass override (time-limited)
  if (input.user.breakGlass && input.user.breakGlassExpiresAt) {
    if (Date.now() < input.user.breakGlassExpiresAt) {
      return {
        allowed: true,
        matchedRule: "break-glass-active",
        evaluationTimeMs: performance.now() - start,
      };
    }
    // Break-glass expired — fall through to normal policy
  }

  // Rule 3: Patient portal — own data only
  if (input.user.roles.includes("patient")) {
    if (input.action.startsWith("portal.")) {
      if (input.resource?.patientDfn && input.user.patientDfn) {
        if (input.resource.patientDfn !== input.user.patientDfn) {
          return {
            allowed: false,
            reason: "Patient can only access own data",
            matchedRule: "patient-own-data",
            evaluationTimeMs: performance.now() - start,
          };
        }
      }
      return {
        allowed: true,
        matchedRule: "patient-portal-access",
        evaluationTimeMs: performance.now() - start,
      };
    }
    // Patient denied non-portal actions
    return {
      allowed: false,
      reason: "Patient role limited to portal actions",
      matchedRule: "patient-scope-limit",
      evaluationTimeMs: performance.now() - start,
    };
  }

  // Rule 4: Role-based action check
  const allowedRoles = ROLE_ACTION_MAP[input.action];
  if (allowedRoles) {
    const hasRole = input.user.roles.some((r) => allowedRoles.includes(r));
    if (hasRole) {
      return {
        allowed: true,
        matchedRule: `role-action:${input.action}`,
        evaluationTimeMs: performance.now() - start,
      };
    }
    return {
      allowed: false,
      reason: `Action '${input.action}' requires one of: ${allowedRoles.join(", ")}`,
      matchedRule: `role-action-denied:${input.action}`,
      evaluationTimeMs: performance.now() - start,
    };
  }

  // Rule 5: Wildcard pattern matching (e.g., "clinical.*")
  const actionPrefix = input.action.split(".")[0] + ".*";
  const wildcardRoles = ROLE_ACTION_MAP[actionPrefix];
  if (wildcardRoles) {
    const hasRole = input.user.roles.some((r) => wildcardRoles.includes(r));
    if (hasRole) {
      return {
        allowed: true,
        matchedRule: `wildcard:${actionPrefix}`,
        evaluationTimeMs: performance.now() - start,
      };
    }
  }

  // Default DENY
  return {
    allowed: false,
    reason: `No policy rule allows action '${input.action}' for roles [${input.user.roles.join(", ")}]`,
    matchedRule: "default-deny",
    evaluationTimeMs: performance.now() - start,
  };
}

/**
 * Resolve the policy action for a given API route URL.
 * Falls back to a generic action based on the URL path prefix.
 */
export function resolveActionForRoute(url: string, method?: string): string {
  // Strip query params
  const path = url.split("?")[0];

  // Exact match first
  if (ROUTE_ACTION_MAP[path]) return ROUTE_ACTION_MAP[path];

  // Prefix match
  for (const [pattern, action] of Object.entries(ROUTE_ACTION_MAP)) {
    if (path.startsWith(pattern)) return action;
  }

  // Fallback based on prefix
  if (path.startsWith("/vista/")) return "phi.patient-list"; // Default VistA to PHI read
  if (path.startsWith("/admin/")) return "admin.config";
  if (path.startsWith("/audit/")) return "audit.view";
  if (path.startsWith("/portal/")) return "portal.own-data";
  if (path.startsWith("/imaging/")) return "imaging.view";
  if (path.startsWith("/analytics/")) return "analytics.view";
  if (path.startsWith("/telehealth/")) return "telehealth.join";
  if (path.startsWith("/reports/")) return "report.generate";

  return "unknown";
}

/**
 * Middleware-style policy check.
 * Evaluates policy and audits denials. Returns the decision.
 */
export function checkPolicy(
  action: string,
  user: PolicyUser,
  resource?: PolicyResource,
  requestMeta?: { requestId?: string; sourceIp?: string },
): PolicyDecision {
  const decision = evaluatePolicy({ action, user, resource });

  if (!decision.allowed) {
    // Audit the denial
    immutableAudit("policy.denied" as ImmutableAuditAction, "denied", {
      sub: user.sub,
      name: user.name,
      roles: user.roles,
    }, {
      requestId: requestMeta?.requestId,
      sourceIp: requestMeta?.sourceIp,
      detail: {
        action,
        reason: decision.reason,
        matchedRule: decision.matchedRule,
        evaluationTimeMs: decision.evaluationTimeMs,
      },
    });

    log.warn("Policy denied", {
      action,
      user: user.sub,
      roles: user.roles,
      reason: decision.reason,
      rule: decision.matchedRule,
    });
  }

  return decision;
}

/**
 * Get all actions available to a given set of roles.
 * Useful for UI capability exposure.
 */
export function getActionsForRoles(roles: PolicyRole[]): string[] {
  if (roles.includes("admin")) {
    return Object.keys(ROLE_ACTION_MAP); // Admin gets everything
  }

  const actions: Set<string> = new Set();
  for (const [action, allowedRoles] of Object.entries(ROLE_ACTION_MAP)) {
    if (roles.some((r) => allowedRoles.includes(r))) {
      actions.add(action);
    }
  }
  return [...actions];
}

/**
 * Check if a set of roles can perform a specific action.
 * Quick boolean check without full policy evaluation.
 */
export function canPerform(roles: PolicyRole[], action: string): boolean {
  if (roles.includes("admin")) return true;
  const allowedRoles = ROLE_ACTION_MAP[action];
  if (!allowedRoles) return false;
  return roles.some((r) => allowedRoles.includes(r));
}
