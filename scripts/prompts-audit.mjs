#!/usr/bin/env node
/**
 * scripts/prompts-audit.mjs — Phase 286 (Wave 11 P1)
 *
 * Scans prompts/ directory for:
 *   - Duplicate numeric prefixes (collision detection)
 *   - Gap detection in prefix sequence
 *   - Folders missing IMPLEMENT or VERIFY files
 *   - Machine-readable JSON report
 *
 * Usage:
 *   node scripts/prompts-audit.mjs [--out path] [--fix]
 */

import { readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const ROOT = process.cwd();
const PROMPTS_DIR = join(ROOT, 'prompts');
const DEFAULT_OUT = join(ROOT, 'evidence', 'wave-11', '286', 'audit-report.json');

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outPath = outIdx >= 0 && args[outIdx + 1] ? args[outIdx + 1] : DEFAULT_OUT;

// ── Scan ───────────────────────────────────────────────────────────

const META_PREFIXES = ['00']; // meta folders are not collisions
const PREFIX_RE = /^(\d+)/;

function scanPrompts() {
  const dirs = readdirSync(PROMPTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const folders = [];
  const prefixGroups = new Map();

  for (const name of dirs) {
    const m = name.match(PREFIX_RE);
    if (!m) {
      folders.push({ name, prefix: null, isMeta: false });
      continue;
    }

    const prefix = m[1];
    const isMeta = META_PREFIXES.includes(prefix);

    // Check for IMPLEMENT / VERIFY files
    let hasImplement = false;
    let hasVerify = false;
    try {
      const files = readdirSync(join(PROMPTS_DIR, name));
      hasImplement = files.some((f) => /IMPLEMENT/i.test(f));
      hasVerify = files.some((f) => /VERIFY/i.test(f));
    } catch {
      /* empty */
    }

    const entry = {
      name,
      prefix,
      numericPrefix: parseInt(prefix, 10),
      isMeta,
      hasImplement,
      hasVerify,
    };
    folders.push(entry);

    if (!isMeta) {
      if (!prefixGroups.has(prefix)) prefixGroups.set(prefix, []);
      prefixGroups.get(prefix).push(entry);
    }
  }

  // Find duplicates (groups with >1 folder)
  const collisions = [];
  for (const [prefix, group] of prefixGroups) {
    if (group.length > 1) {
      collisions.push({
        prefix,
        count: group.length,
        folders: group.map((g) => g.name),
      });
    }
  }

  // Find gaps in numeric prefixes
  const numericPrefixes = [
    ...new Set(folders.filter((f) => f.prefix && !f.isMeta).map((f) => parseInt(f.prefix, 10))),
  ].sort((a, b) => a - b);

  const gaps = [];
  for (let i = 1; i < numericPrefixes.length; i++) {
    const diff = numericPrefixes[i] - numericPrefixes[i - 1];
    if (diff > 1) {
      const missing = [];
      for (let g = numericPrefixes[i - 1] + 1; g < numericPrefixes[i]; g++) {
        missing.push(g);
      }
      gaps.push({
        after: numericPrefixes[i - 1],
        before: numericPrefixes[i],
        missingPrefixes: missing,
      });
    }
  }

  // Folders missing IMPLEMENT/VERIFY
  const incomplete = folders
    .filter((f) => f.prefix && !f.isMeta && (!f.hasImplement || !f.hasVerify))
    .map((f) => ({
      name: f.name,
      hasImplement: f.hasImplement,
      hasVerify: f.hasVerify,
    }));

  return {
    generatedAt: new Date().toISOString(),
    totalFolders: dirs.length,
    totalPhases: folders.filter((f) => f.prefix && !f.isMeta).length,
    collisions,
    collisionCount: collisions.reduce((sum, c) => sum + c.count - 1, 0),
    gaps,
    gapCount: gaps.reduce((sum, g) => sum + g.missingPrefixes.length, 0),
    incomplete,
    incompleteCount: incomplete.length,
    prefixRange:
      numericPrefixes.length > 0
        ? { min: numericPrefixes[0], max: numericPrefixes[numericPrefixes.length - 1] }
        : null,
  };
}

// ── Main ───────────────────────────────────────────────────────────

const report = scanPrompts();

// Output
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');

// Console summary
console.log(`\nPrompts Audit Report`);
console.log(`${'─'.repeat(40)}`);
console.log(`Total folders:    ${report.totalFolders}`);
console.log(`Phase folders:    ${report.totalPhases}`);
console.log(`Prefix range:     ${report.prefixRange?.min}..${report.prefixRange?.max}`);
console.log(`Collisions:       ${report.collisionCount} (${report.collisions.length} groups)`);
console.log(`Gaps:             ${report.gapCount}`);
console.log(`Incomplete:       ${report.incompleteCount}`);
console.log();

if (report.collisions.length > 0) {
  console.log('COLLISIONS:');
  for (const c of report.collisions) {
    console.log(`  prefix ${c.prefix} (${c.count} folders):`);
    for (const f of c.folders) console.log(`    - ${f}`);
  }
  console.log();
}

if (report.gaps.length > 0) {
  console.log('GAPS:');
  for (const g of report.gaps) {
    console.log(`  ${g.after}..${g.before}: missing ${g.missingPrefixes.join(', ')}`);
  }
  console.log();
}

const exitCode = report.collisionCount > 0 ? 1 : 0;
console.log(exitCode === 0 ? '✓ No collisions found' : '✗ Collisions detected — fix required');
process.exit(exitCode);
