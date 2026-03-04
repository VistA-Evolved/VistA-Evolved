#!/usr/bin/env node
/**
 * Phase 55 -- Build CPRS Parity Matrix v2
 *
 * Cross-references:
 *   1. Delphi RPC extraction    (artifacts/cprs/delphi-rpcs.json)
 *   2. Delphi action extraction  (artifacts/cprs/delphi-actions.json)
 *   3. Delphi form extraction    (artifacts/cprs/delphi-forms.json)
 *   4. Vivian RPC index          (data/vista/vivian/rpc_index.json)
 *   5. API RPC registry          (apps/api/src/vista/rpcRegistry.ts -- via direct import)
 *   6. Web action registry       (apps/web/src/actions/actionRegistry.ts -- via direct import)
 *   7. Core actions contract     (scripts/cprs/core-actions.json)
 *
 * Output:
 *   /artifacts/cprs/parity-matrix.json   -- full machine-readable matrix
 *   /artifacts/cprs/parity-summary.txt   -- human-readable summary
 *
 * Usage: npx tsx scripts/cprs/buildParityMatrix.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const ARTIFACTS = join(ROOT, 'artifacts', 'cprs');

/* ------------------------------------------------------------------ */
/*  Load inputs                                                        */
/* ------------------------------------------------------------------ */

interface DelphiRpcFile {
  _meta: any;
  rpcs: Array<{ name: string; refCount: number; files: string[] }>;
}

interface DelphiActionFile {
  _meta: any;
  actions: Array<{
    identifier: string;
    kind: string;
    handler?: string;
    caption?: string;
    sourceFile: string;
    line: number;
  }>;
}

interface DelphiFormFile {
  _meta: any;
  forms: Array<{
    unitName: string;
    formName: string;
    formClass: string;
    parentClass: string;
    caption: string;
    sourceFile: string;
    componentCount: number;
  }>;
}

interface VivianFile {
  _meta: any;
  rpcs: Array<{ name: string; package?: string }>;
}

interface CoreAction {
  actionId: string;
  label: string;
  category: string;
  requiredRpcs: string[];
  gateLevel: 'must' | 'should' | 'may';
}

function loadJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) {
    console.log(`  WARN: missing ${path}, using empty fallback`);
    return fallback;
  }
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

/* ------------------------------------------------------------------ */
/*  Inline RPC registry + action registry (avoid TS import issues)     */
/* ------------------------------------------------------------------ */
// We parse the .ts files directly to extract data without requiring
// ESM/TypeScript runtime resolution of workspace packages.

function extractRegistryFromTs(filePath: string): { rpcs: string[]; exceptions: string[] } {
  if (!existsSync(filePath)) return { rpcs: [], exceptions: [] };
  const src = readFileSync(filePath, 'utf-8');
  const rpcs: string[] = [];
  const exceptions: string[] = [];

  // name: "XUS SIGNON SETUP" patterns
  for (const m of src.matchAll(/name:\s*"([^"]+)"/g)) {
    rpcs.push(m[1].toUpperCase());
  }

  // RPC_EXCEPTIONS section
  const excBlock = src.indexOf('RPC_EXCEPTIONS');
  if (excBlock > 0) {
    const tail = src.slice(excBlock);
    for (const m of tail.matchAll(/name:\s*"([^"]+)"/g)) {
      exceptions.push(m[1].toUpperCase());
    }
  }

  return { rpcs: [...new Set(rpcs)], exceptions: [...new Set(exceptions)] };
}

interface ActionEntry {
  actionId: string;
  label: string;
  location: string;
  rpcs: string[];
  status: string;
  pendingNote?: string;
}

function extractActionsFromTs(filePath: string): ActionEntry[] {
  if (!existsSync(filePath)) return [];
  const src = readFileSync(filePath, 'utf-8');
  const actions: ActionEntry[] = [];

  // Split on action blocks.  Each block: { actionId: "...", label: "...", ...}
  const blocks = src.split(/\{\s*\n\s*actionId:/);
  for (let i = 1; i < blocks.length; i++) {
    const block = 'actionId:' + blocks[i].split(/\n\s*\}/)[0];
    const id = block.match(/actionId:\s*"([^"]+)"/)?.[1] ?? '';
    const label = block.match(/label:\s*"([^"]+)"/)?.[1] ?? '';
    const location = block.match(/location:\s*"([^"]+)"/)?.[1] ?? '';
    const status = block.match(/status:\s*"([^"]+)"/)?.[1] ?? 'unknown';
    const pendingNote = block.match(/pendingNote:\s*"([^"]+)"/)?.[1];
    const rpcsMatch = block.match(/rpcs:\s*\[([^\]]*)\]/);
    const rpcs: string[] = [];
    if (rpcsMatch) {
      for (const rm of rpcsMatch[1].matchAll(/"([^"]+)"/g)) {
        rpcs.push(rm[1]);
      }
    }
    if (id) actions.push({ actionId: id, label, location, rpcs, status, pendingNote });
  }
  return actions;
}

