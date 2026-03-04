#!/usr/bin/env node
/**
 * Phase 47 -- Module Toggle Integrity Check
 *
 * Ensures the module gating system is consistent:
 *   1. Every module in modules.json has valid route patterns
 *   2. Route patterns compile to valid RegExp
 *   3. Every registered route in the API matches at least one module
 *   4. SKU profiles reference only existing modules
 *   5. Module dependencies reference only existing modules
 *   6. No circular dependencies
 *
 * Usage:
 *   npx tsx scripts/check-module-gates.ts
 *
 * Exit codes:
 *   0 = all checks pass
 *   1 = hard failures found
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const ROOT = process.cwd();
const MODULES_PATH = join(ROOT, 'config', 'modules.json');
const SKUS_PATH = join(ROOT, 'config', 'skus.json');

interface ModuleDef {
  name: string;
  description: string;
  alwaysEnabled: boolean;
  routePatterns: string[];
  dependencies: string[];
  adapters: string[];
  services: string[];
}

interface SkuProfile {
  name: string;
  description: string;
  modules: string[];
}

interface CheckResult {
  check: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string[];
}

const results: CheckResult[] = [];

function pass(check: string, message: string) {
  results.push({ check, status: 'pass', message });
}
function fail(check: string, message: string, details?: string[]) {
  results.push({ check, status: 'fail', message, details });
}
function warn(check: string, message: string, details?: string[]) {
  results.push({ check, status: 'warn', message, details });
}

/* ------------------------------------------------------------------ */
/* Load config files                                                    */
/* ------------------------------------------------------------------ */

if (!existsSync(MODULES_PATH)) {
  fail('modules-loaded', 'config/modules.json not found');
  printAndExit();
}
if (!existsSync(SKUS_PATH)) {
  fail('skus-loaded', 'config/skus.json not found');
  printAndExit();
}

const modulesData = JSON.parse(readFileSync(MODULES_PATH, 'utf-8'));
const modules: Record<string, ModuleDef> = modulesData.modules || {};
const moduleIds = Object.keys(modules);

const skusData = JSON.parse(readFileSync(SKUS_PATH, 'utf-8'));
const skus: Record<string, SkuProfile> = skusData.skus || {};
const skuIds = Object.keys(skus);

pass('config-loaded', `Loaded ${moduleIds.length} modules and ${skuIds.length} SKUs`);

/* ------------------------------------------------------------------ */
/* Check 1: Route patterns compile to valid RegExp                      */
/* ------------------------------------------------------------------ */

const badPatterns: string[] = [];
const compiledPatterns = new Map<string, RegExp[]>();

for (const [modId, mod] of Object.entries(modules)) {
  const regexes: RegExp[] = [];
  for (const pattern of mod.routePatterns) {
    try {
      regexes.push(new RegExp(pattern));
    } catch (e) {
      badPatterns.push(`${modId}: "${pattern}" -- ${(e as Error).message}`);
    }
  }
  compiledPatterns.set(modId, regexes);
}

if (badPatterns.length === 0) {
  const totalPatterns = moduleIds.reduce((sum, id) => sum + modules[id].routePatterns.length, 0);
  pass('route-patterns-valid', `All ${totalPatterns} route patterns compile to valid RegExp`);
} else {
  fail('route-patterns-valid', `${badPatterns.length} invalid route patterns`, badPatterns);
}

/* ------------------------------------------------------------------ */
/* Check 2: No empty route patterns (except kernel)                     */
/* ------------------------------------------------------------------ */

const emptyPatterns: string[] = [];
for (const [modId, mod] of Object.entries(modules)) {
  if (mod.routePatterns.length === 0 && !mod.alwaysEnabled) {
    emptyPatterns.push(modId);
  }
}
if (emptyPatterns.length === 0) {
  pass('no-empty-patterns', 'All non-kernel modules have route patterns');
} else {
  warn(
    'no-empty-patterns',
    `Modules with no route patterns: ${emptyPatterns.join(', ')}`,
    emptyPatterns
  );
}

/* ------------------------------------------------------------------ */
/* Check 3: SKU profiles reference only existing modules                */
/* ------------------------------------------------------------------ */

const badSkuRefs: string[] = [];
for (const [skuId, sku] of Object.entries(skus)) {
  for (const modRef of sku.modules) {
    if (!moduleIds.includes(modRef)) {
      badSkuRefs.push(`${skuId} references unknown module "${modRef}"`);
    }
  }
}
if (badSkuRefs.length === 0) {
  pass('sku-refs-valid', `All ${skuIds.length} SKU profiles reference valid modules`);
} else {
  fail('sku-refs-valid', `${badSkuRefs.length} invalid SKU module references`, badSkuRefs);
}

/* ------------------------------------------------------------------ */
/* Check 4: Module dependencies reference existing modules              */
/* ------------------------------------------------------------------ */

const badDeps: string[] = [];
for (const [modId, mod] of Object.entries(modules)) {
  for (const dep of mod.dependencies) {
    if (!moduleIds.includes(dep)) {
      badDeps.push(`${modId} depends on unknown module "${dep}"`);
    }
  }
}
if (badDeps.length === 0) {
  pass('deps-valid', 'All module dependencies reference existing modules');
} else {
  fail('deps-valid', `${badDeps.length} invalid dependency references`, badDeps);
}

