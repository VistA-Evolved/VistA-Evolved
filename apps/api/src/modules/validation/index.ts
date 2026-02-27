/**
 * modules/validation/index.ts -- Barrel + runAllValidations (Phase 163)
 */

export type { ValidationSeverity, ValidationIssue, ValidationCategory, ValidationReport } from "./types.js";
export { validateDependencyIntegrity } from "./dependency-validator.js";
export { validateBoundaryIntegrity } from "./boundary-checker.js";
export { validateCoverageIntegrity } from "./coverage-validator.js";

import type { ValidationReport } from "./types.js";
import { validateDependencyIntegrity } from "./dependency-validator.js";
import { validateBoundaryIntegrity } from "./boundary-checker.js";
import { validateCoverageIntegrity } from "./coverage-validator.js";
import { getActiveSku } from "../module-registry.js";

/**
 * Run all module packaging validations and return a consolidated report.
 */
export function runAllValidations(tenantId: string = "default"): ValidationReport {
  const categories = [
    validateDependencyIntegrity(tenantId),
    validateBoundaryIntegrity(),
    validateCoverageIntegrity(tenantId),
  ];

  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const cat of categories) {
    for (const issue of cat.issues) {
      if (issue.severity === "error") errorCount++;
      else if (issue.severity === "warning") warningCount++;
      else infoCount++;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    passed: errorCount === 0,
    errorCount,
    warningCount,
    infoCount,
    categories,
    activeSku: getActiveSku(),
    tenantId,
  };
}
