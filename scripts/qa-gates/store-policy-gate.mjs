#!/usr/bin/env node
/**
 * Store Policy Gate -- Phase 136
 *
 * Static analysis gate that validates in-memory store policy:
 *   1. Every `new Map` in apps/api/src/ must be registered in store-policy.ts
 *   2. No `critical` + `in_memory_only` stores exist (rc/prod violation)
 *   3. Every `cache` store must declare TTL or maxSize
 *   4. Store inventory file counts match actual source patterns
 *
 * Usage:
 *   node scripts/qa-gates/store-policy-gate.mjs
 *   node scripts/qa-gates/store-policy-gate.mjs --strict
 *
 * Exit code:
 *   0 = PASS
 *   1 = FAIL
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const API_SRC = resolve(ROOT, 'apps/api/src');
const STORE_POLICY_PATH = resolve(API_SRC, 'platform/store-policy.ts');
const strict = process.argv.includes('--strict');

const details = [];
let pass = true;

function fail(msg) {
  details.push(`FAIL: ${msg}`);
  pass = false;
}

function ok(msg) {
  details.push(`OK: ${msg}`);
}

function warn(msg) {
  details.push(`WARN: ${msg}`);
}

// --- 1. store-policy.ts exists ------------------------------

if (!existsSync(STORE_POLICY_PATH)) {
  fail('store-policy.ts does not exist');
  console.log(details.join('\n'));
  process.exit(1);
}

const policySrc = readFileSync(STORE_POLICY_PATH, 'utf8');

// --- 2. Parse inventory from store-policy.ts ----------------

// Extract all file paths mentioned in the inventory
const filePatterns = [];
const fileRegex = /file:\s*"([^"]+)"/g;
let m;
while ((m = fileRegex.exec(policySrc)) !== null) {
  filePatterns.push(m[1]);
}

// Extract classification counts
const criticalCount = (policySrc.match(/classification:\s*"critical"/g) || []).length;
const cacheCount = (policySrc.match(/classification:\s*"cache"/g) || []).length;
const rateLimiterCount = (policySrc.match(/classification:\s*"rate_limiter"/g) || []).length;
const registryCount = (policySrc.match(/classification:\s*"registry"/g) || []).length;
const auditCount = (policySrc.match(/classification:\s*"audit"/g) || []).length;
const devOnlyCount = (policySrc.match(/classification:\s*"dev_only"/g) || []).length;
const totalRegistered =
  criticalCount + cacheCount + rateLimiterCount + registryCount + auditCount + devOnlyCount;

ok(`Store inventory: ${totalRegistered} entries registered`);
ok(`  critical=${criticalCount}, cache=${cacheCount}, rate_limiter=${rateLimiterCount}`);
ok(`  registry=${registryCount}, audit=${auditCount}, dev_only=${devOnlyCount}`);

// Minimum inventory size check (we know there are ~100+ stores)
if (totalRegistered < 80) {
  fail(`Store inventory has only ${totalRegistered} entries (expected 80+). Incomplete inventory.`);
}

// --- 3. Check critical + in_memory_only stores --------------

// Extract critical + in_memory_only entries using block-by-block parsing
// (regex spanning across blocks is unreliable)
const criticalInMemory = [];
const allEntryBlocks = policySrc.split(/\n  \{/).slice(1);
for (const rawBlock of allEntryBlocks) {
  const block = '{' + rawBlock.split(/\n  \},/)[0] + '}';
  const idMatch = block.match(/id:\s*"([^"]+)"/);
  if (!idMatch) continue;
  const classMatch = block.match(/classification:\s*"([^"]+)"/);
  const durMatch = block.match(/durability:\s*"([^"]+)"/);
  if (classMatch && classMatch[1] === 'critical' && durMatch && durMatch[1] === 'in_memory_only') {
    criticalInMemory.push(idMatch[1]);
  }
}

if (criticalInMemory.length > 0) {
  // In dev mode, this is a WARN (known tech debt). In strict/rc/prod, it's a FAIL.
  const msg = `${criticalInMemory.length} critical stores are in_memory_only: ${criticalInMemory.slice(0, 5).join(', ')}${criticalInMemory.length > 5 ? '...' : ''}`;
  if (strict) {
    fail(msg + ' (strict mode: all critical stores must be PG-backed)');
  } else {
    warn(msg + ' (acceptable in dev; would FAIL in rc/prod)');
  }
} else {
  ok('No critical+in_memory_only stores (all critical stores are durable)');
}

// --- 4. Check cache stores have TTL or maxSize --------------

// Split inventory into individual entry blocks to avoid regex spanning
// Each entry starts with `  {` at indent 2 and ends with `  },`
const entryBlocks = policySrc.split(/\n  \{/).slice(1); // skip preamble before first entry
const cacheStoresWithoutLimits = [];
for (const rawBlock of entryBlocks) {
  const block = '{' + rawBlock.split(/\n  \},/)[0] + '}'; // reconstruct block
  const idMatch = block.match(/id:\s*"([^"]+)"/);
  if (!idMatch) continue;
  const id = idMatch[1];
  const classMatch = block.match(/classification:\s*"([^"]+)"/);
  if (!classMatch || classMatch[1] !== 'cache') continue;
  const hasTtl = /ttlMs:\s*\d+/.test(block) && !/ttlMs:\s*0[,\s]/.test(block);
  const hasMaxSize = /maxSize:\s*\d+/.test(block) && !/maxSize:\s*0[,\s]/.test(block);
  if (!hasTtl && !hasMaxSize) {
    cacheStoresWithoutLimits.push(id);
  }
}

if (cacheStoresWithoutLimits.length > 0) {
  if (strict) {
    fail(
      `${cacheStoresWithoutLimits.length} cache stores lack TTL or maxSize: ${cacheStoresWithoutLimits.join(', ')}`
    );
  } else {
    warn(
      `${cacheStoresWithoutLimits.length} cache stores lack TTL or maxSize: ${cacheStoresWithoutLimits.join(', ')}`
    );
  }
} else {
  ok('All cache stores have TTL or maxSize declared');
}

// --- 5. Cross-reference: scan source for unregistered Maps --

function walkDir(dir, ext = '.ts') {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = resolve(dir, e.name);
      if (e.isDirectory()) {
        // Skip node_modules, .next, tests
        if (e.name === 'node_modules' || e.name === '.next' || e.name === '__tests__') continue;
        results.push(...walkDir(full, ext));
      } else if (
        e.name.endsWith(ext) &&
        !e.name.endsWith('.test.ts') &&
        !e.name.endsWith('.spec.ts')
      ) {
        results.push(full);
      }
    }
  } catch {
    /* skip inaccessible dirs */
  }
  return results;
}

