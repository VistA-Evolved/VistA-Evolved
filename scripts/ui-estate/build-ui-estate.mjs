#!/usr/bin/env node
/**
 * build-ui-estate.mjs — Phase 531 (Wave 39 P1)
 *
 * Auto-detects VistA-Evolved coverage for each UI estate surface
 * by scanning route files, page.tsx files, capabilities, and parity matrix.
 *
 * Outputs: data/ui-estate/ui-gap-report.json
 *
 * Usage:
 *   node scripts/ui-estate/build-ui-estate.mjs [--verbose]
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, resolve, relative, sep } from 'path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const verbose = process.argv.includes('--verbose');

// ── Helpers ──────────────────────────────────────────────────────────
function loadJson(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) return null;
  const raw = readFileSync(abs, 'utf8');
  // Strip BOM (BUG-064)
  const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(clean);
}

function walkDir(dir, filter) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full, filter));
    } else if (filter(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// ── 1. Scan API routes ──────────────────────────────────────────────
function scanApiRoutes() {
  const routeDirs = [
    'apps/api/src/routes',
    'apps/api/src/rcm',
    'apps/api/src/intake',
    'apps/api/src/telehealth',
    'apps/api/src/posture',
    'apps/api/src/modules',
    'apps/api/src/audit-shipping',
  ];

  const routeFiles = new Set();
  for (const rd of routeDirs) {
    const abs = join(ROOT, rd);
    if (!existsSync(abs)) continue;
    for (const f of walkDir(abs, n => n.endsWith('.ts') && !n.endsWith('.test.ts'))) {
      routeFiles.add(relative(ROOT, f).replace(/\\/g, '/'));
    }
  }

  // Also scan inline routes in index.ts
  const indexPath = join(ROOT, 'apps/api/src/index.ts');
  if (existsSync(indexPath)) {
    routeFiles.add('apps/api/src/index.ts');
  }

  // Extract route prefixes from route file contents
  const routePrefixes = new Set();
  for (const rf of routeFiles) {
    try {
      const content = readFileSync(join(ROOT, rf), 'utf8');
      // Match route patterns like '/vista/allergies', '/rcm/*', etc.
      const matches = content.matchAll(/['"`](\/[a-z][a-z0-9\-\/\*:[\]{}]*)/gi);
      for (const m of matches) {
        const prefix = m[1].split('/').slice(0, 3).join('/').replace(/[:*[\]{}].*/, '');
        if (prefix.length > 1) routePrefixes.add(prefix);
      }
    } catch { /* skip unreadable */ }
  }

  return { routeFiles: [...routeFiles], routePrefixes: [...routePrefixes].sort() };
}

// ── 2. Scan UI pages ────────────────────────────────────────────────
function scanUiPages() {
  const webPages = [];
  const portalPages = [];

  const webDir = join(ROOT, 'apps/web/src/app');
  const portalDir = join(ROOT, 'apps/portal/src/app');

  for (const f of walkDir(webDir, n => n === 'page.tsx')) {
    const rel = relative(webDir, f).replace(/\\/g, '/').replace(/\/page\.tsx$/, '');
    webPages.push('/' + rel);
  }

  for (const f of walkDir(portalDir, n => n === 'page.tsx')) {
    const rel = relative(portalDir, f).replace(/\\/g, '/').replace(/\/page\.tsx$/, '');
    portalPages.push('/' + rel);
  }

  return { webPages: webPages.sort(), portalPages: portalPages.sort() };
}

// ── 3. Scan E2E tests ───────────────────────────────────────────────
function scanE2eTests() {
  const e2eDir = join(ROOT, 'apps/web/e2e');
  const tests = [];
  if (!existsSync(e2eDir)) return tests;
  for (const f of walkDir(e2eDir, n => n.endsWith('.spec.ts'))) {
    tests.push(relative(ROOT, f).replace(/\\/g, '/'));
  }
  return tests.sort();
}

// ── 4. Load capabilities ────────────────────────────────────────────
function loadCapabilities() {
  const caps = loadJson('config/capabilities.json');
  if (!caps) return [];
  if (Array.isArray(caps)) return caps;
  if (caps.capabilities && typeof caps.capabilities === 'object' && !Array.isArray(caps.capabilities)) {
    // capabilities is an object keyed by id
    return Object.entries(caps.capabilities).map(([id, v]) => ({ id, ...v }));
  }
  if (Array.isArray(caps.capabilities)) return caps.capabilities;
  return [];
}

// ── 5. Load estate catalogs ─────────────────────────────────────────
function loadEstateCatalog(file) {
  const data = loadJson(file);
  if (!data || !data.systems) return [];
  return data.systems;
}

// ── 6. Compute coverage score per surface ───────────────────────────
function coverageScore(coverage) {
  const fields = ['present_ui', 'present_api', 'vista_rpc_wired', 'writeback_ready', 'tests_present', 'evidence_present'];
  const total = fields.length;
  const met = fields.filter(f => coverage[f]).length;
  return { met, total, pct: Math.round((met / total) * 100) };
}