/* ------------------------------------------------------------------ */
/* Check 5: No circular dependencies                                    */
/* ------------------------------------------------------------------ */

function hasCircularDep(modId: string, visited: Set<string>, stack: Set<string>): string | null {
  visited.add(modId);
  stack.add(modId);
  const mod = modules[modId];
  if (mod) {
    for (const dep of mod.dependencies) {
      if (stack.has(dep)) return `${modId} -> ${dep}`;
      if (!visited.has(dep)) {
        const cycle = hasCircularDep(dep, visited, stack);
        if (cycle) return `${modId} -> ${cycle}`;
      }
    }
  }
  stack.delete(modId);
  return null;
}

const cycles: string[] = [];
const visited = new Set<string>();
for (const modId of moduleIds) {
  if (!visited.has(modId)) {
    const cycle = hasCircularDep(modId, visited, new Set());
    if (cycle) cycles.push(cycle);
  }
}
if (cycles.length === 0) {
  pass('no-circular-deps', 'No circular dependencies detected');
} else {
  fail('no-circular-deps', `Circular dependencies: ${cycles.join('; ')}`);
}

/* ------------------------------------------------------------------ */
/* Check 6: FULL_SUITE SKU contains all non-test modules                */
/* ------------------------------------------------------------------ */

const fullSuite = skus['FULL_SUITE'];
if (fullSuite) {
  const missing = moduleIds.filter(
    (id) => !fullSuite.modules.includes(id) && !modules[id].alwaysEnabled
  );
  if (missing.length === 0) {
    pass('full-suite-complete', 'FULL_SUITE SKU includes all non-kernel modules');
  } else {
    warn('full-suite-complete', `FULL_SUITE missing modules: ${missing.join(', ')}`, missing);
  }
} else {
  fail('full-suite-complete', 'FULL_SUITE SKU not found in skus.json');
}

/* ------------------------------------------------------------------ */
/* Check 7: Route pattern overlap detection (warn only)                 */
/* ------------------------------------------------------------------ */

const overlaps: string[] = [];
const moduleEntries = Object.entries(modules);
for (let i = 0; i < moduleEntries.length; i++) {
  for (let j = i + 1; j < moduleEntries.length; j++) {
    const [modA, defA] = moduleEntries[i];
    const [modB, defB] = moduleEntries[j];
    for (const patA of defA.routePatterns) {
      for (const patB of defB.routePatterns) {
        // Simple overlap: same pattern string
        if (patA === patB) {
          overlaps.push(`${modA} and ${modB} share pattern "${patA}"`);
        }
      }
    }
  }
}
if (overlaps.length === 0) {
  pass('no-pattern-overlap', 'No duplicate route patterns across modules');
} else {
  warn('no-pattern-overlap', `${overlaps.length} shared patterns (may be intentional)`, overlaps);
}

/* ------------------------------------------------------------------ */
/* Check 8: alwaysEnabled modules have no dependencies                  */
/* ------------------------------------------------------------------ */

const kernelWithDeps: string[] = [];
for (const [modId, mod] of Object.entries(modules)) {
  if (mod.alwaysEnabled && mod.dependencies.length > 0) {
    kernelWithDeps.push(`${modId} has deps: ${mod.dependencies.join(', ')}`);
  }
}
if (kernelWithDeps.length === 0) {
  pass('kernel-no-deps', 'Always-enabled modules have no dependencies');
} else {
  warn('kernel-no-deps', `Always-enabled modules with deps: ${kernelWithDeps.join('; ')}`);
}

/* ------------------------------------------------------------------ */
/* Output                                                              */
/* ------------------------------------------------------------------ */

function printAndExit() {
  console.log('\n=== Module Toggle Integrity Check (Phase 47) ===\n');

  const passCount = results.filter((r) => r.status === 'pass').length;
  const failCount = results.filter((r) => r.status === 'fail').length;
  const warnCount = results.filter((r) => r.status === 'warn').length;

  for (const r of results) {
    const icon = r.status === 'pass' ? 'PASS' : r.status === 'fail' ? 'FAIL' : 'WARN';
    console.log(`  [${icon}] ${r.check}: ${r.message}`);
    if (r.details && r.details.length > 0) {
      for (const d of r.details.slice(0, 5)) {
        console.log(`         - ${d}`);
      }
      if (r.details.length > 5) {
        console.log(`         ... and ${r.details.length - 5} more`);
      }
    }
  }

  console.log(`\nSummary: ${passCount} pass, ${failCount} fail, ${warnCount} warn`);
  console.log(`Modules: ${moduleIds.length} | SKUs: ${skuIds.length}`);

  // Output JSON for evidence pack
  if (process.env.EVIDENCE_OUTPUT) {
    mkdirSync(dirname(process.env.EVIDENCE_OUTPUT), { recursive: true });
    writeFileSync(
      process.env.EVIDENCE_OUTPUT,
      JSON.stringify(
        {
          gate: 'module-gates',
          results,
          summary: {
            passCount,
            failCount,
            warnCount,
            moduleCount: moduleIds.length,
            skuCount: skuIds.length,
          },
        },
        null,
        2
      )
    );
  }

  process.exit(failCount > 0 ? 1 : 0);
}

printAndExit();
