/**
 * Phase 124 -- Tripwire: Source-Level Dead Click Scanner
 *
 * Scans CPRS panel and page files for dead-click patterns:
 *   1. onClick handlers that are empty: onClick={() => {}}
 *   2. setTimeout-simulated handlers (fake async with no API call)
 *   3. Disabled buttons without title/tooltip explaining why
 *
 * Allowlist: explicitly permitted patterns with justification.
 * CI fails if any non-allowlisted dead-click patterns are found.
 *
 * Usage: pnpm qa:tripwire:source
 *    or: pnpm -C apps/api exec tsx ../../tests/tripwire/tripwire-source-scan.test.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const SCAN_DIRS = [
  'apps/web/src/components/cprs/panels',
  'apps/web/src/app/cprs',
  'apps/web/src/app/patient-search',
];

const FILE_PATTERN = /\.(tsx|ts)$/;

// Patterns that indicate dead clicks
const DEAD_CLICK_PATTERNS: { name: string; regex: RegExp; severity: 'error' | 'warn' }[] = [
  {
    name: 'empty-onClick',
    regex: /onClick\s*=\s*\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/,
    severity: 'error',
  },
  {
    name: 'onClick-undefined',
    regex: /onClick\s*=\s*\{\s*undefined\s*\}/,
    severity: 'error',
  },
  {
    name: 'setTimeout-simulated-query',
    regex: /setTimeout\s*\(\s*\(\)\s*=>\s*\{[^}]*set\w+\([^)]*\)[^}]*\}\s*,\s*\d+\s*\)/,
    severity: 'warn',
  },
  {
    name: 'disabled-no-title',
    regex: /disabled(?:\s*=\s*\{[^}]+\})?\s*>(?!.*title=)/,
    severity: 'warn',
  },
];

// Allowlist: file + line patterns that are explicitly permitted
const ALLOWLIST: { file: RegExp; linePattern: RegExp; reason: string }[] = [
  // QA/debug panels are developer-facing, not user-facing
  { file: /RpcDebugPanel/, linePattern: /.*/, reason: 'Developer debug panel' },
  { file: /ActionInspector/, linePattern: /.*/, reason: 'Developer-facing inspector' },
  { file: /qa-dashboard/, linePattern: /.*/, reason: 'QA admin panel' },
  // Close/dismiss handlers are legitimate (onClick => setX(null))
  { file: /.*/, linePattern: /onClick.*set\w+\(null\)/, reason: 'Dismiss/close handler' },
  { file: /.*/, linePattern: /onClick.*set\w+\(false\)/, reason: 'Toggle-off handler' },
  { file: /.*/, linePattern: /onClick.*set\w+\(''\)/, reason: 'Clear input handler' },
  // Filter/select handlers are legitimate UI state
  { file: /.*/, linePattern: /onClick.*setFilter/, reason: 'Filter UI state' },
  { file: /.*/, linePattern: /onClick.*setTab/, reason: 'Tab switch' },
  { file: /.*/, linePattern: /onClick.*setActive/, reason: 'Selection state' },
  { file: /.*/, linePattern: /onClick.*setSelected/, reason: 'Selection state' },
  { file: /.*/, linePattern: /onClick.*setExpand/, reason: 'Expand/collapse' },
  { file: /.*/, linePattern: /onClick.*setOpen/, reason: 'Open/close toggle' },
  // Disabled with title is fine (integration-pending pattern)
  { file: /.*/, linePattern: /disabled.*title=/, reason: 'Properly disabled with tooltip' },
  // Auto-close modal after API success is legitimate UX, not a dead click
  {
    file: /nursing\/page/,
    linePattern: /setTimeout.*setShowCreate\(false\)/,
    reason: 'Auto-close success modal after real API call',
  },
];

/* ------------------------------------------------------------------ */
/* Scanner                                                             */
/* ------------------------------------------------------------------ */

interface Finding {
  file: string;
  line: number;
  pattern: string;
  severity: 'error' | 'warn';
  text: string;
}

function scanDir(dir: string): string[] {
  const root = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(root)) return [];
  const files: string[] = [];
  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (FILE_PATTERN.test(entry.name)) files.push(full);
    }
  }
  walk(root);
  return files;
}

function isAllowlisted(relFile: string, lineText: string): boolean {
  return ALLOWLIST.some((a) => a.file.test(relFile) && a.linePattern.test(lineText));
}

function scanFile(filePath: string): Finding[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  const findings: Finding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of DEAD_CLICK_PATTERNS) {
      if (pattern.regex.test(line)) {
        if (isAllowlisted(relPath, line)) continue;
        findings.push({
          file: relPath,
          line: i + 1,
          pattern: pattern.name,
          severity: pattern.severity,
          text: line.trim().slice(0, 120),
        });
      }
    }
  }

  return findings;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const allFiles = SCAN_DIRS.flatMap(scanDir);
const allFindings = allFiles.flatMap(scanFile);
const errors = allFindings.filter((f) => f.severity === 'error');
const warnings = allFindings.filter((f) => f.severity === 'warn');

// eslint-disable-next-line no-console
console.log(`\n=== Dead Click Source Scan (Phase 124) ===`);
// eslint-disable-next-line no-console
console.log(`Scanned: ${allFiles.length} files`);
// eslint-disable-next-line no-console
console.log(`Errors:  ${errors.length}`);
// eslint-disable-next-line no-console
console.log(`Warnings: ${warnings.length}\n`);

for (const f of allFindings) {
  const tag = f.severity === 'error' ? 'FAIL' : 'WARN';
  // eslint-disable-next-line no-console
  console.log(`  ${tag}  ${f.file}:${f.line} [${f.pattern}]`);
  // eslint-disable-next-line no-console
  console.log(`         ${f.text}\n`);
}

if (errors.length > 0) {
  // eslint-disable-next-line no-console
  console.log(`\nDead click tripwire FAILED: ${errors.length} error(s) found.`);
  // eslint-disable-next-line no-console
  console.log('Fix the dead clicks or add to ALLOWLIST with justification.');
  process.exit(1);
} else {
  // eslint-disable-next-line no-console
  console.log(`Dead click tripwire PASSED (${warnings.length} warning(s)).`);
}
