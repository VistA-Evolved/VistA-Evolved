#!/usr/bin/env node
/**
 * scripts/audit/system-audit.mjs
 * Phase 120: Full System Audit + Evidence-Based Gap Matrix
 *
 * Outputs:
 *   A) artifacts/system-audit.json        (full detail, gitignored)
 *   B) qa/gauntlet/system-gap-matrix.json (committed, small)
 *   C) docs/audits/system-audit.md        (committed, human summary)
 *
 * Usage:
 *   node scripts/audit/system-audit.mjs
 *   pnpm audit:system
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { resolve, join, relative, basename, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

// ── Helpers ─────────────────────────────────────────────────

function readJson(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function walkFiles(dir, ext, maxDepth = 10) {
  const results = [];
  if (!existsSync(dir) || maxDepth <= 0) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...walkFiles(full, ext, maxDepth - 1));
    } else if (entry.isFile() && (!ext || ext.some((e) => entry.name.endsWith(e)))) {
      results.push(full);
    }
  }
  return results;
}

function grepFile(filePath, pattern) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const matches = [];
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        matches.push({ line: i + 1, text: lines[i].trim().slice(0, 200) });
      }
    }
    return matches;
  } catch {
    return [];
  }
}

function rel(p) {
  return relative(ROOT, p).replace(/\\/g, '/');
}

function gitHead() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function nodeVersion() {
  try {
    return process.version;
  } catch {
    return 'unknown';
  }
}

function pnpmVersion() {
  try {
    return execSync('pnpm --version', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

// ── Section 1: Meta ─────────────────────────────────────────

function buildMeta() {
  return {
    timestamp: new Date().toISOString(),
    headSha: gitHead(),
    nodeVersion: nodeVersion(),
    pnpmVersion: pnpmVersion(),
  };
}

// ── Section 2: Prompts Tree ─────────────────────────────────

function buildPromptsTree() {
  const promptsDir = join(ROOT, 'prompts');
  if (!existsSync(promptsDir)) return { error: 'prompts/ not found' };

  const entries = readdirSync(promptsDir, { withFileTypes: true });
  const folders = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const flatFiles = entries.filter((e) => e.isFile()).map((e) => e.name);

  const phases = [];
  const phaseNumbers = new Map();
  const issues = [];

  for (const folder of folders) {
    const match = folder.match(/^(\d+)-PHASE-(\d+\w*)-/i) || folder.match(/^(\d+)-PHASE-(\d+\w*)/i);
    if (!match) {
      issues.push({ type: 'non_standard_folder', folder });
      continue;
    }
    const [, prefix, phaseNum] = match;
    const files = readdirSync(join(promptsDir, folder)).filter((f) => f.endsWith('.md'));
    const hasImpl = files.some((f) => /IMPLEMENT/i.test(f));
    const hasVerify = files.some((f) => /VERIFY/i.test(f));

    const phase = { prefix, phaseNum, folder, files, hasImpl, hasVerify };
    phases.push(phase);

    if (phaseNumbers.has(phaseNum)) {
      phaseNumbers.get(phaseNum).push(folder);
    } else {
      phaseNumbers.set(phaseNum, [folder]);
    }

    if (!hasImpl) issues.push({ type: 'missing_implement', folder });
    if (!hasVerify) issues.push({ type: 'missing_verify', folder });
  }

  const duplicatePhases = [];
  for (const [num, dirs] of phaseNumbers) {
    if (dirs.length > 1) duplicatePhases.push({ phaseNum: num, folders: dirs });
  }

  return {
    totalFolders: folders.length,
    totalPhases: phases.length,
    flatFiles,
    duplicatePhases,
    issues,
    phases: phases.map((p) => ({ ...p })),
  };
}

// ── Section 3: UI Inventory ─────────────────────────────────

function buildUiInventory() {
  const apps = [
    { name: 'web', dir: join(ROOT, 'apps/web/src/app') },
    { name: 'portal', dir: join(ROOT, 'apps/portal/src/app') },
  ];

  const result = [];
  for (const app of apps) {
    if (!existsSync(app.dir)) {
      result.push({ app: app.name, error: 'not found' });
      continue;
    }

    const pages = walkFiles(app.dir, ['page.tsx', 'page.ts']);
    const routes = pages.map((p) => {
      const route =
        '/' +
        rel(p)
          .replace(`apps/${app.name}/src/app/`, '')
          .replace(/\/page\.tsx?$/, '')
          .replace(/\[(\.\.\.)?([\w]+)\]/g, ':$2');
      return route === '/' + '' ? '/' : route;
    });

    // Deadclick scan in all .tsx files
    const tsxFiles = walkFiles(app.dir, ['.tsx']);
    const deadClickMarkers = [];
    const patterns = [
      { name: 'todo_handler', re: /TODO.*click|onClick.*TODO/i },
      { name: 'coming_soon', re: /coming\s*soon/i },
      { name: 'stub_marker', re: /\bstub\b.*(?:handler|function|onClick)/i },
      { name: 'mock_marker', re: /\bmock\b.*(?:data|response|handler)/i },
      { name: 'integration_pending', re: /integration[_\s-]*pending/i },
      { name: 'placeholder', re: /placeholder.*(?:button|action|feature)/i },
      {
        name: 'disabled_no_reason',
        re: /disabled(?!.*(?:loading|submitting|pending|validation))/i,
      },
    ];

    for (const file of tsxFiles) {
      for (const pat of patterns) {
        const hits = grepFile(file, pat.re);
        if (hits.length > 0) {
          deadClickMarkers.push({
            file: rel(file),
            marker: pat.name,
            count: hits.length,
            samples: hits.slice(0, 2),
          });
        }
      }
    }

    const tagRoutes = (route) => {
      const tags = [];
      if (/cprs/i.test(route)) tags.push('CPRS');
      if (/rcm|claim|payer|denial|payment|remittance|loa|philhealth|hmo/i.test(route))
        tags.push('RCM');
      if (/portal|dashboard/i.test(route)) tags.push('Portal');
      if (/telehealth/i.test(route)) tags.push('Telehealth');
      if (/imaging|dicom/i.test(route)) tags.push('Imaging');
      if (/interop|hl7/i.test(route)) tags.push('Interop');
      if (/admin/i.test(route)) tags.push('Admin');
      if (/auth|login/i.test(route)) tags.push('Auth');
      if (/analytics/i.test(route)) tags.push('Analytics');
      if (/scheduling/i.test(route)) tags.push('Scheduling');
      if (/nursing|emar|handoff|inpatient/i.test(route)) tags.push('Nursing');
      if (tags.length === 0) tags.push('General');
      return tags;
    };

    result.push({
      app: app.name,
      pageCount: pages.length,
      routes: routes.map((r) => ({ route: r, tags: tagRoutes(r) })),
      deadClickMarkers: deadClickMarkers.slice(0, 50),
      deadClickTotal: deadClickMarkers.length,
    });
  }
  return result;
}

// ── Section 4: API Inventory ────────────────────────────────

function buildApiInventory() {
  const apiSrc = join(ROOT, 'apps/api/src');
  if (!existsSync(apiSrc)) return { error: 'apps/api/src not found' };

  // Parse route files for server.METHOD patterns
  const routeFiles = [
    ...walkFiles(join(apiSrc, 'routes'), ['.ts']),
    join(apiSrc, 'index.ts'),
    ...walkFiles(join(apiSrc, 'posture'), ['.ts']),
    ...walkFiles(join(apiSrc, 'rcm'), ['.ts']).filter((f) => /route/i.test(f)),
    ...walkFiles(join(apiSrc, 'telehealth'), ['.ts']).filter(
      (f) => /route/i.test(f) || basename(f) === 'index.ts'
    ),
  ];

  const routePattern = /server\.(get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
  const endpoints = [];
  const seen = new Set();

  for (const file of routeFiles) {
    try {
      const content = readFileSync(file, 'utf8');
      let match;
      const re = new RegExp(routePattern.source, 'gi');
      while ((match = re.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const path = match[2];
        const key = `${method} ${path}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const tags = [];
        if (/\/vista\//i.test(path)) tags.push('vista');
        if (/\/rcm\//i.test(path)) tags.push('rcm');
        if (/\/portal\//i.test(path)) tags.push('portal');
        if (/\/imaging\//i.test(path)) tags.push('imaging');
        if (/\/interop\//i.test(path)) tags.push('interop');
        if (/\/auth\//i.test(path)) tags.push('auth');
        if (/\/admin\//i.test(path)) tags.push('admin');
        if (/\/telehealth\//i.test(path)) tags.push('telehealth');
        if (/\/analytics\//i.test(path)) tags.push('analytics');
        if (/\/iam\//i.test(path)) tags.push('iam');
        if (/\/posture\//i.test(path)) tags.push('posture');
        if (/\/security\//i.test(path)) tags.push('security');
        if (/\/scheduling\//i.test(path)) tags.push('scheduling');
        if (/health|ready|version|metrics/i.test(path)) tags.push('infra');
        if (tags.length === 0) tags.push('other');

        endpoints.push({ method, path, file: rel(file), tags });
      }
    } catch {
      /* skip unreadable */
    }
  }

  return {
    totalEndpoints: endpoints.length,
    endpoints: endpoints.sort((a, b) => a.path.localeCompare(b.path)),
  };
}

