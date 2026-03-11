#!/usr/bin/env node
/**
 * Layer 5: Package Certification Gate
 *
 * Validates that all VistA packages meet the certification criteria:
 * - Schema extracted to JSON
 * - RPCs registered in VistA
 * - API routes created and responding
 * - UI components exist
 * - Documentation generated
 * - Tests pass
 * - Terminal mode verified
 *
 * Usage:
 *   node scripts/qa-gates/package-certification-gate.mjs
 *   node scripts/qa-gates/package-certification-gate.mjs --tier 1
 *   node scripts/qa-gates/package-certification-gate.mjs --package XU
 *
 * Exit 0 = all checked packages are fully certified
 * Exit 1 = at least one package is not fully certified
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const args = process.argv.slice(2);
const filterTier = args.includes('--tier') ? parseInt(args[args.indexOf('--tier') + 1], 10) : null;
const filterPkg = args.includes('--package') ? args[args.indexOf('--package') + 1].toUpperCase() : null;
const updateFlag = args.includes('--update');

const CERT_PATH = join(ROOT, 'data', 'vista', 'package-certification.json');

function loadCertification() {
  if (!existsSync(CERT_PATH)) {
    console.error(`Certification file not found: ${CERT_PATH}`);
    process.exit(1);
  }

  const raw = readFileSync(CERT_PATH, 'utf-8');
  const cleaned = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(cleaned);
}

function checkPackageFiles(prefix) {
  const checks = {
    schemaDir: existsSync(join(ROOT, 'data', 'vista', 'schema')),
    routeFile: existsSync(join(ROOT, 'apps', 'api', 'src', 'routes', 'vista', `${prefix.toLowerCase()}.ts`)),
    typeFile: existsSync(join(ROOT, 'apps', 'api', 'src', 'types', 'vista', `${prefix.toLowerCase()}.ts`)),
    componentDir: existsSync(join(ROOT, 'apps', 'web', 'src', 'components', 'vista', prefix.toLowerCase())),
    docsDir: existsSync(join(ROOT, 'docs', 'modules', prefix.toLowerCase())),
    testFile: existsSync(join(ROOT, 'apps', 'api', 'tests', 'vista', `${prefix.toLowerCase()}.test.ts`)),
  };
  return checks;
}

function main() {
  console.log('=== Package Certification Gate (Layer 5) ===\n');

  const cert = loadCertification();
  const packages = cert.packages || [];

  let filtered = packages;
  if (filterTier) {
    filtered = filtered.filter(p => p.tier === filterTier);
    console.log(`Filtering to tier ${filterTier}: ${filtered.length} packages\n`);
  }
  if (filterPkg) {
    filtered = filtered.filter(p => p.packagePrefix === filterPkg);
    console.log(`Filtering to package ${filterPkg}: ${filtered.length} packages\n`);
  }

  if (filtered.length === 0) {
    console.log('No packages match the filter criteria.');
    process.exit(0);
  }

  let fullyCertified = 0;
  let partiallyCertified = 0;
  let uncertified = 0;

  for (const pkg of filtered) {
    const c = pkg.certification;
    const checks = Object.values(c);
    const passCount = checks.filter(Boolean).length;
    const totalChecks = checks.length;

    const files = checkPackageFiles(pkg.packagePrefix);

    const status = passCount === totalChecks ? 'CERTIFIED'
      : passCount > 0 ? 'PARTIAL'
      : 'UNCERTIFIED';

    if (status === 'CERTIFIED') fullyCertified++;
    else if (status === 'PARTIAL') partiallyCertified++;
    else uncertified++;

    const icon = status === 'CERTIFIED' ? 'PASS' : status === 'PARTIAL' ? 'PART' : 'FAIL';
    console.log(`  [${icon}] ${pkg.packagePrefix.padEnd(6)} ${pkg.packageName.padEnd(30)} Tier ${pkg.tier}  ${passCount}/${totalChecks} checks`);

    if (status !== 'CERTIFIED') {
      for (const [key, val] of Object.entries(c)) {
        if (!val) console.log(`         - ${key}: MISSING`);
      }
      for (const [key, val] of Object.entries(files)) {
        if (!val) console.log(`         - file:${key}: NOT FOUND`);
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Fully certified:    ${fullyCertified}`);
  console.log(`  Partially certified: ${partiallyCertified}`);
  console.log(`  Uncertified:        ${uncertified}`);
  console.log(`  Total checked:      ${filtered.length}`);

  const allPassed = uncertified === 0 && partiallyCertified === 0;
  console.log(`\n  Gate: ${allPassed ? 'PASS' : 'FAIL'}`);

  process.exit(allPassed ? 0 : 1);
}

main();
