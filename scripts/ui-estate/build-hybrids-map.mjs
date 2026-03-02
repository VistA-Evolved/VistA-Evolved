#!/usr/bin/env node
/**
 * build-hybrids-map.mjs -- Phase 541 (Wave 39 P11)
 *
 * Generates data/ui-estate/va-gui-hybrids-map.json by cross-referencing:
 *   - data/ui-estate/va-ui-estate.json  (24 VA systems, 81 surfaces)
 *   - data/ui-estate/ihs-ui-estate.json (4 IHS systems, 22 surfaces)
 *   - docs/vista-alignment/rpc-coverage.json (1016 tracked RPCs)
 *   - config/capabilities.json (177+ capabilities)
 *
 * For each GUI hybrid: host platform, deployment model, RPC overlap/gap,
 * capability overlap, and migration readiness score.
 *
 * Usage:
 *   node scripts/ui-estate/build-hybrids-map.mjs [--verbose]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

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

// ── Known hybrid metadata ────────────────────────────────────────────
// Static metadata for each system's origin platform, deployment model, etc.
const HYBRID_META = {
  'cprs':                { hostPlatform: 'delphi',  deploymentModel: 'thick-client', authMechanism: 'xwb-rpc', migrationStrategy: 'replace' },
  'bcma':                { hostPlatform: 'delphi',  deploymentModel: 'thick-client', authMechanism: 'xwb-rpc', migrationStrategy: 'replace' },
  'vista-imaging':       { hostPlatform: 'delphi',  deploymentModel: 'thick-client', authMechanism: 'xwb-rpc', migrationStrategy: 'replace' },
  'ivs-sic':             { hostPlatform: 'web',     deploymentModel: 'browser',      authMechanism: 'saml',    migrationStrategy: 'coexist' },
  'mha':                 { hostPlatform: 'delphi',  deploymentModel: 'thick-client', authMechanism: 'xwb-rpc', migrationStrategy: 'replace' },
  'vse-vs-gui':          { hostPlatform: 'dotnet',  deploymentModel: 'thick-client', authMechanism: 'xwb-rpc', migrationStrategy: 'replace' },
  'clinical-procedures': { hostPlatform: 'dotnet',  deploymentModel: 'thick-client', authMechanism: 'xwb-rpc', migrationStrategy: 'replace' },
  'jlv':                 { hostPlatform: 'web',     deploymentModel: 'browser',      authMechanism: 'saml',    migrationStrategy: 'coexist' },
  'vistaweb':            { hostPlatform: 'java',    deploymentModel: 'browser',      authMechanism: 'saml',    migrationStrategy: 'deprecate' },
  'cdsp':                { hostPlatform: 'web',     deploymentModel: 'browser',      authMechanism: 'oauth2',  migrationStrategy: 'coexist' },
  'ciss':                { hostPlatform: 'web',     deploymentModel: 'browser',      authMechanism: 'saml',    migrationStrategy: 'wrap' },
  'va-direct':           { hostPlatform: 'web',     deploymentModel: 'api-only',     authMechanism: 'oauth2',  migrationStrategy: 'wrap' },
  'esig':                { hostPlatform: 'dotnet',  deploymentModel: 'hybrid',       authMechanism: 'xwb-rpc', migrationStrategy: 'replace' },
  'hinge':               { hostPlatform: 'java',    deploymentModel: 'hybrid',       authMechanism: 'iam-sts', migrationStrategy: 'coexist' },
  'hwsc':                { hostPlatform: 'java',    deploymentModel: 'api-only',     authMechanism: 'iam-sts', migrationStrategy: 'wrap' },
  'lighthouse':          { hostPlatform: 'web',     deploymentModel: 'api-only',     authMechanism: 'oauth2',  migrationStrategy: 'coexist' },
  'ves':                 { hostPlatform: 'web',     deploymentModel: 'browser',      authMechanism: 'saml',    migrationStrategy: 'coexist' },
  'mhv':                 { hostPlatform: 'web',     deploymentModel: 'browser',      authMechanism: 'oauth2',  migrationStrategy: 'coexist' },
  'voda':                { hostPlatform: 'delphi',  deploymentModel: 'thick-client', authMechanism: 'xwb-rpc', migrationStrategy: 'deprecate' },
  'numi':                { hostPlatform: 'web',     deploymentModel: 'browser',      authMechanism: 'saml',    migrationStrategy: 'coexist' },
  'pats':                { hostPlatform: 'web',     deploymentModel: 'browser',      authMechanism: 'saml',    migrationStrategy: 'coexist' },
  'person-services':     { hostPlatform: 'java',    deploymentModel: 'api-only',     authMechanism: 'iam-sts', migrationStrategy: 'wrap' },
  'vista-audit':         { hostPlatform: 'web',     deploymentModel: 'browser',      authMechanism: 'saml',    migrationStrategy: 'coexist' },
  'adt':                 { hostPlatform: 'delphi',  deploymentModel: 'thick-client', authMechanism: 'xwb-rpc', migrationStrategy: 'replace' },
  // IHS systems
  'rpms-ehr':            { hostPlatform: 'delphi',  deploymentModel: 'thick-client', authMechanism: 'xwb-rpc', migrationStrategy: 'replace' },
  'icare':               { hostPlatform: 'web',     deploymentModel: 'browser',      authMechanism: 'saml',    migrationStrategy: 'coexist' },
  'bprm':                { hostPlatform: 'delphi',  deploymentModel: 'thick-client', authMechanism: 'xwb-rpc', migrationStrategy: 'replace' },
  'bsdx-pims':           { hostPlatform: 'dotnet',  deploymentModel: 'thick-client', authMechanism: 'xwb-rpc', migrationStrategy: 'replace' },
};

// ── Domain-to-system mapping for RPC overlap ─────────────────────────
// Maps RPC domains from rpcRegistry to system IDs in the estate
const DOMAIN_SYSTEM_MAP = {
  'allergies':            ['cprs'],
  'billing':              ['cprs'],
  'consults':             ['cprs', 'clinical-procedures'],
  'imaging':              ['vista-imaging', 'ivs-sic'],
  'labs':                 ['cprs', 'jlv'],
  'medications':          ['cprs', 'bcma'],
  'notes':                ['cprs', 'clinical-procedures'],
  'orders':               ['cprs'],
  'patients':             ['cprs', 'adt'],
  'problems':             ['cprs'],
  'reports':              ['cprs', 'jlv', 'vistaweb'],
  'surgery':              ['cprs'],
  'vitals':               ['cprs'],
  'adt':                  ['cprs', 'adt'],
  'reminders':            ['cprs', 'cdsp'],
  'immunizations':        ['cprs'],
  'messaging':            ['cprs'],
  'scheduling':           ['vse-vs-gui', 'cprs'],
  'mental-health':        ['mha', 'cprs'],
  'clinical-procedures':  ['clinical-procedures', 'cprs'],
  'auth':                 [],       // infrastructure, maps to all
  'catalog':              [],       // infrastructure
  'interop':              ['hinge'],
  'remote':               ['jlv', 'vistaweb'],
  'inbox':                ['cprs'],
};

// ── Category-to-capability-module mapping ────────────────────────────
const CATEGORY_MODULE_MAP = {
  'clinical':        ['clinical'],
  'pharmacy':        ['clinical'],
  'imaging':         ['imaging'],
  'scheduling':      ['scheduling'],
  'reporting':       ['clinical', 'analytics'],
  'portal':          ['portal'],
  'mental-health':   ['clinical'],
  'admin':           ['iam'],
  'infrastructure':  ['interop', 'iam'],
};

// ── Main ─────────────────────────────────────────────────────────────
function buildHybridsMap() {
  console.log('[build-hybrids-map] Cross-referencing VA/IHS GUI hybrids...');

  // Load data sources
  const vaEstate = loadJson('data/ui-estate/va-ui-estate.json');
  const ihsEstate = loadJson('data/ui-estate/ihs-ui-estate.json');
  const rpcCoverage = loadJson('docs/vista-alignment/rpc-coverage.json');
  const capsRaw = loadJson('config/capabilities.json');

  if (!vaEstate) { console.error('Missing va-ui-estate.json'); process.exit(1); }

  // Build RPC lookup: name -> { inRegistry, isLive, isException, domain, ... }
  const rpcLookup = new Map();
  if (rpcCoverage && rpcCoverage.rpcs) {
    for (const rpc of rpcCoverage.rpcs) {
      rpcLookup.set(rpc.name, rpc);
    }
  }

  // Build capability lookup: key -> { status, module, ... }
  const capLookup = new Map();
  if (capsRaw && capsRaw.capabilities) {
    for (const [key, val] of Object.entries(capsRaw.capabilities)) {
      capLookup.set(key, val);
    }
  }

  // Flatten all systems
  const allSystems = [
    ...(vaEstate.systems || []).map(s => ({ ...s, agency: 'va' })),
    ...(ihsEstate?.systems || []).map(s => ({ ...s, agency: 'ihs' })),
  ];

  const hybrids = [];

  for (const sys of allSystems) {
    const meta = HYBRID_META[sys.id] || {
      hostPlatform: 'unknown',
      deploymentModel: 'unknown',
      authMechanism: 'unknown',
      migrationStrategy: 'coexist',
    };

    // Collect all target RPCs from surfaces
    const surfaceRpcs = new Set();
    for (const surf of sys.surfaces) {
      if (surf.targetRpcs) {
        for (const rpc of surf.targetRpcs) {
          surfaceRpcs.add(rpc);
        }
      }
    }

    // Compute RPC overlap and gap
    const rpcOverlap = [];
    const rpcGap = [];
    for (const rpcName of surfaceRpcs) {
      const info = rpcLookup.get(rpcName);
      if (info && (info.isLive || info.inRegistry)) {
        rpcOverlap.push({
          name: rpcName,
          isLive: info.isLive || false,
          domain: info.domain || 'unknown',
        });
      } else {
        rpcGap.push({
          name: rpcName,
          vivianGrounded: info?.inVivian || false,
          inCprs: info?.inCprs || false,
        });
      }
    }

    // Compute capability overlap by module
    const relevantModules = CATEGORY_MODULE_MAP[sys.category] || [];
    const capOverlap = [];
    for (const [key, cap] of capLookup.entries()) {
      if (relevantModules.includes(cap.module) && cap.status === 'live') {
        capOverlap.push(key);
      }
    }

    // Compute surface coverage summary
    let coveredSurfaces = 0;
    let writebackSurfaces = 0;
    let testedSurfaces = 0;
    const surfaceSummary = [];
    for (const surf of sys.surfaces) {
      const covered = surf.coverage.present_ui && surf.coverage.present_api;
      if (covered) coveredSurfaces++;
      if (surf.coverage.writeback_ready) writebackSurfaces++;
      if (surf.coverage.tests_present) testedSurfaces++;
      surfaceSummary.push({
        id: surf.id,
        name: surf.name,
        migrationStatus: surf.migrationStatus,
        priority: surf.priority,
        covered,
        rpcWired: surf.coverage.vista_rpc_wired || false,
        writebackReady: surf.coverage.writeback_ready || false,
      });
    }

    // Migration readiness score (0-100)
    // Factors: surface coverage (40%), RPC overlap (30%), writeback (20%), tests (10%)
    const surfaceCount = sys.surfaces.length || 1;
    const surfaceCoveragePct = (coveredSurfaces / surfaceCount) * 100;
    const rpcTotalTarget = surfaceRpcs.size || 1;
    const rpcOverlapPct = (rpcOverlap.length / rpcTotalTarget) * 100;
    const writebackPct = (writebackSurfaces / surfaceCount) * 100;
    const testPct = (testedSurfaces / surfaceCount) * 100;

    const migrationReadiness = Math.round(
      (surfaceCoveragePct * 0.4) +
      (rpcOverlapPct * 0.3) +
      (writebackPct * 0.2) +
      (testPct * 0.1)
    );

    // Find VE equivalent components
    const veEquivalents = [];
    for (const surf of sys.surfaces) {
      if (surf.veEquivalent) {
        veEquivalents.push({
          surface: surf.id,
          ...surf.veEquivalent,
        });
      }
    }

    hybrids.push({
      id: sys.id,
      name: sys.name,
      agency: sys.agency,
      category: sys.category,
      hostPlatform: meta.hostPlatform,
      deploymentModel: meta.deploymentModel,
      authMechanism: meta.authMechanism,
      migrationStrategy: meta.migrationStrategy,
      surfaceCount: sys.surfaces.length,
      coveredSurfaces,
      writebackSurfaces,
      testedSurfaces,
      rpcOverlap,
      rpcGap,
      capabilityOverlap: capOverlap,
      migrationReadiness,
      surfaceSummary,
      veEquivalents,
    });
  }

  // Sort by migration readiness descending
  hybrids.sort((a, b) => b.migrationReadiness - a.migrationReadiness);

  // Summary rollup
  const summary = {
    totalHybrids: hybrids.length,
    byPlatform: {},
    byDeploymentModel: {},
    byMigrationStrategy: {},
    avgMigrationReadiness: Math.round(
      hybrids.reduce((s, h) => s + h.migrationReadiness, 0) / (hybrids.length || 1)
    ),
    totalRpcOverlap: hybrids.reduce((s, h) => s + h.rpcOverlap.length, 0),
    totalRpcGap: hybrids.reduce((s, h) => s + h.rpcGap.length, 0),
    totalCapOverlap: new Set(hybrids.flatMap(h => h.capabilityOverlap)).size,
    thickClientCount: hybrids.filter(h => h.deploymentModel === 'thick-client').length,
    browserCount: hybrids.filter(h => h.deploymentModel === 'browser').length,
    hybridCount: hybrids.filter(h => h.deploymentModel === 'hybrid').length,
    apiOnlyCount: hybrids.filter(h => h.deploymentModel === 'api-only').length,
  };

  for (const h of hybrids) {
    summary.byPlatform[h.hostPlatform] = (summary.byPlatform[h.hostPlatform] || 0) + 1;
    summary.byDeploymentModel[h.deploymentModel] = (summary.byDeploymentModel[h.deploymentModel] || 0) + 1;
    summary.byMigrationStrategy[h.migrationStrategy] = (summary.byMigrationStrategy[h.migrationStrategy] || 0) + 1;
  }

  const output = {
    _meta: {
      generatedAt: new Date().toISOString(),
      generatedBy: 'scripts/ui-estate/build-hybrids-map.mjs',
      phase: 541,
      description: 'VA/IHS GUI Hybrids Capability Map -- cross-references desktop GUI apps with VistA-Evolved coverage',
      sources: {
        vaEstate: 'data/ui-estate/va-ui-estate.json',
        ihsEstate: 'data/ui-estate/ihs-ui-estate.json',
        rpcCoverage: 'docs/vista-alignment/rpc-coverage.json',
        capabilities: 'config/capabilities.json',
      },
    },
    summary,
    hybrids,
  };

  const outPath = join(ROOT, 'data/ui-estate/va-gui-hybrids-map.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');

  console.log(`[build-hybrids-map] Hybrids map written to data/ui-estate/va-gui-hybrids-map.json`);
  console.log(`  Total hybrids: ${hybrids.length}`);
  console.log(`  Avg migration readiness: ${summary.avgMigrationReadiness}%`);
  console.log(`  Total RPC overlap: ${summary.totalRpcOverlap}`);
  console.log(`  Total RPC gap: ${summary.totalRpcGap}`);
  console.log(`  Thick-client: ${summary.thickClientCount}, Browser: ${summary.browserCount}, Hybrid: ${summary.hybridCount}, API-only: ${summary.apiOnlyCount}`);

  if (verbose) {
    console.log('\nPer-hybrid readiness:');
    for (const h of hybrids) {
      console.log(`  ${h.id.padEnd(22)} ${String(h.migrationReadiness).padStart(3)}%  RPCs: ${h.rpcOverlap.length}/${h.rpcOverlap.length + h.rpcGap.length}  Surfaces: ${h.coveredSurfaces}/${h.surfaceCount}`);
    }
  }

  return output;
}

buildHybridsMap();
