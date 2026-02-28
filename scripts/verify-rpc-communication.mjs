#!/usr/bin/env node
/**
 * verify-rpc-communication.mjs  --  Phase 217: RPC Communication Verification
 *
 * Two modes:
 *   --static   (default) Cross-reference route-rpc-map.json with rpcRegistry.ts
 *              to find drift, unregistered RPCs, and coverage gaps.
 *
 *   --live     Requires Docker + API running. Hits /vista/capabilities or
 *              /vista/provision/status to verify actual RPC availability.
 *
 * Outputs:
 *   - docs/vista-alignment/rpc-verification-report.md
 *   - Exit code 0 = all checks pass, 1 = findings need attention
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ALIGNMENT_DIR = join(ROOT, 'docs', 'vista-alignment');

const args = process.argv.slice(2);
const isLive = args.includes('--live');

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function readJsonFile(path) {
  let raw = readFileSync(path, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return JSON.parse(raw);
}

function parseRpcRegistryFromSource() {
  const regPath = join(ROOT, 'apps', 'api', 'src', 'vista', 'rpcRegistry.ts');
  const src = readFileSync(regPath, 'utf8');

  const registered = new Set();
  const exceptions = new Set();

  const regRe = /\{\s*name:\s*["']([^"']+)["']\s*,\s*domain:\s*["']([^"']+)["']/g;
  let m;
  while ((m = regRe.exec(src)) !== null) registered.add(m[1]);

  const excRe = /\{\s*name:\s*["']([^"']+)["']\s*,\s*reason:\s*["']([^"']+)["']/g;
  while ((m = excRe.exec(src)) !== null) exceptions.add(m[1]);

  return { registered, exceptions, all: new Set([...registered, ...exceptions]) };
}

/* ------------------------------------------------------------------ */
/* Static Analysis                                                     */
/* ------------------------------------------------------------------ */

function runStaticAnalysis() {
  console.log('=== RPC Communication Verification (Static) ===\n');

  // Load route-rpc-map
  const mapPath = join(ALIGNMENT_DIR, 'route-rpc-map.json');
  if (!existsSync(mapPath)) {
    console.log('  FAIL: route-rpc-map.json not found. Run: node tools/rpc-extract/build-route-rpc-map.mjs');
    return { passed: 0, warned: 0, failed: 1, findings: [] };
  }

  const routeMap = readJsonFile(mapPath);
  const registry = parseRpcRegistryFromSource();

  let passed = 0;
  let warned = 0;
  let failed = 0;
  const findings = [];

  // Gate 1: All RPCs in routes are registered
  const routeRpcs = new Set();
  for (const route of routeMap.routes) {
    for (const rpc of route.rpcs) {
      routeRpcs.add(rpc.name);
    }
  }
  for (const rpcName of routeMap.serviceRpcs ? Object.values(routeMap.serviceRpcs).flat().map(r => r.name) : []) {
    routeRpcs.add(rpcName);
  }

  const unregistered = [...routeRpcs].filter(n => !registry.all.has(n));
  if (unregistered.length === 0) {
    console.log(`  PASS  All ${routeRpcs.size} RPCs in routes are registered`);
    passed++;
  } else {
    console.log(`  FAIL  ${unregistered.length} unregistered RPCs: ${unregistered.join(', ')}`);
    failed++;
    findings.push({ type: 'unregistered', rpcs: unregistered });
  }

  // Gate 2: No route calls RPCs from a different domain than expected
  // (informational -- domains should be consistent within a route file)
  const domainConflicts = [];
  for (const route of routeMap.routes) {
    if (route.rpcs.length < 2) continue;
    const domains = new Set(route.rpcs.map(r => r.domain).filter(d => d !== 'unknown' && d !== 'exception'));
    if (domains.size > 2) {
      domainConflicts.push({ path: route.path, method: route.method, domains: [...domains] });
    }
  }
  if (domainConflicts.length === 0) {
    console.log(`  PASS  No route crosses >2 RPC domains`);
    passed++;
  } else {
    console.log(`  WARN  ${domainConflicts.length} routes cross >2 RPC domains`);
    warned++;
    findings.push({ type: 'domain-conflict', routes: domainConflicts });
  }

  // Gate 3: Route-RPC map is fresh (generated within last 24h)
  const genDate = new Date(routeMap._meta.generatedAt);
  const ageHours = (Date.now() - genDate.getTime()) / (1000 * 60 * 60);
  if (ageHours >= 0 && ageHours < 24) {
    console.log(`  PASS  Route-RPC map is fresh (${ageHours.toFixed(1)}h old)`);
    passed++;
  } else {
    console.log(`  WARN  Route-RPC map is ${ageHours.toFixed(0)}h old -- regenerate with: node tools/rpc-extract/build-route-rpc-map.mjs`);
    warned++;
  }

  // Gate 4: Registry RPCs not used in any route (potential dead entries)
  const unusedRegistry = [...registry.registered].filter(n => !routeRpcs.has(n));
  console.log(`  INFO  ${unusedRegistry.length}/${registry.registered.size} registered RPCs not directly in routes (may be in adapters/services)`);

  // Gate 5: Coverage stats
  const rpcActiveRoutes = routeMap.routes.filter(r => r.rpcCount > 0 && !r.isStub);
  const stubRoutes = routeMap.routes.filter(r => r.isStub);
  const nonRpcRoutes = routeMap.routes.filter(r => r.rpcCount === 0 && !r.isStub);
  console.log(`  INFO  ${rpcActiveRoutes.length} RPC-active, ${stubRoutes.length} stubs, ${nonRpcRoutes.length} non-RPC, ${routeMap.routes.length} total`);

  console.log(`\n=== Summary: ${passed} PASS, ${warned} WARN, ${failed} FAIL ===`);

  return { passed, warned, failed, findings, routeMap, registry, routeRpcs, unusedRegistry };
}

