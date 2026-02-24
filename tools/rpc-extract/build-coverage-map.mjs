#!/usr/bin/env node
/**
 * build-coverage-map.mjs  --  Phase 106: VistA Alignment Coverage
 *
 * Reads three canonical sources and cross-references them to produce a
 * machine-checkable coverage map:
 *
 *   1. CPRS Delphi extraction   → design/contracts/cprs/v1/rpc_catalog.json
 *   2. Vivian RPC index         → data/vista/vivian/rpc_index.json
 *   3. API RPC registry         → apps/api/src/vista/rpcRegistry.ts
 *   4. Live callRpc sites       → grep through apps/api/src/**\/*.ts
 *   5. Stub routes              → auto-generated routes returning {ok:false}
 *
 * Outputs:
 *   - docs/vista-alignment/rpc-coverage.json   (canonical machine-readable)
 *   - docs/vista-alignment/rpc-coverage.md     (human-readable report)
 *   - apps/web/src/lib/vista-panel-wiring.ts   (dev-mode wiring metadata)
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Strip UTF-8 BOM if present (BUG-064). */
function readJsonFile(path) {
  let raw = readFileSync(path, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return JSON.parse(raw);
}

/** Recursively collect all .ts files under a directory. */
function walkTs(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      results.push(...walkTs(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      results.push(full);
    }
  }
  return results;
}

/* ------------------------------------------------------------------ */
/* 1. Load CPRS RPC catalog                                            */
/* ------------------------------------------------------------------ */

const cprsPath = join(ROOT, 'design/contracts/cprs/v1/rpc_catalog.json');
const cprsCatalog = readJsonFile(cprsPath);
/** Map<UPPER_NAME, { name, isContext, references[] }> */
const cprsMap = new Map();
for (const rpc of cprsCatalog.rpcs) {
  cprsMap.set(rpc.name.toUpperCase(), rpc);
}
console.log(`[cprs] ${cprsMap.size} RPCs from Delphi extraction`);

/* ------------------------------------------------------------------ */
/* 2. Load Vivian RPC index                                            */
/* ------------------------------------------------------------------ */

const vivianPath = join(ROOT, 'data/vista/vivian/rpc_index.json');
const vivianIndex = readJsonFile(vivianPath);
/** Map<UPPER_NAME, { name, package }> */
const vivianMap = new Map();
for (const rpc of vivianIndex.rpcs) {
  vivianMap.set(rpc.name.toUpperCase(), rpc);
}
console.log(`[vivian] ${vivianMap.size} RPCs from Vivian snapshot`);

/* ------------------------------------------------------------------ */
/* 3. Parse rpcRegistry.ts                                             */
/* ------------------------------------------------------------------ */

const registryPath = join(ROOT, 'apps/api/src/vista/rpcRegistry.ts');
const registrySource = readFileSync(registryPath, 'utf8');

// Extract RPC_REGISTRY entries
const registryEntries = [];
const regRx = /\{\s*name:\s*"([^"]+)"\s*,\s*domain:\s*"([^"]+)"\s*,\s*tag:\s*"([^"]+)"\s*,\s*description:\s*"([^"]+)"\s*\}/g;
let m;
while ((m = regRx.exec(registrySource)) !== null) {
  registryEntries.push({ name: m[1], domain: m[2], tag: m[3], description: m[4] });
}
/** Map<UPPER_NAME, { name, domain, tag, description }> */
const registryMap = new Map();
for (const e of registryEntries) {
  registryMap.set(e.name.toUpperCase(), e);
}

// Extract RPC_EXCEPTIONS
const exceptions = [];
const excRx = /\{\s*name:\s*"([^"]+)"\s*,\s*reason:\s*"([^"]+)"\s*\}/g;
while ((m = excRx.exec(registrySource)) !== null) {
  exceptions.push({ name: m[1], reason: m[2] });
}
const exceptionSet = new Set(exceptions.map(e => e.name.toUpperCase()));

console.log(`[registry] ${registryMap.size} registered + ${exceptions.length} exceptions`);

/* ------------------------------------------------------------------ */
/* 4. Scan all .ts files for live RPC call sites                       */
/* ------------------------------------------------------------------ */

const apiSrcDir = join(ROOT, 'apps/api/src');
const tsFiles = walkTs(apiSrcDir);

/**
 * Map<UPPER_NAME, { name, callSites: [{ file, line }] }>
 * "Live" means an actual callRpc / safeCallRpc / etc. invocation.
 */
const liveRpcMap = new Map();
const callRxPatterns = [
  /(?:callRpc|safeCallRpc|safeCallRpcWithList|cachedRpc|resilientRpc)\s*\(\s*["']([^"']+)["']/g,
  /(?:callRpc|safeCallRpc|safeCallRpcWithList|cachedRpc|resilientRpc)\s*\(\s*`([^`]+)`/g,
];

/** Map<file, Set<UPPER_NAME>> for route→RPC mapping */
const fileToRpcs = new Map();

for (const filePath of tsFiles) {
  const src = readFileSync(filePath, 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const rx of callRxPatterns) {
      rx.lastIndex = 0;
      let cm;
      while ((cm = rx.exec(lines[i])) !== null) {
        const rpcName = cm[1];
        const key = rpcName.toUpperCase();
        const relFile = relative(ROOT, filePath).replace(/\\/g, '/');
        if (!liveRpcMap.has(key)) {
          liveRpcMap.set(key, { name: rpcName, callSites: [] });
        }
        liveRpcMap.get(key).callSites.push({ file: relFile, line: i + 1 });
        if (!fileToRpcs.has(relFile)) fileToRpcs.set(relFile, new Set());
        fileToRpcs.get(relFile).add(key);
      }
    }
  }
}
console.log(`[live] ${liveRpcMap.size} unique RPCs with call sites across ${tsFiles.length} files`);

/* ------------------------------------------------------------------ */
/* 5. Detect stub routes                                               */
/* ------------------------------------------------------------------ */

const stubRpcNames = new Set();
const stubRx = /rpcName:\s*"([^"]+)"/g;

for (const filePath of tsFiles) {
  const src = readFileSync(filePath, 'utf8');
  // Only look in files with the stub marker
  if (!src.includes('error: "Not implemented"') && !src.includes("error: 'Not implemented'")) continue;
  let sm;
  stubRx.lastIndex = 0;
  while ((sm = stubRx.exec(src)) !== null) {
    stubRpcNames.add(sm[1].toUpperCase());
  }
}
console.log(`[stubs] ${stubRpcNames.size} stub RPCs detected`);

/* ------------------------------------------------------------------ */
/* 6. Build unified RPC coverage records                               */
/* ------------------------------------------------------------------ */

// Collect the superset of all RPC names
const allNames = new Set([
  ...cprsMap.keys(),
  ...registryMap.keys(),
  ...exceptionSet,
  ...liveRpcMap.keys(),
  ...stubRpcNames,
  // Don't include ALL vivian RPCs — too many (3747). Only include those
  // that overlap with CPRS or registry.
]);

// But DO flag vivian presence for each entry
const records = [];
for (const upperName of [...allNames].sort()) {
  const cprs = cprsMap.get(upperName);
  const vivian = vivianMap.get(upperName);
  const reg = registryMap.get(upperName);
  const isException = exceptionSet.has(upperName);
  const live = liveRpcMap.get(upperName);
  const isStub = stubRpcNames.has(upperName);

  // Determine canonical name
  const canonName = reg?.name ?? live?.name ?? cprs?.name ?? vivian?.name ?? upperName;

  // Determine status
  let status;
  if (live) {
    status = 'wired';
  } else if (reg || isException) {
    status = 'registered';
  } else if (isStub) {
    status = 'stub';
  } else if (cprs && !vivian) {
    status = 'cprs-only';
  } else if (vivian && !cprs) {
    status = 'vivian-only';
  } else {
    status = 'cprs-only'; // in CPRS catalog but might also be in Vivian
  }

  records.push({
    name: canonName,
    inCprs: !!cprs,
    inVivian: !!vivian,
    inRegistry: !!reg,
    isException,
    isLive: !!live,
    isStub,
    domain: reg?.domain ?? (isException ? 'exception' : null),
    tag: reg?.tag ?? null,
    status,
    callSites: live?.callSites ?? [],
    cprsReferences: cprs?.references?.length ?? 0,
    vivianPackage: vivian?.package ?? null,
  });
}

// Also add vivian-only RPCs that are relevant (in registry or CPRS coverage)
// But don't bloat with all 3747 — only the superset already computed.

/* ------------------------------------------------------------------ */
/* 7. Summary statistics                                               */
/* ------------------------------------------------------------------ */

const wiredCount = records.filter(r => r.status === 'wired').length;
const registeredCount = records.filter(r => r.status === 'registered').length;
const stubCount = records.filter(r => r.status === 'stub').length;
const cprsOnlyCount = records.filter(r => r.status === 'cprs-only').length;
const totalCprs = cprsMap.size;
const totalVivian = vivianMap.size;

const summary = {
  totalUniqueCprsRpcs: totalCprs,
  totalUniqueVivianRpcs: totalVivian,
  registeredInApi: registryMap.size,
  exceptionsInApi: exceptions.length,
  liveWired: wiredCount,
  registeredOnly: registeredCount,
  stubbed: stubCount,
  cprsOnlyGap: cprsOnlyCount,
  totalTracked: records.length,
  coverageVsCprs: `${((wiredCount / totalCprs) * 100).toFixed(1)}%`,
  coverageVsVivian: `${((wiredCount / totalVivian) * 100).toFixed(1)}%`,
};

console.log(`\n=== Coverage Summary ===`);
console.log(`  CPRS Delphi RPCs:       ${totalCprs}`);
console.log(`  Vivian RPCs:            ${totalVivian}`);
console.log(`  API registered:         ${registryMap.size} + ${exceptions.length} exceptions`);
console.log(`  Live wired:             ${wiredCount}`);
console.log(`  Registered only:        ${registeredCount}`);
console.log(`  Stub routes:            ${stubCount}`);
console.log(`  CPRS-only gap:          ${cprsOnlyCount}`);
console.log(`  Coverage vs CPRS:       ${summary.coverageVsCprs}`);
console.log(`  Coverage vs Vivian:     ${summary.coverageVsVivian}`);

/* ------------------------------------------------------------------ */
/* 8. Write rpc-coverage.json                                          */
/* ------------------------------------------------------------------ */

const outDir = join(ROOT, 'docs/vista-alignment');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const coverageJson = {
  _meta: {
    generatedAt: new Date().toISOString(),
    tool: 'tools/rpc-extract/build-coverage-map.mjs',
    sources: {
      cprs: { file: 'design/contracts/cprs/v1/rpc_catalog.json', count: totalCprs },
      vivian: { file: 'data/vista/vivian/rpc_index.json', count: totalVivian },
      registry: { file: 'apps/api/src/vista/rpcRegistry.ts', count: registryMap.size },
      exceptions: { count: exceptions.length },
      liveCallSites: { count: liveRpcMap.size },
      stubs: { count: stubRpcNames.size },
    },
    summary,
  },
  rpcs: records,
};

const jsonPath = join(outDir, 'rpc-coverage.json');
writeFileSync(jsonPath, JSON.stringify(coverageJson, null, 2) + '\n');
console.log(`\nWrote ${jsonPath}`);

/* ------------------------------------------------------------------ */
/* 9. Write rpc-coverage.md                                            */
/* ------------------------------------------------------------------ */

const byStatus = {
  wired: records.filter(r => r.status === 'wired'),
  registered: records.filter(r => r.status === 'registered'),
  stub: records.filter(r => r.status === 'stub'),
  'cprs-only': records.filter(r => r.status === 'cprs-only'),
};

let md = `# VistA Alignment Coverage Report

> Auto-generated by \`tools/rpc-extract/build-coverage-map.mjs\`
> Generated: ${new Date().toISOString()}

## Summary

| Metric | Count |
|--------|-------|
| CPRS Delphi RPCs | ${totalCprs} |
| Vivian Index RPCs | ${totalVivian} |
| API Registered (RPC_REGISTRY) | ${registryMap.size} |
| API Exceptions (RPC_EXCEPTIONS) | ${exceptions.length} |
| **Live Wired** | **${wiredCount}** |
| Registered Only (no call site) | ${registeredCount} |
| Stub Routes (not implemented) | ${stubCount} |
| CPRS-Only Gap | ${cprsOnlyCount} |
| Coverage vs CPRS | ${summary.coverageVsCprs} |
| Coverage vs Vivian | ${summary.coverageVsVivian} |

## Status Legend

- **wired**: RPC is registered AND has live \`callRpc\`/\`safeCallRpc\` invocations in route code
- **registered**: RPC is in \`rpcRegistry.ts\` but no live call site found (definition only)
- **stub**: Auto-generated stub route returning \`{ok: false, error: "Not implemented"}\`
- **cprs-only**: Found in CPRS Delphi source but not yet in API registry

---

## Wired RPCs (${byStatus.wired.length})

These RPCs are fully connected to VistA through the RPC Broker.

| RPC Name | Domain | Tag | Call Sites | In CPRS | In Vivian |
|----------|--------|-----|-----------|---------|-----------|
`;

for (const r of byStatus.wired) {
  const sites = r.callSites.map(s => `${s.file}:${s.line}`).join(', ');
  md += `| ${r.name} | ${r.domain ?? '-'} | ${r.tag ?? '-'} | ${r.callSites.length} | ${r.inCprs ? 'Yes' : '-'} | ${r.inVivian ? 'Yes' : '-'} |\n`;
}

md += `\n---\n\n## Registered Only (${byStatus.registered.length})\n\nIn \`rpcRegistry.ts\` but no detected \`callRpc\` invocation. May be called dynamically or through wrappers.\n\n| RPC Name | Domain | Tag | In CPRS | In Vivian |\n|----------|--------|-----|---------|-----------|
`;

for (const r of byStatus.registered) {
  md += `| ${r.name} | ${r.domain ?? '-'} | ${r.tag ?? '-'} | ${r.inCprs ? 'Yes' : '-'} | ${r.inVivian ? 'Yes' : '-'} |\n`;
}

md += `\n---\n\n## Stub Routes (${byStatus.stub.length})\n\nAuto-generated stubs from CPRS extraction. Return \`{ok: false}\` until wired.\n\n| RPC Name | CPRS Refs | In Vivian | Target Domain |\n|----------|-----------|-----------|---------------|\n`;

for (const r of byStatus.stub) {
  // Guess domain from RPC prefix
  let domain = '-';
  if (r.name.startsWith('ORWDPS') || r.name.startsWith('ORWPS') || r.name.startsWith('PSO') || r.name.startsWith('PSB')) domain = 'meds';
  else if (r.name.startsWith('ORQQPL')) domain = 'problems';
  else if (r.name.startsWith('TIU') || r.name.startsWith('ORWTIU')) domain = 'notes';
  else if (r.name.startsWith('ORWDX') || r.name.startsWith('ORWORR')) domain = 'orders';
  else if (r.name.startsWith('ORWLRR') || r.name.startsWith('ORWLAB')) domain = 'labs';
  md += `| ${r.name} | ${r.cprsReferences} | ${r.inVivian ? 'Yes' : '-'} | ${domain} |\n`;
}

md += `\n---\n\n## CPRS-Only Gap (${byStatus['cprs-only'].length})\n\nRPCs found in CPRS Delphi source but not yet addressed in VistA-Evolved.\n\n| RPC Name | CPRS Refs | In Vivian | Prefix |\n|----------|-----------|-----------|--------|\n`;

for (const r of byStatus['cprs-only'].slice(0, 100)) {
  const prefix = r.name.split(' ')[0];
  md += `| ${r.name} | ${r.cprsReferences} | ${r.inVivian ? 'Yes' : '-'} | ${prefix} |\n`;
}
if (byStatus['cprs-only'].length > 100) {
  md += `\n*... and ${byStatus['cprs-only'].length - 100} more (see rpc-coverage.json for full list)*\n`;
}

md += `\n---\n\n## Domain Coverage Breakdown\n\n`;

// Group wired RPCs by domain
const domainGroups = {};
for (const r of records.filter(r => r.domain)) {
  if (!domainGroups[r.domain]) domainGroups[r.domain] = { wired: 0, registered: 0, stub: 0, total: 0 };
  domainGroups[r.domain].total++;
  if (r.status === 'wired') domainGroups[r.domain].wired++;
  else if (r.status === 'registered') domainGroups[r.domain].registered++;
  else if (r.status === 'stub') domainGroups[r.domain].stub++;
}

md += `| Domain | Wired | Registered | Stub | Total |\n|--------|-------|-----------|------|-------|\n`;
for (const [domain, counts] of Object.entries(domainGroups).sort((a, b) => a[0].localeCompare(b[0]))) {
  md += `| ${domain} | ${counts.wired} | ${counts.registered} | ${counts.stub} | ${counts.total} |\n`;
}

md += `\n---\n\n*This report is generated automatically. Regenerate with:*\n\`\`\`bash\nnode tools/rpc-extract/build-coverage-map.mjs\n\`\`\`\n`;

const mdPath = join(outDir, 'rpc-coverage.md');
writeFileSync(mdPath, md);
console.log(`Wrote ${mdPath}`);

/* ------------------------------------------------------------------ */
/* 10. Write panel wiring metadata for dev-mode UI banner              */
/* ------------------------------------------------------------------ */

// Map each UI panel to its API routes and wiring status
const panelWiring = [
  { panel: 'CoverSheetPanel', routes: ['/vista/allergies', '/vista/problems', '/vista/vitals', '/vista/notes', '/vista/medications'], rpcs: ['ORQQAL LIST', 'ORQQPL PROBLEM LIST', 'ORQQVI VITALS', 'TIU DOCUMENTS BY CONTEXT', 'ORWPS ACTIVE'] },
  { panel: 'ProblemsPanel', routes: ['/vista/problems'], rpcs: ['ORQQPL PROBLEM LIST', 'ORQQPL ADD SAVE', 'ORQQPL EDIT SAVE'] },
  { panel: 'MedsPanel', routes: ['/vista/medications'], rpcs: ['ORWPS ACTIVE'] },
  { panel: 'OrdersPanel', routes: ['/vista/cprs/orders'], rpcs: ['ORWORR AGET', 'ORWDX SAVE', 'ORWDX LOCK', 'ORWDX UNLOCK', 'ORWOR1 SIG'] },
  { panel: 'NotesPanel', routes: ['/vista/cprs/notes'], rpcs: ['TIU DOCUMENTS BY CONTEXT', 'TIU CREATE RECORD', 'TIU SIGN RECORD', 'TIU GET RECORD TEXT'] },
  { panel: 'ConsultsPanel', routes: ['/vista/consults'], rpcs: ['ORQQCN LIST', 'ORQQCN DETAIL'] },
  { panel: 'LabsPanel', routes: ['/vista/labs'], rpcs: ['ORWLRR INTERIM', 'ORWLRR CHART'] },
  { panel: 'ReportsPanel', routes: ['/vista/reports'], rpcs: ['ORWRP REPORT LISTS', 'ORWRP REPORT TEXT'] },
  { panel: 'SurgeryPanel', routes: ['/vista/surgery'], rpcs: ['ORWSR LIST', 'ORWSR RPTLIST'] },
  { panel: 'DCSummPanel', routes: ['/vista/dc-summaries'], rpcs: ['TIU DOCUMENTS BY CONTEXT'] },
  { panel: 'ImagingPanel', routes: ['/imaging'], rpcs: ['MAG4 PAT GET IMAGES', 'MAGG PAT PHOTOS'] },
  { panel: 'ImmunizationsPanel', routes: ['/vista/immunizations'], rpcs: ['ORQQPX IMMUN LIST'] },
  { panel: 'ADTPanel', routes: ['/adt'], rpcs: ['ORQPT WARDS', 'ORQPT WARD PATIENTS', 'ORQPT PROVIDER PATIENTS'] },
  { panel: 'NursingPanel', routes: ['/nursing'], rpcs: ['ORQQVI VITALS FOR DATE RANGE'] },
  { panel: 'TelehealthPanel', routes: ['/telehealth'], rpcs: [] },
  { panel: 'MessagingTasksPanel', routes: ['/messaging'], rpcs: ['ZVE MAIL FOLDERS', 'ZVE MAIL LIST'] },
  { panel: 'AIAssistPanel', routes: [], rpcs: [] },
  { panel: 'IntakePanel', routes: ['/intake'], rpcs: [] },
  { panel: 'RpcDebugPanel', routes: ['/ws/console'], rpcs: [] },
  { panel: 'PatientLOAPanel', routes: ['/inpatient/loa'], rpcs: [] },
];

// Resolve wiring status for each panel
const panelWiringResolved = panelWiring.map(p => {
  const rpcStatuses = p.rpcs.map(rpcName => {
    const upper = rpcName.toUpperCase();
    const isLive = liveRpcMap.has(upper);
    const isRegistered = registryMap.has(upper) || exceptionSet.has(upper);
    return {
      name: rpcName,
      wired: isLive,
      registered: isRegistered,
    };
  });
  const allWired = p.rpcs.length > 0 && rpcStatuses.every(r => r.wired);
  const anyWired = rpcStatuses.some(r => r.wired);
  const pendingRpcs = rpcStatuses.filter(r => !r.wired).map(r => r.name);

  return {
    panel: p.panel,
    wiredToVista: allWired,
    partiallyWired: anyWired && !allWired,
    noVista: p.rpcs.length === 0,
    routes: p.routes,
    totalRpcs: p.rpcs.length,
    wiredRpcs: rpcStatuses.filter(r => r.wired).length,
    pendingRpcs,
  };
});

// Generate TypeScript source
let tsSrc = `/**
 * vista-panel-wiring.ts -- Auto-generated panel wiring metadata for dev-mode banner.
 *
 * Generated by: tools/rpc-extract/build-coverage-map.mjs
 * Generated at: ${new Date().toISOString()}
 *
 * DO NOT EDIT BY HAND -- re-run the generator to update.
 */

export interface PanelWiring {
  panel: string;
  /** true if ALL RPCs for this panel have live callRpc invocations */
  wiredToVista: boolean;
  /** true if SOME but not all RPCs are wired */
  partiallyWired: boolean;
  /** true if panel has no VistA RPCs at all (e.g., Telehealth, AI) */
  noVista: boolean;
  routes: string[];
  totalRpcs: number;
  wiredRpcs: number;
  /** RPC names that are NOT yet wired */
  pendingRpcs: string[];
}

export const PANEL_WIRING: PanelWiring[] = ${JSON.stringify(panelWiringResolved, null, 2)};

/** Quick lookup by panel name */
export function getPanelWiring(panelName: string): PanelWiring | undefined {
  return PANEL_WIRING.find(p => p.panel === panelName);
}
`;

const wiringPath = join(ROOT, 'apps/web/src/lib/vista-panel-wiring.ts');
const wiringDir = dirname(wiringPath);
if (!existsSync(wiringDir)) mkdirSync(wiringDir, { recursive: true });
writeFileSync(wiringPath, tsSrc);
console.log(`Wrote ${wiringPath}`);

console.log('\nDone. Run verify-phase106-vista-alignment.ps1 to validate.');
