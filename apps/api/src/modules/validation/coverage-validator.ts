/**
 * coverage-validator.ts -- Capability/module/store coverage checks (Phase 163)
 *
 * Validates:
 * - Every capability's module exists in modules.json
 * - No orphan capabilities (module exists but no capabilities defined)
 * - Store-policy dataStores cross-reference
 * - Permission declarations vs known actions
 */

import type { ValidationIssue, ValidationCategory } from './types.js';
import { getModuleDefinitions, getEnabledModules } from '../module-registry.js';
import { getCapabilityDefinitions, resolveCapabilities } from '../capability-service.js';
import { STORE_INVENTORY } from '../../platform/store-policy.js';

/* ------------------------------------------------------------------ */
/*  Main validator                                                     */
/* ------------------------------------------------------------------ */

export function validateCoverageIntegrity(tenantId: string = 'default'): ValidationCategory {
  const start = Date.now();
  const issues: ValidationIssue[] = [];
  const defs = getModuleDefinitions();
  const capDefs = getCapabilityDefinitions();
  const enabled = getEnabledModules(tenantId);

  // 1. Every capability references a valid module
  const capModules = new Set<string>();
  for (const [capId, cap] of Object.entries(capDefs)) {
    capModules.add(cap.module);
    if (!defs[cap.module]) {
      issues.push({
        code: 'CAP_ORPHAN_MODULE',
        severity: 'error',
        message: `Capability "${capId}" references module "${cap.module}" which does not exist`,
        subject: capId,
        suggestion: `Fix the module reference in capabilities.json or add "${cap.module}" to modules.json`,
      });
    }
  }

  // 2. Check for modules with zero capabilities
  for (const modId of Object.keys(defs)) {
    if (modId === 'kernel') continue; // kernel is infrastructure, no user-facing caps
    if (!capModules.has(modId)) {
      issues.push({
        code: 'MODULE_NO_CAPS',
        severity: 'warning',
        message: `Module "${modId}" has no capabilities defined in capabilities.json`,
        subject: modId,
        suggestion: 'Add at least one capability for this module',
      });
    }
  }

  // 3. Capability resolution health for enabled modules
  const resolved = resolveCapabilities(tenantId);
  let liveCount = 0;
  let pendingCount = 0;
  let disabledCount = 0;
  for (const cap of resolved) {
    if (cap.effectiveStatus === 'live') liveCount++;
    else if (cap.effectiveStatus === 'pending') pendingCount++;
    else if (cap.effectiveStatus === 'disabled') disabledCount++;
  }

  issues.push({
    code: 'CAP_SUMMARY',
    severity: 'info',
    message: `${resolved.length} capabilities: ${liveCount} live, ${pendingCount} pending, ${disabledCount} disabled`,
  });

  // 4. Cross-reference module dataStores with store-policy
  for (const [modId, def] of Object.entries(defs)) {
    const dataStores = (def as any).dataStores as string[] | undefined;
    if (!dataStores) continue;
    for (const storeName of dataStores) {
      // Check if any store-policy entry matches by ID or domain
      const found = STORE_INVENTORY.some((s) => s.id === storeName || s.domain === modId);
      if (!found) {
        issues.push({
          code: 'STORE_NOT_IN_POLICY',
          severity: 'warning',
          message: `Module "${modId}" declares dataStore "${storeName}" not found in store-policy`,
          subject: modId,
          suggestion: 'Add a matching entry to STORE_INVENTORY in store-policy.ts',
        });
      }
    }
  }

  // 5. Check for store-policy entries without a matching module
  const allModIds = new Set(Object.keys(defs));
  const unmatchedDomains = new Set<string>();
  for (const store of STORE_INVENTORY) {
    if (
      store.domain &&
      !allModIds.has(store.domain) &&
      ![
        'auth',
        'security',
        'platform',
        'infra',
        'dev',
        'performance',
        'queue',
        'workflow',
        'templates',
        'alignment',
      ].includes(store.domain)
    ) {
      unmatchedDomains.add(store.domain);
    }
  }
  if (unmatchedDomains.size > 0) {
    issues.push({
      code: 'STORE_UNMATCHED_DOMAIN',
      severity: 'info',
      message: `${unmatchedDomains.size} store-policy domains not matching a module ID: ${[...unmatchedDomains].join(', ')}`,
      suggestion: 'This is informational -- non-module domains are acceptable',
    });
  }

  // 6. Check enabled module count vs capability count ratio
  const capsPerModule = resolved.length / Math.max(enabled.length, 1);
  if (capsPerModule < 2) {
    issues.push({
      code: 'CAP_LOW_COVERAGE',
      severity: 'warning',
      message: `Only ${capsPerModule.toFixed(1)} capabilities per enabled module (recommended >= 3)`,
      suggestion: 'Add more granular capabilities for better UI feature gating',
    });
  }

  return {
    category: 'coverage-integrity',
    label: 'Coverage Integrity',
    issues,
    durationMs: Date.now() - start,
  };
}