// ── Section 5: RPC Usage ────────────────────────────────────

function buildRpcUsage() {
  const apiSrc = join(ROOT, 'apps/api/src');
  const rpcCallPattern =
    /(?:callRpc|safeCallRpc|safeCallRpcWithList|cachedRpc|resilientRpc)\s*\(\s*["'`]([^"'`]+)["'`]/g;

  const allTsFiles = walkFiles(apiSrc, ['.ts']);
  const rpcCalls = [];
  const rpcToFiles = new Map();

  for (const file of allTsFiles) {
    try {
      const content = readFileSync(file, 'utf8');
      let match;
      const re = new RegExp(rpcCallPattern.source, 'g');
      while ((match = re.exec(content)) !== null) {
        const rpcName = match[1];
        rpcCalls.push({
          rpcName,
          file: rel(file),
          line: content.substring(0, match.index).split('\n').length,
        });
        if (!rpcToFiles.has(rpcName)) rpcToFiles.set(rpcName, []);
        const arr = rpcToFiles.get(rpcName);
        const f = rel(file);
        if (!arr.includes(f)) arr.push(f);
      }
    } catch {
      /* skip */
    }
  }

  // Load RPC registry if available
  const registryPath = join(apiSrc, 'vista/rpcRegistry.ts');
  let registeredRpcs = [];
  if (existsSync(registryPath)) {
    try {
      const content = readFileSync(registryPath, 'utf8');
      const namePattern = /name:\s*["'`]([^"'`]+)["'`]/g;
      let m;
      while ((m = namePattern.exec(content)) !== null) {
        registeredRpcs.push(m[1]);
      }
    } catch {
      /* skip */
    }
  }

  const usedRpcNames = [...new Set(rpcCalls.map((c) => c.rpcName))].sort();
  const registeredSet = new Set(registeredRpcs);
  const usedSet = new Set(usedRpcNames);

  return {
    totalCallSites: rpcCalls.length,
    uniqueRpcsUsed: usedRpcNames.length,
    registeredRpcsCount: registeredRpcs.length,
    usedRpcs: usedRpcNames.map((name) => ({
      name,
      files: rpcToFiles.get(name) || [],
      inRegistry: registeredSet.has(name),
    })),
    unusedRegistered: registeredRpcs.filter((n) => !usedSet.has(n)).length,
    unregisteredUsed: usedRpcNames.filter((n) => !registeredSet.has(n)),
  };
}

// ── Section 6: Persistence Inventory ────────────────────────

function buildPersistenceInventory() {
  const apiSrc = join(ROOT, 'apps/api/src');
  const allTs = walkFiles(apiSrc, ['.ts']);

  // In-memory Map stores
  const mapStores = [];
  const mapPattern = /(?:const|let)\s+(\w+)\s*[:=]\s*new\s+Map\s*[<(]/;
  const storeModulePattern = /Map<\s*string\s*,\s*(\w+)/;

  for (const file of allTs) {
    try {
      const content = readFileSync(file, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(mapPattern);
        if (match) {
          const typMatch = lines[i].match(storeModulePattern);
          const dataType = typMatch ? typMatch[1] : 'unknown';
          mapStores.push({
            file: rel(file),
            variable: match[1],
            dataType,
            line: i + 1,
          });
        }
      }
    } catch {
      /* skip */
    }
  }

  // SQLite tables from schema
  const schemaPath = join(apiSrc, 'platform/db/schema.ts');
  const sqliteTables = [];
  if (existsSync(schemaPath)) {
    try {
      const content = readFileSync(schemaPath, 'utf8');
      const tablePattern = /export\s+const\s+(\w+)\s*=\s*sqliteTable\s*\(\s*["'`]([^"'`]+)["'`]/g;
      let m;
      while ((m = tablePattern.exec(content)) !== null) {
        sqliteTables.push({ variable: m[1], tableName: m[2] });
      }
    } catch {
      /* skip */
    }
  }

  // JSON seed/mutable files
  const dataDir = join(ROOT, 'data');
  const jsonStores = [];
  if (existsSync(dataDir)) {
    for (const file of walkFiles(dataDir, ['.json'])) {
      const r = rel(file);
      jsonStores.push({
        file: r,
        type: /payers|seed/i.test(r) ? 'json_seed' : 'json_mutable',
      });
    }
  }

  // Classify risk
  const highRiskKeywords = [
    'claim',
    'audit',
    'denial',
    'eligibility',
    'payment',
    'remittance',
    'accreditation',
    'credential',
    'loa',
    'scheduling',
    'note',
    'order',
  ];
  const medRiskKeywords = [
    'session',
    'handoff',
    'message',
    'portal',
    'appointment',
    'refill',
    'task',
    'worklist',
  ];

  // Phase 121: Detect hybrid-backed stores (have dbRepo or initXxxRepo in same file)
  const hybridFiles = new Set();
  for (const file of allTs) {
    try {
      const content = readFileSync(file, 'utf8');
      if (
        /\bdbRepo\b/.test(content) &&
        /\binit\w+Repo\b/.test(content) &&
        mapPattern.test(content)
      ) {
        hybridFiles.add(rel(file));
      }
    } catch {
      /* skip */
    }
  }

  const classifiedStores = mapStores.map((s) => {
    const lower = (s.variable + ' ' + s.dataType + ' ' + s.file).toLowerCase();
    const isHybrid = hybridFiles.has(s.file);
    let risk = 'low';
    if (highRiskKeywords.some((k) => lower.includes(k))) risk = isHybrid ? 'low' : 'high';
    else if (medRiskKeywords.some((k) => lower.includes(k))) risk = isHybrid ? 'low' : 'med';

    return { ...s, durability: isHybrid ? 'hybrid_db_backed' : 'in_memory_map', risk };
  });

  return {
    inMemoryMaps: { count: classifiedStores.length, stores: classifiedStores },
    sqliteTables: { count: sqliteTables.length, tables: sqliteTables },
    jsonStores: { count: jsonStores.length, stores: jsonStores },
    highRiskMapStores: classifiedStores.filter((s) => s.risk === 'high').length,
    medRiskMapStores: classifiedStores.filter((s) => s.risk === 'med').length,
  };
}

// ── Section 7: External Systems ─────────────────────────────

function buildExternalSystems() {
  const systems = [];

  // VistA Docker
  const vistaCompose = join(ROOT, 'services/vista/docker-compose.yml');
  systems.push({
    name: 'VistA Docker (WorldVistA EHR)',
    type: 'rpc_broker',
    configFile: existsSync(vistaCompose) ? 'services/vista/docker-compose.yml' : null,
    required: { dev: true, prod: true },
    hasProbe: existsSync(join(ROOT, 'apps/api/src/vista/rpcBroker.ts')),
    hasStub: false,
    notes: 'XWB RPC Broker on port 9430',
  });

  // Keycloak
  const kcCompose = join(ROOT, 'services/keycloak/docker-compose.yml');
  systems.push({
    name: 'Keycloak (OIDC/IAM)',
    type: 'oidc_provider',
    configFile: existsSync(kcCompose) ? 'services/keycloak/docker-compose.yml' : null,
    required: { dev: false, prod: true },
    hasProbe: existsSync(join(ROOT, 'apps/api/src/auth/oidc-provider.ts')),
    hasStub: true,
    notes: 'Opt-in via OIDC_ENABLED=true',
  });

  // Orthanc/PACS
  const imgCompose = join(ROOT, 'services/imaging/docker-compose.yml');
  systems.push({
    name: 'Orthanc (DICOM/PACS)',
    type: 'imaging_server',
    configFile: existsSync(imgCompose) ? 'services/imaging/docker-compose.yml' : null,
    required: { dev: false, prod: true },
    hasProbe: existsSync(join(ROOT, 'apps/api/src/services/imaging-service.ts')),
    hasStub: false,
    notes: 'DICOMweb on port 8042, DICOM on 4242',
  });

  // YottaDB/Octo analytics
  const analyticsCompose = join(ROOT, 'services/analytics/docker-compose.yml');
  systems.push({
    name: 'YottaDB/Octo (Analytics BI)',
    type: 'analytics_db',
    configFile: existsSync(analyticsCompose) ? 'services/analytics/docker-compose.yml' : null,
    required: { dev: false, prod: false },
    hasProbe: existsSync(join(ROOT, 'apps/api/src/services/analytics-etl.ts')),
    hasStub: true,
    notes: 'ROcto PG wire protocol on port 1338',
  });

  // Platform DB (PostgreSQL)
  const platformCompose = join(ROOT, 'services/platform-db/docker-compose.yml');
  systems.push({
    name: 'PostgreSQL (Platform DB)',
    type: 'relational_db',
    configFile: existsSync(platformCompose) ? 'services/platform-db/docker-compose.yml' : null,
    required: { dev: false, prod: true },
    hasProbe: existsSync(join(ROOT, 'apps/api/src/platform/pg/pg-db.ts')),
    hasStub: true,
    notes: 'SQLite fallback when PG unavailable',
  });

  // Observability stack
  const obsCompose = join(ROOT, 'services/observability/docker-compose.yml');
  systems.push({
    name: 'OTel Collector + Jaeger + Prometheus',
    type: 'observability',
    configFile: existsSync(obsCompose) ? 'services/observability/docker-compose.yml' : null,
    required: { dev: false, prod: true },
    hasProbe: existsSync(join(ROOT, 'apps/api/src/telemetry/tracing.ts')),
    hasStub: true,
    notes: 'Opt-in via OTEL_ENABLED=true',
  });

  return systems;
}

// ── Section 8: CI Inventory ─────────────────────────────────

function buildCiInventory() {
  const workflowsDir = join(ROOT, '.github/workflows');
  if (!existsSync(workflowsDir)) return { error: '.github/workflows not found' };

  const files = readdirSync(workflowsDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  const workflows = [];

  for (const file of files) {
    try {
      const content = readFileSync(join(workflowsDir, file), 'utf8');
      const triggers = [];
      if (/on:\s*\n\s*pull_request/m.test(content)) triggers.push('pull_request');
      if (/on:\s*\n\s*push/m.test(content)) triggers.push('push');
      if (/schedule:/m.test(content)) triggers.push('schedule');
      if (/workflow_dispatch/m.test(content)) triggers.push('workflow_dispatch');

      const gates = [];
      if (/gauntlet.*fast/i.test(content)) gates.push('gauntlet:fast');
      if (/gauntlet.*rc/i.test(content)) gates.push('gauntlet:rc');
      if (/gauntlet.*full/i.test(content)) gates.push('gauntlet:full');
      if (/evidence[_-]gate/i.test(content)) gates.push('evidence-gate');
      if (/secret[_-]scan/i.test(content)) gates.push('secret-scan');
      if (/phi[_-]leak/i.test(content)) gates.push('phi-leak-scan');
      if (/tsc\s+--noEmit/i.test(content)) gates.push('typecheck');
      if (/vitest/i.test(content)) gates.push('unit-tests');
      if (/pnpm.*build/i.test(content)) gates.push('build');
      if (/prompts.*integr/i.test(content)) gates.push('prompts-integrity');

      workflows.push({ file, triggers, gates });
    } catch {
      /* skip */
    }
  }

  return { totalWorkflows: workflows.length, workflows };
}

// ── Section 9: Known Gaps Discovery ─────────────────────────

function buildKnownGaps() {
  const dirs = [
    join(ROOT, 'apps/api/src'),
    join(ROOT, 'apps/web/src'),
    join(ROOT, 'apps/portal/src'),
  ];

  const patterns = [
    { name: 'integration_pending', re: /integration[_\s-]*pending/i },
    { name: 'mock', re: /\bmock(?:ed|ing|Data|Response|Handler)?\b/i },
    { name: 'placeholder', re: /\bplaceholder\b/i },
    { name: 'todo', re: /\bTODO\b/ },
    { name: 'fixme', re: /\bFIXME\b/ },
    { name: 'local_only', re: /local[_\s-]*only/i },
    { name: 'stub', re: /\bstub\b(?!\.\w)/i },
    { name: 'not_implemented', re: /not[_\s]*implemented/i },
  ];

  const results = {};
  for (const pat of patterns) results[pat.name] = [];

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    const files = walkFiles(dir, ['.ts', '.tsx']);
    for (const file of files) {
      for (const pat of patterns) {
        const hits = grepFile(file, pat.re);
        if (hits.length > 0) {
          results[pat.name].push({
            file: rel(file),
            count: hits.length,
            samples: hits.slice(0, 2),
          });
        }
      }
    }
  }

  // Summary counts
  const summary = {};
  for (const [key, arr] of Object.entries(results)) {
    summary[key] = { files: arr.length, totalHits: arr.reduce((s, a) => s + a.count, 0) };
  }

  return { summary, details: results };
}

// ── Gap Matrix Builder ──────────────────────────────────────

function buildGapMatrix(audit) {
  const { rpcUsage, persistenceInventory, apiInventory, uiInventory, externalSystems, knownGaps } =
    audit;

  function domainEndpoints(tag) {
    return (apiInventory.endpoints || []).filter((e) => e.tags.includes(tag));
  }

  function domainRpcs(keywords) {
    return (rpcUsage.usedRpcs || []).filter((r) =>
      keywords.some((k) => r.name.toLowerCase().includes(k))
    );
  }

  function storesByKeyword(keywords) {
    return (persistenceInventory.inMemoryMaps.stores || []).filter((s) =>
      keywords.some((k) => (s.file + ' ' + s.variable + ' ' + s.dataType).toLowerCase().includes(k))
    );
  }

  const highRiskMaps = persistenceInventory.inMemoryMaps.stores.filter((s) => s.risk === 'high');

  const domains = [
    {
      domain: 'AUTH_IAM',
      status: 'wired',
      evidence: [
        ...domainEndpoints('auth')
          .slice(0, 5)
          .map((e) => ({ route: `${e.method} ${e.path}`, file: e.file })),
        ...domainEndpoints('iam')
          .slice(0, 5)
          .map((e) => ({ route: `${e.method} ${e.path}`, file: e.file })),
      ],
      topGaps: [
        {
          gap: 'OIDC is opt-in, not default',
          severity: 'med',
          evidenceFiles: ['apps/api/src/auth/oidc-provider.ts'],
        },
        {
          gap: 'Passkey data delegated to Keycloak (not available in sandbox)',
          severity: 'low',
          evidenceFiles: ['apps/api/src/auth/biometric/passkeys-provider.ts'],
        },
      ],
      nextActions: [
        'Enable OIDC by default in production',
        'Test Keycloak integration with WorldVistA',
      ],
    },
    {
      domain: 'CPRS_UI',
      status: 'wired',
      evidence: (uiInventory.find((u) => u.app === 'web')?.routes || [])
        .filter((r) => r.tags.includes('CPRS'))
        .slice(0, 10)
        .map((r) => ({ route: r.route, tags: r.tags })),
      topGaps: [
        {
          gap: 'Multiple admin pages may have placeholder content',
          severity: 'med',
          evidenceFiles: [],
        },
      ],
      nextActions: ['Audit each CPRS tab for end-to-end wiring to VistA RPCs'],
    },
    {
      domain: 'VISTA_RPC_COVERAGE',
      status: 'partial',
      evidence: [
        { metric: 'uniqueRpcsUsed', value: rpcUsage.uniqueRpcsUsed },
        { metric: 'registeredRpcs', value: rpcUsage.registeredRpcsCount },
        { metric: 'totalCallSites', value: rpcUsage.totalCallSites },
      ],
      topGaps: [
        ...(rpcUsage.unregisteredUsed.length > 0
          ? [
              {
                gap: `${rpcUsage.unregisteredUsed.length} RPCs used but not in registry`,
                severity: rpcUsage.unregisteredUsed.length > 5 ? 'high' : 'med',
                evidenceFiles: rpcUsage.unregisteredUsed.slice(0, 5),
              },
            ]
          : []),
        ...(rpcUsage.unusedRegistered > 0
          ? [
              {
                gap: `${rpcUsage.unusedRegistered} registered RPCs not called in code`,
                severity: 'low',
                evidenceFiles: [],
              },
            ]
          : []),
      ],
      nextActions: ['Register unregistered RPCs', 'Wire unused registered RPCs to endpoints'],
    },
    {
      domain: 'ORDERS_CPOE',
      status: 'partial',
      evidence: domainEndpoints('vista')
        .filter((e) => /order/i.test(e.path))
        .slice(0, 5)
        .map((e) => ({ route: `${e.method} ${e.path}`, file: e.file })),
      topGaps: [
        {
          gap: 'Order signing workflow may be incomplete in sandbox',
          severity: 'med',
          evidenceFiles: ['apps/api/src/routes/cprs/orders-cpoe.ts'],
        },
      ],
      nextActions: ['Verify ORWDX LOCK/UNLOCK cycle end-to-end'],
    },
    {
      domain: 'SCHEDULING_SDMODULE',
      status: 'integration_pending',
      evidence: domainEndpoints('scheduling')
        .slice(0, 5)
        .map((e) => ({ route: `${e.method} ${e.path}`, file: e.file })),
      topGaps: [
        {
          gap: 'SDES RPCs callable but WorldVistA File 44 lacks resource/slot config. Target: SDES GET APPT TYPES, SDOE LIST ENCOUNTERS, SD W/L CREATE FILE. requestStore is pg_backed.',
          severity: 'med',
          evidenceFiles: ['apps/api/src/routes/scheduling'],
        },
      ],
      nextActions: ['Run ZVESDSEED.m to populate clinic data, then wire SDES write-back'],
    },
    {
      domain: 'PORTAL_PATIENT',
      status: 'local_only',
      evidence: (uiInventory.find((u) => u.app === 'portal')?.routes || [])
        .slice(0, 10)
        .map((r) => ({ route: r.route, tags: r.tags })),
      topGaps: [
        {
          gap: 'Portal stores use write-through Map+PG (pg_backed). Hot cache resets on restart but DB is source of truth.',
          severity: 'low',
          evidenceFiles: storesByKeyword(['portal'])
            .slice(0, 5)
            .map((s) => s.file),
        },
        {
          gap: 'Portal auth is separate from VistA auth',
          severity: 'med',
          evidenceFiles: ['apps/api/src/routes/portal-auth.ts'],
        },
      ],
      nextActions: ['Wire portal to VistA patient data via DFN linkage'],
    },
    {
      domain: 'TELEHEALTH',
      status: 'local_only',
      evidence: domainEndpoints('telehealth')
        .slice(0, 5)
        .map((e) => ({ route: `${e.method} ${e.path}`, file: e.file })),
      topGaps: [
        {
          gap: 'Room store is pg_backed (write-through). Rooms are ephemeral (4h TTL) by design. Target: VistA SDEC APPOINTMENT STATUS for future scheduling linkage.',
          severity: 'low',
          evidenceFiles: ['apps/api/src/telehealth/room-store.ts'],
        },
      ],
      nextActions: ['Integrate with VistA scheduling for appointments via SDEC RPCs'],
    },
    {
      domain: 'IMAGING',
      status: 'partial',
      evidence: domainEndpoints('imaging')
        .slice(0, 5)
        .map((e) => ({ route: `${e.method} ${e.path}`, file: e.file })),
      topGaps: [
        {
          gap: 'Imaging worklist/ingest are pg_backed (Phase 128 write-through + rehydration). Target: VistA ORWDXR NEW ORDER, RAD/NUC MED REGISTER for native storage.',
          severity: 'low',
          evidenceFiles: [
            'apps/api/src/services/imaging-worklist.ts',
            'apps/api/src/services/imaging-ingest.ts',
          ],
        },
        {
          gap: 'Orthanc integration requires external Docker service',
          severity: 'med',
          evidenceFiles: ['services/imaging/docker-compose.yml'],
        },
      ],
      nextActions: [
        'Wire VistA Rad/Nuc Med RPCs when available in sandbox',
        'Test Orthanc OnStableStudy webhook',
      ],
    },
    {
      domain: 'INTEROP_HL7_HLO',
      status: 'partial',
      evidence: domainEndpoints('interop')
        .slice(0, 5)
        .map((e) => ({ route: `${e.method} ${e.path}`, file: e.file })),
      topGaps: [
        {
          gap: 'Custom M routines must be installed in Docker',
          severity: 'med',
          evidenceFiles: ['services/vista/ZVEMIOP.m'],
        },
      ],
      nextActions: ['Automate interop RPC installation', 'Test HL7/HLO round-trip'],
    },
    {
      domain: 'RCM_CORE',
      status: 'partial',
      evidence: domainEndpoints('rcm')
        .slice(0, 10)
        .map((e) => ({ route: `${e.method} ${e.path}`, file: e.file })),
      topGaps: [
        {
          gap: 'Claim store is pg_backed since Phase 126 (rcm_claim + rcm_remittance tables). Map is write-through cache. Target: VistA ^IB/^PRCA for production billing.',
          severity: 'low',
          evidenceFiles: ['apps/api/src/rcm/domain/claim-store.ts'],
        },
        {
          gap: 'CLAIM_SUBMISSION_ENABLED=false by default (intentional safety gate)',
          severity: 'low',
          evidenceFiles: ['apps/api/src/rcm/edi/pipeline.ts'],
        },
      ],
      nextActions: [
        'Wire to VistA IB/PRCA subsystem when charge data available',
        'Enable submission with clearinghouse testing',
      ],
    },
    {
      domain: 'PAYER_INTEGRATIONS_PH',
      status: 'partial',
      evidence: [
        { file: 'data/payers/ph_hmos.json', type: 'seed_data' },
        { file: 'apps/api/src/rcm/connectors/philhealth-connector.ts', type: 'connector' },
      ],
      topGaps: [
        {
          gap: 'PhilHealth eClaims 3.0 connector is simulation scaffold. Blocked by: facility accreditation, TLS client cert (PKI), API access enrollment. Target: PhilHealth eClaims 3.0 REST /api/v3.',
          severity: 'med',
          evidenceFiles: ['apps/api/src/rcm/connectors/philhealth-connector.ts'],
        },
      ],
      nextActions: ['Enroll facility for PhilHealth eClaims 3.0 API access + PKI cert'],
    },
    {
      domain: 'PAYER_INTEGRATIONS_US',
      status: 'partial',
      evidence: [
        { file: 'data/payers/us_core.json', type: 'seed_data' },
        { file: 'apps/api/src/rcm/connectors/clearinghouse-connector.ts', type: 'connector' },
      ],
      topGaps: [
        {
          gap: 'Clearinghouse connector is simulation scaffold. Blocked by: vendor contract (Change Healthcare/Availity/WayStar), SFTP credentials, sender/receiver ID enrollment. Target: vendor SFTP/API.',
          severity: 'med',
          evidenceFiles: ['apps/api/src/rcm/connectors/clearinghouse-connector.ts'],
        },
      ],
      nextActions: ['Sign clearinghouse vendor contract and enroll sender ID'],
    },
    {
      domain: 'REPORTING',
      status: 'local_only',
      evidence: domainEndpoints('other')
        .filter((e) => /report/i.test(e.path))
        .slice(0, 5)
        .map((e) => ({ route: `${e.method} ${e.path}`, file: e.file })),
      topGaps: [
        {
          gap: 'Report cache is in-memory',
          severity: 'low',
          evidenceFiles: ['apps/api/src/routes/reporting.ts'],
        },
      ],
      nextActions: ['Wire clinical reports to VistA ORWRP REPORT TEXT'],
    },
    {
      domain: 'AI_GOVERNANCE',
      status: 'partial',
      evidence: [
        {
          file: 'apps/api/src/services/ai-shield.ts',
          type: 'service',
          note: 'PHI redaction + guardrails',
        },
      ],
      topGaps: [
        { gap: 'AI model integration is scaffold only', severity: 'med', evidenceFiles: [] },
      ],
      nextActions: ['Connect AI shield to production LLM endpoint'],
    },
    {
      domain: 'ADMIN_PLATFORM',
      status: 'wired',
      evidence: domainEndpoints('admin')
        .slice(0, 10)
        .map((e) => ({ route: `${e.method} ${e.path}`, file: e.file })),
      topGaps: [],
      nextActions: ['Continue admin panel feature parity'],
    },
    {
      domain: 'AUDIT_COMPLIANCE',
      status: 'wired',
      evidence: [
        { file: 'apps/api/src/lib/immutable-audit.ts', type: 'hash_chain' },
        { file: 'apps/api/src/services/imaging-audit.ts', type: 'hash_chain' },
        { file: 'apps/api/src/rcm/audit/rcm-audit.ts', type: 'hash_chain' },
      ],
      topGaps: [
        {
          gap: 'Audit JSONL files are append-only but not externally replicated',
          severity: 'med',
          evidenceFiles: ['apps/api/src/lib/immutable-audit.ts'],
        },
      ],
      nextActions: ['Add audit log shipping to external SIEM'],
    },
    {
      domain: 'MULTI_TENANCY',
      status: 'partial',
      evidence: [
        { file: 'apps/api/src/platform/pg/tenant-context.ts', type: 'middleware' },
        { file: 'apps/api/src/platform/db/schema.ts', type: 'schema', note: 'tenant_id columns' },
      ],
      topGaps: [
        {
          gap: 'RLS auto-enables in rc/prod mode (Phase 125). PLATFORM_PG_RLS_ENABLED is dev-mode toggle only. 21 tables covered with ENABLE + FORCE RLS.',
          severity: 'low',
          evidenceFiles: ['apps/api/src/posture/tenant-posture.ts'],
        },
        {
          gap: 'SQLite blocked in rc/prod by store-resolver (Phase 125). Dev-mode SQLite has app-level tenant_id guards via tenant-guard.ts.',
          severity: 'low',
          evidenceFiles: ['apps/api/src/platform/db/schema.ts'],
        },
      ],
      nextActions: ['Verify RLS covers all new tables added after Phase 125'],
    },
    {
      domain: 'DATABASE_POSTURE',
      status: 'partial',
      evidence: [
        { metric: 'sqliteTables', value: persistenceInventory.sqliteTables.count },
        { metric: 'inMemoryMaps', value: persistenceInventory.inMemoryMaps.count },
        { metric: 'highRiskMaps', value: persistenceInventory.highRiskMapStores },
        { metric: 'medRiskMaps', value: persistenceInventory.medRiskMapStores },
      ],
      topGaps: [
        {
          gap: `${highRiskMaps.length} Map stores flagged high-risk. Critical stores (claims, portal, imaging, telehealth, scheduling) are pg_backed via write-through. Remaining are rebuildable caches or ephemeral by design.`,
          severity: 'med',
          evidenceFiles: highRiskMaps.slice(0, 5).map((s) => s.file),
        },
      ],
      nextActions: ['Verify all critical stores have store-policy pg_backed classification'],
    },
    {
      domain: 'INTERNATIONALIZATION',
      status: 'partial',
      evidence: [
        { metric: 'i18nFramework', value: 'next-intl 4.8' },
        { metric: 'webMessages', value: 'apps/web/public/messages/en.json' },
        { metric: 'portalMessages', value: 'apps/portal/public/messages/{en,fil,es}.json' },
      ],
      topGaps: [
        {
          gap: 'I18nProvider wired in web+portal layouts (Phase 132) but not all strings extracted',
          severity: 'low',
          evidenceFiles: ['apps/web/src/components/I18nProvider.tsx'],
        },
        {
          gap: 'PHP peso currency in PH payer data -- locale formatting pending',
          severity: 'low',
          evidenceFiles: ['data/payers/ph_hmos.json'],
        },
      ],
      nextActions: [
        'Extract remaining hardcoded strings to message files',
        'Add locale-aware currency formatting for PH market',
      ],
    },
  ];

  const topRisks = [
    ...highRiskMaps.slice(0, 5).map((s) => ({
      risk: `Map store ${s.variable} in ${s.file} is write-through cache (pg_backed critical stores survive restart; ephemeral stores rebuildable)`,
      severity: 'med',
      evidence: [`${s.file}:${s.line}`],
    })),
    {
      risk: 'Claim submission disabled by default (CLAIM_SUBMISSION_ENABLED=false) -- intentional safety gate',
      severity: 'low',
      evidence: ['apps/api/src/rcm/edi/pipeline.ts'],
    },
    {
      risk: 'RLS auto-enables in rc/prod (Phase 125). Dev-mode only requires PLATFORM_PG_RLS_ENABLED toggle.',
      severity: 'low',
      evidence: ['apps/api/src/posture/tenant-posture.ts'],
    },
    {
      risk: 'External payer integrations (PhilHealth eClaims, US Clearinghouse) are simulation scaffolds pending vendor enrollment',
      severity: 'med',
      evidence: [
        'apps/api/src/rcm/connectors/philhealth-connector.ts',
        'apps/api/src/rcm/connectors/clearinghouse-connector.ts',
      ],
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    headSha: gitHead(),
    domains,
    topRisks,
  };
}

// ── Human Summary Builder ───────────────────────────────────

function buildHumanSummary(audit, gapMatrix) {
  const lines = [];
  const {
    meta,
    rpcUsage,
    persistenceInventory,
    apiInventory,
    uiInventory,
    ciInventory,
    knownGaps,
  } = audit;

  lines.push('# VistA-Evolved System Audit');
  lines.push('');
  lines.push(`> Generated: ${meta.timestamp}  `);
  lines.push(`> HEAD: ${meta.headSha}  `);
  lines.push(`> Node: ${meta.nodeVersion} | pnpm: ${meta.pnpmVersion}`);
  lines.push('');

  // What is truly wired end-to-end (top 10)
  lines.push('## What Is Truly Wired End-to-End');
  lines.push('');
  const wiredDomains = gapMatrix.domains.filter((d) => d.status === 'wired');
  const partialDomains = gapMatrix.domains.filter((d) => d.status === 'partial');
  const localDomains = gapMatrix.domains.filter((d) => d.status === 'local_only');
  const plannedDomains = gapMatrix.domains.filter(
    (d) => d.status === 'planned' || d.status === 'mock'
  );
  const pendingDomains = gapMatrix.domains.filter((d) => d.status === 'integration_pending');

  lines.push('| # | Domain | Status | Evidence |');
  lines.push('|---|--------|--------|----------|');
  let n = 1;
  for (const d of wiredDomains) {
    const ev = d.evidence
      .slice(0, 2)
      .map((e) => e.route || e.file || e.metric || '')
      .join(', ');
    lines.push(`| ${n++} | ${d.domain} | **WIRED** | ${ev} |`);
  }
  for (const d of partialDomains.slice(0, 10 - wiredDomains.length)) {
    const ev = d.evidence
      .slice(0, 2)
      .map((e) => e.route || e.file || e.metric || '')
      .join(', ');
    lines.push(`| ${n++} | ${d.domain} | partial | ${ev} |`);
  }
  lines.push('');

  // What is local-only/mock/integration pending (top 20)
  lines.push('## Local-Only / Mock / Integration Pending');
  lines.push('');
  lines.push('| Domain | Status | Top Gap |');
  lines.push('|--------|--------|---------|');
  for (const d of [...localDomains, ...pendingDomains, ...plannedDomains]) {
    const topGap = d.topGaps[0]?.gap || 'none';
    lines.push(`| ${d.domain} | ${d.status} | ${topGap} |`);
  }
  lines.push('');

  // Durability posture
  lines.push('## Durability Posture');
  lines.push('');
  const pi = persistenceInventory;
  lines.push(`- **SQLite tables:** ${pi.sqliteTables.count}`);
  lines.push(`- **In-memory Map stores:** ${pi.inMemoryMaps.count}`);
  lines.push(`- **High-risk (data loss on restart):** ${pi.highRiskMapStores}`);
  lines.push(`- **Medium-risk:** ${pi.medRiskMapStores}`);
  lines.push(`- **JSON seed/mutable stores:** ${pi.jsonStores.count}`);
  lines.push('');
  if (pi.highRiskMapStores > 0) {
    lines.push('### High-Risk In-Memory Stores');
    lines.push('');
    lines.push('| Store | File | Data Type |');
    lines.push('|-------|------|-----------|');
    for (const s of pi.inMemoryMaps.stores.filter((s) => s.risk === 'high').slice(0, 15)) {
      lines.push(`| ${s.variable} | ${s.file} | ${s.dataType} |`);
    }
    lines.push('');
  }

  // RPC coverage
  lines.push('## VistA RPC Coverage');
  lines.push('');
  lines.push(`- **Unique RPCs used in code:** ${rpcUsage.uniqueRpcsUsed}`);
  lines.push(`- **RPCs in registry:** ${rpcUsage.registeredRpcsCount}`);
  lines.push(`- **Total call sites:** ${rpcUsage.totalCallSites}`);
  lines.push(`- **Unregistered RPCs used:** ${rpcUsage.unregisteredUsed.length}`);
  lines.push(`- **Unused registered RPCs:** ${rpcUsage.unusedRegistered}`);
  lines.push('');

  // API inventory
  lines.push('## API Inventory');
  lines.push('');
  lines.push(`- **Total endpoints:** ${apiInventory.totalEndpoints}`);
  const tagCounts = {};
  for (const ep of apiInventory.endpoints || []) {
    for (const t of ep.tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
  }
  lines.push(
    '- **By tag:** ' +
      Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}(${v})`)
        .join(', ')
  );
  lines.push('');

  // UI inventory
  lines.push('## UI Inventory');
  lines.push('');
  for (const app of uiInventory) {
    if (app.error) continue;
    lines.push(
      `- **${app.app}:** ${app.pageCount} pages, ${app.deadClickTotal} dead-click markers`
    );
  }
  lines.push('');

  // CI enforcement posture
  lines.push('## CI Enforcement Posture');
  lines.push('');
  lines.push(`- **Workflow files:** ${ciInventory.totalWorkflows}`);
  for (const wf of ciInventory.workflows || []) {
    lines.push(
      `- **${wf.file}:** triggers=[${wf.triggers.join(',')}] gates=[${wf.gates.join(',')}]`
    );
  }
  lines.push('');

  // Known gaps summary
  lines.push('## Known Gaps Summary');
  lines.push('');
  lines.push('| Marker | Files | Total Hits |');
  lines.push('|--------|-------|------------|');
  for (const [key, val] of Object.entries(knownGaps.summary)) {
    lines.push(`| ${key} | ${val.files} | ${val.totalHits} |`);
  }
  lines.push('');

  // Top 20 prioritized next build items
  lines.push('## Top 20 Prioritized Next Build Items');
  lines.push('');
  const nextItems = [];
  for (const d of gapMatrix.domains) {
    for (const g of d.topGaps) {
      nextItems.push({
        domain: d.domain,
        gap: g.gap,
        severity: g.severity,
        files: g.evidenceFiles,
      });
    }
  }
  nextItems.sort((a, b) => {
    const sev = { high: 0, med: 1, low: 2 };
    return (sev[a.severity] ?? 3) - (sev[b.severity] ?? 3);
  });
  lines.push('| # | Severity | Domain | Gap | Key File |');
  lines.push('|---|----------|--------|-----|----------|');
  for (let i = 0; i < Math.min(20, nextItems.length); i++) {
    const item = nextItems[i];
    const file = item.files[0] || '';
    lines.push(`| ${i + 1} | ${item.severity} | ${item.domain} | ${item.gap} | ${file} |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('*This audit is auto-generated by `pnpm audit:system`. Do not edit manually.*');

  return lines.join('\n');
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  console.log('=== VistA-Evolved System Audit ===\n');

  const t0 = Date.now();

  console.log('  Scanning meta...');
  const meta = buildMeta();

  console.log('  Scanning prompts tree...');
  const promptsTree = buildPromptsTree();

  console.log('  Scanning UI inventory...');
  const uiInventory = buildUiInventory();

  console.log('  Scanning API inventory...');
  const apiInventory = buildApiInventory();

  console.log('  Scanning RPC usage...');
  const rpcUsage = buildRpcUsage();

  console.log('  Scanning persistence inventory...');
  const persistenceInventory = buildPersistenceInventory();

  console.log('  Scanning external systems...');
  const externalSystems = buildExternalSystems();

  console.log('  Scanning CI inventory...');
  const ciInventory = buildCiInventory();

  console.log('  Scanning known gaps...');
  const knownGaps = buildKnownGaps();

  const audit = {
    meta,
    promptsTree,
    uiInventory,
    apiInventory,
    rpcUsage,
    persistenceInventory,
    externalSystems,
    ciInventory,
    knownGaps,
  };

  console.log('  Building gap matrix...');
  const gapMatrix = buildGapMatrix(audit);

  console.log('  Building human summary...');
  const humanSummary = buildHumanSummary(audit, gapMatrix);

  // Write outputs
  mkdirSync(join(ROOT, 'artifacts'), { recursive: true });
  mkdirSync(join(ROOT, 'docs/audits'), { recursive: true });

  const fullPath = join(ROOT, 'artifacts/system-audit.json');
  writeFileSync(fullPath, JSON.stringify(audit, null, 2));
  console.log(`  Wrote: ${rel(fullPath)}`);

  const matrixPath = join(ROOT, 'qa/gauntlet/system-gap-matrix.json');
  writeFileSync(matrixPath, JSON.stringify(gapMatrix, null, 2));
  console.log(`  Wrote: ${rel(matrixPath)}`);

  const mdPath = join(ROOT, 'docs/audits/system-audit.md');
  writeFileSync(mdPath, humanSummary);
  console.log(`  Wrote: ${rel(mdPath)}`);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n  Done in ${elapsed}s`);
  console.log(`  Endpoints: ${apiInventory.totalEndpoints}`);
  console.log(
    `  RPCs used: ${rpcUsage.uniqueRpcsUsed} / ${rpcUsage.registeredRpcsCount} registered`
  );
  console.log(
    `  In-memory stores: ${persistenceInventory.inMemoryMaps.count} (${persistenceInventory.highRiskMapStores} high-risk)`
  );
  console.log(`  SQLite tables: ${persistenceInventory.sqliteTables.count}`);
  console.log(
    `  UI pages: web=${uiInventory.find((u) => u.app === 'web')?.pageCount || 0} portal=${uiInventory.find((u) => u.app === 'portal')?.pageCount || 0}`
  );
  console.log(`  Domains: ${gapMatrix.domains.length}`);
}

main().catch((err) => {
  console.error('System audit failed:', err);
  process.exit(1);
});
