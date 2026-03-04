/**
 * FHIR R4 Assertion Helpers
 * Phase 290 -- Interop Certification Harness
 *
 * Reusable assertion functions for validating FHIR R4 resources
 * and CapabilityStatement conformance.
 */

/**
 * Assert that a value is truthy, log result.
 * @param {string} name - Assertion name
 * @param {boolean} condition - Condition to check
 * @param {string} [detail] - Additional detail on failure
 * @returns {{ name: string, passed: boolean, detail?: string }}
 */
export function assert(name, condition, detail) {
  return {
    name,
    passed: !!condition,
    detail: condition ? undefined : detail || 'assertion failed',
  };
}

/**
 * Assert response is valid JSON with expected status code.
 * @param {string} name
 * @param {Response} res - fetch Response
 * @param {number} expectedStatus
 * @returns {Promise<{ name: string, passed: boolean, detail?: string, body?: any }>}
 */
export async function assertJsonResponse(name, res, expectedStatus = 200) {
  if (res.status !== expectedStatus) {
    return {
      name,
      passed: false,
      detail: `Expected status ${expectedStatus}, got ${res.status}`,
    };
  }
  try {
    const body = await res.json();
    return { name, passed: true, body };
  } catch (e) {
    return { name, passed: false, detail: `Invalid JSON: ${e.message}` };
  }
}

/**
 * Assert a FHIR resource has the expected resourceType.
 * @param {object} resource
 * @param {string} expectedType
 */
export function assertResourceType(resource, expectedType) {
  return assert(
    `resourceType is ${expectedType}`,
    resource && resource.resourceType === expectedType,
    `Got resourceType: ${resource?.resourceType}`
  );
}

/**
 * Assert a FHIR CapabilityStatement declares a specific resource type.
 * @param {object} capStmt - CapabilityStatement resource
 * @param {string} resourceType - e.g. "Patient"
 */
export function assertSupportsResource(capStmt, resourceType) {
  const rest = capStmt?.rest || [];
  const serverRest = rest.find((r) => r.mode === 'server') || rest[0];
  const resources = serverRest?.resource || [];
  const found = resources.some((r) => r.type === resourceType);
  return assert(
    `CapabilityStatement supports ${resourceType}`,
    found,
    `Resource ${resourceType} not found in rest[].resource[]`
  );
}

/**
 * Assert a FHIR CapabilityStatement declares a specific interaction for a resource.
 * @param {object} capStmt
 * @param {string} resourceType
 * @param {string} interaction - e.g. "read", "search-type"
 */
export function assertSupportsInteraction(capStmt, resourceType, interaction) {
  const rest = capStmt?.rest || [];
  const serverRest = rest.find((r) => r.mode === 'server') || rest[0];
  const resources = serverRest?.resource || [];
  const res = resources.find((r) => r.type === resourceType);
  const interactions = res?.interaction || [];
  const found = interactions.some((i) => i.code === interaction);
  return assert(
    `${resourceType} supports ${interaction}`,
    found,
    `Interaction ${interaction} not found for ${resourceType}`
  );
}

/**
 * Assert a Bundle has expected structure.
 * @param {object} bundle
 */
export function assertBundle(bundle) {
  const results = [];
  results.push(assertResourceType(bundle, 'Bundle'));
  results.push(assert('Bundle has type', !!bundle?.type, 'Missing bundle.type'));
  results.push(
    assert('Bundle has entry array', Array.isArray(bundle?.entry), 'Missing bundle.entry[]')
  );
  return results;
}

/**
 * Summarize assertion results.
 * @param {Array<{name: string, passed: boolean}>} results
 * @returns {{ total: number, passed: number, failed: number, results: Array }}
 */
export function summarize(results) {
  const passed = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}
