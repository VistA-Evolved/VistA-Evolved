#!/usr/bin/env node
/**
 * G20 -- No New Stub Growth Gate (Phase 145)
 *
 * Soft gate (warn): alerts if stub/not_implemented marker counts
 * increase compared to a committed baseline snapshot.
 *
 * The baseline lives in qa/gauntlet/stub-baseline.json and is
 * updated explicitly when new stubs are intentionally added.
 *
 * Checks:
 *   1. Scan apps/api/src, apps/web/src, apps/portal/src for
 *      'stub', 'not_implemented', 'integration_pending' markers
 *   2. Compare against baseline
 *   3. WARN if any count increases; PASS if stable or decreasing
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const BASELINE_PATH = resolve(__dirname, '../stub-baseline.json');

export const id = 'G20_no_new_stub_growth';
export const name = 'No New Stub Growth';

function walkFiles(dir, exts, maxDepth = 10) {
  const results = [];
  if (!existsSync(dir) || maxDepth <= 0) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...walkFiles(full, exts, maxDepth - 1));
    } else if (entry.isFile() && exts.some((e) => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

function countMarkers(dirs) {
  const patterns = {
    stub: /\bstub\b(?!\.\w)/i,
    not_implemented: /not[_\s]*implemented/i,
    integration_pending: /integration[_\s-]*pending/i,
  };

  const counts = {};
  for (const key of Object.keys(patterns)) counts[key] = 0;

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    const files = walkFiles(dir, ['.ts', '.tsx']);
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          for (const [key, re] of Object.entries(patterns)) {
            if (re.test(line)) counts[key]++;
          }
        }
      } catch {
        /* skip unreadable */
      }
    }
  }

  return counts;
}

export async function run(opts = {}) {
  const start = Date.now();
  const details = [];
  let status = 'pass';

  const dirs = [
    resolve(ROOT, 'apps/api/src'),
    resolve(ROOT, 'apps/web/src'),
    resolve(ROOT, 'apps/portal/src'),
  ];

  const current = countMarkers(dirs);
  details.push(
    `Current: stub=${current.stub} not_implemented=${current.not_implemented} integration_pending=${current.integration_pending}`
  );

  // Load or create baseline
  let baseline;
  if (existsSync(BASELINE_PATH)) {
    try {
      const raw = readFileSync(BASELINE_PATH, 'utf8');
      baseline = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
    } catch {
      baseline = null;
    }
  }

  if (!baseline) {
    details.push(
      'FAIL: stub-baseline.json missing. Run: node qa/gauntlet/gates/g20-no-new-stub-growth.mjs --update-baseline'
    );
    return { id, name, status: 'fail', details, durationMs: Date.now() - start };
  }

  details.push(
    `Baseline: stub=${baseline.counts.stub} not_implemented=${baseline.counts.not_implemented} integration_pending=${baseline.counts.integration_pending}`
  );

  // Compare
  const increases = [];
  for (const key of Object.keys(current)) {
    const bVal = baseline.counts[key] ?? 0;
    const aVal = current[key];
    const delta = aVal - bVal;
    if (delta > 0) {
      increases.push(`${key}: ${bVal} -> ${aVal} (+${delta})`);
    } else if (delta < 0) {
      details.push(`${key}: decreased by ${Math.abs(delta)} (good)`);
    }
  }

  if (increases.length > 0) {
    status = 'warn';
    for (const inc of increases) {
      details.push(`WARN: ${inc}`);
    }
    details.push(
      'Stub/not_implemented counts increased. If intentional, update baseline with: node qa/gauntlet/gates/g20-no-new-stub-growth.mjs --update-baseline'
    );
  } else {
    details.push('PASS: No stub growth detected');
  }

  return { id, name, status, details, durationMs: Date.now() - start };
}

// CLI: --update-baseline
if (process.argv.includes('--update-baseline')) {
  const dirs = [
    resolve(ROOT, 'apps/api/src'),
    resolve(ROOT, 'apps/web/src'),
    resolve(ROOT, 'apps/portal/src'),
  ];
  const current = countMarkers(dirs);
  const baselineData = {
    generatedAt: new Date().toISOString(),
    note: 'Baseline for stub growth detection. Update with: node qa/gauntlet/gates/g20-no-new-stub-growth.mjs --update-baseline',
    counts: current,
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(baselineData, null, 2) + '\n');
  console.log('Baseline updated:', JSON.stringify(current));
}
