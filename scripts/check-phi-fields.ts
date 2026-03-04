#!/usr/bin/env node
/**
 * Phase 48 — PHI Field Blocklist Lint Gate
 *
 * Scans all .ts source files for log calls that pass blocked field names
 * (PHI/PII/credentials) directly as object keys.
 *
 * This catches patterns like:
 *   log.info("msg", { ssn: patient.ssn })
 *   log.error("fail", { password: pwd })
 *
 * Usage:
 *   npx tsx scripts/check-phi-fields.ts
 *
 * Exit codes:
 *   0 = no violations
 *   1 = violations found
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, relative, extname, dirname } from 'path';

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, 'apps', 'api', 'src');
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'test', 'tests']);

/* ------------------------------------------------------------------ */
/* Load blocklist from phi-redaction.ts dynamically                     */
/* ------------------------------------------------------------------ */

// We duplicate the blocklist here to avoid import issues in tsx scripts
// These must stay in sync with apps/api/src/lib/phi-redaction.ts
const BLOCKED_FIELDS = new Set([
  // Credentials
  'accesscode',
  'verifycode',
  'password',
  'secret',
  'token',
  'sessiontoken',
  'avplain',
  'access_code',
  'verify_code',
  'authorization',
  'cookie',
  'set-cookie',
  'x-service-key',
  'api_key',
  'apikey',
  // PHI
  'ssn',
  'socialsecuritynumber',
  'social_security_number',
  'dob',
  'dateofbirth',
  'date_of_birth',
  'birthdate',
  'notetext',
  'notecontent',
  'problemtext',
  'patientname',
  'patient_name',
  'membername',
  'member_name',
  'subscribername',
  'subscriber_name',
  'memberid',
  'member_id',
  'subscriberid',
  'subscriber_id',
  'insuranceid',
  'insurance_id',
  'policyid',
  'policy_id',
  'medicarenum',
  'medicaidnum',
  'address',
  'streetaddress',
  'street_address',
  'phonenumber',
  'phone_number',
  'phone',
  'email',
  'emailaddress',
  'email_address',
]);

/* ------------------------------------------------------------------ */
/* Scan                                                                */
/* ------------------------------------------------------------------ */

function walkDir(dir: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory() && !SKIP_DIRS.has(entry)) {
      files.push(...walkDir(fullPath));
    } else if (stat.isFile() && extname(entry) === '.ts') {
      files.push(fullPath);
    }
  }
  return files;
}

interface Violation {
  file: string;
  line: number;
  field: string;
  snippet: string;
}

// Pattern: log.info("msg", { someField: ... }) or log.warn/error/debug etc
// We look for object keys in the 2nd argument of log calls
const LOG_CALL_PATTERN = /\blog\.(trace|debug|info|warn|error|fatal)\s*\([^)]*\{([^}]+)\}/g;

function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relPath = relative(ROOT, filePath).replace(/\\/g, '/');

  // Skip phi-redaction.ts itself (it defines the blocklist)
  if (relPath.includes('phi-redaction.ts')) return violations;
  // Skip test files
  if (relPath.includes('.test.') || relPath.includes('.spec.')) return violations;
  // Skip the check script itself
  if (relPath.includes('check-phi-fields')) return violations;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Quick check: does this line have a log call with an object literal?
    if (!line.match(/\blog\.(trace|debug|info|warn|error|fatal)\s*\(/)) continue;

    // Extract potential object keys from the line and next few lines
    const context = lines.slice(i, Math.min(i + 5, lines.length)).join(' ');

    // Find all keys in object literals after log calls
    const keyPattern = /\b(\w+)\s*:/g;
    let keyMatch: RegExpExecArray | null;
    while ((keyMatch = keyPattern.exec(context)) !== null) {
      const fieldName = keyMatch[1].toLowerCase();
      if (BLOCKED_FIELDS.has(fieldName)) {
        violations.push({
          file: relPath,
          line: i + 1,
          field: keyMatch[1],
          snippet: line.trim().slice(0, 120),
        });
      }
    }
  }

  return violations;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const sourceFiles = walkDir(SRC_DIR);
const allViolations: Violation[] = [];

for (const f of sourceFiles) {
  allViolations.push(...scanFile(f));
}

console.log('\n=== PHI Field Blocklist Check (Phase 48) ===\n');

if (allViolations.length === 0) {
  console.log(`  [PASS] No blocked PHI/credential fields in ${sourceFiles.length} source files`);
} else {
  console.log(`  [FAIL] ${allViolations.length} violations in ${sourceFiles.length} files:`);
  for (const v of allViolations.slice(0, 20)) {
    console.log(`    ${v.file}:${v.line} — field "${v.field}"`);
    console.log(`      ${v.snippet}`);
  }
  if (allViolations.length > 20) {
    console.log(`    ... and ${allViolations.length - 20} more`);
  }
}

console.log(`\nScanned: ${sourceFiles.length} files | Violations: ${allViolations.length}`);

// Evidence output
if (process.env.EVIDENCE_OUTPUT) {
  mkdirSync(dirname(process.env.EVIDENCE_OUTPUT), { recursive: true });
  writeFileSync(
    process.env.EVIDENCE_OUTPUT,
    JSON.stringify(
      {
        gate: 'phi-fields',
        passed: allViolations.length === 0,
        filesScanned: sourceFiles.length,
        violationCount: allViolations.length,
        violations: allViolations.slice(0, 50),
      },
      null,
      2
    )
  );
}

process.exit(allViolations.length > 0 ? 1 : 0);
