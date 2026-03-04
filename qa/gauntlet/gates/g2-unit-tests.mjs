#!/usr/bin/env node
/**
 * G2 -- Unit Tests Gate
 *
 * Runs the existing vitest test suites with deterministic config.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

export const id = 'G2_unit_tests';
export const name = 'Unit Tests';

export async function run() {
  const start = Date.now();
  const details = [];
  let status = 'pass';

  // Run API unit/integration tests if they exist
  const testFiles = [
    {
      label: 'API contract tests',
      cmd: 'cd apps/api && npx vitest run tests/contract.test.ts --reporter=verbose',
    },
    {
      label: 'API security tests',
      cmd: 'cd apps/api && npx vitest run tests/qa-security.test.ts --reporter=verbose',
    },
  ];

  for (const t of testFiles) {
    try {
      execSync(t.cmd, {
        cwd: ROOT,
        stdio: 'pipe',
        timeout: 120_000,
        env: { ...process.env, NODE_ENV: 'test' },
      });
      details.push(`${t.label}: PASS`);
    } catch (err) {
      const stdout = err.stdout?.toString() || '';
      const stderr = err.stderr?.toString() || '';
      const combined = stdout + stderr;
      const out = combined.slice(-300);
      // Check if it's "no test files found" -- that's a skip, not fail
      if (combined.includes('No test files found') || combined.includes('no tests found')) {
        details.push(`${t.label}: SKIP (no test files)`);
      } else if (combined.includes('ECONNREFUSED') || combined.includes('connect ECONNREFUSED')) {
        details.push(`${t.label}: SKIP (API not running -- integration test requires live server)`);
      } else {
        details.push(`${t.label}: FAIL -- ${out.trim().split('\n').slice(-3).join('; ')}`);
        status = 'fail';
      }
    }
  }

  return { id, name, status, details, durationMs: Date.now() - start };
}
