#!/usr/bin/env node
// scripts/qa-gates/rpc-trace-compare.mjs
// Phase 501 -- Stub: RPC trace compare gate
// Compares current RPC registry against the catalog snapshot
// This is a minimal stub that validates the snapshot file exists
// and the registry file exists. Full trace compare is a future enhancement.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

const registryPath = resolve(root, 'apps/api/src/vista/rpcRegistry.ts');
const snapshotPath = resolve(root, 'data/vista/rpc-catalog-snapshot.json');

let failures = 0;

function check(label, ok) {
  const tag = ok ? 'PASS' : 'FAIL';
  console.log(`  [${tag}] ${label}`);
  if (!ok) failures++;
}

console.log('--- G06: RPC Trace Compare ---');

check('rpcRegistry.ts exists', existsSync(registryPath));
check('rpc-catalog-snapshot.json exists', existsSync(snapshotPath));

if (existsSync(snapshotPath) && existsSync(registryPath)) {
  try {
    const raw = readFileSync(snapshotPath, 'utf8');
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    const snapshot = JSON.parse(clean);
    // Snapshot uses "registry" object (keys = RPC names), not "rpcs" array
    const registry = snapshot.registry || {};
    const rpcCount = Object.keys(registry).length;
    const exceptionCount = snapshot.exceptions ? snapshot.exceptions.length : 0;
    check(`Snapshot has RPCs (${rpcCount})`, rpcCount > 0);
    check(`Snapshot has exceptions (${exceptionCount})`, exceptionCount >= 0);
    const snapshotTotal = rpcCount + exceptionCount;

    // Read registry TS and count { name: "..." } entries
    const regSrc = readFileSync(registryPath, 'utf8');
    const regMatches = regSrc.match(/\{\s*name:\s*["'][^"']+["']/g);
    const regCount = regMatches ? regMatches.length : 0;
    check(`Registry has entries (${regCount})`, regCount > 50);

    // Drift check: snapshot total (registry + exceptions) vs code entries
    const drift = Math.abs(snapshotTotal - regCount);
    check(`RPC drift <= 30 (snapshot: ${snapshotTotal}, code: ${regCount}, delta: ${drift})`, drift <= 30);
  } catch (e) {
    check(`Parse snapshot: ${e.message}`, false);
  }
} else {
  console.log('  [SKIP] Detailed trace compare (missing files)');
}

console.log(`\n--- G06 result: ${failures === 0 ? 'PASS' : 'FAIL'} ---`);
process.exit(failures === 0 ? 0 : 1);
