/**
 * Contract Validator -- Phase 26
 *
 * Validates portal-contract-v1.yaml:
 *   1. Parses as valid YAML
 *   2. Contains required top-level keys (version, rules, modules, infrastructure)
 *   3. Contains all required modules
 *   4. Each module has: name, status, phase
 *   5. Rules contain non-negotiable guardrails
 *
 * Also validates portal-capability-matrix.md:
 *   - Contains required module headings
 *
 * Usage: npx tsx scripts/contract-validate-portal.ts
 * Exit 0 = all checks pass, Exit 1 = failures found
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------- Minimal YAML parser (no deps) ----------
// Handles up to 3 levels of nesting -- enough for the contract file.
// Level 0: top-level keys (no indent)
// Level 1: second-level keys (2-space indent)
// Level 2: third-level keys (4-space indent)

function parseSimpleYaml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let l0Key = '';
  let l0Block: Record<string, unknown> = {};
  let l1Key = '';
  let l1Block: Record<string, unknown> = {};
  let inL0 = false;
  let inL1 = false;

  function flushL1() {
    if (inL1 && l1Key) {
      l0Block[l1Key] = Object.keys(l1Block).length > 0 ? { ...l1Block } : true;
      l1Block = {};
      inL1 = false;
    }
  }

  function flushL0() {
    flushL1();
    if (inL0 && l0Key) {
      result[l0Key] = Object.keys(l0Block).length > 0 ? { ...l0Block } : true;
      l0Block = {};
      inL0 = false;
    }
  }

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '');

    // Skip comments and blank lines
    if (/^\s*#/.test(line) || /^\s*$/.test(line)) continue;
    // Skip YAML list items (we only care about map keys)
    if (/^\s*-\s/.test(line)) continue;

    // Level 0 -- top-level key (no indent): "key: value" or "key:"
    const l0Match = line.match(/^([a-z_]+):\s*(.*)/);
    if (l0Match) {
      flushL0();
      const [, key, value] = l0Match;
      if (value && value !== '' && !value.startsWith('>')) {
        result[key] = value.replace(/^["']|["']$/g, '');
      } else {
        l0Key = key;
        l0Block = {};
        inL0 = true;
      }
      continue;
    }

    // Level 1 -- second-level key (2-space indent): "  key: value" or "  key:"
    if (inL0) {
      const l1Match = line.match(/^  ([a-z_]+):\s*(.*)/);
      if (l1Match) {
        flushL1();
        const [, key, value] = l1Match;
        if (value && value !== '' && !value.startsWith('>')) {
          l0Block[key] = value.replace(/^["']|["']$/g, '');
        } else {
          l1Key = key;
          l1Block = {};
          inL1 = true;
        }
        continue;
      }
    }

    // Level 2 -- third-level key (4-space indent): "    key: value"
    if (inL1) {
      const l2Match = line.match(/^    ([a-z_]+):\s*(.*)/);
      if (l2Match) {
        const [, key, value] = l2Match;
        l1Block[key] = value ? value.replace(/^["']|["']$/g, '') : true;
        continue;
      }
    }
  }

  flushL0();
  return result;
}

// ---------- Checks ----------

interface CheckResult {
  name: string;
  ok: boolean;
  detail?: string;
}

const results: CheckResult[] = [];

function check(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
}

// ---------- Main ----------

const root = join(import.meta.dirname || __dirname, '..');
const contractDir = join(root, 'docs', 'contracts', 'portal');

// 1. Parse portal-contract-v1.yaml
let contractText = '';
try {
  contractText = readFileSync(join(contractDir, 'portal-contract-v1.yaml'), 'utf-8');
  check('YAML file readable', true);
} catch (e: any) {
  check('YAML file readable', false, e.message);
}

let parsed: Record<string, unknown> = {};
if (contractText) {
  try {
    parsed = parseSimpleYaml(contractText);
    check('YAML parses successfully', Object.keys(parsed).length > 0);
  } catch (e: any) {
    check('YAML parses successfully', false, e.message);
  }
}

// 2. Required top-level keys
const requiredTopKeys = ['version', 'rules', 'modules', 'infrastructure'];
for (const key of requiredTopKeys) {
  check(`Top-level key: ${key}`, key in parsed, key in parsed ? undefined : `Missing key: ${key}`);
}

// 3. Required modules
const requiredModules = [
  'auth',
  'dashboard',
  'health_records',
  'medications',
  'messages',
  'appointments',
  'telehealth',
  'profile',
];

const modules = (parsed.modules || {}) as Record<string, unknown>;
for (const mod of requiredModules) {
  check(`Module: ${mod}`, mod in modules, mod in modules ? undefined : `Missing module: ${mod}`);
}

// 4. Required rules
const requiredRules = [
  'vista_first',
  'no_va_terminology',
  'no_parallel_engine',
  'phi_safety',
  'license_guardrails',
];

const rules = (parsed.rules || {}) as Record<string, unknown>;
for (const rule of requiredRules) {
  check(`Rule: ${rule}`, rule in rules, rule in rules ? undefined : `Missing rule: ${rule}`);
}

// 5. Each module has name, status, phase (check raw text for these)
for (const mod of requiredModules) {
  if (mod in modules) {
    const modBlock = modules[mod] as Record<string, unknown>;
    check(
      `Module ${mod} has name`,
      'name' in modBlock,
      'name' in modBlock ? undefined : `Module ${mod} missing 'name'`
    );
    check(
      `Module ${mod} has status`,
      'status' in modBlock,
      'status' in modBlock ? undefined : `Module ${mod} missing 'status'`
    );
    check(
      `Module ${mod} has phase`,
      'phase' in modBlock,
      'phase' in modBlock ? undefined : `Module ${mod} missing 'phase'`
    );
  }
}

// 6. Validate portal-capability-matrix.md
let matrixText = '';
try {
  matrixText = readFileSync(join(contractDir, 'portal-capability-matrix.md'), 'utf-8');
  check('Capability matrix readable', true);
} catch (e: any) {
  check('Capability matrix readable', false, e.message);
}

const requiredMatrixModules = [
  'Auth',
  'Health Records',
  'Messages',
  'Appointments',
  'Telehealth',
  'Profile',
  'Medications',
  'Dashboard',
];

for (const mod of requiredMatrixModules) {
  const pattern = new RegExp(`##\\s+.*${mod}`, 'i');
  check(
    `Matrix module: ${mod}`,
    pattern.test(matrixText),
    pattern.test(matrixText) ? undefined : `Missing module heading: ${mod}`
  );
}

// ---------- Summary ----------

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;

console.log('\n=== Portal Contract Validation ===\n');

for (const r of results) {
  const tag = r.ok ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  const detail = r.detail ? ` - ${r.detail}` : '';
  console.log(`  ${tag} ${r.name}${detail}`);
}

console.log(`\n  PASS: ${passed}  FAIL: ${failed}\n`);

if (failed > 0) {
  console.log('  CONTRACT VALIDATION FAILED\n');
  process.exit(1);
} else {
  console.log('  All contract checks passed.\n');
  process.exit(0);
}
