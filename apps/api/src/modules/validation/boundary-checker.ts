/**
 * boundary-checker.ts -- Module boundary integrity + route overlap detection (Phase 163)
 *
 * Validates:
 * - No route pattern overlaps between modules
 * - Adapter references match known adapter types
 * - Module health check endpoints declared
 * - Route pattern syntax is valid regex
 */

import type { ValidationIssue, ValidationCategory } from "./types.js";
import { getModuleDefinitions } from "../module-registry.js";

/* Known adapter types from adapter-loader.ts */
const KNOWN_ADAPTER_TYPES = new Set([
  "clinical-engine",
  "scheduling",
  "billing",
  "imaging",
  "messaging",
]);

/* ------------------------------------------------------------------ */
/*  Route pattern overlap detection                                    */
/* ------------------------------------------------------------------ */

function detectRouteOverlaps(
  modules: Record<string, { routePatterns?: string[] }>
): { moduleA: string; moduleB: string; patternA: string; patternB: string }[] {
  const overlaps: {
    moduleA: string;
    moduleB: string;
    patternA: string;
    patternB: string;
  }[] = [];

  const entries = Object.entries(modules).filter(
    ([, def]) => def.routePatterns && def.routePatterns.length > 0
  );

  // Test each pair of modules for pattern overlap
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [idA, defA] = entries[i];
      const [idB, defB] = entries[j];
      const patternsA = defA.routePatterns ?? [];
      const patternsB = defB.routePatterns ?? [];

      for (const pA of patternsA) {
        for (const pB of patternsB) {
          // Generate test paths from one pattern, check if they match the other
          const testPaths = generateTestPaths(pA);
          for (const testPath of testPaths) {
            try {
              if (new RegExp(pB).test(testPath)) {
                overlaps.push({
                  moduleA: idA,
                  moduleB: idB,
                  patternA: pA,
                  patternB: pB,
                });
                break; // One overlap per pattern pair is enough
              }
            } catch {
              // Invalid regex handled separately
            }
          }
        }
      }
    }
  }

  return overlaps;
}

/**
 * Generate plausible test paths from a regex pattern.
 * Simple heuristic: extract literal path prefixes.
 */
function generateTestPaths(pattern: string): string[] {
  // Extract literal prefix before first regex metachar
  const cleaned = pattern.replace(/^\^/, "").replace(/\$$/, "");
  const literal = cleaned.replace(/[.*+?{}()|[\]\\].*/, "");
  if (!literal || literal.length < 2) return [];

  return [
    literal,
    literal + "test",
    literal + "test/sub",
  ];
}

/* ------------------------------------------------------------------ */
/*  Main validator                                                     */
/* ------------------------------------------------------------------ */

export function validateBoundaryIntegrity(): ValidationCategory {
  const start = Date.now();
  const issues: ValidationIssue[] = [];
  const defs = getModuleDefinitions();

  // 1. Validate route pattern syntax
  for (const [modId, def] of Object.entries(defs)) {
    for (const pattern of def.routePatterns ?? []) {
      try {
        new RegExp(pattern);
      } catch (err) {
        issues.push({
          code: "ROUTE_INVALID_REGEX",
          severity: "error",
          message: `Module "${modId}" has invalid route pattern: ${pattern}`,
          subject: modId,
          suggestion: "Fix the regex in config/modules.json",
        });
      }
    }
  }

  // 2. Detect route pattern overlaps
  const overlaps = detectRouteOverlaps(defs);
  for (const ov of overlaps) {
    issues.push({
      code: "ROUTE_OVERLAP",
      severity: "warning",
      message: `Route overlap: "${ov.moduleA}" (${ov.patternA}) and "${ov.moduleB}" (${ov.patternB})`,
      subject: `${ov.moduleA} vs ${ov.moduleB}`,
      suggestion:
        "The first matching module wins. Ensure this is intentional or refine patterns.",
    });
  }

  // 3. Validate adapter references
  for (const [modId, def] of Object.entries(defs)) {
    for (const adapter of def.adapters ?? []) {
      if (!KNOWN_ADAPTER_TYPES.has(adapter)) {
        issues.push({
          code: "ADAPTER_UNKNOWN",
          severity: "warning",
          message: `Module "${modId}" references unknown adapter type "${adapter}"`,
          subject: modId,
          suggestion: `Either add "${adapter}" to adapter-loader.ts or fix the reference in modules.json`,
        });
      }
    }
  }

  // 4. Check for health endpoint declarations
  // Note: healthCheckEndpoint is optional and not all modules have one.
  // Only flag as info if module has route patterns but no health endpoint.
  let modulesWithHealth = 0;
  for (const [modId, def] of Object.entries(defs)) {
    if (def.alwaysEnabled) continue; // kernel doesn't need a health endpoint
    const hasRoutes = def.routePatterns && def.routePatterns.length > 0;
    if (!hasRoutes) {
      // Modules without routes don't need health endpoints
      continue;
    }
    // Check for any /health sub-route in the pattern list
    const hasHealthRoute = def.routePatterns!.some((p: string) => p.includes("health"));
    if (hasHealthRoute) {
      modulesWithHealth++;
    } else {
      issues.push({
        code: "HEALTH_MISSING",
        severity: "info",
        message: `Module "${modId}" has route patterns but no health endpoint`,
        subject: modId,
        suggestion: "Consider adding a health check route for this module",
      });
    }
  }

  // 5. Check modules without route patterns
  for (const [modId, def] of Object.entries(defs)) {
    if (def.alwaysEnabled) continue;
    if (!def.routePatterns || def.routePatterns.length === 0) {
      issues.push({
        code: "ROUTE_NONE",
        severity: "info",
        message: `Module "${modId}" has no route patterns defined`,
        subject: modId,
        suggestion: "Module guard cannot protect this module without route patterns",
      });
    }
  }

  if (issues.filter((i) => i.severity === "error").length === 0) {
    issues.push({
      code: "BOUNDARY_OK",
      severity: "info",
      message: `Module boundaries validated: ${Object.keys(defs).length} modules, ${modulesWithHealth} with health endpoints`,
    });
  }

  return {
    category: "boundary-integrity",
    label: "Boundary Integrity",
    issues,
    durationMs: Date.now() - start,
  };
}
