#!/usr/bin/env node
/**
 * scripts/upstream/emit-release-manifest.mjs
 *
 * Phase 449 (W29-P3). Generates a VistA release manifest from current repo state.
 * Reads: vendor/worldvista/LOCK.json, apps/api/src/vista/rpcRegistry.ts, services/vista/*.m
 * Writes: artifacts/vista-release-manifest.json
 *
 * Works without Docker; does not require a running VistA instance.
 *
 * Usage:
 *   node scripts/upstream/emit-release-manifest.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const LOCK_FILE = join(ROOT, 'vendor', 'worldvista', 'LOCK.json');
const RPC_REGISTRY = join(ROOT, 'apps', 'api', 'src', 'vista', 'rpcRegistry.ts');
const ROUTINES_DIR = join(ROOT, 'services', 'vista');
const ARTIFACTS_DIR = join(ROOT, 'artifacts');
const OUTPUT_FILE = join(ARTIFACTS_DIR, 'vista-release-manifest.json');

console.log('=== VistA Release Manifest Generator ===\n');

// ── Build SHA ──────────────────────────────────────────────────────
let buildSha = 'unknown';
try {
  buildSha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
} catch {
  console.warn('WARN: Could not get git SHA');
}

// ── Upstream SHAs from LOCK.json ───────────────────────────────────
const upstreamShas = {};
if (existsSync(LOCK_FILE)) {
  const raw = readFileSync(LOCK_FILE, 'utf-8');
  const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const lock = JSON.parse(clean);
  for (const repo of lock.repos || []) {
    const name = repo.repo.split('/').pop();
    upstreamShas[name] = repo.sha === 'not-yet-synced' ? null : repo.sha;
  }
} else {
  console.warn('WARN: vendor/worldvista/LOCK.json not found');
}

// ── RPC counts from rpcRegistry.ts ─────────────────────────────────
let rpcCount = 0;
let rpcExceptionCount = 0;
if (existsSync(RPC_REGISTRY)) {
  const regSrc = readFileSync(RPC_REGISTRY, 'utf-8');
  // RPC_REGISTRY is an array of { name: "...", ... }
  // Count all `name: "..."` entries within the RPC_REGISTRY array
  const regMatch = regSrc.match(/export\s+const\s+RPC_REGISTRY[\s\S]*?=\s*\[([\s\S]*?)\];\s/);
  if (regMatch) {
    const entries = regMatch[1].match(/name:\s*["'][^"']+["']/g);
    rpcCount = entries ? entries.length : 0;
  }
  // RPC_EXCEPTIONS is also an array or Record
  const excMatch = regSrc.match(
    /export\s+const\s+RPC_EXCEPTIONS[\s\S]*?=\s*[\[{]([\s\S]*?)[\]}]\s*(?:as\s+const\s*)?;/
  );
  if (excMatch) {
    const entries =
      excMatch[1].match(/name:\s*["'][^"']+["']/g) || excMatch[1].match(/"[^"]+"\s*:/g);
    rpcExceptionCount = entries ? entries.length : 0;
  }
} else {
  console.warn('WARN: rpcRegistry.ts not found');
}

// ── Custom routines ────────────────────────────────────────────────
let customRoutines = [];
if (existsSync(ROUTINES_DIR)) {
  customRoutines = readdirSync(ROUTINES_DIR)
    .filter((f) => f.endsWith('.m'))
    .sort();
}

// ── Image definitions (matches build-images.ps1) ───────────────────
const images = [
  { name: 'vista-evolved/api', tag: 'dev', digest: null, dockerfile: 'apps/api/Dockerfile' },
  { name: 'vista-evolved/web', tag: 'dev', digest: null, dockerfile: 'apps/web/Dockerfile' },
  { name: 'vista-evolved/portal', tag: 'dev', digest: null, dockerfile: 'apps/portal/Dockerfile' },
];

// ── Assemble manifest ──────────────────────────────────────────────
const manifest = {
  schemaVersion: '1.0.0',
  buildSha,
  buildTime: new Date().toISOString(),
  builderVersion: 'emit-release-manifest.mjs v1',
  upstreamShas,
  rpcCount,
  rpcExceptionCount,
  routineCount: customRoutines.length,
  images,
  vistaDocker: {
    image: 'worldvista/worldvista-ehr:latest',
    digest: null,
  },
  customRoutines,
  patchTrainLevel: null,
};

// ── Write output ───────────────────────────────────────────────────
if (!existsSync(ARTIFACTS_DIR)) {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
console.log(`Build SHA:        ${buildSha}`);
console.log(`Upstream repos:   ${Object.keys(upstreamShas).length}`);
console.log(`RPCs (registry):  ${rpcCount}`);
console.log(`RPCs (exceptions):${rpcExceptionCount}`);
console.log(`Custom routines:  ${customRoutines.length}`);
console.log(`Images:           ${images.length}`);
console.log(`\nManifest written: ${OUTPUT_FILE}`);
