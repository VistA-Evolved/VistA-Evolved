#!/usr/bin/env node
/**
 * QA Gate: No hardcoded localhost in frontend source.
 *
 * Scans apps/web/src and apps/portal/src for `localhost:3001` references
 * outside the centralised api-config.ts files. Any hit is a FAIL.
 *
 * Allowlist: api-config.ts, playwright.config.ts, *.test.*, *.spec.*
 *
 * Usage:  node scripts/qa-gates/no-hardcoded-localhost.mjs
 * Exit:   0 = PASS, 1 = FAIL
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, sep } from "path";

const ROOT = process.cwd();
const DIRS = [
  join(ROOT, "apps", "web", "src"),
  join(ROOT, "apps", "portal", "src"),
];

const PATTERN = /localhost:3001/;

// Files allowed to contain the pattern
const ALLOWLIST_RE =
  /api-config\.ts$|playwright\.config|\.test\.|\.spec\.|\.stories\.|__tests__|__mocks__/;

function walk(dir, exts = [".ts", ".tsx"]) {
  const results = [];
  try {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          if (entry === "node_modules" || entry === ".next" || entry === "dist") continue;
          results.push(...walk(fullPath, exts));
        } else if (exts.some((e) => entry.endsWith(e))) {
          results.push(fullPath);
        }
      } catch { /* skip unreadable */ }
    }
  } catch { /* skip unreadable dir */ }
  return results;
}

let failures = 0;
let checked = 0;

for (const dir of DIRS) {
  for (const file of walk(dir)) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    if (ALLOWLIST_RE.test(rel)) continue;

    checked++;
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      if (PATTERN.test(lines[i])) {
        console.log(`FAIL  ${rel}:${i + 1}  ${lines[i].trim().slice(0, 100)}`);
        failures++;
      }
    }
  }
}

console.log("");
console.log(`no-hardcoded-localhost: scanned ${checked} files, ${failures} violation(s)`);

if (failures > 0) {
  console.log("FIX: import { API_BASE } from '@/lib/api-config' instead of inlining localhost.");
  process.exit(1);
} else {
  console.log("PASS");
  process.exit(0);
}
