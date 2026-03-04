/**
 * Fine-Grained ABAC Authorization Engine — Phase 340 (W16-P4).
 *
 * Composable Attribute-Based Access Control that chains AFTER RBAC.
 * RBAC runs first (policy-engine.ts). If RBAC allows, ABAC conditions
 * are evaluated as an additional refinement layer. ABAC can only
 * DENY or CONSTRAIN — it never grants access that RBAC denied.
 *
 * Features:
 *  - Composable AND/OR condition combinators
 *  - Time-of-day, IP range, facility, sensitivity conditions
 *  - Structured deny reasons with remediation hints
 *  - Environment-aware policies (dev/test/rc/prod)
 */

import {
  RequestAttributes,
  ResourceAttributes,
  EnvironmentAttributes,
  SensitivityLevel,
  extractRequestAttributes,
  extractResourceAttributes,
  extractEnvironmentAttributes,
  compareSensitivity,
} from './abac-attributes.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Result of an ABAC condition evaluation. */
export interface AbacConditionResult {
  /** Whether the condition passed. */
  passed: boolean;
  /** Human-readable reason if denied. */
  reason?: string;
  /** Machine-readable remediation hint. */
  remediation?: string;
  /** Condition name (for audit trail). */
  conditionName: string;
}

/** Structured ABAC denial with remediation guidance. */
export interface AbacDenial {
  /** Overall allowed/denied. */
  allowed: false;
  /** All failed conditions. */
  violations: AbacConditionResult[];
  /** Summary reason. */
  reason: string;
  /** Primary remediation hint. */
  remediation: string;
}

/** ABAC allow result. */
export interface AbacAllow {
  allowed: true;
  /** Conditions that were evaluated (all passed). */
  evaluatedConditions: string[];
}

export type AbacResult = AbacAllow | AbacDenial;

/** Full ABAC evaluation context. */
export interface AbacContext {
  request: RequestAttributes;
  resource: ResourceAttributes;
  environment: EnvironmentAttributes;
  /** Authenticated user attributes. */
  user: {
    role: string;
    duz?: string;
    facilityStation?: string;
    tenantId?: string;
  };
  /** The action being performed. */
  action: string;
}

/** A single ABAC condition function. */
export type AbacCondition = (ctx: AbacContext) => AbacConditionResult;

/** An ABAC policy: a named bundle of conditions with a combinator. */
export interface AbacPolicy {
  /** Policy name for audit trail. */
  name: string;
  /** Description. */
  description: string;
  /** Which actions this policy applies to (regex patterns). */
  actionPatterns: RegExp[];
  /** Conditions to evaluate. */
  conditions: AbacCondition[];
  /** How to combine conditions: AND = all must pass, OR = at least one. */
  combinator: 'AND' | 'OR';
  /** Whether this policy is enabled. */
  enabled: boolean;
}

/* ------------------------------------------------------------------ */
/* Built-in Conditions                                                 */
/* ------------------------------------------------------------------ */

/**
 * Time-of-day condition: restrict access to certain hours (UTC).
 */
export function timeOfDayCondition(
  allowedStartHour: number,
  allowedEndHour: number,
  name = 'time-of-day'
): AbacCondition {
  return (ctx: AbacContext): AbacConditionResult => {
    const hour = ctx.request.hourUtc;
    // Handle wrap-around (e.g., 22..06)
    let inRange: boolean;
    if (allowedStartHour <= allowedEndHour) {
      inRange = hour >= allowedStartHour && hour < allowedEndHour;
    } else {
      inRange = hour >= allowedStartHour || hour < allowedEndHour;
    }
    return {
      passed: inRange,
      conditionName: name,
      reason: inRange
        ? undefined
        : `Access denied outside allowed hours (${allowedStartHour}:00-${allowedEndHour}:00 UTC)`,
      remediation: inRange
        ? undefined
        : `Retry during business hours (${allowedStartHour}:00-${allowedEndHour}:00 UTC)`,
    };
  };
}

/**
 * Day-of-week condition: restrict to certain days (0=Sun..6=Sat).
 */
