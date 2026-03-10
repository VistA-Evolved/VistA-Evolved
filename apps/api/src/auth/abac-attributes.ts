/**
 * ABAC Attribute Extractors -- Phase 340 (W16-P4).
 *
 * Extracts and normalizes attributes from requests, resources, and
 * environment for ABAC policy evaluation.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface RequestAttributes {
  /** Source IP address */
  sourceIp: string;
  /** IP /24 prefix for network-level checks */
  ipPrefix: string;
  /** Current hour (0-23) in UTC */
  hourUtc: number;
  /** Current day of week (0=Sunday, 6=Saturday) */
  dayOfWeek: number;
  /** User-agent header */
  userAgent: string;
  /** Whether the request is from a known internal network */
  isInternalNetwork: boolean;
  /** Request method (GET, POST, etc.) */
  method: string;
  /** Request path */
  path: string;
}

export interface ResourceAttributes {
  /** Sensitivity level: public, internal, confidential, restricted */
  sensitivityLevel: SensitivityLevel;
  /** Owning facility station */
  facilityStation?: string;
  /** Owning department */
  department?: string;
  /** Resource type (patient, order, note, etc.) */
  resourceType?: string;
  /** Whether the resource is flagged for special handling */
  flagged?: boolean;
}

export interface EnvironmentAttributes {
  /** Runtime mode: dev, test, rc, prod */
  runtimeMode: string;
  /** Whether maintenance mode is active */
  maintenanceMode: boolean;
  /** Active feature flags */
  featureFlags: string[];
}

export type SensitivityLevel = 'public' | 'internal' | 'confidential' | 'restricted';

/* ------------------------------------------------------------------ */
/* Internal network ranges (configurable)                              */
/* ------------------------------------------------------------------ */

const INTERNAL_NETWORKS = (
  process.env.ABAC_INTERNAL_NETWORKS ||
  '10.,172.16.,172.17.,172.18.,172.19.,172.20.,172.21.,172.22.,172.23.,172.24.,172.25.,172.26.,172.27.,172.28.,172.29.,172.30.,172.31.,192.168.,127.0.0.'
).split(',');

/* ------------------------------------------------------------------ */
/* Extractors                                                          */
/* ------------------------------------------------------------------ */

/**
 * Extract request attributes from a Fastify request object.
 */
export function extractRequestAttributes(request: {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
}): RequestAttributes {
  const ip =
    request.ip ||
    (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    '0.0.0.0';
  const cleanIp = ip.replace(/^::ffff:/, '');

  // Extract /24 prefix for IPv4
  const parts = cleanIp.split('.');
  const ipPrefix = parts.length === 4 ? parts.slice(0, 3).join('.') + '.0/24' : cleanIp;

  const now = new Date();

  return {
    sourceIp: cleanIp,
    ipPrefix,
    hourUtc: now.getUTCHours(),
    dayOfWeek: now.getUTCDay(),
    userAgent: (request.headers['user-agent'] as string) || '',
    isInternalNetwork: INTERNAL_NETWORKS.some((prefix) => cleanIp.startsWith(prefix)),
    method: request.method || 'GET',
    path: (request.url || '/').split('?')[0],
  };
}

/**
 * Extract resource attributes (defaults for when no specific attributes are provided).
 */
export function extractResourceAttributes(
  overrides?: Partial<ResourceAttributes>
): ResourceAttributes {
  return {
    sensitivityLevel: overrides?.sensitivityLevel ?? 'internal',
    facilityStation: overrides?.facilityStation,
    department: overrides?.department,
    resourceType: overrides?.resourceType,
    flagged: overrides?.flagged ?? false,
  };
}

/**
 * Extract environment attributes from process env.
 */
export function extractEnvironmentAttributes(): EnvironmentAttributes {
  const mode = (process.env.PLATFORM_RUNTIME_MODE || process.env.NODE_ENV || 'dev').toLowerCase();
  return {
    runtimeMode: mode === 'production' ? 'prod' : mode,
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
    featureFlags: (process.env.FEATURE_FLAGS || '').split(',').filter(Boolean),
  };
}

/**
 * Normalize a sensitivity level string to a valid SensitivityLevel.
 */
export function normalizeSensitivity(value: string | undefined): SensitivityLevel {
  const valid: SensitivityLevel[] = ['public', 'internal', 'confidential', 'restricted'];
  const lower = (value || 'internal').toLowerCase() as SensitivityLevel;
  return valid.includes(lower) ? lower : 'internal';
}

/**
 * Compare sensitivity levels. Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareSensitivity(a: SensitivityLevel, b: SensitivityLevel): number {
  const order: Record<SensitivityLevel, number> = {
    public: 0,
    internal: 1,
    confidential: 2,
    restricted: 3,
  };
  return order[a] - order[b];
}
