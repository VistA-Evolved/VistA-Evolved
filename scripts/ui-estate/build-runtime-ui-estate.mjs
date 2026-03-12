#!/usr/bin/env node
/**
 * build-runtime-ui-estate.mjs -- Phase 726
 *
 * Builds a machine-readable inventory of the current VistA-Evolved runtime UI
 * surface. This is the boundary artifact for the full truth and UX audit.
 *
 * Outputs:
 *   - data/ui-estate/runtime-ui-estate.json
 *   - docs/ui-estate/runtime-ui-estate.md
 *
 * Usage:
 *   node scripts/ui-estate/build-runtime-ui-estate.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, relative, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const OUTPUT_JSON = join(ROOT, 'data/ui-estate/runtime-ui-estate.json');
const OUTPUT_MD = join(ROOT, 'docs/ui-estate/runtime-ui-estate.md');
const CHECKLIST_JSON = join(ROOT, 'data/ui-estate/runtime-ui-audit-checklist.json');
const CHECKLIST_MD = join(ROOT, 'docs/ui-estate/runtime-ui-audit-checklist.md');
const CHECKLIST_OVERRIDES_JSON = join(ROOT, 'data/ui-estate/runtime-ui-audit-overrides.json');

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function readText(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

function readJson(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readText(abs));
  } catch {
    return null;
  }
}

function readJsonAbs(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readText(filePath));
  } catch {
    return null;
  }
}

function rel(filePath) {
  return relative(ROOT, filePath).replace(/\\/g, '/');
}

function walk(dir, predicate) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
      results.push(...walk(full, predicate));
    } else if (entry.isFile() && predicate(entry.name, full)) {
      results.push(full);
    }
  }
  return results;
}

function routeFromPage(rootDir, pageFile) {
  const route = relative(rootDir, pageFile)
    .replace(/\\/g, '/')
    .replace(/\/page\.tsx?$/, '')
    .replace(/^page$/, '')
    .replace(/\[(\.\.\.)?([^\]]+)\]/g, ':$2');
  return route ? `/${route}` : '/';
}

function scanNextApp(appName, appDir) {
  const pages = walk(appDir, (name) => name === 'page.tsx' || name === 'page.ts');
  const routes = pages.map((file) => ({
    route: routeFromPage(appDir, file),
    file: rel(file),
  }));
  return {
    app: appName,
    type: 'next-app',
    pageCount: routes.length,
    routes,
  };
}

function scanMobile() {
  const screensDir = join(ROOT, 'apps/mobile/src/screens');
  const appFile = join(ROOT, 'apps/mobile/src/App.tsx');
  const screens = walk(screensDir, (name) => name.endsWith('Screen.tsx') || name.endsWith('Screen.ts'))
    .map((file) => ({
      id: basename(file).replace(/\.tsx?$/, ''),
      file: rel(file),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return {
    app: 'mobile',
    type: 'react-native',
    appShell: existsSync(appFile) ? rel(appFile) : null,
    screenCount: screens.length,
    screens,
  };
}

function scanDesktop() {
  const files = ['main.js', 'preload.js', 'splash.html']
    .map((name) => join(ROOT, 'apps/desktop', name))
    .filter((file) => existsSync(file))
    .map((file) => rel(file));
  return {
    app: 'desktop',
    type: 'electron-shell',
    shellFileCount: files.length,
    files,
  };
}

function countStatus(content, status) {
  const matches = content.match(new RegExp(`status:\\s*'${status}'`, 'g'));
  return matches ? matches.length : 0;
}

function scanPanelRegistry() {
  const filePath = join(ROOT, 'apps/web/src/lib/vista-panel-registry.ts');
  if (!existsSync(filePath)) return null;
  const content = readText(filePath);
  const ids = [...content.matchAll(/\{\s*id:\s*'([^']+)'/g)].map((match) => match[1]);
  const categories = [...content.matchAll(/category:\s*'([^']+)'/g)].map((match) => match[1]);
  const tiers = [...content.matchAll(/tier:\s*(\d+)/g)].map((match) => Number(match[1]));
  return {
    file: rel(filePath),
    panelCount: ids.length,
    uniqueCategories: [...new Set(categories)].sort(),
    tierCounts: Array.from(new Set(tiers)).sort((a, b) => a - b).map((tier) => ({
      tier,
      count: tiers.filter((value) => value === tier).length,
    })),
    sampleIds: ids.slice(0, 20),
  };
}

function scanActionRegistry() {
  const filePath = join(ROOT, 'apps/web/src/actions/actionRegistry.ts');
  if (!existsSync(filePath)) return null;
  const content = readText(filePath);
  const actionIds = [...content.matchAll(/actionId:\s*'([^']+)'/g)].map((match) => match[1]);
  return {
    file: rel(filePath),
    actionCount: actionIds.length,
    statuses: {
      wired: countStatus(content, 'wired'),
      requires_config: countStatus(content, 'requires_config'),
      'unsupported-in-sandbox': countStatus(content, 'unsupported-in-sandbox'),
      stub: countStatus(content, 'stub'),
    },
    sampleActionIds: actionIds.slice(0, 20),
  };
}

function scanDocsModules() {
  const docsDir = join(ROOT, 'docs/modules');
  if (!existsSync(docsDir)) return null;
  const entries = readdirSync(docsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  return {
    dir: rel(docsDir),
    moduleDocCount: entries.length,
    sampleNamespaces: entries.slice(0, 25),
  };
}

function scanCertification() {
  const data = readJson('data/vista/package-certification.json');
  const packages = Array.isArray(data?.packages) ? data.packages : [];
  const certificationCounts = {};
  for (const pkg of packages) {
    const key = pkg.certification || 'unknown';
    certificationCounts[key] = (certificationCounts[key] || 0) + 1;
  }
  return {
    file: 'data/vista/package-certification.json',
    packageCount: packages.length,
    certificationCounts,
  };
}

function scanE2e() {
  const groups = [
    { name: 'web', dir: join(ROOT, 'apps/web/e2e') },
    { name: 'portal', dir: join(ROOT, 'apps/portal/e2e') },
    { name: 'api', dir: join(ROOT, 'apps/api/e2e') },
  ];
  return groups.map((group) => {
    const files = walk(group.dir, (name) => name.endsWith('.spec.ts') || name.endsWith('.spec.tsx'))
      .map((file) => rel(file))
      .sort();
    return {
      app: group.name,
      specCount: files.length,
      files,
    };
  });
}

function scanSupportingArtifacts() {
  const deadClickAudit = join(ROOT, 'artifacts/DEAD_CLICK_AUDIT.csv');
  return {
    deadClickAuditCsv: existsSync(deadClickAudit) ? rel(deadClickAudit) : null,
    hasDeadClickArtifact: existsSync(deadClickAudit),
  };
}

function classifyVistaExpectation(app, routeOrId) {
  const value = routeOrId.toLowerCase();
  if (app === 'web') {
    if (
      value.startsWith('/chart/') ||
      value.startsWith('/cprs/chart/') ||
      value === '/patient-search' ||
      value === '/cprs/patient-search' ||
      value === '/cprs/vista-workspace' ||
      value.startsWith('/encounter/') ||
      value.startsWith('/inpatient/') ||
      value.startsWith('/cprs/nursing') ||
      value.startsWith('/cprs/emar') ||
      value.startsWith('/cprs/messages') ||
      value.startsWith('/cprs/inbox') ||
      value.startsWith('/cprs/handoff') ||
      value.startsWith('/cprs/scheduling') ||
      value.startsWith('/cprs/admin/vista/')
    ) {
      return 'required';
    }
    if (value.startsWith('/cprs/admin/')) return 'mixed';
    return 'not-applicable';
  }
  if (app === 'portal') {
    if (
      value.startsWith('/dashboard/health') ||
      value.startsWith('/dashboard/medications') ||
      value.startsWith('/dashboard/records') ||
      value.startsWith('/dashboard/documents') ||
      value.startsWith('/dashboard/immunizations') ||
      value.startsWith('/dashboard/appointments') ||
      value.startsWith('/dashboard/messages') ||
      value.startsWith('/dashboard/telehealth')
    ) {
      return 'mixed';
    }
    return 'not-applicable';
  }
  if (app === 'mobile' || app === 'desktop') return 'mixed';
  return 'not-applicable';
}

function buildAuditOverrideMap() {
  const data = readJsonAbs(CHECKLIST_OVERRIDES_JSON);
  const items = Array.isArray(data?.items) ? data.items : [];
  const map = new Map();
  for (const item of items) {
    if (!item || typeof item.surfaceId !== 'string') continue;
    map.set(item.surfaceId, item);
  }
  return map;
}

function buildChecklistItem(baseItem, overrides) {
  const override = overrides.get(baseItem.surfaceId);
  if (!override) return baseItem;
  return {
    ...baseItem,
    ...override,
    surfaceId: baseItem.surfaceId,
    app: baseItem.app,
    kind: baseItem.kind,
    label: baseItem.label,
    file: baseItem.file,
    liveVistaExpectation: baseItem.liveVistaExpectation,
  };
}

function buildChecklist(inventory) {
  const items = [];
  const overrides = buildAuditOverrideMap();

  for (const entry of inventory.uiEstate.web.routes) {
    items.push(buildChecklistItem({
      surfaceId: `web:${entry.route}`,
      app: 'web',
      kind: 'route',
      label: entry.route,
      file: entry.file,
      liveVistaExpectation: classifyVistaExpectation('web', entry.route),
      auditStatus: 'unreviewed',
      interactionAudit: 'pending',
      workflowAudit: 'pending',
      responsiveAudit: 'pending',
      accessibilityAudit: 'pending',
      notes: '',
    }, overrides));
  }

  for (const entry of inventory.uiEstate.portal.routes) {
    items.push(buildChecklistItem({
      surfaceId: `portal:${entry.route}`,
      app: 'portal',
      kind: 'route',
      label: entry.route,
      file: entry.file,
      liveVistaExpectation: classifyVistaExpectation('portal', entry.route),
      auditStatus: 'unreviewed',
      interactionAudit: 'pending',
      workflowAudit: 'pending',
      responsiveAudit: 'pending',
      accessibilityAudit: 'pending',
      notes: '',
    }, overrides));
  }

  for (const entry of inventory.uiEstate.marketing.routes) {
    items.push(buildChecklistItem({
      surfaceId: `marketing:${entry.route}`,
      app: 'marketing',
      kind: 'route',
      label: entry.route,
      file: entry.file,
      liveVistaExpectation: classifyVistaExpectation('marketing', entry.route),
      auditStatus: 'unreviewed',
      interactionAudit: 'pending',
      workflowAudit: 'pending',
      responsiveAudit: 'pending',
      accessibilityAudit: 'pending',
      notes: '',
    }, overrides));
  }

  for (const entry of inventory.uiEstate.mobile.screens) {
    items.push(buildChecklistItem({
      surfaceId: `mobile:${entry.id}`,
      app: 'mobile',
      kind: 'screen',
      label: entry.id,
      file: entry.file,
      liveVistaExpectation: classifyVistaExpectation('mobile', entry.id),
      auditStatus: 'unreviewed',
      interactionAudit: 'pending',
      workflowAudit: 'pending',
      responsiveAudit: 'pending',
      accessibilityAudit: 'pending',
      notes: '',
    }, overrides));
  }

  for (const file of inventory.uiEstate.desktop.files) {
    items.push(buildChecklistItem({
      surfaceId: `desktop:${file}`,
      app: 'desktop',
      kind: 'shell',
      label: basename(file),
      file,
      liveVistaExpectation: classifyVistaExpectation('desktop', file),
      auditStatus: 'unreviewed',
      interactionAudit: 'pending',
      workflowAudit: 'pending',
      responsiveAudit: 'not-applicable',
      accessibilityAudit: 'pending',
      notes: '',
    }, overrides));
  }

  const expectationCounts = items.reduce((acc, item) => {
    acc[item.liveVistaExpectation] = (acc[item.liveVistaExpectation] || 0) + 1;
    return acc;
  }, {});

  const auditStatusCounts = items.reduce((acc, item) => {
    acc[item.auditStatus] = (acc[item.auditStatus] || 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: inventory.generatedAt,
    generatedBy: inventory.generatedBy,
    summary: {
      totalSurfaces: items.length,
      expectationCounts,
      auditStatusCounts,
    },
    items,
  };
}

function buildInventory() {
  const web = scanNextApp('web', join(ROOT, 'apps/web/src/app'));
  const portal = scanNextApp('portal', join(ROOT, 'apps/portal/src/app'));
  const marketing = scanNextApp('marketing', join(ROOT, 'apps/marketing/src/app'));
  const mobile = scanMobile();
  const desktop = scanDesktop();
  const e2e = scanE2e();
  const panelRegistry = scanPanelRegistry();
  const actionRegistry = scanActionRegistry();
  const docsModules = scanDocsModules();
  const certification = scanCertification();
  const artifacts = scanSupportingArtifacts();

  const nextAppPageTotal = web.pageCount + portal.pageCount + marketing.pageCount;
  const e2eTotal = e2e.reduce((sum, entry) => sum + entry.specCount, 0);

  return {
    generatedAt: new Date().toISOString(),
    generatedBy: 'Phase 726 - Full Truth And UX Audit',
    summary: {
      nextAppPageTotal,
      mobileScreenTotal: mobile.screenCount,
      desktopShellFileTotal: desktop.shellFileCount,
      e2eSpecTotal: e2eTotal,
      panelRegistryCount: panelRegistry?.panelCount || 0,
      actionRegistryCount: actionRegistry?.actionCount || 0,
      moduleDocCount: docsModules?.moduleDocCount || 0,
      certifiedPackageTotal: certification.packageCount,
    },
    uiEstate: {
      web,
      portal,
      marketing,
      mobile,
      desktop,
    },
    crossChecks: {
      panelRegistry,
      actionRegistry,
      docsModules,
      certification,
      e2e,
      artifacts,
    },
    auditBoundaryNotes: [
      'This inventory is the outer boundary for the full UI and UX audit.',
      'Generated breadth does not imply certified or live-backed completion.',
      'VEHU remains the current truth lane until vista-distro proves parity.',
    ],
  };
}

function toMarkdown(inventory) {
  const { summary, uiEstate, crossChecks } = inventory;
  const lines = [
    '# Runtime UI Estate Inventory',
    '',
    `Generated: ${inventory.generatedAt}`,
    '',
    '## Purpose',
    '',
    'This inventory defines the current runtime UI boundary for the full truth and UX audit.',
    'It is intentionally breadth-first: every user-facing app family is counted and cross-checked against registries, docs, tests, and certification signals.',
    '',
    '## Summary',
    '',
    `- Next.js pages: ${summary.nextAppPageTotal}`,
    `- Mobile screens: ${summary.mobileScreenTotal}`,
    `- Desktop shell files: ${summary.desktopShellFileTotal}`,
    `- E2E specs: ${summary.e2eSpecTotal}`,
    `- VistA panel registry entries: ${summary.panelRegistryCount}`,
    `- CPRS action registry entries: ${summary.actionRegistryCount}`,
    `- Module docs directories: ${summary.moduleDocCount}`,
    `- Package certification entries: ${summary.certifiedPackageTotal}`,
    '',
    '## User-Facing Apps',
    '',
    `- Web pages: ${uiEstate.web.pageCount}`,
    `- Portal pages: ${uiEstate.portal.pageCount}`,
    `- Marketing pages: ${uiEstate.marketing.pageCount}`,
    `- Mobile screens: ${uiEstate.mobile.screenCount}`,
    `- Desktop shell files: ${uiEstate.desktop.shellFileCount}`,
    '',
    '## Cross-Checks',
    '',
    `- Panel registry: ${crossChecks.panelRegistry?.panelCount || 0} entries from ${crossChecks.panelRegistry?.file || 'n/a'}`,
    `- Action registry: ${crossChecks.actionRegistry?.actionCount || 0} entries from ${crossChecks.actionRegistry?.file || 'n/a'}`,
    `- Module docs: ${crossChecks.docsModules?.moduleDocCount || 0} directories under ${crossChecks.docsModules?.dir || 'n/a'}`,
    `- Certification source: ${crossChecks.certification.file}`,
    `- Dead-click artifact present: ${crossChecks.artifacts.hasDeadClickArtifact ? 'yes' : 'no'}`,
    '',
    '## Certification Snapshot',
    '',
  ];

  for (const [status, count] of Object.entries(crossChecks.certification.certificationCounts).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`- ${status}: ${count}`);
  }

  lines.push('', '## Next Actions', '', '- Use this inventory as the outer boundary for the page-by-page and control-by-control audit.', '- Cross-check every visible UI surface against live verification and truthful UX states.', '- Do not treat generated package breadth as equivalent to certified completion.', '');

  return `${lines.join('\n')}\n`;
}

function checklistToMarkdown(checklist) {
  const lines = [
    '# Runtime UI Audit Checklist',
    '',
    `Generated: ${checklist.generatedAt}`,
    '',
    '## Purpose',
    '',
    'This checklist is the audit tracker for every currently inventoried runtime UI surface.',
    'Each item starts as unreviewed and is meant to be advanced through the full interaction, workflow, responsive, accessibility, and live-VistA review process.',
    '',
    '## Summary',
    '',
    `- Total surfaces: ${checklist.summary.totalSurfaces}`,
  ];

  for (const [key, count] of Object.entries(checklist.summary.expectationCounts).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`- ${key}: ${count}`);
  }

  lines.push('');
  lines.push('## Audit Status Counts');
  lines.push('');

  for (const [key, count] of Object.entries(checklist.summary.auditStatusCounts || {}).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`- ${key}: ${count}`);
  }

  lines.push('', '## Override Source', '', `- Manual review overrides live in \
\`${rel(CHECKLIST_OVERRIDES_JSON)}\`.`, '- Surfaces without an override still default to `unreviewed` and `pending`.', '- Use overrides only for evidence-backed review state; do not mark a surface complete from plan prose alone.', '');

  return `${lines.join('\n')}\n`;
}

function main() {
  const inventory = buildInventory();
  const checklist = buildChecklist(inventory);
  ensureDir(OUTPUT_JSON);
  ensureDir(OUTPUT_MD);
  ensureDir(CHECKLIST_JSON);
  ensureDir(CHECKLIST_MD);
  writeFileSync(OUTPUT_JSON, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
  writeFileSync(OUTPUT_MD, toMarkdown(inventory), 'utf8');
  writeFileSync(CHECKLIST_JSON, `${JSON.stringify(checklist, null, 2)}\n`, 'utf8');
  writeFileSync(CHECKLIST_MD, checklistToMarkdown(checklist), 'utf8');
  process.stdout.write(
    `[build-runtime-ui-estate] Wrote ${rel(OUTPUT_JSON)}, ${rel(OUTPUT_MD)}, ${rel(CHECKLIST_JSON)}, and ${rel(CHECKLIST_MD)}\n`
  );
}

main();
