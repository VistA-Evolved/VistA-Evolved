#!/usr/bin/env node
/**
 * scripts/sbom/generate-sbom.mjs
 *
 * Phase 454 (W29-P8). Generates a lightweight SBOM from:
 *   - Root package.json + pnpm-lock.yaml (npm deps)
 *   - vendor/worldvista/LOCK.json (upstream components)
 *   - docs/vista/component-inventory.json (OSS components)
 *
 * Output: artifacts/sbom.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const ROOT = process.cwd();
const ARTIFACTS = join(ROOT, 'artifacts');
const OUTPUT = join(ARTIFACTS, 'sbom.json');

console.log('=== SBOM Generator ===\n');

// ── npm packages (from workspace package.json files) ────────────────
const pkgFiles = [];
const scanDirs = ['.', 'apps/api', 'apps/web', 'apps/portal'];
for (const d of scanDirs) {
  const p = join(ROOT, d, 'package.json');
  if (existsSync(p)) pkgFiles.push({ dir: d, path: p });
}

const npmPackages = [];
for (const pf of pkgFiles) {
  const raw = readFileSync(pf.path, 'utf-8');
  const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const pkg = JSON.parse(clean);
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };
  for (const [name, version] of Object.entries(allDeps)) {
    npmPackages.push({
      type: 'npm',
      workspace: pf.dir,
      name,
      version,
      license: null, // Would need node_modules scan for actual license
    });
  }
}

// ── Vendor components from LOCK.json ────────────────────────────────
const vendorComponents = [];
const lockFile = join(ROOT, 'vendor', 'worldvista', 'LOCK.json');
if (existsSync(lockFile)) {
  const raw = readFileSync(lockFile, 'utf-8');
  const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const lock = JSON.parse(clean);
  for (const repo of lock.repos || []) {
    vendorComponents.push({
      type: 'vendor',
      name: repo.repo,
      sha: repo.sha,
      description: repo.description,
      licensePath: repo.licensePath || null,
    });
  }
}

// ── OSS component inventory ─────────────────────────────────────────
const inventoryFile = join(ROOT, 'docs', 'vista', 'component-inventory.json');
const ossComponents = [];
if (existsSync(inventoryFile)) {
  const raw = readFileSync(inventoryFile, 'utf-8');
  const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const inv = JSON.parse(clean);
  for (const comp of inv.components || []) {
    ossComponents.push({
      type: 'oss-component',
      id: comp.id,
      name: comp.name,
      repo: comp.repo,
      status: comp.status,
      integration: comp.integration,
    });
  }
}

// ── Assemble SBOM ──────────────────────────────────────────────────
const sbom = {
  bomFormat: 'VistA-Evolved-SBOM',
  specVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  generatedBy: 'generate-sbom.mjs',
  summary: {
    npmPackages: npmPackages.length,
    vendorComponents: vendorComponents.length,
    ossComponents: ossComponents.length,
    total: npmPackages.length + vendorComponents.length + ossComponents.length,
  },
  npmPackages,
  vendorComponents,
  ossComponents,
};

if (!existsSync(ARTIFACTS)) mkdirSync(ARTIFACTS, { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(sbom, null, 2));

console.log(`npm packages:     ${npmPackages.length}`);
console.log(`Vendor components: ${vendorComponents.length}`);
console.log(`OSS components:   ${ossComponents.length}`);
console.log(`\nSBOM written: ${OUTPUT}`);