export function dayOfWeekCondition(allowedDays: number[], name = 'day-of-week'): AbacCondition {
  return (ctx: AbacContext): AbacConditionResult => {
    const inRange = allowedDays.includes(ctx.request.dayOfWeek);
    return {
      passed: inRange,
      conditionName: name,
      reason: inRange ? undefined : 'Access denied on this day of the week',
      remediation: inRange
        ? undefined
        : `Retry on allowed days: ${allowedDays.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}`,
    };
  };
}

/**
 * IP range condition: restrict to certain IP prefixes.
 */
export function ipRangeCondition(allowedPrefixes: string[], name = 'ip-range'): AbacCondition {
  return (ctx: AbacContext): AbacConditionResult => {
    const ip = ctx.request.sourceIp;
    const passed = allowedPrefixes.some((prefix) => ip.startsWith(prefix));
    return {
      passed,
      conditionName: name,
      reason: passed ? undefined : 'Access denied from this network location',
      remediation: passed ? undefined : 'Connect from an authorized network or use VPN',
    };
  };
}

/**
 * Internal network condition: require requests from internal networks.
 */
export function internalNetworkCondition(name = 'internal-network'): AbacCondition {
  return (ctx: AbacContext): AbacConditionResult => ({
    passed: ctx.request.isInternalNetwork,
    conditionName: name,
    reason: ctx.request.isInternalNetwork ? undefined : 'Access requires internal network',
    remediation: ctx.request.isInternalNetwork ? undefined : 'Connect via VPN or internal network',
  });
}

/**
 * Facility match condition: user must belong to the resource's facility.
 */
export function facilityMatchCondition(name = 'facility-match'): AbacCondition {
  return (ctx: AbacContext): AbacConditionResult => {
    // If no facility on resource, allow (no constraint)
    if (!ctx.resource.facilityStation) {
      return { passed: true, conditionName: name };
    }
    const passed = ctx.user.facilityStation === ctx.resource.facilityStation;
    return {
      passed,
      conditionName: name,
      reason: passed
        ? undefined
        : `Access denied: resource belongs to facility ${ctx.resource.facilityStation}`,
      remediation: passed ? undefined : 'Request cross-facility access through your administrator',
    };
  };
}

/**
 * Sensitivity level condition: user role must meet minimum sensitivity clearance.
 */
export function sensitivityCondition(
  roleClearances: Record<string, SensitivityLevel>,
  name = 'sensitivity-level'
): AbacCondition {
  return (ctx: AbacContext): AbacConditionResult => {
    const maxAllowed = roleClearances[ctx.user.role] ?? 'internal';
    const resourceLevel = ctx.resource.sensitivityLevel;
    const passed = compareSensitivity(resourceLevel, maxAllowed) <= 0;
    return {
      passed,
      conditionName: name,
      reason: passed
        ? undefined
        : `Access denied: resource sensitivity '${resourceLevel}' exceeds role clearance '${maxAllowed}'`,
      remediation: passed ? undefined : 'Request elevated access or contact your security officer',
    };
  };
}

/**
 * Environment condition: restrict actions to certain runtime environments.
 */
export function environmentCondition(
  allowedModes: string[],
  name = 'environment-mode'
): AbacCondition {
  return (ctx: AbacContext): AbacConditionResult => {
    const passed = allowedModes.includes(ctx.environment.runtimeMode);
    return {
      passed,
      conditionName: name,
      reason: passed
        ? undefined
        : `Action not available in ${ctx.environment.runtimeMode} environment`,
      remediation: passed
        ? undefined
        : `This action is only available in: ${allowedModes.join(', ')}`,
    };
  };
}

/**
 * Maintenance mode condition: block non-admin access during maintenance.
 */
export function maintenanceModeCondition(name = 'maintenance-mode'): AbacCondition {
  return (ctx: AbacContext): AbacConditionResult => {
    if (!ctx.environment.maintenanceMode) {
      return { passed: true, conditionName: name };
    }
    const isAdmin = ctx.user.role === 'admin';
    return {
      passed: isAdmin,
      conditionName: name,
      reason: isAdmin ? undefined : 'System is in maintenance mode',
      remediation: isAdmin
        ? undefined
        : 'Wait for maintenance to complete or contact your administrator',
    };
  };
}

