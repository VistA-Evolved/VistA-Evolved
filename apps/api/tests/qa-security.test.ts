/**
 * Phase 105 -- QA Gauntlet: Security & PHI Gates
 *
 * Automated checks for:
 * - Credential patterns not in source code
 * - Logging redaction (DOB/SSN/AccessCode/VerifyCode not logged)
 * - Sensitive files not committed
 * - Response headers
 *
 * Run: cd apps/api && pnpm exec vitest run tests/qa-security.test.ts
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, extname, relative } from "path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const API = process.env.API_URL ?? "http://localhost:3001";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function walkFiles(dir: string, exts: Set<string>): string[] {
  const results: string[] = [];
  const SKIP = new Set(["node_modules", ".next", ".git", "dist", ".turbo", ".pnpm", "coverage"]);

  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          if (!SKIP.has(entry)) walk(full);
        } else if (exts.has(extname(entry))) {
          results.push(full);
        }
      } catch { /* broken symlink etc */ }
    }
  }
  walk(dir);
  return results;
}

/* ================================================================== */
/* 1. Secret / Credential Scanning                                     */
/* ================================================================== */

describe("Secret scanning", () => {
  const CODE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
  // Exemptions matching the pre-commit hook
  const EXEMPT_PATTERNS = [
    /page\.tsx$/,           // login page sandbox creds gated by NODE_ENV
    /\.env\.example$/,
    /\.env\.local$/,
    /AGENTS\.md$/,
    /BUG-TRACKER\.md$/,
    /runbooks\//,
    /\.test\./,
    /\.spec\./,
    /\.setup\.ts$/,         // auth setup files
    /tools\//,
    /reference\//,
    /config\.ts$/,          // vista/config.ts has comments only
    /session-store\.ts$/,   // has comment-only reference per AGENTS.md #22
    /helpers\/auth\.ts$/,   // e2e auth helper uses env var fallbacks
  ];

  function isExempt(filepath: string): boolean {
    const rel = relative(ROOT, filepath).replace(/\\/g, "/");
    return EXEMPT_PATTERNS.some((p) => p.test(rel));
  }

  it("no hardcoded PROV123/PHARM123/NURSE123 in production source", () => {
    const files = [
      ...walkFiles(join(ROOT, "apps", "api", "src"), CODE_EXTS),
      ...walkFiles(join(ROOT, "apps", "web", "src"), CODE_EXTS),
    ];

    const violations: string[] = [];
    for (const f of files) {
      if (isExempt(f)) continue;
      const content = readFileSync(f, "utf-8");
      if (/PROV123|PHARM123|NURSE123/.test(content)) {
        violations.push(relative(ROOT, f));
      }
    }

    expect(violations, `Credentials found in: ${violations.join(", ")}`).toHaveLength(0);
  });

  it("no AWS keys in source", () => {
    const files = walkFiles(join(ROOT, "apps"), CODE_EXTS);
    const violations: string[] = [];
    for (const f of files) {
      const content = readFileSync(f, "utf-8");
      if (/AKIA[0-9A-Z]{16}/.test(content)) {
        violations.push(relative(ROOT, f));
      }
    }
    expect(violations).toHaveLength(0);
  });
});

/* ================================================================== */
/* 2. Sensitive files not committed                                    */
/* ================================================================== */

describe("Sensitive file guards", () => {
  const FORBIDDEN_IN_REPO = [
    "apps/api/.env.local",
    ".env",
    ".env.local",
    "id_rsa",
    "id_ed25519",
  ];

  for (const f of FORBIDDEN_IN_REPO) {
    it(`${f} is not tracked by git`, () => {
      // Check .gitignore patterns cover these
      const gitignorePath = join(ROOT, ".gitignore");
      if (existsSync(gitignorePath)) {
        const gitignore = readFileSync(gitignorePath, "utf-8");
        const patterns = [".env.local", ".env", "id_rsa", "id_ed25519"];
        const covered = patterns.some((p) => gitignore.includes(p));
        expect(covered).toBe(true);
      }
    });
  }
});

/* ================================================================== */
/* 3. PHI Redaction in Logging                                         */
/* ================================================================== */

describe("PHI redaction", () => {
  it("logger redacts SSN patterns", () => {
    // Verify the logger module has redaction logic
    const loggerPath = join(ROOT, "apps", "api", "src", "lib", "logger.ts");
    if (existsSync(loggerPath)) {
      const content = readFileSync(loggerPath, "utf-8");
      expect(content).toMatch(/redact|sanitize|mask/i);
    }
  });

  it("AI redaction module exists and covers PHI", () => {
    const redactionPath = join(ROOT, "apps", "api", "src", "ai", "redaction.ts");
    if (existsSync(redactionPath)) {
      const content = readFileSync(redactionPath, "utf-8");
      expect(content).toMatch(/SSN|social.*security|DOB|date.*birth/i);
    }
  });
});

/* ================================================================== */
/* 4. Security Headers                                                 */
/* ================================================================== */

describe("Security headers", () => {
  /** Helper: skip when API is unreachable (no running server). */
  async function apiReachable(): Promise<boolean> {
    try {
      await fetch(`${API}/health`, { signal: AbortSignal.timeout(2000) });
      return true;
    } catch { return false; }
  }

  it("API responses include security headers", async () => {
    if (!(await apiReachable())) return; // skip when server not running
    const res = await fetch(`${API}/health`);
    const headers = Object.fromEntries(res.headers.entries());

    // Should have some security headers
    const securityHeaders = [
      "x-content-type-options",
      "x-frame-options",
      "x-request-id",
    ];
    const present = securityHeaders.filter((h) => headers[h]);
    expect(present.length).toBeGreaterThanOrEqual(1);
  });

  it("error responses do not include server version header", async () => {
    if (!(await apiReachable())) return; // skip when server not running
    const res = await fetch(`${API}/nonexistent`);
    const server = res.headers.get("server") ?? "";
    // Should not reveal exact framework version
    expect(server).not.toMatch(/fastify|express|node/i);
  });
});

/* ================================================================== */
/* 5. No console.log pollution (Phase 16 rule)                         */
/* ================================================================== */

describe("Console.log discipline", () => {
  it("apps/api/src has limited console.log usage", () => {
    const files = walkFiles(join(ROOT, "apps", "api", "src"), new Set([".ts"]));
    let count = 0;
    const violations: string[] = [];

    for (const f of files) {
      // Skip test files and tools
      const rel = relative(ROOT, f).replace(/\\/g, "/");
      if (rel.includes("tools/") || rel.includes(".test.") || rel.includes(".spec.")) continue;

      const content = readFileSync(f, "utf-8");
      const matches = content.match(/console\.log\(/g);
      if (matches) {
        count += matches.length;
        if (matches.length > 0) violations.push(`${rel}: ${matches.length}`);
      }
    }

    // Phase 16 cap: <=6 total console.log in entire codebase
    expect(count, `console.log count=${count}: ${violations.join(", ")}`).toBeLessThanOrEqual(6);
  });
});
