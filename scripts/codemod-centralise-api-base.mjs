#!/usr/bin/env node
/**
 * Codemod: Replace scattered localhost:3001 API_BASE declarations with
 * centralised import from @/lib/api-config.
 *
 * Usage:
 *   node scripts/codemod-centralise-api-base.mjs [--dry-run]
 *
 * Handles these patterns:
 *   A) const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
 *   B) const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
 *   C) const API_BASE = "http://localhost:3001";  (hardcoded, no env)
 *   D) Inline function-level: const base = process.env...  (leave, add module-level import)
 *   E) const apiBase = process.env...  inside function bodies
 *
 * Special cases handled separately:
 *   - BrowserTerminal.tsx (ws:// URL)
 *   - chart-types.ts (re-export)
 *   - api-config.ts itself (skip)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = process.cwd();

// ── Pattern matchers ─────────────────────────────────────────────────
// Module-level declarations (top of file, no leading whitespace beyond normal)
const MODULE_LEVEL_RE =
  /^(const\s+)(API_BASE|API)\s*[:=]\s*(?:process\.env\.NEXT_PUBLIC_API_URL\s*(?:\?\?|\|\|)\s*)?['"]http:\/\/localhost:3001['"];?\s*$/;

// Function-level declarations (indented, inside function bodies)
const FUNC_LEVEL_RE =
  /^(\s+)(const\s+)(base|apiBase|API|API_BASE)\s*[:=]\s*(?:process\.env\.NEXT_PUBLIC_API_URL\s*(?:\?\?|\|\|)\s*)?['"]http:\/\/localhost:3001['"];?\s*$/;

// Inline usage (not a declaration, but embedded in an expression)
const INLINE_RE =
  /process\.env\.NEXT_PUBLIC_API_URL\s*(?:\?\?|\|\|)\s*['"]http:\/\/localhost:3001['"]/;

// ── Helpers ──────────────────────────────────────────────────────────

function walk(dir, exts = ['.ts', '.tsx']) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === 'dist') continue;
      results.push(...walk(fullPath, exts));
    } else if (exts.some((e) => entry.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

function isWebFile(filePath) {
  return filePath.includes(`apps${sep}web${sep}src`);
}

function isPortalFile(filePath) {
  return filePath.includes(`apps${sep}portal${sep}src`);
}

function getImportPath(filePath) {
  if (isWebFile(filePath)) return '@/lib/api-config';
  if (isPortalFile(filePath)) return '@/lib/api-config';
  return null;
}

function hasImportAlready(content, importPath) {
  return content.includes(`from '${importPath}'`) || content.includes(`from "${importPath}"`);
}

function buildImportLine(varName, importPath) {
  if (varName === 'API_BASE') return `import { API_BASE } from '${importPath}';`;
  // For API, API_BASE as API to keep existing usage
  return `import { API_BASE as ${varName} } from '${importPath}';`;
}

// ── Main transform ───────────────────────────────────────────────────

const stats = { files: 0, replacements: 0, skipped: [] };

function transformFile(filePath) {
  const rel = relative(ROOT, filePath).replace(/\\/g, '/');

  // Skip the config files themselves
  if (rel.endsWith('lib/api-config.ts')) return;
  // Skip test files and config files that are fine
  if (rel.includes('playwright.config')) return;
  if (rel.includes('.test.')) return;
  if (rel.includes('.spec.')) return;

  const importPath = getImportPath(filePath);
  if (!importPath) return;

  const original = readFileSync(filePath, 'utf-8');
  if (!original.includes('localhost:3001')) return;

  const lines = original.split('\n');
  let modified = false;
  let neededImportVar = null; // Which var name to import
  const removedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check module-level pattern (no or minimal leading whitespace)
    const mMatch = line.match(MODULE_LEVEL_RE);
    if (mMatch) {
      const varName = mMatch[2]; // API_BASE or API
      neededImportVar = neededImportVar || varName;
      removedLines.push(i);
      modified = true;
      continue;
    }

    // Check function-level pattern (indented)
    const fMatch = line.match(FUNC_LEVEL_RE);
    if (fMatch) {
      const indent = fMatch[1];
      const varName = fMatch[3]; // base, apiBase, API, API_BASE
      // Replace with: const varName = API_BASE;
      lines[i] = `${indent}const ${varName} = API_BASE;`;
      // We need API_BASE import
      neededImportVar = neededImportVar || 'API_BASE';
      modified = true;
      continue;
    }

    // Check inline usage (inside template literals etc.)
    if (INLINE_RE.test(line)) {
      // Replace inline with API_BASE reference
      lines[i] = line.replace(INLINE_RE, 'API_BASE');
      neededImportVar = neededImportVar || 'API_BASE';
      modified = true;
    }
  }

  if (!modified) {
    // File has localhost:3001 but in a pattern we don't handle (e.g., comments)
    if (original.includes('localhost:3001') && !rel.includes('api-config')) {
      stats.skipped.push(rel);
    }
    return;
  }

  // Remove module-level declaration lines (reverse order to preserve indices)
  for (const idx of removedLines.reverse()) {
    // Also remove a preceding blank line if it exists and looks like a separator
    lines.splice(idx, 1);
  }

  let content = lines.join('\n');

  // Add import if not already present
  if (neededImportVar && !hasImportAlready(content, importPath)) {
    const importLine = buildImportLine(neededImportVar, importPath);
    // Insert after the last existing import or 'use client' directive
    const importInsertIdx = findImportInsertPosition(content);
    const contentLines = content.split('\n');
    contentLines.splice(importInsertIdx, 0, importLine);
    content = contentLines.join('\n');
  }

  if (!DRY_RUN) {
    writeFileSync(filePath, content, 'utf-8');
  }

  stats.files++;
  stats.replacements += removedLines.length + (modified ? 1 : 0);
  console.log(
    `  ${DRY_RUN ? '[DRY] ' : ''}${rel} → import { ${neededImportVar === 'API_BASE' ? 'API_BASE' : `API_BASE as ${neededImportVar}`} }`
  );
}

function findImportInsertPosition(content) {
  const lines = content.split('\n');
  let lastImportLine = -1;
  let useClientLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("'use client'") || trimmed.startsWith('"use client"')) {
      useClientLine = i;
    }
    if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
      lastImportLine = i;
    }
    // Stop scanning after we pass the import block
    if (
      lastImportLine > -1 &&
      !trimmed.startsWith('import') &&
      trimmed !== '' &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('/*') &&
      !trimmed.startsWith('*')
    ) {
      break;
    }
  }

  if (lastImportLine > -1) return lastImportLine + 1;
  if (useClientLine > -1) return useClientLine + 1;
  return 0;
}

// ── Run ──────────────────────────────────────────────────────────────

console.log(`\nCentralising API_BASE declarations...${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

const webFiles = walk(join(ROOT, 'apps', 'web', 'src'));
const portalFiles = walk(join(ROOT, 'apps', 'portal', 'src'));

for (const f of [...webFiles, ...portalFiles]) {
  transformFile(f);
}

console.log(`\n── Summary ──`);
console.log(`  Files modified: ${stats.files}`);
console.log(`  Total replacements: ${stats.replacements}`);
if (stats.skipped.length) {
  console.log(`  Skipped (needs manual review):`);
  for (const s of stats.skipped) console.log(`    ${s}`);
}
console.log('');