/**
 * Feature flag condition: require a specific feature flag to be active.
 */
export function featureFlagCondition(requiredFlag: string, name?: string): AbacCondition {
  const condName = name ?? `feature-flag:${requiredFlag}`;
  return (ctx: AbacContext): AbacConditionResult => {
    const passed = ctx.environment.featureFlags.includes(requiredFlag);
    return {
      passed,
      conditionName: condName,
      reason: passed ? undefined : `Feature '${requiredFlag}' is not enabled`,
      remediation: passed ? undefined : `Enable feature flag '${requiredFlag}' in configuration`,
    };
  };
}

/* ------------------------------------------------------------------ */
/* Combinators                                                         */
/* ------------------------------------------------------------------ */

/**
 * AND combinator: all conditions must pass.
 */
export function andConditions(conditions: AbacCondition[]): AbacCondition[] {
  // Simply return conditions — AND is the default evaluation mode
  return conditions;
}

/**
 * OR combinator: wrap multiple conditions into one that passes if any passes.
 */
export function orCondition(conditions: AbacCondition[], name = 'or-group'): AbacCondition {
  return (ctx: AbacContext): AbacConditionResult => {
    const results = conditions.map((c) => c(ctx));
    const anyPassed = results.some((r) => r.passed);
    if (anyPassed) {
      return { passed: true, conditionName: name };
    }
    return {
      passed: false,
      conditionName: name,
      reason: results
        .map((r) => r.reason)
        .filter(Boolean)
        .join('; '),
      remediation: results.map((r) => r.remediation).filter(Boolean)[0],
    };
  };
}

/* ------------------------------------------------------------------ */
/* Policy Registry                                                     */
/* ------------------------------------------------------------------ */

const policyRegistry: AbacPolicy[] = [];

/**
 * Register an ABAC policy.
 */
export function registerAbacPolicy(policy: AbacPolicy): void {
  policyRegistry.push(policy);
}

/**
 * Remove an ABAC policy by name.
 */
export function unregisterAbacPolicy(name: string): boolean {
  const idx = policyRegistry.findIndex((p) => p.name === name);
  if (idx >= 0) {
    policyRegistry.splice(idx, 1);
    return true;
  }
  return false;
}

/**
 * Get all registered ABAC policies.
 */
export function getAbacPolicies(): readonly AbacPolicy[] {
  return policyRegistry;
}

/**
 * Clear all ABAC policies (useful for testing).
 */
export function clearAbacPolicies(): void {
  policyRegistry.length = 0;
}

/* ------------------------------------------------------------------ */
/* Evaluation Engine                                                   */
/* ------------------------------------------------------------------ */

/**
 * Evaluate a single ABAC policy against the context.
 */
export function evaluateAbacPolicy(policy: AbacPolicy, ctx: AbacContext): AbacResult {
  if (!policy.enabled) {
    return { allowed: true, evaluatedConditions: [] };
  }

  const results = policy.conditions.map((c) => c(ctx));

  if (policy.combinator === 'AND') {
    const violations = results.filter((r) => !r.passed);
    if (violations.length === 0) {
      return {
        allowed: true,
        evaluatedConditions: results.map((r) => r.conditionName),
      };
    }
    return {
      allowed: false,
      violations,
      reason: violations
        .map((v) => v.reason)
        .filter(Boolean)
        .join('; '),
      remediation:
        violations.map((v) => v.remediation).filter(Boolean)[0] ?? 'Contact your administrator',
    };
  }

  // OR combinator: at least one must pass
  const anyPassed = results.some((r) => r.passed);
  if (anyPassed) {
    return {
      allowed: true,
      evaluatedConditions: results.filter((r) => r.passed).map((r) => r.conditionName),
    };
  }
  return {
    allowed: false,
    violations: results.filter((r) => !r.passed),
    reason: results
      .map((r) => r.reason)
      .filter(Boolean)
      .join('; '),
    remediation:
      results.map((r) => r.remediation).filter(Boolean)[0] ?? 'Contact your administrator',
  };
}

