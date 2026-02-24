#!/usr/bin/env node
/**
 * G2 -- Unit Tests Gate
 *
 * Runs the existing vitest test suites with deterministic config.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

export const id = "G2_unit_tests";
export const name = "Unit Tests";

export async function run() {
  const start = Date.now();
  const details = [];
  let status = "pass";

  // Run API unit/integration tests if they exist
  const testFiles = [
    { label: "API contract tests", cmd: "cd apps/api && npx vitest run tests/contract.test.ts --reporter=verbose" },
    { label: "API security tests", cmd: "cd apps/api && npx vitest run tests/qa-security.test.ts --reporter=verbose" },
  ];

  for (const t of testFiles) {
    try {
      execSync(t.cmd, {
        cwd: ROOT,
        stdio: "pipe",
        timeout: 120_000,
        env: { ...process.env, NODE_ENV: "test" },
      });
      details.push(`${t.label}: PASS`);
    } catch (err) {
      const out = err.stdout?.toString().slice(-300) || err.stderr?.toString().slice(-300) || "";
      // Check if it's "no test files found" -- that's a skip, not fail
      if (out.includes("No test files found") || out.includes("no tests found")) {
        details.push(`${t.label}: SKIP (no test files)`);
      } else {
        details.push(`${t.label}: FAIL -- ${out.trim().split("\n").slice(-3).join("; ")}`);
        status = "fail";
      }
    }
  }

  return { id, name, status, details, durationMs: Date.now() - start };
}
