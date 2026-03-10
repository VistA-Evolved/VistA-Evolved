#!/usr/bin/env node
/**
 * Phase 277 -- VistA Container Modernization QA Gate
 *
 * Validates that docker-compose files meet modernization standards:
 * healthcheck, resource limits, named volumes.
 *
 * Usage:
 *   node scripts/qa-gates/vista-container-gate.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();

const checks = [];

function check(name, pass, detail) {
  checks.push({ name, pass, detail });
}

/* ------------------------------------------------------------------ */
/* Dev Sandbox                                                         */
/* ------------------------------------------------------------------ */

const devCompose = join(ROOT, 'services/vista/docker-compose.yml');
let devContent;
try {
  devContent = readFileSync(devCompose, 'utf-8');
} catch {
  check('dev-compose-exists', false, 'services/vista/docker-compose.yml not found');
  devContent = '';
}

if (devContent) {
  check('dev-healthcheck', devContent.includes('healthcheck'), 'Dev sandbox has healthcheck');
  check(
    'dev-resource-limits',
    devContent.includes('limits') && devContent.includes('memory'),
    'Dev sandbox has resource limits'
  );
  check(
    'dev-named-volume',
    devContent.includes('volumes:') && devContent.includes('vista-globals'),
    'Dev sandbox has named volume for persistence'
  );
}

/* ------------------------------------------------------------------ */
/* Distro Lane                                                         */
/* ------------------------------------------------------------------ */

const distroCompose = join(ROOT, 'services/vista-distro/docker-compose.yml');
let distroContent;
try {
  distroContent = readFileSync(distroCompose, 'utf-8');
} catch {
  check('distro-compose-exists', false, 'services/vista-distro/docker-compose.yml not found');
  distroContent = '';
}

if (distroContent) {
  check('distro-healthcheck', distroContent.includes('healthcheck'), 'Distro lane has healthcheck');
  check(
    'distro-resource-limits',
    distroContent.includes('limits') && distroContent.includes('memory'),
    'Distro lane has resource limits'
  );
  check(
    'distro-no-baked-creds',
    !distroContent.includes('PROV123'),
    'No baked credentials in distro compose'
  );
}

/* ------------------------------------------------------------------ */
/* Output                                                              */
/* ------------------------------------------------------------------ */

const passed = checks.filter((c) => c.pass).length;
const failed = checks.filter((c) => !c.pass).length;

const report = {
  generatedAt: new Date().toISOString(),
  gate: 'vista-container-modernization',
  checks,
  summary: { passed, failed, total: checks.length },
};

const artifactDir = join(ROOT, 'artifacts');
mkdirSync(artifactDir, { recursive: true });
writeFileSync(join(artifactDir, 'vista-container-gate.json'), JSON.stringify(report, null, 2));

console.log(`\n=== VistA Container Modernization Gate (Phase 277) ===\n`);
for (const c of checks) {
  console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.name}: ${c.detail}`);
}
console.log(`\n  Total: ${passed} pass, ${failed} fail`);
console.log(`  Output: artifacts/vista-container-gate.json\n`);

process.exit(failed > 0 ? 1 : 0);
