/**
 * Phase 54 -- PHI Log Scan Audit Module
 *
 * Checks server-side code for patterns that could leak PHI/PII.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative, extname } from "path";
import type { AuditModule, AuditFinding } from "../types.js";

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "coverage", ".turbo"]);
const SKIP_FILES = new Set(["phi-leak-scan.mjs", "phiLogScanAudit.ts"]);

const LEAK_PATTERNS = [
  {
    name: "console.log in server code",
    regex: /\bconsole\.(log|info|debug|warn|error)\s*\(/g,
    allow: [".test.ts", "logger.ts", "logger.test.ts", "scripts/"],
    severity: "medium" as const,
  },
  {
    name: "Stack trace in response",
    regex: /(?:reply|res|response)\.(?:send|code|status).*(?:stack|stackTrace|err\.message)/g,
    allow: [],
    severity: "high" as const,
  },
  {
    name: "Raw error.message to client",
    regex: /reply\.send\(\s*\{[^}]*error:\s*(?:err|error)\.message/g,
    allow: [],
    severity: "high" as const,
  },
  {
    name: "Logging raw request body",
    regex: /log\.\w+\([^)]*request\.body\s*[,)]/g,
    allow: [],
    severity: "high" as const,
  },
  {
    name: "Logging raw cookie/session",
    regex: /log\.\w+\([^)]*(?:request\.cookies|request\.headers\.cookie|sessionToken)\s*[,)]/g,
    allow: [],
    severity: "high" as const,
  },
];

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
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

function isAllowed(filePath: string, root: string, allowPatterns: string[]): boolean {
  const rel = relative(root, filePath).replace(/\\/g, "/");
  return allowPatterns.some((p) => rel.includes(p));
}

export const phiLogScanAudit: AuditModule = {
  name: "phiLogScanAudit",
  requires: "offline",

  async run(root: string): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    const apiSrc = join(root, "apps", "api", "src");
    const files = collectFiles(apiSrc);
    let totalViolations = 0;

    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      const rel = relative(root, file).replace(/\\/g, "/");
      const lines = content.split("\n");

      for (const pattern of LEAK_PATTERNS) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;

          pattern.regex.lastIndex = 0;
          if (pattern.regex.test(line) && !isAllowed(file, root, pattern.allow)) {
            totalViolations++;
            findings.push({
              rule: `phi-${pattern.name.toLowerCase().replace(/\s+/g, "-")}`,
              status: "fail",
              severity: pattern.severity,
              message: `${pattern.name}`,
              file: rel,
              line: i + 1,
              fix: "Use structured logger; sanitize before sending to client",
            });
          }
        }
      }
    }

    if (totalViolations === 0) {
      findings.push({
        rule: "no-phi-leaks",
        status: "pass",
        severity: "info",
        message: `Scanned ${files.length} server files -- no PHI leak patterns found`,
      });
    }

    return findings;
  },
};