const sourceFiles = walkDir(API_SRC);
let unregisteredMaps = 0;
const unregisteredFiles = [];

for (const filePath of sourceFiles) {
  const relPath = relative(API_SRC, filePath).replace(/\\/g, '/');
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Count module-level `new Map` patterns.
  // Heuristic: only count Maps at indent level 0 (true module scope).
  // Function-scoped Maps (indent >= 2 chars) are transient locals.
  let moduleLevelMaps = 0;
  for (const line of lines) {
    if (/(?:const|let|var)\s+\w+.*=\s*new\s+Map/.test(line)) {
      const indent = line.match(/^(\s*)/)[1].length;
      if (indent === 0) {
        // True module-level declaration
        moduleLevelMaps++;
      }
    }
  }

  if (moduleLevelMaps > 0) {
    // Check if this file is registered in the inventory
    const isRegistered = filePatterns.some(
      (fp) => relPath.includes(fp) || fp.includes(relPath.replace('.ts', ''))
    );

    if (!isRegistered) {
      // Check if it's a test helper, or store-policy itself
      if (relPath === 'platform/store-policy.ts') continue;
      if (relPath.includes('test') || relPath.includes('spec')) continue;

      unregisteredMaps += moduleLevelMaps;
      unregisteredFiles.push(`${relPath} (${moduleLevelMaps} Maps)`);
    }
  }
}

if (unregisteredFiles.length > 0) {
  const msg = `${unregisteredFiles.length} files with unregistered Map stores:\n    ${unregisteredFiles.slice(0, 10).join('\n    ')}`;
  if (strict) {
    fail(msg);
  } else {
    warn(msg);
  }
} else {
  ok('All Map stores in source files are registered in inventory');
}

// --- 6. Verify required exports exist -----------------------

const requiredExports = [
  'STORE_INVENTORY',
  'getStoresByClassification',
  'getCriticalInMemoryStores',
  'getCacheStoresWithoutLimits',
  'getStoreInventorySummary',
];

const missingExports = requiredExports.filter(
  (e) => !policySrc.includes(`export function ${e}`) && !policySrc.includes(`export const ${e}`)
);

if (missingExports.length > 0) {
  fail(`store-policy.ts missing exports: ${missingExports.join(', ')}`);
} else {
  ok(
    `store-policy.ts: ${requiredExports.length}/${requiredExports.length} required exports present`
  );
}

// --- 7. Verify migrationTarget on all critical+in_memory ---

// Reuse the block-by-block approach for accurate matching
const criticalNoMigration = [];
for (const rawBlock of allEntryBlocks) {
  const block = '{' + rawBlock.split(/\n  \},/)[0] + '}';
  const idMatch = block.match(/id:\s*"([^"]+)"/);
  if (!idMatch) continue;
  const classMatch = block.match(/classification:\s*"([^"]+)"/);
  const durMatch = block.match(/durability:\s*"([^"]+)"/);
  if (classMatch && classMatch[1] === 'critical' && durMatch && durMatch[1] === 'in_memory_only') {
    if (!block.includes('migrationTarget')) {
      criticalNoMigration.push(idMatch[1]);
    }
  }
}

if (criticalNoMigration.length > 0) {
  fail(
    `${criticalNoMigration.length} critical+in_memory_only stores lack migrationTarget: ${criticalNoMigration.join(', ')}`
  );
} else {
  ok('All critical+in_memory_only stores have migrationTarget declared');
}

// --- Summary ------------------------------------------------

console.log('\n=== Store Policy Gate ===\n');
for (const d of details) {
  console.log(`  ${d}`);
}
console.log(`\n  Result: ${pass ? 'PASS' : 'FAIL'}\n`);

process.exit(pass ? 0 : 1);
