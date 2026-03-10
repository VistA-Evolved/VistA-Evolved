/**
 * API Route Contract Registry -- Phase 251
 *
 * Machine-readable contracts for all major API endpoints.
 * Each contract specifies: method, path, auth level, expected response shape.
 *
 * Used by contract verification tests to ensure API shape stability.
 */

export type AuthLevel = 'none' | 'session' | 'admin' | 'service' | 'bearer';

export interface RouteContract {
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Route path pattern (Fastify-style :param) */
  path: string;
  /** Authentication requirement */
  auth: AuthLevel;
  /** Domain grouping */
  domain: string;
  /** Expected response shape keys when successful (top-level JSON keys) */
  successKeys: string[];
  /** Expected HTTP status on success */
  successStatus: number;
  /** Expected HTTP status when auth is missing/invalid */
  unauthStatus: number;
  /** Phase that introduced this route */
  sincePhase: number;
  /** Brief description */
  description: string;
}

/**
 * Core API route contracts -- covers the critical clinical path
 * plus infrastructure endpoints.
 */
export const ROUTE_CONTRACTS: RouteContract[] = [
  // --- Infrastructure (public) ---
  {
    method: 'GET',
    path: '/health',
    auth: 'none',
    domain: 'infra',
    successKeys: ['status'],
    successStatus: 200,
    unauthStatus: 200,
    sincePhase: 1,
    description: 'Liveness probe',
  },
  {
    method: 'GET',
    path: '/ready',
    auth: 'none',
    domain: 'infra',
    successKeys: ['ok'],
    successStatus: 200,
    unauthStatus: 200,
    sincePhase: 1,
    description: 'Readiness probe',
  },
  {
    method: 'GET',
    path: '/version',
    auth: 'none',
    domain: 'infra',
    successKeys: ['version', 'phase'],
    successStatus: 200,
    unauthStatus: 200,
    sincePhase: 1,
    description: 'Version info',
  },
  {
    method: 'GET',
    path: '/vista/ping',
    auth: 'none',
    domain: 'infra',
    successKeys: ['ok'],
    successStatus: 200,
    unauthStatus: 200,
    sincePhase: 1,
    description: 'VistA TCP probe',
  },
  {
    method: 'GET',
    path: '/metrics/prometheus',
    auth: 'none',
    domain: 'infra',
    successKeys: [],
    successStatus: 200,
    unauthStatus: 200,
    sincePhase: 36,
    description: 'Prometheus metrics',
  },

  // --- Auth ---
  {
    method: 'POST',
    path: '/auth/login',
    auth: 'none',
    domain: 'auth',
    successKeys: ['ok', 'session'],
    successStatus: 200,
    unauthStatus: 200, // returns 200 with ok:false on bad creds
    sincePhase: 1,
    description: 'Login with access/verify codes',
  },
  {
    method: 'GET',
    path: '/auth/session',
    auth: 'session',
    domain: 'auth',
    successKeys: ['ok', 'session'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 1,
    description: 'Current session info',
  },
  {
    method: 'POST',
    path: '/auth/logout',
    auth: 'session',
    domain: 'auth',
    successKeys: ['ok'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 1,
    description: 'Logout / destroy session',
  },

  // --- Clinical reads ---
  {
    method: 'GET',
    path: '/vista/patient-search',
    auth: 'session',
    domain: 'clinical',
    successKeys: ['ok', 'results'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 1,
    description: 'Patient search',
  },
  {
    method: 'GET',
    path: '/vista/allergies',
    auth: 'session',
    domain: 'clinical',
    successKeys: ['ok'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 1,
    description: 'Allergy list',
  },
  {
    method: 'GET',
    path: '/vista/vitals',
    auth: 'session',
    domain: 'clinical',
    successKeys: ['ok'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 1,
    description: 'Vitals data',
  },
  {
    method: 'GET',
    path: '/vista/problems',
    auth: 'session',
    domain: 'clinical',
    successKeys: ['ok'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 1,
    description: 'Problem list',
  },
  {
    method: 'GET',
    path: '/vista/medications',
    auth: 'session',
    domain: 'clinical',
    successKeys: ['ok'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 1,
    description: 'Active medications',
  },
  {
    method: 'GET',
    path: '/vista/notes',
    auth: 'session',
    domain: 'clinical',
    successKeys: ['ok'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 1,
    description: 'Clinical notes',
  },
  {
    method: 'GET',
    path: '/vista/default-patient-list',
    auth: 'session',
    domain: 'clinical',
    successKeys: ['ok'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 1,
    description: 'Default patient list',
  },

  // --- FHIR R4 ---
  {
    method: 'GET',
    path: '/fhir/metadata',
    auth: 'none',
    domain: 'fhir',
    successKeys: ['resourceType', 'fhirVersion', 'status'],
    successStatus: 200,
    unauthStatus: 200,
    sincePhase: 178,
    description: 'FHIR CapabilityStatement',
  },
  {
    method: 'GET',
    path: '/fhir/Patient',
    auth: 'bearer',
    domain: 'fhir',
    successKeys: ['resourceType', 'type', 'total', 'entry'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 178,
    description: 'FHIR Patient search',
  },
  {
    method: 'GET',
    path: '/fhir/AllergyIntolerance',
    auth: 'bearer',
    domain: 'fhir',
    successKeys: ['resourceType', 'type', 'total'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 178,
    description: 'FHIR AllergyIntolerance search',
  },
  {
    method: 'GET',
    path: '/fhir/Condition',
    auth: 'bearer',
    domain: 'fhir',
    successKeys: ['resourceType', 'type', 'total'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 178,
    description: 'FHIR Condition search',
  },
  {
    method: 'GET',
    path: '/fhir/Observation',
    auth: 'bearer',
    domain: 'fhir',
    successKeys: ['resourceType', 'type', 'total'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 178,
    description: 'FHIR Observation search',
  },
  {
    method: 'GET',
    path: '/fhir/MedicationRequest',
    auth: 'bearer',
    domain: 'fhir',
    successKeys: ['resourceType', 'type', 'total'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 178,
    description: 'FHIR MedicationRequest search',
  },
  {
    method: 'GET',
    path: '/fhir/DocumentReference',
    auth: 'bearer',
    domain: 'fhir',
    successKeys: ['resourceType', 'type', 'total'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 178,
    description: 'FHIR DocumentReference search',
  },
  {
    method: 'GET',
    path: '/fhir/Encounter',
    auth: 'bearer',
    domain: 'fhir',
    successKeys: ['resourceType', 'type', 'total'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 178,
    description: 'FHIR Encounter search',
  },

  // --- SMART discovery ---
  {
    method: 'GET',
    path: '/.well-known/smart-configuration',
    auth: 'none',
    domain: 'fhir',
    successKeys: ['authorization_endpoint', 'token_endpoint'],
    successStatus: 200,
    unauthStatus: 200,
    sincePhase: 231,
    description: 'SMART App Launch discovery',
  },

  // --- Admin ---
  {
    method: 'GET',
    path: '/vista/provision/status',
    auth: 'admin',
    domain: 'admin',
    successKeys: ['ok'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 155,
    description: 'VistA provisioning status',
  },
  {
    method: 'GET',
    path: '/posture/observability',
    auth: 'admin',
    domain: 'admin',
    successKeys: ['gates'],
    successStatus: 200,
    unauthStatus: 401,
    sincePhase: 107,
    description: 'Observability posture',
  },
];

/** Get contracts by domain */
export function getContractsByDomain(domain: string): RouteContract[] {
  return ROUTE_CONTRACTS.filter((c) => c.domain === domain);
}

/** Get all public (no-auth) contracts */
export function getPublicContracts(): RouteContract[] {
  return ROUTE_CONTRACTS.filter((c) => c.auth === 'none');
}

/** Get all session-required contracts */
export function getSessionContracts(): RouteContract[] {
  return ROUTE_CONTRACTS.filter((c) => c.auth === 'session');
}

/** Get all FHIR contracts */
export function getFhirContracts(): RouteContract[] {
  return ROUTE_CONTRACTS.filter((c) => c.domain === 'fhir');
}
