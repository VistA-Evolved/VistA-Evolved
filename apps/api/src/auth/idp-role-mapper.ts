/**
 * IdP Role Mapper -- Phase 141: Enterprise IAM Posture.
 *
 * Maps identity provider claims (OIDC groups/roles, SAML attributes) to
 * the platform's UserRole type and validates tenant isolation boundaries.
 *
 * Design principles:
 *   1. IdP groups map to exactly ONE UserRole (first match wins)
 *   2. Tenant ID comes from the IdP claim (tenant_id / facility_station)
 *   3. Cross-tenant escalation is structurally prevented
 *   4. Unmapped users get the lowest-privilege role ("clerk")
 *
 * The mapping table is configurable via environment variable or future
 * DB-backed config. For now, a sensible default covers Keycloak realm roles.
 */

import type { UserRole } from './session-store.js';
import type { OidcTokenClaims } from './oidc-provider.js';
import { log } from '../lib/logger.js';
import { tryResolveTenantId } from '../config/tenant-config.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface IdpRoleMapping {
  /** IdP group/role name (case-insensitive match) */
  idpGroup: string;
  /** Platform role to assign */
  platformRole: UserRole;
  /** Optional: restrict to specific tenant IDs */
  tenantIds?: string[];
}

export interface MappedIdentity {
  /** Resolved platform role */
  role: UserRole;
  /** Resolved tenant ID */
  tenantId: string;
  /** Original IdP groups/roles */
  idpGroups: string[];
  /** Which mapping rule matched (null = default fallback) */
  matchedRule: string | null;
  /** Warnings during mapping */
  warnings: string[];
}

/* ------------------------------------------------------------------ */
/* Default mapping table                                               */
/* ------------------------------------------------------------------ */

/**
 * Default IdP group -> UserRole mapping.
 * Keycloak realm roles follow the convention: vista-<role>.
 * Order matters: first match wins.
 */
const DEFAULT_MAPPINGS: IdpRoleMapping[] = [
  { idpGroup: 'vista-admin', platformRole: 'admin' },
  { idpGroup: 'admin', platformRole: 'admin' },
  { idpGroup: 'vista-provider', platformRole: 'provider' },
  { idpGroup: 'provider', platformRole: 'provider' },
  { idpGroup: 'vista-nurse', platformRole: 'nurse' },
  { idpGroup: 'nurse', platformRole: 'nurse' },
  { idpGroup: 'vista-pharmacist', platformRole: 'pharmacist' },
  { idpGroup: 'pharmacist', platformRole: 'pharmacist' },
  { idpGroup: 'vista-billing', platformRole: 'billing' },
  { idpGroup: 'billing', platformRole: 'billing' },
  { idpGroup: 'vista-support', platformRole: 'support' },
  { idpGroup: 'support', platformRole: 'support' },
  { idpGroup: 'vista-clerk', platformRole: 'clerk' },
  { idpGroup: 'clerk', platformRole: 'clerk' },
];

/** Fallback role when no mapping matches */
const DEFAULT_FALLBACK_ROLE: UserRole = 'clerk';

/* ------------------------------------------------------------------ */
/* Custom mapping support                                              */
/* ------------------------------------------------------------------ */

let customMappings: IdpRoleMapping[] | null = null;

/**
 * Set custom IdP role mappings (e.g., from DB or config).
 * Pass null to revert to defaults.
 */
export function setIdpRoleMappings(mappings: IdpRoleMapping[] | null): void {
  customMappings = mappings;
  log.info('IdP role mappings updated', { count: mappings?.length ?? 0, custom: !!mappings });
}

function getActiveMappings(): IdpRoleMapping[] {
  return customMappings || DEFAULT_MAPPINGS;
}

/* ------------------------------------------------------------------ */
/* Core mapping logic                                                  */
/* ------------------------------------------------------------------ */

/**
 * Map OIDC token claims to a platform identity.
 * Extracts groups/roles and tenant from claims, resolves UserRole.
 */
export function mapOidcClaimsToIdentity(claims: OidcTokenClaims): MappedIdentity {
  const idpGroups = extractGroupsFromClaims(claims);
  const tenantId = claims.tenant_id || tryResolveTenantId(claims.facility_station) || '';
  const warnings: string[] = [];
  if (!tenantId) {
    warnings.push('OIDC claims missing tenant_id and facility_station did not resolve to a tenant');
  }

  // Find first matching rule
  const mappings = getActiveMappings();
  let matchedRule: string | null = null;
  let role: UserRole = DEFAULT_FALLBACK_ROLE;

  for (const mapping of mappings) {
    const groupMatch = idpGroups.find((g) => g.toLowerCase() === mapping.idpGroup.toLowerCase());
    if (groupMatch) {
      // Check tenant restriction if specified
      if (mapping.tenantIds && mapping.tenantIds.length > 0) {
        if (!mapping.tenantIds.includes(tenantId)) {
          warnings.push(
            `Group '${groupMatch}' matched but tenant '${tenantId}' not in allowed list`
          );
          continue; // Skip this rule, try next
        }
      }
      role = mapping.platformRole;
      matchedRule = `${mapping.idpGroup} -> ${mapping.platformRole}`;
      break;
    }
  }

  if (!matchedRule) {
    warnings.push(
      `No IdP group matched. Assigning fallback role '${DEFAULT_FALLBACK_ROLE}'. ` +
        `Groups: [${idpGroups.join(', ')}]`
    );
  }

  return { role, tenantId, idpGroups, matchedRule, warnings };
}

