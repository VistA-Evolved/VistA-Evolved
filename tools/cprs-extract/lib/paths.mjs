/**
 * lib/paths.mjs — Shared paths and file-globbing utilities for CPRS extraction.
 */

import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
// __dirname = tools/cprs-extract/lib/ → go up 3 levels to repo root
const ROOT = resolve(__dirname, '..', '..', '..');

export const CPRS_CHART_DIR = join(
  ROOT,
  'reference', 'cprs', 'Packages',
  'Order Entry Results Reporting', 'CPRS', 'CPRS-Chart'
);

export const CPRS_ROOT = join(ROOT, 'reference', 'cprs');

export const OUTPUT_DIR = join(ROOT, 'design', 'contracts', 'cprs', 'v1');

/**
 * Recursively walk a directory and return all files matching a filter.
 */
async function walkDir(dir, filter) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await walkDir(fullPath, filter));
    } else if (filter(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Get all .dfm files under CPRS-Chart.
 */
export async function globDfmFiles() {
  return walkDir(CPRS_CHART_DIR, (name) => name.toLowerCase().endsWith('.dfm'));
}

/**
 * Get all .pas files under CPRS-Chart.
 */
export async function globPasFiles() {
  return walkDir(CPRS_CHART_DIR, (name) => name.toLowerCase().endsWith('.pas'));
}

/**
 * Get all .pas files across the entire CPRS source tree.
 */
export async function globAllPasFiles() {
  return walkDir(CPRS_ROOT, (name) => name.toLowerCase().endsWith('.pas'));
}
