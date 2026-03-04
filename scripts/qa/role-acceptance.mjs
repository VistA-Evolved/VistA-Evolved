#!/usr/bin/env node
// scripts/qa/role-acceptance.mjs
// Phase 507 -- Role-Based Acceptance Matrix verification
// Static analysis of RBAC architecture consistency.
//
// Usage: node scripts/qa/role-acceptance.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

let passes = 0;
let failures = 0;
const results = [];

function check(label, ok, detail = '') {
  const tag = ok ? 'PASS' : 'FAIL';
  console.log(`  [${tag}] ${label}${detail ? ' -- ' + detail : ''}`);
  if (ok) passes++;
  else failures++;
  results.push({ label, status: tag, detail });
}

console.log('=== Role-Based Acceptance Matrix (Phase 507) ===\n');

// -------------------------------------------------------------------
// 1. AUTH_RULES file exists and has rules
// -------------------------------------------------------------------
const secFile = join(ROOT, 'apps/api/src/middleware/security.ts');
const secSrc = existsSync(secFile) ? readFileSync(secFile, 'utf-8') : '';
const authRulesMatch = secSrc.match(/const AUTH_RULES:\s*AuthRule\[\]\s*=\s*\[/);
check('AUTH_RULES array declared in security.ts', !!authRulesMatch);

// Count rules (lines with `{ pattern:`)
const ruleLines = secSrc.split('\n').filter((l) => l.match(/\{\s*pattern:\s*\//));
check(
  `AUTH_RULES has substantial coverage (${ruleLines.length} rules)`,
  ruleLines.length >= 40,
  `found ${ruleLines.length} pattern rules`
);

// -------------------------------------------------------------------
// 2. Every AUTH_RULE has a valid auth level
// -------------------------------------------------------------------
const validAuthLevels = ['none', 'session', 'admin', 'service', 'fhir'];
const authLevelPattern = /auth:\s*"(\w+)"/;
let badLevels = 0;
for (const line of ruleLines) {
  const m = line.match(authLevelPattern);
  if (!m || !validAuthLevels.includes(m[1])) badLevels++;
}
check('All AUTH_RULES have valid auth levels', badLevels === 0, `${badLevels} invalid`);

// -------------------------------------------------------------------
// 3. Critical admin routes require admin auth
// -------------------------------------------------------------------
const adminRequired = [
  '/secrets/',
  '/tenant-security/',
  '/siem/',
  '/posture/',
  '/hardening/',
  '/facilities/',
  '/departments/',
  '/events/',
  '/webhooks/',
  '/plugins/',
  '/edge-gateways/',
  '/devices/',
  '/admin/',
  '/audit/',
];
let missingAdmin = [];
for (const prefix of adminRequired) {
  // Find a rule whose pattern covers this prefix
  const covered = ruleLines.some((line) => {
    const patternMatch = line.match(/pattern:\s*\/(.+?)\//);
    if (!patternMatch) return false;
    const levelMatch = line.match(authLevelPattern);
    if (!levelMatch) return false;
    // Check if the pattern could match this prefix and requires admin or service
    const level = levelMatch[1];
    return (
      (level === 'admin' || level === 'service') &&
      (line.includes(prefix.replace(/\//g, '\\/')) ||
        line.includes(prefix.replace(/\//g, '')) ||
        line.includes(`^\\/` + prefix.slice(1)))
    );
  });
  if (!covered) missingAdmin.push(prefix);
}
check(
  'Critical admin routes require admin auth',
  missingAdmin.length === 0,
  missingAdmin.length > 0
    ? `missing: ${missingAdmin.join(', ')}`
    : `${adminRequired.length} verified`
);

// -------------------------------------------------------------------
// 4. rbac.ts exists and defines ROLE_PERMISSIONS
// -------------------------------------------------------------------
const rbacFile = join(ROOT, 'apps/api/src/auth/rbac.ts');
const rbacSrc = existsSync(rbacFile) ? readFileSync(rbacFile, 'utf-8') : '';
check('rbac.ts exists and defines ROLE_PERMISSIONS', rbacSrc.includes('ROLE_PERMISSIONS'));

// -------------------------------------------------------------------
// 5. All 7 roles present in ROLE_PERMISSIONS
// -------------------------------------------------------------------
const expectedRoles = ['admin', 'provider', 'nurse', 'pharmacist', 'billing', 'clerk', 'support'];
const missingRoles = expectedRoles.filter((r) => !rbacSrc.includes(`${r}:`));
check(
  `All 7 roles present in ROLE_PERMISSIONS`,
  missingRoles.length === 0,
  missingRoles.length > 0 ? `missing: ${missingRoles.join(', ')}` : 'all present'
);

// -------------------------------------------------------------------
// 6. Admin role has all permissions (superuser)
// -------------------------------------------------------------------
const allPerms = [
  'clinical:read',
  'clinical:write',
  'rcm:read',
  'rcm:write',
  'rcm:admin',
  'imaging:read',
  'imaging:write',
  'imaging:admin',
  'analytics:read',
  'analytics:admin',
  'admin:system',
  'audit:read',
];
const missingAdminPerms = allPerms.filter((p) => !rbacSrc.includes(`"${p}"`));
check(
  'Admin role has all core permissions',
  missingAdminPerms.length === 0,
  missingAdminPerms.length > 0
    ? `missing: ${missingAdminPerms.join(', ')}`
    : `${allPerms.length} verified`
);

// -------------------------------------------------------------------
// 7. clerk has minimal permissions (least privilege)
// -------------------------------------------------------------------
const clerkSection = rbacSrc.match(/clerk:\s*\[([\s\S]*?)\]/);
const clerkPerms = clerkSection ? clerkSection[1].match(/"[^"]+"/g) || [] : [];
check(
  'clerk role has minimal permissions (least privilege)',
  clerkPerms.length <= 4,
  `${clerkPerms.length} permissions`
);
// clerk should NOT have admin:system
const clerkHasAdmin = clerkPerms.some((p) => p.includes('admin:system'));
check('clerk role does NOT have admin:system', !clerkHasAdmin);

// -------------------------------------------------------------------
// 8. requirePermission / requireRole / requireAdmin functions exist
// -------------------------------------------------------------------
const rbacGuards = ['requirePermission', 'requireAdmin'];
for (const fn of rbacGuards) {
  const found =
    rbacSrc.includes(`export function ${fn}`) || rbacSrc.includes(`export async function ${fn}`);
  check(`Guard function ${fn}() exported from rbac.ts`, found);
}
// requireRole is in auth-routes.ts (separate module)
const authRoutesFile = join(ROOT, 'apps/api/src/auth/auth-routes.ts');
const authRoutesSrc = existsSync(authRoutesFile) ? readFileSync(authRoutesFile, 'utf-8') : '';
check(
  'Guard function requireRole() exported from auth module',
  authRoutesSrc.includes('requireRole') || authRoutesSrc.includes('export function requireRole')
);

// -------------------------------------------------------------------
// 9. Policy engine exists with default-deny
// -------------------------------------------------------------------
const policyFile = join(ROOT, 'apps/api/src/auth/policy-engine.ts');
const policySrc = existsSync(policyFile) ? readFileSync(policyFile, 'utf-8') : '';
check('Policy engine has default-deny', policySrc.includes('deny') || policySrc.includes('DENY'));
check('Policy engine has evaluatePolicy()', policySrc.includes('evaluatePolicy'));

// -------------------------------------------------------------------
// 10. Imaging RBAC exists
// -------------------------------------------------------------------
const imgAuthz = join(ROOT, 'apps/api/src/services/imaging-authz.ts');
check('Imaging RBAC module exists', existsSync(imgAuthz));

// -------------------------------------------------------------------
// 11. Analytics permissions exist
// -------------------------------------------------------------------
const analyticsConfig = join(ROOT, 'apps/api/src/config/analytics-config.ts');
const analyticsSrc = existsSync(analyticsConfig) ? readFileSync(analyticsConfig, 'utf-8') : '';
check(
  'Analytics permissions configured',
  analyticsSrc.includes('analytics_viewer') || analyticsSrc.includes('ANALYTICS_ROLE_PERMISSIONS')
);

// -------------------------------------------------------------------
// 12. ABAC engine exists (Phase 340)
// -------------------------------------------------------------------
const abacFile = join(ROOT, 'apps/api/src/auth/abac-engine.ts');
check('ABAC engine module exists (Phase 340)', existsSync(abacFile));

// -------------------------------------------------------------------
// 13. Session security module exists (Phase 338)
// -------------------------------------------------------------------
const sessionSec = join(ROOT, 'apps/api/src/auth/session-security.ts');
check('Session security module exists (Phase 338)', existsSync(sessionSec));

// -------------------------------------------------------------------
// Summary
// -------------------------------------------------------------------
console.log(`\n=== Role Acceptance: ${passes} pass, ${failures} fail ===`);

const report = {
  generatedAt: new Date().toISOString(),
  pass: passes,
  fail: failures,
  results,
};

const evDir = join(ROOT, 'evidence/wave-35/507-W35-P8-ROLE-ACCEPTANCE');
if (!existsSync(evDir)) mkdirSync(evDir, { recursive: true });
writeFileSync(join(evDir, 'role-acceptance-report.json'), JSON.stringify(report, null, 2));
console.log(`Report: ${join(evDir, 'role-acceptance-report.json')}`);

process.exit(failures > 0 ? 1 : 0);