/**
 * Extract groups/roles from OIDC claims.
 * Supports multiple claim structures from different IdPs.
 */
function extractGroupsFromClaims(claims: OidcTokenClaims): string[] {
  const groups: string[] = [];

  // Keycloak realm_access.roles (standard)
  if (claims.realm_access?.roles) {
    groups.push(...claims.realm_access.roles);
  }

  // Custom realm_roles claim
  if (Array.isArray(claims.realm_roles)) {
    groups.push(...claims.realm_roles);
  }

  // "groups" claim (common in Azure AD, Okta)
  if (Array.isArray((claims as any).groups)) {
    groups.push(...(claims as any).groups);
  }

  // "roles" claim (generic)
  if (Array.isArray((claims as any).roles)) {
    groups.push(...(claims as any).roles);
  }

  // Deduplicate
  return [...new Set(groups)];
}

/* ------------------------------------------------------------------ */
/* Tenant isolation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Validate that a session's tenant ID matches the request context.
 * Prevents cross-tenant privilege escalation.
 *
 * @returns true if valid, false if tenant mismatch detected
 */
export function validateTenantIsolation(
  sessionTenantId: string,
  requestTenantId: string | undefined
): { valid: boolean; reason?: string } {
  // No tenant in request = OK (uses session tenant)
  if (!requestTenantId) {
    return { valid: true };
  }

  // "default" tenant is a wildcard for single-tenant deployments
  if (sessionTenantId === 'default' || requestTenantId === 'default') {
    return { valid: true };
  }

  // Strict match required
  if (sessionTenantId !== requestTenantId) {
    return {
      valid: false,
      reason: `Tenant mismatch: session=${sessionTenantId}, request=${requestTenantId}`,
    };
  }

  return { valid: true };
}

/**
 * Map SAML assertion attributes to a platform identity.
 * SAML uses attribute statements instead of JWT claims.
 * Structure follows the same mapping logic.
 */
export function mapSamlAttributesToIdentity(
  attributes: Record<string, string | string[]>
): MappedIdentity {
  // Convert SAML attributes to a claims-like structure
  const groups: string[] = [];
  const warnings: string[] = [];

  // Common SAML group attributes
  const groupKeys = ['groups', 'memberOf', 'Role', 'role', 'Roles', 'roles'];
  for (const key of groupKeys) {
    const val = attributes[key];
    if (Array.isArray(val)) {
      groups.push(...val);
    } else if (typeof val === 'string') {
      groups.push(val);
    }
  }

  const tenantId =
    (attributes.tenant_id as string) ||
    tryResolveTenantId(attributes.facilityStation as string) ||
    '';
  if (!tenantId) {
    warnings.push(
      'SAML attributes missing tenant_id and facilityStation did not resolve to a tenant'
    );
  }

  // Reuse the same mapping logic
  const mappings = getActiveMappings();
  let matchedRule: string | null = null;
  let role: UserRole = DEFAULT_FALLBACK_ROLE;

  for (const mapping of mappings) {
    const groupMatch = groups.find((g) => g.toLowerCase() === mapping.idpGroup.toLowerCase());
    if (groupMatch) {
      if (mapping.tenantIds && mapping.tenantIds.length > 0) {
        if (!mapping.tenantIds.includes(tenantId)) {
          warnings.push(
            `Group '${groupMatch}' matched but tenant '${tenantId}' not in allowed list`
          );
          continue;
        }
      }
      role = mapping.platformRole;
      matchedRule = `${mapping.idpGroup} -> ${mapping.platformRole}`;
      break;
    }
  }

  if (!matchedRule) {
    warnings.push(
      `No SAML group matched. Assigning fallback role '${DEFAULT_FALLBACK_ROLE}'. ` +
        `Groups: [${groups.join(', ')}]`
    );
  }

  return { role, tenantId, idpGroups: [...new Set(groups)], matchedRule, warnings };
}

/**
 * Get the current mapping table (for admin introspection).
 */
export function getIdpRoleMappings(): {
  mappings: IdpRoleMapping[];
  isCustom: boolean;
  fallbackRole: UserRole;
} {
  return {
    mappings: getActiveMappings(),
    isCustom: !!customMappings,
    fallbackRole: DEFAULT_FALLBACK_ROLE,
  };
}
