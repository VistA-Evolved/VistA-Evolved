#!/usr/bin/env node
/**
 * build-runtime-ui-truth-matrix.mjs -- Phase 726
 *
 * Purpose:
 *   - Transform the runtime UI estate checklist into an evidence-seeded truth matrix.
 *   - Give every current runtime surface an initial truth posture before manual audit.
 *   - Keep the audit grounded in existing repo signals instead of plan prose.
 *
 * Outputs:
 *   - data/ui-estate/runtime-ui-truth-matrix.json
 *   - docs/ui-estate/runtime-ui-truth-matrix.md
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const CHECKLIST_JSON = join(ROOT, 'data/ui-estate/runtime-ui-audit-checklist.json');
const INVENTORY_JSON = join(ROOT, 'data/ui-estate/runtime-ui-estate.json');
const CERT_JSON = join(ROOT, 'data/vista/package-certification.json');
const ROUTE_TESTS_JSON = join(ROOT, 'data/vista/route-test-results.json');
const PANEL_REGISTRY_TS = join(ROOT, 'apps/web/src/lib/vista-panel-registry.ts');
const ACTION_REGISTRY_TS = join(ROOT, 'apps/web/src/actions/actionRegistry.ts');
const OUTPUT_JSON = join(ROOT, 'data/ui-estate/runtime-ui-truth-matrix.json');
const OUTPUT_MD = join(ROOT, 'docs/ui-estate/runtime-ui-truth-matrix.md');

const E2E_DIRS = [
  join(ROOT, 'apps/web/e2e'),
  join(ROOT, 'apps/portal/e2e'),
  join(ROOT, 'apps/marketing/e2e'),
];

const STOP_WORDS = new Set([
  'app',
  'apps',
  'audit',
  'admin',
  'and',
  'api',
  'cprs',
  'clinical',
  'dashboard',
  'desktop',
  'file',
  'health',
  'home',
  'index',
  'marketing',
  'mobile',
  'page',
  'portal',
  'runtime',
  'screen',
  'setup',
  'src',
  'system',
  'the',
  'truth',
  'ui',
  'vista',
  'web',
  'workbench',
  'workspace',
]);

const ROUTE_LOCATION_HINTS = [
  { test: value => value.includes('patient-search'), locations: ['PatientSearch'] },
  { test: value => value.includes('/chart/') || value.includes('vista-workspace'), locations: ['CoverSheet', 'Problems', 'Medications', 'Orders', 'Notes', 'Labs', 'Allergies', 'Vitals', 'Consults', 'Reports', 'Immunizations'] },
  { test: value => value.includes('problem'), locations: ['Problems'] },
  { test: value => value.includes('allerg'), locations: ['Allergies'] },
  { test: value => value.includes('vital'), locations: ['Vitals'] },
  { test: value => value.includes('med') || value.includes('emar'), locations: ['Medications', 'eMAR'] },
  { test: value => value.includes('order'), locations: ['Orders'] },
  { test: value => value.includes('note') || value.includes('document'), locations: ['Notes'] },
  { test: value => value.includes('lab'), locations: ['Labs'] },
  { test: value => value.includes('consult'), locations: ['Consults'] },
  { test: value => value.includes('report'), locations: ['Reports'] },
  { test: value => value.includes('immun'), locations: ['Immunizations'] },
  { test: value => value.includes('sched') || value.includes('appointment'), locations: ['Appointments', 'Scheduling'] },
];

const PACKAGE_KEYWORD_HINTS = [
  { test: value => value.includes('/chart/') || value.includes('vista-workspace'), packages: ['dg', 'or', 'gmpl', 'gmra', 'gmv', 'pso', 'lr', 'tiu', 'sd'] },
  { test: value => value.includes('patient-search'), packages: ['dg', 'or'] },
  { test: value => value.includes('problem'), packages: ['gmpl'] },
  { test: value => value.includes('allerg'), packages: ['gmra'] },
  { test: value => value.includes('vital'), packages: ['gmv'] },
  { test: value => value.includes('med') || value.includes('emar'), packages: ['pso', 'psj', 'psb'] },
  { test: value => value.includes('lab'), packages: ['lr'] },
  { test: value => value.includes('note') || value.includes('document'), packages: ['tiu'] },
  { test: value => value.includes('order'), packages: ['or'] },
  { test: value => value.includes('consult'), packages: ['gmrc'] },
  { test: value => value.includes('report'), packages: ['gmts', 'tiu'] },
  { test: value => value.includes('appointment') || value.includes('sched'), packages: ['sd'] },
  { test: value => value.includes('imaging'), packages: ['mag', 'ra'] },
  { test: value => value.includes('billing') || value.includes('claim') || value.includes('payer') || value.includes('coverage') || value.includes('remittance') || value.includes('denial') || value.includes('payment') || value.includes('reconciliation'), packages: ['ib', 'prca', 'ibcn', 'arc', 'arj'] },
  { test: value => value.includes('/cprs/admin/vista/') || value.includes('rpc-debug') || value.includes('integrations'), packages: ['xu', 'xwb', 'xus', 'hl', 'fm', 'xq'] },
  { test: value => value.includes('telehealth'), packages: ['sd', 'tiu'] },
];

function readText(path) {
  const raw = readFileSync(path, 'utf8');
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function ensureDir(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function rel(path) {
  return relative(ROOT, path).replace(/\\/g, '/');
}

function listFilesRecursive(dir, predicate, results = []) {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      listFilesRecursive(fullPath, predicate, results);
      continue;
    }
    if (predicate(fullPath)) {
      results.push(rel(fullPath));
    }
  }
  return results;
}

function normalizeCertification(pkg) {
  const id = String(pkg.namespace || pkg.packagePrefix || '').toLowerCase();
  if (!id) return null;
  let certification = 'unknown';
  if (typeof pkg.certification === 'string') {
    certification = pkg.certification;
  } else if (pkg.certification && typeof pkg.certification === 'object') {
    const values = Object.values(pkg.certification);
    const passCount = values.filter(Boolean).length;
    certification = passCount === values.length ? 'certified' : passCount > 0 ? 'partial' : 'uncertified';
  }
  return {
    id,
    certification,
    routeCount: Number(pkg.routeCount || 0),
    hasDocs: Boolean(pkg.hasDocs),
    hasPanel: Boolean(pkg.hasPanel),
    registered: pkg.registered !== false,
  };
}

function buildCertificationMap() {
  const data = readJson(CERT_JSON);
  const map = new Map();
  for (const rawPkg of data.packages || []) {
    const pkg = normalizeCertification(rawPkg);
    if (pkg) map.set(pkg.id, pkg);
  }
  return map;
}

function buildRouteTestMap() {
  const routeTests = readJson(ROUTE_TESTS_JSON);
  const map = new Map();
  for (const entry of routeTests) {
    const pkg = String(entry.package || '').toLowerCase();
    if (!pkg) continue;
    if (!map.has(pkg)) {
      map.set(pkg, { total: 0, statusCounts: {}, sampleRoutes: [] });
    }
    const current = map.get(pkg);
    current.total += 1;
    const status = String(entry.status || 'unknown').toLowerCase();
    current.statusCounts[status] = (current.statusCounts[status] || 0) + 1;
    if (current.sampleRoutes.length < 5 && entry.route) {
      current.sampleRoutes.push(entry.route);
    }
  }
  return map;
}

function parsePanelRegistry() {
  const text = readText(PANEL_REGISTRY_TS);
  const matches = text.matchAll(/\{ id: '([^']+)', name: '([^']+)', component: '([^']+)', tier: (\d+), category: '([^']+)' \}/g);
  const entries = [];
  for (const match of matches) {
    entries.push({
      id: match[1].toLowerCase(),
      name: match[2],
      component: match[3],
      tier: Number(match[4]),
      category: match[5],
    });
  }
  return entries;
}

function parseActionRegistry() {
  const text = readText(ACTION_REGISTRY_TS);
  const entries = [];
  for (const block of text.match(/\{\n(?:.|\n)*?\n  \},/g) || []) {
    if (!block.includes("actionId:")) continue;
    const actionId = block.match(/actionId:\s*'([^']+)'/);
    const location = block.match(/location:\s*'([^']+)'/);
    const status = block.match(/status:\s*'([^']+)'/);
    const endpoint = block.match(/endpoint:\s*'([^']+)'/);
    const capability = block.match(/capability:\s*'([^']+)'/);
    if (!actionId || !location || !status || !capability) continue;
    entries.push({
      actionId: actionId[1],
      location: location[1],
      status: status[1],
      endpoint: endpoint ? endpoint[1] : '',
      capability: capability[1],
      tokens: tokenize(`${actionId[1]} ${location[1]} ${status[1]} ${endpoint ? endpoint[1] : ''} ${capability[1]}`),
    });
  }
  return entries;
}

function tokenize(value) {
  const tokens = new Set();
  for (const token of value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) {
    if (token.length < 3 || STOP_WORDS.has(token)) continue;
    tokens.add(token);
    if (token.endsWith('s') && token.length > 4) tokens.add(token.slice(0, -1));
  }
  return [...tokens];
}

function inferPackageHints(surface) {
  const searchable = `${surface.surfaceId} ${surface.label} ${surface.file}`.toLowerCase();
  const packages = new Set();
  for (const hint of PACKAGE_KEYWORD_HINTS) {
    if (hint.test(searchable)) {
      for (const id of hint.packages) packages.add(id);
    }
  }
  return [...packages].sort();
}

function inferActionLocations(surface) {
  const searchable = `${surface.surfaceId} ${surface.label}`.toLowerCase();
  const locations = new Set();
  for (const hint of ROUTE_LOCATION_HINTS) {
    if (hint.test(searchable)) {
      for (const location of hint.locations) locations.add(location.toLowerCase());
    }
  }
  return [...locations].sort();
}

function summarizeActionStatuses(actions) {
  const statusCounts = {};
  for (const action of actions) {
    statusCounts[action.status] = (statusCounts[action.status] || 0) + 1;
  }
  return {
    total: actions.length,
    wired: statusCounts.wired || 0,
    requiresConfig: statusCounts.requires_config || 0,
    unsupportedInSandbox: statusCounts['unsupported-in-sandbox'] || 0,
    stub: statusCounts.stub || 0,
    statusCounts,
  };
}

function matchActions(surface, actions) {
  const keywords = new Set(tokenize(`${surface.label} ${surface.file}`));
  const locationHints = inferActionLocations(surface);
  const matches = actions.filter(action => {
    if (locationHints.includes(action.location.toLowerCase())) return true;
    return action.tokens.some(token => keywords.has(token));
  });
  return {
    summary: summarizeActionStatuses(matches),
    sampleActionIds: matches.slice(0, 8).map(action => action.actionId),
  };
}

function summarizeRouteTests(packageIds, routeTestMap) {
  const statusCounts = {};
  const sampleRoutes = [];
  let total = 0;
  for (const packageId of packageIds) {
    const current = routeTestMap.get(packageId);
    if (!current) continue;
    total += current.total;
    for (const [status, count] of Object.entries(current.statusCounts)) {
      statusCounts[status] = (statusCounts[status] || 0) + count;
    }
    for (const route of current.sampleRoutes) {
      if (sampleRoutes.length < 8) sampleRoutes.push(route);
    }
  }
  return { total, statusCounts, sampleRoutes };
}

function scanE2ESpecs() {
  return E2E_DIRS.flatMap(dir => listFilesRecursive(dir, path => /\.spec\.(ts|tsx|js)$/.test(path)));
}

function matchE2ESpecs(surface, e2eSpecs) {
  const keywords = new Set(tokenize(`${surface.label} ${surface.file}`));
  const matches = e2eSpecs.filter(spec => tokenize(spec).some(token => keywords.has(token)));
  return {
    total: matches.length,
    sampleSpecs: matches.slice(0, 8),
  };
}

function deriveTruthBucket(surface, packageEvidence, actionEvidence, routeEvidence, e2eEvidence) {
  const packageStates = new Set(packageEvidence.map(entry => entry.certification));
  const hasCertifiedPackage = packageStates.has('certified');
  const hasAnyPackage = packageEvidence.length > 0;
  const hasWiredActions = actionEvidence.summary.wired > 0;
  const hasRouteEvidence = routeEvidence.total > 0;
  const hasE2E = e2eEvidence.total > 0;

  if (surface.app === 'marketing') return 'non-clinical-surface';
  if (surface.liveVistaExpectation === 'not-applicable') return 'non-vista-or-shell-surface';

  if (surface.liveVistaExpectation === 'required') {
    if (!hasAnyPackage && !hasWiredActions) return 'required-unmapped';
    if (hasCertifiedPackage && hasWiredActions && hasRouteEvidence) return 'required-with-strong-signals';
    if (hasWiredActions || hasRouteEvidence || hasE2E) return 'required-needs-live-verification';
    return 'required-manual-triage';
  }

  if (hasCertifiedPackage || hasWiredActions || hasRouteEvidence) return 'mixed-with-vista-signals';
  if (hasAnyPackage || hasE2E) return 'mixed-manual-review';
  return 'mixed-unmapped';
}

function derivePriority(surface, truthBucket) {
  if (surface.liveVistaExpectation === 'required') return 'P1';
  if (truthBucket === 'mixed-with-vista-signals') return 'P2';
  return 'P3';
}

function buildTruthMatrix() {
  const checklist = readJson(CHECKLIST_JSON);
  const inventory = readJson(INVENTORY_JSON);
  const certMap = buildCertificationMap();
  const routeTestMap = buildRouteTestMap();
  const panels = parsePanelRegistry();
  const actions = parseActionRegistry();
  const e2eSpecs = scanE2ESpecs();
  const deadClickAuditPath = join(ROOT, 'artifacts/DEAD_CLICK_AUDIT.csv');

  const items = checklist.items.map(surface => {
    const inferredPackages = inferPackageHints(surface);
    const packageEvidence = inferredPackages
      .map(id => certMap.get(id))
      .filter(Boolean)
      .map(entry => ({ ...entry }));
    const relatedPanels = inferredPackages
      .map(id => panels.find(panel => panel.id === id))
      .filter(Boolean)
      .map(panel => ({ ...panel }));
    const actionEvidence = matchActions(surface, actions);
    const routeEvidence = summarizeRouteTests(inferredPackages, routeTestMap);
    const e2eEvidence = matchE2ESpecs(surface, e2eSpecs);
    const truthBucket = deriveTruthBucket(surface, packageEvidence, actionEvidence, routeEvidence, e2eEvidence);
    const reviewPriority = derivePriority(surface, truthBucket);

    return {
      ...surface,
      truthBucket,
      reviewPriority,
      inferredPackages,
      packageEvidence,
      relatedPanels,
      actionEvidence,
      routeEvidence,
      e2eEvidence,
      evidenceSources: {
        checklist: rel(CHECKLIST_JSON),
        inventory: rel(INVENTORY_JSON),
        packageCertification: rel(CERT_JSON),
        routeTests: rel(ROUTE_TESTS_JSON),
        panelRegistry: rel(PANEL_REGISTRY_TS),
        actionRegistry: rel(ACTION_REGISTRY_TS),
        deadClickAudit: existsSync(deadClickAuditPath) ? rel(deadClickAuditPath) : null,
      },
    };
  });

  const summary = {
    totalSurfaces: items.length,
    byPriority: countBy(items, item => item.reviewPriority),
    byTruthBucket: countBy(items, item => item.truthBucket),
    requiredSurfaceCount: items.filter(item => item.liveVistaExpectation === 'required').length,
    surfacesWithActionSignals: items.filter(item => item.actionEvidence.summary.total > 0).length,
    surfacesWithPackageSignals: items.filter(item => item.packageEvidence.length > 0).length,
    surfacesWithRouteEvidence: items.filter(item => item.routeEvidence.total > 0).length,
    surfacesWithE2EHints: items.filter(item => item.e2eEvidence.total > 0).length,
    certifiedPackageHints: items.filter(item => item.packageEvidence.some(entry => entry.certification === 'certified')).length,
  };

  return {
    generatedAt: new Date().toISOString(),
    generatedBy: 'Phase 726 - Full Truth And UX Audit',
    summary,
    sourceSummary: inventory.summary,
    items,
  };
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function renderSection(title, items) {
  const lines = [`## ${title}`, ''];
  if (!items.length) {
    lines.push('- None', '');
    return lines;
  }
  for (const item of items) {
    const packages = item.inferredPackages.length ? item.inferredPackages.join(', ') : 'none';
    const actions = item.actionEvidence.summary.total;
    const tests = item.routeEvidence.total;
    const e2e = item.e2eEvidence.total;
    lines.push(`- ${item.surfaceId} | ${item.truthBucket} | packages: ${packages} | actions: ${actions} | route-tests: ${tests} | e2e: ${e2e}`);
  }
  lines.push('');
  return lines;
}

function toMarkdown(matrix) {
  const requiredSurfaces = matrix.items.filter(item => item.reviewPriority === 'P1');
  const unmapped = matrix.items.filter(item => item.truthBucket === 'required-unmapped' || item.truthBucket === 'mixed-unmapped');
  const strongSignals = matrix.items.filter(item => item.truthBucket === 'required-with-strong-signals');

  const lines = [
    '# Runtime UI Truth Matrix',
    '',
    `Generated: ${matrix.generatedAt}`,
    '',
    '## Purpose',
    '',
    'This matrix converts the runtime UI checklist into an evidence-seeded first-pass truth posture.',
    'It is not a completion certificate. It is the starting point for manual review and live verification.',
    '',
    '## Summary',
    '',
    `- Total surfaces: ${matrix.summary.totalSurfaces}`,
    `- Required surfaces: ${matrix.summary.requiredSurfaceCount}`,
    `- Surfaces with action signals: ${matrix.summary.surfacesWithActionSignals}`,
    `- Surfaces with package signals: ${matrix.summary.surfacesWithPackageSignals}`,
    `- Surfaces with route evidence: ${matrix.summary.surfacesWithRouteEvidence}`,
    `- Surfaces with E2E hints: ${matrix.summary.surfacesWithE2EHints}`,
    `- Surfaces with at least one certified package hint: ${matrix.summary.certifiedPackageHints}`,
    '',
    '## Priority Split',
    '',
  ];

  for (const [priority, count] of Object.entries(matrix.summary.byPriority).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`- ${priority}: ${count}`);
  }

  lines.push('', '## Truth Buckets', '');
  for (const [bucket, count] of Object.entries(matrix.summary.byTruthBucket).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`- ${bucket}: ${count}`);
  }

  lines.push('');
  lines.push(...renderSection('P1 Required Surfaces', requiredSurfaces));
  lines.push(...renderSection('High-Confidence Required Signals', strongSignals));
  lines.push(...renderSection('Unmapped Surfaces', unmapped));

  return `${lines.join('\n')}\n`;
}

function main() {
  const matrix = buildTruthMatrix();
  ensureDir(OUTPUT_JSON);
  ensureDir(OUTPUT_MD);
  writeFileSync(OUTPUT_JSON, `${JSON.stringify(matrix, null, 2)}\n`, 'utf8');
  writeFileSync(OUTPUT_MD, toMarkdown(matrix), 'utf8');
  process.stdout.write(`[build-runtime-ui-truth-matrix] Wrote ${rel(OUTPUT_JSON)} and ${rel(OUTPUT_MD)}\n`);
}

main();