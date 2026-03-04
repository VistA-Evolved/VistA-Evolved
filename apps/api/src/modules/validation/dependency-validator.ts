/**
 * dependency-validator.ts -- Module dependency integrity checks (Phase 163)
 *
 * Validates:
 * - All enabled modules have their dependencies met
 * - No circular dependency chains
 * - SKU profiles reference valid module IDs
 * - alwaysEnabled modules are never disabled
 */

import type { ValidationIssue, ValidationCategory } from './types.js';
import {
  getModuleDefinitions,
  getSkuProfiles,
  getActiveSku,
  getEnabledModules,
  validateDependencies,
} from '../module-registry.js';

/* ------------------------------------------------------------------ */
/*  Circular dependency detection                                      */
/* ------------------------------------------------------------------ */

function detectCircularDeps(modules: Record<string, { dependencies?: string[] }>): string[][] {
  const circles: string[][] = [];
  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string, pathSet: Set<string>) {
    if (pathSet.has(nodeId)) {
      // Found a cycle: extract the cycle from path
      const cycleStart = path.indexOf(nodeId);
      if (cycleStart >= 0) {
        circles.push([...path.slice(cycleStart), nodeId]);
      }
      return;
    }
    if (visited.has(nodeId)) return;

    pathSet.add(nodeId);
    path.push(nodeId);

    const deps = modules[nodeId]?.dependencies ?? [];
    for (const dep of deps) {
      dfs(dep, pathSet);
    }

    path.pop();
    pathSet.delete(nodeId);
    visited.add(nodeId);
  }

  for (const id of Object.keys(modules)) {
    dfs(id, new Set());
  }

  return circles;
}

/* ------------------------------------------------------------------ */
/*  Main validator                                                     */
/* ------------------------------------------------------------------ */

export function validateDependencyIntegrity(tenantId: string = 'default'): ValidationCategory {
  const start = Date.now();
  const issues: ValidationIssue[] = [];
  const defs = getModuleDefinitions();
  const skus = getSkuProfiles();
  const activeSku = getActiveSku();

  // 1. Check enabled modules have deps met
  const enabled = getEnabledModules(tenantId);
  const depErrors = validateDependencies(enabled);
  for (const errMsg of depErrors) {
    issues.push({
      code: 'DEP_UNMET',
      severity: 'error',
      message: errMsg,
      suggestion: 'Enable the required dependency module or change the SKU profile',
    });
  }

  // 2. Detect circular dependencies in module graph
  const circles = detectCircularDeps(defs);
  for (const cycle of circles) {
    issues.push({
      code: 'DEP_CIRCULAR',
      severity: 'error',
      message: `Circular dependency: ${cycle.join(' -> ')}`,
      suggestion: 'Break the circular dependency by removing or refactoring one edge',
    });
  }

  // 3. Validate SKU profiles reference valid modules
  for (const [skuId, sku] of Object.entries(skus)) {
    for (const modId of sku.modules ?? []) {
      if (!defs[modId]) {
        issues.push({
          code: 'SKU_INVALID_MODULE',
          severity: 'error',
          message: `SKU "${skuId}" references unknown module "${modId}"`,
          subject: skuId,
          suggestion: `Fix the module ID in config/skus.json or add the module to config/modules.json`,
        });
      }
    }
  }

  // 4. Validate active SKU exists
  if (!skus[activeSku]) {
    issues.push({
      code: 'SKU_UNKNOWN',
      severity: 'error',
      message: `Active SKU "${activeSku}" not found in SKU profiles`,
      suggestion: 'Set DEPLOY_SKU to a valid SKU ID',
    });
  }

  // 5. Check alwaysEnabled modules are in enabled set
  for (const [modId, def] of Object.entries(defs)) {
    if (def.alwaysEnabled && !enabled.includes(modId)) {
      issues.push({
        code: 'ALWAYS_ENABLED_MISSING',
        severity: 'error',
        message: `Module "${modId}" is marked alwaysEnabled but not in enabled set`,
        subject: modId,
        suggestion: 'This indicates a bug in getEnabledModules()',
      });
    }
  }

  // 6. Info: report dependency graph depth
  const maxDepth = calculateMaxDepth(defs);
  if (maxDepth > 5) {
    issues.push({
      code: 'DEP_DEEP_CHAIN',
      severity: 'warning',
      message: `Deepest dependency chain is ${maxDepth} levels. Consider flattening.`,
    });
  }

  if (issues.length === 0) {
    issues.push({
      code: 'DEP_OK',
      severity: 'info',
      message: `All ${enabled.length} enabled modules have valid dependencies`,
    });
  }

  return {
    category: 'dependency-integrity',
    label: 'Dependency Integrity',
    issues,
    durationMs: Date.now() - start,
  };
}

function calculateMaxDepth(modules: Record<string, { dependencies?: string[] }>): number {
  const memo = new Map<string, number>();

  function depth(id: string, visited: Set<string>): number {
    if (memo.has(id)) return memo.get(id)!;
    if (visited.has(id)) return 0; // cycle guard
    visited.add(id);

    const deps = modules[id]?.dependencies ?? [];
    let max = 0;
    for (const dep of deps) {
      max = Math.max(max, 1 + depth(dep, visited));
    }

    memo.set(id, max);
    return max;
  }

  let globalMax = 0;
  for (const id of Object.keys(modules)) {
    globalMax = Math.max(globalMax, depth(id, new Set()));
  }
  return globalMax;
}
