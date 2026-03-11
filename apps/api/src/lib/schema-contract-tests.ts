/**
 * Layer 2: Schema Contract Tests
 *
 * Provides Zod schemas for every VistA route response and validates that:
 * 1. Responses match their declared schema
 * 2. No response contains "integration-pending" status
 * 3. No response returns empty data when seed data should exist
 *
 * Used by CI test runner and the runtime contract validation endpoint.
 */

import { z } from 'zod';

/** Standard VistA route response envelope */
export const VistaResponseSchema = z.object({
  ok: z.boolean(),
  source: z.string().optional(),
  rpcUsed: z.array(z.string()).optional(),
  data: z.unknown().optional(),
});

/** Response must be ok:true with non-empty data */
export const VistaSuccessSchema = z.object({
  ok: z.literal(true),
  source: z.literal('vista'),
  rpcUsed: z.array(z.string()).min(1),
  data: z.unknown(),
});

/** Integration-pending is FORBIDDEN */
export const NoPendingSchema = z.object({
  status: z.string(),
}).refine(
  (data) => data.status !== 'integration-pending' && data.status !== 'unsupported-in-sandbox',
  { message: 'Response contains integration-pending status -- this is forbidden by the zero-pending policy' }
);

/** Package certification schema */
export const PackageCertificationSchema = z.object({
  packagePrefix: z.string(),
  packageName: z.string(),
  tier: z.number().int().min(1).max(5),
  certification: z.object({
    schemaExtracted: z.boolean(),
    rpcsRegistered: z.boolean(),
    routesCreated: z.boolean(),
    uiComponents: z.boolean(),
    docsGenerated: z.boolean(),
    testsPass: z.boolean(),
    terminalWorks: z.boolean(),
  }),
  rpcCount: z.number().int(),
  routeCount: z.number().int(),
  fileCount: z.number().int(),
  certifiedAt: z.string().optional(),
  certifiedBy: z.string().optional(),
});

export type PackageCertification = z.infer<typeof PackageCertificationSchema>;

/**
 * Validate a route response against the zero-pending policy.
 * Returns { valid: true } or { valid: false, errors: [...] }
 */
export function validateRouteResponse(response: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof response !== 'object' || response === null) {
    errors.push('Response is not an object');
    return { valid: false, errors };
  }

  const resp = response as Record<string, unknown>;

  // Check for integration-pending
  if (resp.status === 'integration-pending' || resp.status === 'unsupported-in-sandbox') {
    errors.push(`FORBIDDEN: Response has status "${resp.status}"`);
  }

  // Check for ok: false without valid error
  if (resp.ok === false && !resp.status && !resp.error) {
    errors.push('Response is ok:false without status or error explanation');
  }

  // Check for empty data when ok: true
  if (resp.ok === true && resp.data !== undefined) {
    if (Array.isArray(resp.data) && resp.data.length === 0) {
      // Empty array is OK for some routes but should be flagged for seed data check
      errors.push('WARNING: ok:true but data is empty array (may need seed data)');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Run contract validation against a list of routes.
 * Returns per-route results and an overall pass/fail.
 */
export async function runSchemaContractTests(
  baseUrl: string,
  routes: Array<{ method: string; path: string; expectedSchema?: z.ZodType }>,
  cookie?: string,
): Promise<{
  passed: boolean;
  results: Array<{
    route: string;
    status: number;
    valid: boolean;
    errors: string[];
  }>;
}> {
  const results: Array<{
    route: string;
    status: number;
    valid: boolean;
    errors: string[];
  }> = [];

  for (const route of routes) {
    try {
      const res = await fetch(`${baseUrl}${route.path}`, {
        method: route.method,
        headers: cookie ? { Cookie: cookie } : {},
      });

      const body = await res.json().catch(() => null);
      const validation = validateRouteResponse(body);

      if (route.expectedSchema && body) {
        const schemaResult = route.expectedSchema.safeParse(body);
        if (!schemaResult.success) {
          validation.errors.push(
            ...schemaResult.error.errors.map(e => `Schema: ${e.path.join('.')} - ${e.message}`)
          );
          validation.valid = false;
        }
      }

      results.push({
        route: `${route.method} ${route.path}`,
        status: res.status,
        valid: validation.valid,
        errors: validation.errors,
      });
    } catch (err) {
      results.push({
        route: `${route.method} ${route.path}`,
        status: 0,
        valid: false,
        errors: [(err as Error).message],
      });
    }
  }

  return {
    passed: results.every(r => r.valid),
    results,
  };
}
