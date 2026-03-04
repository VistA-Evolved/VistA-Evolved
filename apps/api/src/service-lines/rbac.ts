/**
 * apps/api/src/service-lines/rbac.ts
 *
 * Phase 470 (W31-P7). Service-line RBAC.
 * Controls access to ED, OR, and ICU endpoints by role.
 */

// ── Service Lines ──────────────────────────────────────────────────

export type ServiceLine = 'ed' | 'or' | 'icu';

export type ServiceLinePermission =
  | 'view' // Read boards, metrics, lists
  | 'document' // Add flowsheet entries, triage, I&O
  | 'manage' // Create/update visits, cases, admissions
  | 'admin'; // Configuration, bed management, blocks

// ── Roles ──────────────────────────────────────────────────────────

export type ServiceLineRole =
  | 'ed_provider'
  | 'ed_nurse'
  | 'or_surgeon'
  | 'or_anesthesiologist'
  | 'or_nurse'
  | 'icu_provider'
  | 'icu_nurse'
  | 'admin'
  | 'clerk';

// ── Role -> Permission Mapping ─────────────────────────────────────

const ROLE_PERMISSIONS: Record<
  ServiceLineRole,
  Partial<Record<ServiceLine, ServiceLinePermission[]>>
> = {
  ed_provider: { ed: ['view', 'document', 'manage'] },
  ed_nurse: { ed: ['view', 'document'] },
  or_surgeon: { or: ['view', 'document', 'manage'] },
  or_anesthesiologist: { or: ['view', 'document', 'manage'] },
  or_nurse: { or: ['view', 'document'] },
  icu_provider: { icu: ['view', 'document', 'manage'] },
  icu_nurse: { icu: ['view', 'document'] },
  admin: {
    ed: ['view', 'document', 'manage', 'admin'],
    or: ['view', 'document', 'manage', 'admin'],
    icu: ['view', 'document', 'manage', 'admin'],
  },
  clerk: { ed: ['view'], or: ['view'], icu: ['view'] },
};

// ── Access Check ───────────────────────────────────────────────────

export function checkServiceLineAccess(
  roles: ServiceLineRole[],
  serviceLine: ServiceLine,
  requiredPermission: ServiceLinePermission
): boolean {
  for (const role of roles) {
    const perms = ROLE_PERMISSIONS[role]?.[serviceLine];
    if (perms && perms.includes(requiredPermission)) return true;
  }
  return false;
}

// ── Route prefixes -> service line mapping ──────────────────────────

const ROUTE_SERVICE_LINE: Record<string, ServiceLine> = {
  '/ed/': 'ed',
  '/or/': 'or',
  '/icu/': 'icu',
};

export function resolveServiceLine(path: string): ServiceLine | null {
  for (const [prefix, sl] of Object.entries(ROUTE_SERVICE_LINE)) {
    if (path.startsWith(prefix)) return sl;
  }
  return null;
}

// ── Permission required per HTTP method ─────────────────────────────

/** Documentation sub-paths — POST to these is "document", not "manage". */
const DOCUMENT_PATHS = [
  '/triage',
  '/flowsheet',
  '/vent',
  '/io',
  '/scores',
  '/anesthesia',
  '/disposition',
];

export function requiredPermissionForMethod(method: string, path?: string): ServiceLinePermission {
  // POST to documentation sub-paths requires "document", not "manage"
  if (path && method.toUpperCase() === 'POST') {
    if (DOCUMENT_PATHS.some((dp) => path.endsWith(dp))) return 'document';
  }
  switch (method.toUpperCase()) {
    case 'GET':
      return 'view';
    case 'POST':
      return 'manage';
    case 'PATCH':
      return 'manage';
    case 'PUT':
      return 'manage';
    case 'DELETE':
      return 'admin';
    default:
      return 'view';
  }
}

// ── Export role definitions for documentation ───────────────────────

export function getRoleDefinitions(): Record<
  ServiceLineRole,
  Partial<Record<ServiceLine, ServiceLinePermission[]>>
> {
  return { ...ROLE_PERMISSIONS };
}