/* ------------------------------------------------------------------ */
/*  Build matrix                                                       */
/* ------------------------------------------------------------------ */

interface RpcParity {
  name: string;
  inDelphiSource: boolean;
  delphiRefCount: number;
  delphiFiles: string[];
  inVivianIndex: boolean;
  vivianPackage: string;
  inApiRegistry: boolean;
  apiDomain: string;
  isException: boolean;
  wiredInWebAction: boolean;
  webActions: string[];
  status: 'wired' | 'registered' | 'vivian-only' | 'delphi-only' | 'gap';
}

interface ActionParity {
  actionId: string;
  label: string;
  location: string;
  status: string;
  rpcs: string[];
  allRpcsInRegistry: boolean;
  allRpcsInVivian: boolean;
  hasDelphiCounterpart: boolean;
  pendingNote?: string;
}

interface CoreActionGate {
  actionId: string;
  label: string;
  gateLevel: string;
  category: string;
  requiredRpcs: string[];
  webActionFound: boolean;
  webActionStatus: string;
  allRpcsWired: boolean;
  gateResult: 'PASS' | 'WARN' | 'FAIL';
  failReason?: string;
}

function main() {
  mkdirSync(ARTIFACTS, { recursive: true });

  // 1. Load Delphi extractions
  const delphiRpcs = loadJson<DelphiRpcFile>(join(ARTIFACTS, 'delphi-rpcs.json'), {
    _meta: {},
    rpcs: [],
  });
  const delphiActions = loadJson<DelphiActionFile>(join(ARTIFACTS, 'delphi-actions.json'), {
    _meta: {},
    actions: [],
  });
  const delphiForms = loadJson<DelphiFormFile>(join(ARTIFACTS, 'delphi-forms.json'), {
    _meta: {},
    forms: [],
  });

  // 2. Load Vivian index
  const vivian = loadJson<VivianFile>(join(ROOT, 'data', 'vista', 'vivian', 'rpc_index.json'), {
    _meta: {},
    rpcs: [],
  });
  const vivianSet = new Map<string, string>();
  for (const r of vivian.rpcs) vivianSet.set(r.name.toUpperCase(), r.package ?? '');

  // 3. Load API registry
  const reg = extractRegistryFromTs(join(ROOT, 'apps', 'api', 'src', 'vista', 'rpcRegistry.ts'));
  const apiRpcSet = new Set(reg.rpcs);
  const apiExcSet = new Set(reg.exceptions);

  // 4. Load web action registry
  const webActions = extractActionsFromTs(
    join(ROOT, 'apps', 'web', 'src', 'actions', 'actionRegistry.ts')
  );
  const webActionRpcs = new Set<string>();
  const rpcToActions = new Map<string, string[]>();
  for (const a of webActions) {
    for (const rpc of a.rpcs) {
      webActionRpcs.add(rpc.toUpperCase());
      if (!rpcToActions.has(rpc.toUpperCase())) rpcToActions.set(rpc.toUpperCase(), []);
      rpcToActions.get(rpc.toUpperCase())!.push(a.actionId);
    }
  }

  // 5. Load core actions contract
  const coreActions = loadJson<CoreAction[]>(
    join(ROOT, 'scripts', 'cprs', 'core-actions.json'),
    []
  );

  // Build unified RPC set from all sources
  const allRpcNames = new Set<string>();
  for (const r of delphiRpcs.rpcs) allRpcNames.add(r.name.toUpperCase());
  for (const r of vivian.rpcs) allRpcNames.add(r.name.toUpperCase());
  for (const n of apiRpcSet) allRpcNames.add(n);
  for (const n of apiExcSet) allRpcNames.add(n);

  // Build RPC parity rows
  const rpcParity: RpcParity[] = [];
  for (const name of [...allRpcNames].sort()) {
    const delphiEntry = delphiRpcs.rpcs.find((r) => r.name === name);
    const inDelphi = !!delphiEntry;
    const inVivian = vivianSet.has(name);
    const inApi = apiRpcSet.has(name);
    const isExc = apiExcSet.has(name);
    const inWeb = webActionRpcs.has(name);

    let status: RpcParity['status'];
    if (inWeb) status = 'wired';
    else if (inApi || isExc) status = 'registered';
    else if (inVivian && !inDelphi) status = 'vivian-only';
    else if (inDelphi && !inVivian && !inApi) status = 'delphi-only';
    else status = 'gap';

    rpcParity.push({
      name,
      inDelphiSource: inDelphi,
      delphiRefCount: delphiEntry?.refCount ?? 0,
      delphiFiles: delphiEntry?.files ?? [],
      inVivianIndex: inVivian,
      vivianPackage: vivianSet.get(name) ?? '',
      inApiRegistry: inApi || isExc,
      apiDomain: inApi ? 'registered' : isExc ? 'exception' : '',
      isException: isExc,
      wiredInWebAction: inWeb,
      webActions: rpcToActions.get(name) ?? [],
      status,
    });
  }

  // Build action parity rows
  const actionParity: ActionParity[] = webActions.map((a) => {
    const allInReg = a.rpcs.every(
      (r) => apiRpcSet.has(r.toUpperCase()) || apiExcSet.has(r.toUpperCase())
    );
    const allInViv = a.rpcs.every(
      (r) => vivianSet.has(r.toUpperCase()) || apiExcSet.has(r.toUpperCase())
    );
    // Check if any Delphi action has a matching handler name or identifier
    const aIdParts = a.actionId.split('.');
    const hasDelphiMatch = delphiActions.actions.some((da) => {
      const daLower = (da.handler ?? da.identifier).toLowerCase();
      return aIdParts.some((p) => daLower.includes(p));
    });
    return {
      actionId: a.actionId,
      label: a.label,
      location: a.location,
      status: a.status,
      rpcs: a.rpcs,
      allRpcsInRegistry: allInReg,
      allRpcsInVivian: allInViv,
      hasDelphiCounterpart: hasDelphiMatch,
      pendingNote: a.pendingNote,
    };
  });

  // Build core action gates
  const gates: CoreActionGate[] = coreActions.map((ca) => {
    const wa = webActions.find((a) => a.actionId === ca.actionId);
    const found = !!wa;
    const waStatus = wa?.status ?? 'missing';
    const allWired =
      found &&
      waStatus === 'wired' &&
      ca.requiredRpcs.every(
        (r) => apiRpcSet.has(r.toUpperCase()) || apiExcSet.has(r.toUpperCase())
      );

    let gateResult: CoreActionGate['gateResult'] = 'PASS';
    let failReason: string | undefined;

    if (ca.gateLevel === 'must') {
      if (!found) {
        gateResult = 'FAIL';
        failReason = 'Core action missing from web action registry';
      } else if (waStatus === 'stub') {
        gateResult = 'FAIL';
        failReason = `Action is stub (expected wired or integration-pending)`;
      } else if (waStatus === 'integration-pending') {
        gateResult = 'WARN';
        failReason = 'Action integration-pending (acceptable but track)';
      } else if (!allWired) {
        gateResult = 'FAIL';
        failReason = 'Required RPCs not all in API registry';
      }
    } else if (ca.gateLevel === 'should') {
      if (!found) {
        gateResult = 'WARN';
        failReason = 'Should-have action missing from registry';
      } else if (waStatus === 'stub') {
        gateResult = 'WARN';
        failReason = 'Should-have action still stub';
      }
    }
    // "may" level only FAILs if dead-click (wired but RPCs missing)
    if (ca.gateLevel === 'may' && found && waStatus === 'wired' && !allWired) {
      gateResult = 'FAIL';
      failReason = 'Action marked wired but RPCs not in registry (dead click)';
    }

    return {
      actionId: ca.actionId,
      label: ca.label,
      gateLevel: ca.gateLevel,
      category: ca.category,
      requiredRpcs: ca.requiredRpcs,
      webActionFound: found,
      webActionStatus: waStatus,
      allRpcsWired: !!allWired,
      gateResult,
      failReason,
    };
  });

  // Compute summary stats
  const rpcStats = {
    total: rpcParity.length,
    wired: rpcParity.filter((r) => r.status === 'wired').length,
    registered: rpcParity.filter((r) => r.status === 'registered').length,
    vivianOnly: rpcParity.filter((r) => r.status === 'vivian-only').length,
    delphiOnly: rpcParity.filter((r) => r.status === 'delphi-only').length,
    gap: rpcParity.filter((r) => r.status === 'gap').length,
    inDelphi: rpcParity.filter((r) => r.inDelphiSource).length,
    inVivian: rpcParity.filter((r) => r.inVivianIndex).length,
    inApi: rpcParity.filter((r) => r.inApiRegistry).length,
    inWeb: rpcParity.filter((r) => r.wiredInWebAction).length,
  };

  const actionStats = {
    total: actionParity.length,
    wired: actionParity.filter((a) => a.status === 'wired').length,
    pending: actionParity.filter((a) => a.status === 'integration-pending').length,
    stub: actionParity.filter((a) => a.status === 'stub').length,
  };

  const gateStats = {
    total: gates.length,
    pass: gates.filter((g) => g.gateResult === 'PASS').length,
    warn: gates.filter((g) => g.gateResult === 'WARN').length,
    fail: gates.filter((g) => g.gateResult === 'FAIL').length,
  };

  // Write matrix JSON
  const matrix = {
    _meta: {
      generatedAt: new Date().toISOString(),
      phase: 55,
      description: 'CPRS Parity Matrix v2 — Delphi + Vivian + API + Web cross-reference',
      inputs: {
        delphiRpcs: delphiRpcs._meta,
        delphiActions: delphiActions._meta,
        delphiForms: delphiForms._meta,
        vivianRpcs: vivian._meta?.totalRpcs ?? vivian.rpcs.length,
        apiRegistry: reg.rpcs.length,
        apiExceptions: reg.exceptions.length,
        webActions: webActions.length,
        coreActions: coreActions.length,
      },
    },
    summary: { rpc: rpcStats, action: actionStats, coreGates: gateStats },
    rpcParity,
    actionParity,
    formInventory: delphiForms.forms ?? [],
    coreActionGates: gates,
  };

  writeFileSync(join(ARTIFACTS, 'parity-matrix.json'), JSON.stringify(matrix, null, 2));
  console.log(`\nParity matrix written to artifacts/cprs/parity-matrix.json`);

  // Write human-readable summary
  const lines: string[] = [
    '# CPRS Parity Matrix v2 Summary',
    `Generated: ${matrix._meta.generatedAt}`,
    '',
    '## RPC Coverage',
    `  Total unique RPCs:     ${rpcStats.total}`,
    `  In Delphi source:      ${rpcStats.inDelphi}`,
    `  In Vivian index:       ${rpcStats.inVivian}`,
    `  In API registry:       ${rpcStats.inApi}`,
    `  Wired in web actions:  ${rpcStats.inWeb}`,
    '',
    `  Status breakdown:`,
    `    wired:       ${rpcStats.wired}  (RPC has web action)`,
    `    registered:  ${rpcStats.registered}  (in API registry, no web action)`,
    `    vivian-only: ${rpcStats.vivianOnly}  (in Vivian, not in Delphi/API)`,
    `    delphi-only: ${rpcStats.delphiOnly}  (in Delphi source, not in Vivian/API)`,
    `    gap:         ${rpcStats.gap}`,
    '',
    '## Web Action Coverage',
    `  Total actions: ${actionStats.total}`,
    `  Wired:         ${actionStats.wired}`,
    `  Pending:       ${actionStats.pending}`,
    `  Stub:          ${actionStats.stub}`,
    '',
    '## Core Action Gates',
    `  Total: ${gateStats.total}  PASS: ${gateStats.pass}  WARN: ${gateStats.warn}  FAIL: ${gateStats.fail}`,
    '',
  ];

  if (gates.length > 0) {
    lines.push('### Gate Results');
    for (const g of gates) {
      const icon = g.gateResult === 'PASS' ? 'PASS' : g.gateResult === 'WARN' ? 'WARN' : 'FAIL';
      lines.push(`  [${icon}] ${g.actionId} (${g.gateLevel}) -- ${g.label}`);
      if (g.failReason) lines.push(`         ${g.failReason}`);
    }
    lines.push('');
  }

  // Top 20 most-referenced Delphi RPCs not wired
  const unwiredFromDelphi = rpcParity
    .filter((r) => r.inDelphiSource && !r.wiredInWebAction && !r.inApiRegistry)
    .sort((a, b) => b.delphiRefCount - a.delphiRefCount)
    .slice(0, 20);

  if (unwiredFromDelphi.length > 0) {
    lines.push('## Top 20 Delphi RPCs NOT in API/Web (by reference count)');
    for (const r of unwiredFromDelphi) {
      lines.push(
        `  ${r.delphiRefCount.toString().padStart(3)} refs  ${r.name}  [${r.delphiFiles.length} files]`
      );
    }
    lines.push('');
  }

  writeFileSync(join(ARTIFACTS, 'parity-summary.txt'), lines.join('\n'));
  console.log(`Summary written to artifacts/cprs/parity-summary.txt`);

  // Print summary to console
  console.log('\n' + lines.join('\n'));
}

main();