// ── 7. Build gap report ─────────────────────────────────────────────
function buildGapReport() {
  console.log('[build-ui-estate] Scanning workspace...');

  const apiScan = scanApiRoutes();
  const uiScan = scanUiPages();
  const e2eTests = scanE2eTests();
  const capabilities = loadCapabilities();

  if (verbose) {
    console.log(`  API route files: ${apiScan.routeFiles.length}`);
    console.log(`  API route prefixes: ${apiScan.routePrefixes.length}`);
    console.log(`  Web pages: ${uiScan.webPages.length}`);
    console.log(`  Portal pages: ${uiScan.portalPages.length}`);
    console.log(`  E2E tests: ${e2eTests.length}`);
    console.log(`  Capabilities: ${capabilities.length}`);
  }

  // Load both catalogs
  const vaSystems = loadEstateCatalog('data/ui-estate/va-ui-estate.json');
  const ihsSystems = loadEstateCatalog('data/ui-estate/ihs-ui-estate.json');

  const allSystems = [
    ...vaSystems.map(s => ({ ...s, agency: 'va' })),
    ...ihsSystems.map(s => ({ ...s, agency: 'ihs' })),
  ];

  // Per-system breakdown
  const systemBreakdown = [];
  let totalSurfaces = 0;
  let coveredSurfaces = 0;
  let gapSurfaces = 0;
  const priorityCounts = { 'p0-critical': { total: 0, covered: 0 }, 'p1-high': { total: 0, covered: 0 }, 'p2-medium': { total: 0, covered: 0 }, 'p3-low': { total: 0, covered: 0 } };
  const statusCounts = { 'not-started': 0, 'scaffold': 0, 'api-wired': 0, 'writeback': 0, 'parity': 0, 'certified': 0 };
  const gaps = [];
  let rpcReferencingCount = 0;

  for (const sys of allSystems) {
    const sysResult = {
      id: sys.id,
      name: sys.name,
      agency: sys.agency,
      category: sys.category,
      surfaceCount: sys.surfaces.length,
      coverageAvg: 0,
      surfaceDetails: [],
    };

    let sysCoverageSum = 0;

    for (const surf of sys.surfaces) {
      totalSurfaces++;
      const score = coverageScore(surf.coverage);
      sysCoverageSum += score.pct;

      if (surf.targetRpcs && surf.targetRpcs.length > 0) {
        rpcReferencingCount++;
      }

      // Consider "covered" if at least present_ui AND present_api
      const isCovered = surf.coverage.present_ui && surf.coverage.present_api;
      if (isCovered) {
        coveredSurfaces++;
      } else {
        gapSurfaces++;
        gaps.push({
          system: sys.id,
          surface: surf.id,
          name: surf.name,
          priority: surf.priority,
          migrationStatus: surf.migrationStatus,
          coveragePct: score.pct,
        });
      }

      priorityCounts[surf.priority].total++;
      if (isCovered) priorityCounts[surf.priority].covered++;
      statusCounts[surf.migrationStatus]++;

      sysResult.surfaceDetails.push({
        id: surf.id,
        name: surf.name,
        priority: surf.priority,
        migrationStatus: surf.migrationStatus,
        coveragePct: score.pct,
        covered: isCovered,
      });
    }

    sysResult.coverageAvg = sys.surfaces.length > 0
      ? Math.round(sysCoverageSum / sys.surfaces.length)
      : 0;

    systemBreakdown.push(sysResult);
  }

  // Sort gaps by priority then coverage
  const priorityOrder = { 'p0-critical': 0, 'p1-high': 1, 'p2-medium': 2, 'p3-low': 3 };
  gaps.sort((a, b) => (priorityOrder[a.priority] - priorityOrder[b.priority]) || (a.coveragePct - b.coveragePct));

  const report = {
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/ui-estate/build-ui-estate.mjs',
    phase: 531,
    totals: {
      systems: allSystems.length,
      surfaces: totalSurfaces,
      covered: coveredSurfaces,
      gaps: gapSurfaces,
      coveragePct: totalSurfaces > 0 ? Math.round((coveredSurfaces / totalSurfaces) * 100) : 0,
      rpcReferencingSurfaces: rpcReferencingCount,
    },
    byPriority: priorityCounts,
    byMigrationStatus: statusCounts,
    workspace: {
      apiRouteFiles: apiScan.routeFiles.length,
      apiRoutePrefixes: apiScan.routePrefixes.length,
      webPages: uiScan.webPages.length,
      portalPages: uiScan.portalPages.length,
      e2eTests: e2eTests.length,
      capabilities: capabilities.length,
    },
    systemBreakdown,
    gaps,
  };

  const outPath = join(ROOT, 'data/ui-estate/ui-gap-report.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[build-ui-estate] Gap report written to data/ui-estate/ui-gap-report.json`);
  console.log(`  Total surfaces: ${totalSurfaces}`);
  console.log(`  Covered: ${coveredSurfaces} (${report.totals.coveragePct}%)`);
  console.log(`  Gaps: ${gapSurfaces}`);
  console.log(`  RPC-referencing: ${rpcReferencingCount}`);

  return report;
}

// ── Main ─────────────────────────────────────────────────────────────
buildGapReport();
