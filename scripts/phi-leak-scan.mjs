#!/usr/bin/env node
/**
 * PHI Leak Scanner (Phase 34)
 *
 * Scans server-side source for patterns that could leak PHI/PII
 * to logs, error messages, or client responses.
 *
 * Exit code 1 if violations found. Used in CI gates.
 *
 * Usage: node scripts/phi-leak-scan.mjs
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, extname } from "path";

const ROOT = process.cwd();
const API_SRC = join(ROOT, "apps", "api", "src");

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs"]);
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", ".git", "coverage"]);
const SKIP_FILES = new Set(["phi-leak-scan.mjs", "redaction.test.ts", "logger.test.ts"]);

/**
 * Patterns that indicate potential PHI leakage.
 * Each has a name, regex, and optional allowlist of file patterns.
 */
const LEAK_PATTERNS = [
  {
    name: "console.log in server code",
    regex: /\bconsole\.(log|info|debug|warn|error)\s*\(/g,
    allow: [".test.ts", "logger.ts", "logger.test.ts", "scripts/"],
    description: "Use structured logger instead of console.*",
  },
  {
    name: "Stack trace in response",
    regex: /(?:reply|res|response)\.(?:send|code|status).*(?:stack|stackTrace|err\.message)/g,
    allow: [],
    description: "Never send stack traces to clients",
  },
  {
    name: "Raw error.message to client",
    regex: /reply\.send\(\s*\{[^}]*error:\s*(?:err|error)\.message/g,
    allow: [],
    description: "Sanitize error messages before sending to clients",
  },
  {
    name: "Logging raw request body",
    regex: /log\.\w+\([^)]*request\.body\s*[,)]/g,
    allow: [],
    description: "Never log raw request bodies (may contain PHI)",
  },
  {
    name: "Logging raw cookie/session",
    regex: /log\.\w+\([^)]*(?:request\.cookies|request\.headers\.cookie|sessionToken)\s*[,)]/g,
    allow: [],
    description: "Never log cookies or session tokens",
  },
];

function collectFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (SCAN_EXTENSIONS.has(extname(entry.name)) && !SKIP_FILES.has(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function isAllowed(filePath, allowPatterns) {
  const rel = relative(ROOT, filePath).replace(/\\/g, "/");
  return allowPatterns.some((p) => rel.includes(p));
}

let totalViolations = 0;
const violations = [];

const files = collectFiles(API_SRC);

for (const filePath of files) {
  const content = readFileSync(filePath, "utf-8");
  const rel = relative(ROOT, filePath).replace(/\\/g, "/");
  const lines = content.split("\n");

  for (const pattern of LEAK_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments
      if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;

      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(line) && !isAllowed(filePath, pattern.allow)) {
        totalViolations++;
        violations.push({
          file: rel,
          line: i + 1,
          pattern: pattern.name,
          description: pattern.description,
          text: line.trim().slice(0, 120),
        });
      }
    }
  }
}

console.log(`\n=== PHI Leak Scanner (Phase 34) ===\n`);
console.log(`Files scanned: ${files.length}`);
console.log(`Violations found: ${totalViolations}\n`);

if (violations.length > 0) {
  for (const v of violations) {
    console.log(`  [VIOLATION] ${v.file}:${v.line}`);
    console.log(`    Pattern: ${v.pattern}`);
    console.log(`    Detail: ${v.description}`);
    console.log(`    Code: ${v.text}\n`);
  }
  process.exit(1);
} else {
  console.log("  No PHI leak patterns detected. CLEAN.\n");
  process.exit(0);
}
