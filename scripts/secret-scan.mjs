#!/usr/bin/env node
/**
 * Phase 16: Secret pattern scanner.
 *
 * Scans source files for potential hardcoded credentials, API keys,
 * and sensitive patterns. Returns exit code 1 if secrets found.
 *
 * Usage:
 *   node scripts/secret-scan.mjs
 *   # or in CI:
 *   npx tsx scripts/secret-scan.mjs && echo "CLEAN" || echo "BLOCKED"
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, extname } from "path";

const ROOT = process.cwd();

/** File extensions to scan */
const SCAN_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".yml", ".yaml", ".toml", ".env",
  ".md", ".sh", ".ps1", ".bat", ".cmd",
]);

/** Directories to skip */
const SKIP_DIRS = new Set([
  "node_modules", ".next", ".git", "dist", ".turbo",
  ".pnpm", "coverage", ".nyc_output",
]);

/** Files to skip entirely */
const SKIP_FILES = new Set([
  "pnpm-lock.yaml", "package-lock.json", "yarn.lock",
  "secret-scan.mjs", // don't flag our own patterns
]);

/**
 * Patterns that indicate potential secrets.
 * Each has: name, regex, and optional allowlist of file patterns.
 */
const SECRET_PATTERNS = [
  {
    name: "Hardcoded password",
    regex: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{4,}["']/gi,
    allow: [".env.example", ".md", "AGENTS.md", "BUG-TRACKER.md"],
  },
  {
    name: "AWS Access Key",
    regex: /AKIA[0-9A-Z]{16}/g,
    allow: [],
  },
  {
    name: "Generic API key",
    regex: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][a-zA-Z0-9]{20,}["']/gi,
    allow: [".env.example"],
  },
  {
    name: "Private key header",
    regex: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
    allow: [],
  },
  {
    name: "Hardcoded JWT/token",
    regex: /(?:token|jwt|bearer)\s*[:=]\s*["']eyJ[a-zA-Z0-9._-]{20,}["']/gi,
    allow: [],
  },
  {
    name: "Connection string with creds",
    regex: /(?:mongodb|postgres|mysql|redis):\/\/[^:]+:[^@]+@/gi,
    allow: [".env.example"],
  },
  {
    name: "Hardcoded VistA creds in non-doc",
    regex: /(?:PROV123|NURSE123|PHARM123)(?:!!)?/g,
    allow: [".md", ".env.example", "AGENTS.md", "BUG-TRACKER.md", "secret-scan.mjs",
            "verify-", "login/page.tsx"], // login page uses NODE_ENV gate
  },
];

/** Collect all files recursively */
function collectFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (stat.isFile()) {
      if (SKIP_FILES.has(entry)) continue;
      const ext = extname(entry);
      if (SCAN_EXTENSIONS.has(ext)) {
        results.push(full);
      }
    }
  }
  return results;
}

/** Check if a file path matches any allow pattern */
function isAllowed(filePath, allowPatterns) {
  const rel = relative(ROOT, filePath).replace(/\\/g, "/");
  return allowPatterns.some((p) => rel.includes(p));
}

// ---- Main scan ----
const files = collectFiles(ROOT);
let totalFindings = 0;
const findings = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const rel = relative(ROOT, file).replace(/\\/g, "/");

  for (const pattern of SECRET_PATTERNS) {
    const matches = content.match(pattern.regex);
    if (matches && !isAllowed(file, pattern.allow)) {
      // Check: is it inside a comment?
      for (const match of matches) {
        const idx = content.indexOf(match);
        const lineStart = content.lastIndexOf("\n", idx) + 1;
        const line = content.slice(lineStart, idx + match.length + 50).split("\n")[0];
        const lineNum = content.slice(0, idx).split("\n").length;

        // Skip if clearly in a comment
        const trimmedLine = line.trimStart();
        if (trimmedLine.startsWith("//") || trimmedLine.startsWith("*") || trimmedLine.startsWith("#")) {
          continue;
        }

        findings.push({
          file: rel,
          line: lineNum,
          pattern: pattern.name,
          snippet: match.slice(0, 60),
        });
        totalFindings++;
      }
    }
  }
}

// ---- Output ----
if (totalFindings === 0) {
  console.log("✓ Secret scan passed — no suspicious patterns found.");
  console.log(`  Scanned ${files.length} files.`);
  process.exit(0);
} else {
  console.error(`✗ Secret scan FAILED — ${totalFindings} potential secret(s) found:\n`);
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line} — ${f.pattern}: ${f.snippet}`);
  }
  console.error(`\nFix these before merging. See docs/runbooks/prod-deploy-phase16.md`);
  process.exit(1);
}
