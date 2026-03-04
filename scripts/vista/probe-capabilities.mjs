#!/usr/bin/env node
/**
 * scripts/vista/probe-capabilities.mjs — Phase 425 (W26 P3)
 *
 * Calls the running API's /vista/rpc-capabilities?refresh=true endpoint
 * and saves the result as a dated capability snapshot under data/vista/.
 *
 * Usage:
 *   node scripts/vista/probe-capabilities.mjs
 *   node scripts/vista/probe-capabilities.mjs --api http://127.0.0.1:3001
 *   node scripts/vista/probe-capabilities.mjs --output data/vista/snapshot-custom.json
 *
 * Requirements:
 *   - API server running at the specified URL
 *   - VistA Docker container running and reachable
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');

// ── CLI args ────────────────────────────────────────

const args = process.argv.slice(2);
let apiUrl = 'http://127.0.0.1:3001';
let outputPath = '';
let compareBaseline = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--api' && args[i + 1]) apiUrl = args[++i];
  if (args[i] === '--output' && args[i + 1]) outputPath = args[++i];
  if (args[i] === '--compare') compareBaseline = true;
  if (args[i] === '--help') {
    console.log(`
Usage: node scripts/vista/probe-capabilities.mjs [options]

Options:
  --api <url>      API base URL (default: http://127.0.0.1:3001)
  --output <path>  Output file path (default: data/vista/capability-snapshot-<date>.json)
  --compare        Compare result against most recent baseline
  --help           Show this help
`);
    process.exit(0);
  }
}

// ── Probe ────────────────────────────────────────

console.log('\n=== VistA Capability Probe (Phase 425) ===\n');
console.log(`  API:  ${apiUrl}`);

async function probe() {
  const url = `${apiUrl}/vista/rpc-capabilities?refresh=true`;
  console.log(`  Probing: ${url}`);

  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  } catch (err) {
    console.error(`\n  ERROR: Could not reach API at ${apiUrl}`);
    console.error(`  Is the API server running? (npx tsx --env-file=.env.local src/index.ts)`);
    console.error(`  ${err.message}\n`);
    process.exit(1);
  }

  if (!response.ok) {
    const text = await response.text();
    console.error(`\n  ERROR: API returned ${response.status}`);
    console.error(`  ${text.substring(0, 500)}\n`);
    process.exit(1);
  }

  const data = await response.json();

  if (!data.ok) {
    console.error('\n  ERROR: API returned ok=false');
    console.error(`  ${JSON.stringify(data).substring(0, 500)}\n`);
    process.exit(1);
  }

  return data;
}

async function fetchRuntimeMatrix() {
  try {
    const url = `${apiUrl}/vista/runtime-matrix`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (response.ok) return await response.json();
  } catch {
    // runtime-matrix endpoint may not exist yet
  }
  return null;
}

async function main() {
  const capabilities = await probe();

  // Enrich with metadata
  const snapshot = {
    snapshotVersion: '1.0.0',
    capturedAt: new Date().toISOString(),
    apiUrl,
    instanceId: capabilities.instanceId,
    summary: {
      totalProbed: capabilities.totalProbed,
      available: capabilities.available,
      missing: capabilities.missing,
      expectedMissing: capabilities.expectedMissing,
      unexpectedMissing: capabilities.unexpectedMissing,
    },
    availableList: capabilities.rpcs
      ? Object.entries(capabilities.rpcs)
          .filter(([, v]) => v.available)
          .map(([k]) => k)
          .sort()
      : [],
    missingList: capabilities.rpcs
      ? Object.entries(capabilities.rpcs)
          .filter(([, v]) => !v.available)
          .map(([k]) => k)
          .sort()
      : [],
    domains: capabilities.domains || {},
    rpcs: capabilities.rpcs || {},
  };

  // Try to fetch runtime matrix too
  const matrix = await fetchRuntimeMatrix();
  if (matrix) {
    snapshot.runtimeMatrix = matrix;
  }

  // Print summary
  console.log('');
  console.log(`  Instance:   ${snapshot.instanceId}`);
  console.log(`  Available:  ${snapshot.summary.available}/${snapshot.summary.totalProbed}`);
  console.log(
    `  Missing:    ${snapshot.summary.missing} (${snapshot.summary.expectedMissing} expected, ${snapshot.summary.unexpectedMissing} unexpected)`
  );
  console.log('');

  // Domain summaries
  if (snapshot.domains) {
    console.log('  Domain Status:');
    for (const [name, info] of Object.entries(snapshot.domains)) {
      const read = info.readAvailable ? 'R' : '-';
      const write = info.writeAvailable ? 'W' : '-';
      console.log(`    [${read}${write}] ${name}`);
    }
    console.log('');
  }

  // ── Output ────────────────────────────────────────

  if (!outputPath) {
    const date = new Date().toISOString().slice(0, 10);
    outputPath = join(REPO_ROOT, `data/vista/capability-snapshot-${date}.json`);
  }

  const outDir = dirname(outputPath);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  writeFileSync(outputPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');
  console.log(`  Snapshot saved: ${outputPath}`);

  // ── Compare against baseline ────────────────────────────────────────

  if (compareBaseline) {
    const baselinePath = join(REPO_ROOT, 'data/vista/baseline-worldvista-docker.json');
    if (existsSync(baselinePath)) {
      console.log(`\n  Comparing against baseline: ${baselinePath}`);
      const raw = readFileSync(baselinePath, 'utf-8');
      const baseline = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);

      // Simple comparison: check if any baseline-available RPCs are now missing
      const baselineAvailable = new Set(
        baseline.rpcs
          ? Object.entries(baseline.rpcs)
              .filter(([, v]) => v.available)
              .map(([k]) => k)
          : baseline.availableList || []
      );

      const regressions = [];
      const newlyAvailable = [];

      for (const rpc of baselineAvailable) {
        if (!snapshot.availableList.includes(rpc)) {
          regressions.push(rpc);
        }
      }

      for (const rpc of snapshot.availableList) {
        if (!baselineAvailable.has(rpc)) {
          newlyAvailable.push(rpc);
        }
      }

      if (regressions.length > 0) {
        console.log(`\n  REGRESSIONS (${regressions.length}):`);
        for (const r of regressions) console.log(`    - ${r}`);
      }

      if (newlyAvailable.length > 0) {
        console.log(`\n  NEWLY AVAILABLE (${newlyAvailable.length}):`);
        for (const r of newlyAvailable) console.log(`    + ${r}`);
      }

      if (regressions.length === 0 && newlyAvailable.length === 0) {
        console.log('  No drift detected -- matches baseline.');
      }
    } else {
      console.log(`\n  No baseline found at ${baselinePath} -- skipping comparison.`);
      console.log('  Run: scripts\\vista\\inspect-container.ps1 to create one.');
    }
  }

  console.log('');
}

main().catch((err) => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