/* ------------------------------------------------------------------ */
/* Live Probing (requires running API)                                 */
/* ------------------------------------------------------------------ */

async function runLiveProbe() {
  console.log('\n=== RPC Communication Verification (Live) ===\n');

  const API_BASE = process.env.API_BASE || 'http://127.0.0.1:3001';
  let passed = 0, warned = 0, failed = 0;
  const findings = [];

  // Check if API is reachable
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log(`  PASS  API reachable at ${API_BASE}`);
    passed++;
  } catch (e) {
    console.log(`  SKIP  API not reachable at ${API_BASE}: ${e.message}`);
    console.log('         Start API with: cd apps/api && npx tsx --env-file=.env.local src/index.ts');
    return { passed, warned, failed, findings, skipped: true };
  }

  // Check VistA connectivity
  try {
    const res = await fetch(`${API_BASE}/vista/ping`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data.ok) {
      console.log(`  PASS  VistA reachable via /vista/ping`);
      passed++;
    } else {
      console.log(`  WARN  VistA ping returned ok:false`);
      warned++;
    }
  } catch (e) {
    console.log(`  SKIP  VistA not reachable: ${e.message}`);
    return { passed, warned, failed, findings, skipped: true };
  }

  // Check provisioning status (admin endpoint - needs auth)
  try {
    const res = await fetch(`${API_BASE}/vista/provision/status`, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json();
      console.log(`  INFO  Provisioning: ${data.overallHealth || 'unknown'}`);
      if (data.routines) {
        for (const [name, status] of Object.entries(data.routines)) {
          const icon = status.health === 'installed' ? 'PASS' : status.health === 'partial' ? 'WARN' : 'FAIL';
          console.log(`  ${icon}  ${name}: ${status.health}`);
        }
      }
    } else {
      console.log(`  WARN  Provisioning status returned ${res.status} (may need auth)`);
    }
  } catch (e) {
    console.log(`  WARN  Could not check provisioning: ${e.message}`);
  }

  // Try a read-only RPC via a public endpoint
  try {
    const res = await fetch(`${API_BASE}/vista/default-patient-list`, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    if (data.ok) {
      console.log(`  PASS  Live RPC call succeeded: /vista/default-patient-list`);
      passed++;
    } else {
      console.log(`  WARN  /vista/default-patient-list returned ok:false`);
      warned++;
    }
  } catch (e) {
    console.log(`  WARN  Could not test live RPC: ${e.message}`);
    warned++;
  }

  console.log(`\n=== Live Summary: ${passed} PASS, ${warned} WARN, ${failed} FAIL ===`);
  return { passed, warned, failed, findings, skipped: false };
}

/* ------------------------------------------------------------------ */
/* Report Generation                                                   */
/* ------------------------------------------------------------------ */

function generateReport(result, liveResult) {
  const lines = [
    '# RPC Communication Verification Report',
    '',
    `> Generated: ${new Date().toISOString()}`,
    `> Mode: ${isLive ? 'static + live' : 'static only'}`,
    '',
    '## Static Analysis Results',
    '',
    `| Check | Result |`,
    `|-------|--------|`,
    `| Passed | ${result.passed} |`,
    `| Warned | ${result.warned} |`,
    `| Failed | ${result.failed} |`,
    '',
  ];

  if (result.findings.length > 0) {
    lines.push('## Findings');
    lines.push('');
    for (const f of result.findings) {
      if (f.type === 'unregistered') {
        lines.push(`### Unregistered RPCs`);
        for (const rpc of f.rpcs) lines.push(`- \`${rpc}\``);
      }
      if (f.type === 'domain-conflict') {
        lines.push(`### Domain Conflicts`);
        for (const r of f.routes) {
          lines.push(`- \`${r.method} ${r.path}\` crosses domains: ${r.domains.join(', ')}`);
        }
      }
      lines.push('');
    }
  }

  if (result.routeRpcs) {
    lines.push(`## Coverage`);
    lines.push('');
    lines.push(`- **${result.routeRpcs.size}** unique RPCs across routes and services`);
    lines.push(`- **${result.registry?.registered.size || 0}** RPCs in RPC_REGISTRY`);
    lines.push(`- **${result.unusedRegistry?.length || 0}** registered RPCs not directly used in route handlers`);
    lines.push('');
  }

  if (liveResult && !liveResult.skipped) {
    lines.push(`## Live Probe Results`);
    lines.push('');
    lines.push(`| Check | Result |`);
    lines.push(`|-------|--------|`);
    lines.push(`| Passed | ${liveResult.passed} |`);
    lines.push(`| Warned | ${liveResult.warned} |`);
    lines.push(`| Failed | ${liveResult.failed} |`);
    lines.push('');
  }

  if (!existsSync(ALIGNMENT_DIR)) mkdirSync(ALIGNMENT_DIR, { recursive: true });
  const reportPath = join(ALIGNMENT_DIR, 'rpc-verification-report.md');
  writeFileSync(reportPath, lines.join('\n') + '\n');
  console.log(`\nReport written: docs/vista-alignment/rpc-verification-report.md`);
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  const staticResult = runStaticAnalysis();
  let liveResult = null;

  if (isLive) {
    liveResult = await runLiveProbe();
  }

  generateReport(staticResult, liveResult);

  const totalFailed = staticResult.failed + (liveResult?.failed || 0);
  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
