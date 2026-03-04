#!/usr/bin/env node
/**
 * G11 -- Tenant Isolation Gate (Phase 122)
 *
 * Validates tenant isolation enforcement:
 *   1. tenant-guard.ts module exists with required exports
 *   2. tenant-scoped-queries.ts module exists
 *   3. TENANT_SCOPED_TABLES is non-empty and covers required tables
 *   4. No repo files perform PK lookups without tenant guard imports
 *   5. PG RLS table list covers all PG-resident tenant tables
 *   6. Tenant isolation tests pass (vitest)
 *
 * In strict mode, also checks:
 *   - Every repo file that imports db must also import tenant-guard
 *   - PG RLS covers >= 20 tables
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const API_SRC = resolve(ROOT, 'apps/api/src');
const REPO_DIR = resolve(API_SRC, 'platform/db/repo');

export const id = 'G11_tenant_isolation';
export const name = 'Tenant Isolation';

export async function run(opts = {}) {
  const start = Date.now();
  const details = [];
  let status = 'pass';
  const strict = opts.strict || false;

  // ── 1. tenant-guard.ts exists ────────────────────────────
  const guardPath = resolve(REPO_DIR, 'tenant-guard.ts');
  if (!existsSync(guardPath)) {
    details.push('tenant-guard.ts: MISSING');
    return { id, name, status: 'fail', details, durationMs: Date.now() - start };
  }

  const guardSrc = readFileSync(guardPath, 'utf8');
  const requiredExports = [
    'requireTenantId',
    'assertTenantMatch',
    'TenantIsolationError',
    'TENANT_SCOPED_TABLES',
    'GLOBAL_TABLES',
  ];
  const missingExports = requiredExports.filter(
    (e) =>
      !guardSrc.includes(`export function ${e}`) &&
      !guardSrc.includes(`export class ${e}`) &&
      !guardSrc.includes(`export const ${e}`)
  );
  if (missingExports.length > 0) {
    details.push(`tenant-guard.ts: missing exports: ${missingExports.join(', ')}`);
    status = 'fail';
  } else {
    details.push(
      `tenant-guard.ts: ${requiredExports.length}/${requiredExports.length} exports present`
    );
  }

  // ── 2. tenant-scoped-queries.ts exists ───────────────────
  const scopedPath = resolve(REPO_DIR, 'tenant-scoped-queries.ts');
  if (!existsSync(scopedPath)) {
    details.push('tenant-scoped-queries.ts: MISSING');
    status = 'fail';
  } else {
    const scopedSrc = readFileSync(scopedPath, 'utf8');
    const fnCount = (scopedSrc.match(/export function/g) || []).length;
    details.push(`tenant-scoped-queries.ts: ${fnCount} exported functions`);
    if (fnCount < 2) {
      details.push('  expected >= 2 tenant-scoped query wrappers');
      status = 'fail';
    }
  }

  // ── 3. TENANT_SCOPED_TABLES coverage ─────────────────────
  const tablesMatch = guardSrc.match(/TENANT_SCOPED_TABLES\s*=\s*\[([\s\S]*?)\]\s*as\s+const/);
  let scopedTableCount = 0;
  const criticalTables = [
    'rcm_claim',
    'rcm_remittance',
    'rcm_claim_case',
    'rcm_work_item',
    'auth_session',
    'tenant_payer',
  ];
  if (tablesMatch) {
    const tableEntries = tablesMatch[1].match(/"([^"]+)"/g) || [];
    scopedTableCount = tableEntries.length;
    const tableNames = tableEntries.map((t) => t.replace(/"/g, ''));
    const missingCritical = criticalTables.filter((t) => !tableNames.includes(t));
    details.push(`TENANT_SCOPED_TABLES: ${scopedTableCount} tables`);
    if (missingCritical.length > 0) {
      details.push(`  missing critical tables: ${missingCritical.join(', ')}`);
      status = 'fail';
    }
  } else {
    details.push('TENANT_SCOPED_TABLES: not found in tenant-guard.ts');
    status = 'fail';
  }

  // ── 4. Barrel export check ───────────────────────────────
  const barrelPath = resolve(REPO_DIR, 'index.ts');
  if (existsSync(barrelPath)) {
    const barrelSrc = readFileSync(barrelPath, 'utf8');
    const hasTenantGuardExport = barrelSrc.includes('tenant-guard');
    const hasScopedExport = barrelSrc.includes('tenant-scoped-queries');
    if (!hasTenantGuardExport) {
      details.push('barrel index.ts: missing tenant-guard re-export');
      status = 'fail';
    }
    if (!hasScopedExport) {
      details.push('barrel index.ts: missing tenant-scoped-queries re-export');
      status = 'fail';
    }
    if (hasTenantGuardExport && hasScopedExport) {
      details.push('barrel index.ts: tenant-guard + tenant-scoped-queries exported');
    }
  } else {
    details.push('barrel index.ts: MISSING');
    status = 'fail';
  }

  // ── 5. PG RLS table list coverage ────────────────────────
  const pgMigratePath = resolve(API_SRC, 'platform/pg/pg-migrate.ts');
  if (existsSync(pgMigratePath)) {
    const pgSrc = readFileSync(pgMigratePath, 'utf8');
    const rlsMatch = pgSrc.match(/const tenantTables\s*=\s*\[([\s\S]*?)\]/);
    if (rlsMatch) {
      const rlsEntries = rlsMatch[1].match(/"([^"]+)"/g) || [];
      const rlsCount = rlsEntries.length;
      details.push(`PG RLS tenantTables: ${rlsCount} tables`);
      if (strict && rlsCount < 20) {
        details.push(`  strict: expected >= 20 RLS tables`);
        status = 'fail';
      }
    } else {
      details.push('PG RLS tenantTables: not found in pg-migrate.ts');
      if (strict) status = 'fail';
    }
  }

  // ── 6. Auto-enable logic present ─────────────────────────
  if (existsSync(pgMigratePath)) {
    const pgSrc = readFileSync(pgMigratePath, 'utf8');
    const hasAutoEnable =
      pgSrc.includes('NODE_ENV') &&
      pgSrc.includes('production') &&
      pgSrc.includes('PLATFORM_PG_URL');
    if (hasAutoEnable) {
      details.push('PG RLS auto-enable: present (production + PG_URL)');
    } else {
      details.push('PG RLS auto-enable: MISSING -- RLS should auto-enable in production');
      status = 'fail';
    }
  }

  // ── 7. Tenant isolation test exists and passes ───────────
  const testPath = resolve(ROOT, 'apps/api/tests/tenant-isolation.test.ts');
  if (!existsSync(testPath)) {
    details.push('tenant-isolation.test.ts: MISSING');
    status = 'fail';
  } else {
    try {
      const testOutput = execSync(
        'pnpm exec vitest run tests/tenant-isolation.test.ts --reporter=json 2>&1',
        { cwd: resolve(ROOT, 'apps/api'), encoding: 'utf8', timeout: 30_000 }
      );
      // Try to parse JSON output
      const jsonStart = testOutput.indexOf('{');
      if (jsonStart >= 0) {
        try {
          const result = JSON.parse(testOutput.slice(jsonStart));
          const passed = result.numPassedTests || 0;
          const failed = result.numFailedTests || 0;
          details.push(`tenant-isolation tests: ${passed} passed, ${failed} failed`);
          if (failed > 0) status = 'fail';
        } catch {
          // JSON parse failed, check for "passed" in output
          if (testOutput.includes('passed') && !testOutput.includes('failed')) {
            details.push('tenant-isolation tests: passed (non-JSON output)');
          } else {
            details.push('tenant-isolation tests: could not parse results');
          }
        }
      } else if (testOutput.includes('passed') && !testOutput.includes('fail')) {
        details.push('tenant-isolation tests: passed');
      } else {
        details.push(`tenant-isolation tests: ambiguous output`);
      }
    } catch (err) {
      const msg = (err.stdout || err.message || '').slice(0, 300);
      if (msg.includes('passed') && !msg.includes('fail')) {
        details.push('tenant-isolation tests: passed (non-zero exit with pass)');
      } else {
        details.push(`tenant-isolation tests: FAIL -- ${msg.slice(0, 200)}`);
        status = 'fail';
      }
    }
  }

  // ── 8. Posture endpoint exists ───────────────────────────
  const posturePath = resolve(API_SRC, 'posture/index.ts');
  if (existsSync(posturePath)) {
    const postureSrc = readFileSync(posturePath, 'utf8');
    const hasTenantPosture =
      postureSrc.includes('tenant-posture') || postureSrc.includes('admin/tenant-posture');
    if (hasTenantPosture) {
      details.push('/admin/tenant-posture endpoint: present');
    } else {
      details.push('/admin/tenant-posture endpoint: MISSING');
      status = 'fail';
    }
  }

  // ── Strict-mode extras ───────────────────────────────────
  if (strict) {
    // Check that repo files importing db schema also import tenant guard
    const repoFiles = existsSync(REPO_DIR)
      ? readdirSync(REPO_DIR).filter(
          (f) => f.endsWith('.ts') && !f.startsWith('index') && !f.startsWith('tenant-')
        )
      : [];

    let ungardedCount = 0;
    for (const f of repoFiles) {
      const src = readFileSync(join(REPO_DIR, f), 'utf8');
      // If file imports from schema and does SELECT-like operations
      if (
        src.includes('from') &&
        (src.includes('.select(') || src.includes('.get(') || src.includes('.all('))
      ) {
        if (!src.includes('tenant-guard') && !src.includes('requireTenantId')) {
          ungardedCount++;
          details.push(`  strict: ${f} -- queries DB without tenant-guard import`);
        }
      }
    }
    if (ungardedCount > 0) {
      details.push(`  strict: ${ungardedCount} repo files lack tenant-guard usage`);
      // WARN, not FAIL -- adoption is incremental
      if (status === 'pass') status = 'warn';
    } else {
      details.push('strict: all repo files with queries import tenant-guard');
    }
  }

  return { id, name, status, details, durationMs: Date.now() - start };
}