/**
 * Evaluate ALL registered ABAC policies that match the given action.
 * Returns the first denial if any policy denies, otherwise allows.
 */
export function evaluateAbac(ctx: AbacContext): AbacResult {
  const matchingPolicies = policyRegistry.filter(
    (p) => p.enabled && p.actionPatterns.some((pat) => pat.test(ctx.action))
  );

  if (matchingPolicies.length === 0) {
    // No applicable ABAC policies = allow (RBAC already approved)
    return { allowed: true, evaluatedConditions: [] };
  }

  const allEvaluated: string[] = [];

  for (const policy of matchingPolicies) {
    const result = evaluateAbacPolicy(policy, ctx);
    if (!result.allowed) {
      return result; // First denial wins (fail-fast)
    }
    allEvaluated.push(...result.evaluatedConditions);
  }

  return { allowed: true, evaluatedConditions: allEvaluated };
}

/**
 * Build an AbacContext from typical Fastify request + user session.
 */
export function buildAbacContext(
  request: {
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
    method?: string;
    url?: string;
  },
  user: AbacContext['user'],
  action: string,
  resourceOverrides?: Partial<ResourceAttributes>
): AbacContext {
  return {
    request: extractRequestAttributes(request),
    resource: extractResourceAttributes(resourceOverrides),
    environment: extractEnvironmentAttributes(),
    user,
    action,
  };
}

/* ------------------------------------------------------------------ */
/* Default Policies (registered at module load)                        */
/* ------------------------------------------------------------------ */

/**
 * Initialize default ABAC policies. Called from index.ts setup.
 * These are sensible defaults; tenants can override via config.
 */
export function initializeDefaultAbacPolicies(): void {
  // 1. Maintenance mode blocks non-admin access
  registerAbacPolicy({
    name: 'system-maintenance-guard',
    description: 'Block non-admin access during maintenance mode',
    actionPatterns: [/.*/],
    conditions: [maintenanceModeCondition()],
    combinator: 'AND',
    enabled: true,
  });

  // 2. Admin actions require internal network in prod
  registerAbacPolicy({
    name: 'admin-network-restriction',
    description: 'Admin actions require internal network in rc/prod',
    actionPatterns: [/^admin\./],
    conditions: [
      (ctx: AbacContext): AbacConditionResult => {
        // Only enforce in rc/prod
        if (ctx.environment.runtimeMode !== 'rc' && ctx.environment.runtimeMode !== 'prod') {
          return { passed: true, conditionName: 'admin-network-env-gate' };
        }
        return internalNetworkCondition('admin-internal-network')(ctx);
      },
    ],
    combinator: 'AND',
    enabled: true,
  });

  // 3. Restricted sensitivity requires admin or provider role
  registerAbacPolicy({
    name: 'restricted-data-clearance',
    description: 'Restricted-sensitivity data requires admin or provider clearance',
    actionPatterns: [/^clinical\./, /^patient\./],
    conditions: [
      sensitivityCondition(
        {
          admin: 'restricted',
          provider: 'restricted',
          pharmacist: 'confidential',
          nurse: 'confidential',
          billing: 'internal',
          clerk: 'internal',
          support: 'public',
        },
        'role-sensitivity-clearance'
      ),
    ],
    combinator: 'AND',
    enabled: true,
  });

  // 4. Audit export only in business hours (configurable)
  if (process.env.ABAC_AUDIT_EXPORT_HOURS === 'true') {
    registerAbacPolicy({
      name: 'audit-export-business-hours',
      description: 'Audit exports restricted to business hours',
      actionPatterns: [/^audit\.export/],
      conditions: [
        timeOfDayCondition(6, 22, 'audit-export-hours'),
        dayOfWeekCondition([1, 2, 3, 4, 5], 'audit-export-weekday'),
      ],
      combinator: 'AND',
      enabled: true,
    });
  }
}
