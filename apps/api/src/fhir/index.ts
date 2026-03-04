/**
 * FHIR R4 Gateway — Barrel Export (Phase 178).
 */

export { default as fhirRoutes } from './fhir-routes.js';
export { buildCapabilityStatement } from './capability-statement.js';
export { getFhirCacheStats, clearFhirCache } from './fhir-cache.js';
export {
  extractBearerToken,
  validateFhirBearerToken,
  principalFromSession,
} from './fhir-bearer-auth.js';
export type { FhirPrincipal } from './fhir-bearer-auth.js';
export { parseScope, checkScopeAccess, enforceFhirScope } from './fhir-scope-enforcement.js';
export type { FhirResourceType } from './fhir-scope-enforcement.js';
export * from './mappers.js';
export type * from './types.js';
