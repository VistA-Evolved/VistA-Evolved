#!/usr/bin/env node
/**
 * G3 -- Security Scans Gate
 *
 * Wraps existing:
 *   - scripts/secret-scan.mjs
 *   - scripts/phi-leak-scan.mjs
 *   - pnpm audit (critical only)
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

export const id = 'G3_security_scans';
export const name = 'Security Scans';

export async function run() {
  const start = Date.now();
  const details = [];
  let status = 'pass';
  let hasWarnings = false;

  const scans = [
    { label: 'Secret scan', cmd: 'node scripts/secret-scan.mjs', required: false },
    { label: 'PHI leak scan', cmd: 'node scripts/phi-leak-scan.mjs', required: false },
  ];

  for (const s of scans) {
    const scriptPath = resolve(ROOT, s.cmd.split(' ').slice(1).join(' '));
    try {
      execSync(s.cmd, { cwd: ROOT, stdio: 'pipe', timeout: 60_000 });
      details.push(`${s.label}: PASS`);
    } catch (err) {
      const out = err.stdout?.toString().slice(-200) || err.stderr?.toString().slice(-200) || '';
      if (s.required) {
        details.push(`${s.label}: FAIL -- ${out.trim().split('\n').pop()}`);
        status = 'fail';
      } else {
        details.push(`${s.label}: WARN -- ${out.trim().split('\n').pop()}`);
        hasWarnings = true;
      }
    }
  }

  // Dependency audit -- critical only, warn on high
  try {
    execSync('pnpm audit --audit-level=critical', {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 60_000,
    });
    details.push('Dependency audit (critical): PASS');
  } catch (err) {
    const out = err.stdout?.toString() || '';
    if (out.includes('critical')) {
      details.push('Dependency audit: FAIL -- critical vulnerabilities found');
      status = 'fail';
    } else {
      details.push('Dependency audit: WARN -- non-critical vulnerabilities');
    }
  }

  // If only warnings (no hard fails), report as warn not fail
  if (status === 'pass' && hasWarnings) status = 'warn';

  return { id, name, status, details, durationMs: Date.now() - start };
}
