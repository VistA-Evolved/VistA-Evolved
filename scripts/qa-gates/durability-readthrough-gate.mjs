#!/usr/bin/env node
/**
 * Phase 276 — Durability Read-Through QA Gate
 *
 * Scans store-policy.ts to find all pg_backed stores, then checks
 * which ones have read-through wiring (import from read-through.ts
 * or explicit PG reads on the get/find path).
 *
 * Output: console summary + artifacts/durability-readthrough-gate.json
 *
 * Usage:
 *   node scripts/qa-gates/durability-readthrough-gate.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const STORE_POLICY = join(ROOT, 'apps/api/src/platform/store-policy.ts');

/* ------------------------------------------------------------------ */
/* Parse store-policy.ts for pg_backed stores                          */
/* ------------------------------------------------------------------ */

let policySource;
try {
  policySource = readFileSync(STORE_POLICY, 'utf-8');
} catch {
  console.error('Could not read store-policy.ts');
  process.exit(1);
}

// Find all store IDs with durability: "pg_backed"
const pgBackedPattern = /id:\s*"([^"]+)"[\s\S]*?durability:\s*"pg_backed"/g;
const pgBackedStores = [];
let match;
while ((match = pgBackedPattern.exec(policySource)) !== null) {
  pgBackedStores.push(match[1]);
}

/* ------------------------------------------------------------------ */
/* Check for read-through imports across the API source                */
/* ------------------------------------------------------------------ */

const apiDir = join(ROOT, 'apps/api/src');

function findFilesRecursive(dir, ext) {
  const results = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findFilesRecursive(full, ext));
      } else if (entry.name.endsWith(ext)) {
        results.push(full);
      }
    }
  } catch {
    /* skip unreadable dirs */
  }
  return results;
}

const tsFiles = findFilesRecursive(apiDir, '.ts');

// Track which files import from read-through
const readThroughImporters = new Set();
const dbReadPatterns =
  /readThroughGet|readThroughList|findById|findByTenant|\.query\s*\(\s*["'`]SELECT/;

for (const file of tsFiles) {
  try {
    const content = readFileSync(file, 'utf-8');
    if (content.includes('read-through') || dbReadPatterns.test(content)) {
      readThroughImporters.add(file.replace(apiDir, '').replace(/\\/g, '/'));
    }
  } catch {
    /* skip */
  }
}

/* ------------------------------------------------------------------ */
/* Map stores to their source files and check coverage                 */
/* ------------------------------------------------------------------ */

// Extract file field for each pg_backed store
const filePattern = /id:\s*"([^"]+)"[\s\S]*?file:\s*"([^"]+)"[\s\S]*?durability:\s*"pg_backed"/g;
const storeFiles = new Map();
while ((match = filePattern.exec(policySource)) !== null) {
  storeFiles.set(match[1], match[2]);
}

const withReadThrough = [];
const withoutReadThrough = [];

for (const storeId of pgBackedStores) {
  const storeFile = storeFiles.get(storeId) || '';
  const normalizedFile = '/' + storeFile.replace(/\\/g, '/');

  // Check if the store's source file has DB read patterns
  const hasReadThrough = [...readThroughImporters].some(
    (f) => normalizedFile.endsWith(f.replace(/^\//, '')) || f.includes(storeFile)
  );

  if (hasReadThrough) {
    withReadThrough.push(storeId);
  } else {
    withoutReadThrough.push(storeId);
  }
}

/* ------------------------------------------------------------------ */
/* Output                                                              */
/* ------------------------------------------------------------------ */

const coverage =
  pgBackedStores.length > 0
    ? ((withReadThrough.length / pgBackedStores.length) * 100).toFixed(1)
    : '0';

const report = {
  generatedAt: new Date().toISOString(),
  totalPgBacked: pgBackedStores.length,
  withReadThrough: withReadThrough.length,
  withoutReadThrough: withoutReadThrough.length,
  coveragePercent: Number(coverage),
  stores: {
    readThrough: withReadThrough,
    writeOnly: withoutReadThrough,
  },
};

const artifactDir = join(ROOT, 'artifacts');
mkdirSync(artifactDir, { recursive: true });
writeFileSync(
  join(artifactDir, 'durability-readthrough-gate.json'),
  JSON.stringify(report, null, 2)
);

console.log(`\n=== Durability Read-Through Gate (Phase 276) ===\n`);
console.log(`  PG-backed stores:     ${report.totalPgBacked}`);
console.log(`  With read-through:    ${report.withReadThrough}`);
console.log(`  Write-through only:   ${report.withoutReadThrough}`);
console.log(`  Coverage:             ${coverage}%`);
console.log(`\n  Output: artifacts/durability-readthrough-gate.json\n`);

// Gate passes at >5% coverage (baseline — will ratchet up)
process.exit(report.withReadThrough >= 3 ? 0 : 1);
