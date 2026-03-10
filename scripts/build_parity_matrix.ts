#!/usr/bin/env node
/**
 * Phase 37B -- Step 3: Parity Matrix Builder
 *
 * Triangulates three sources:
 *   1. docs/grounding/cprs-contract.extracted.json (Delphi CPRS contract)
 *   2. Runtime RPC catalog snapshot (from /vista/rpc-catalog or file)
 *   3. docs/grounding/vivian-index.json (VistA package grounding)
 *
 * Outputs:
 *   - docs/grounding/parity-matrix.json (machine readable)
 *   - docs/grounding/parity-matrix.md (human readable)
 *
 * Usage: npx tsx scripts/build_parity_matrix.ts [--rpc-file <path>]
 *
 * The --rpc-file flag accepts a JSON file with runtime RPC data.
 * Without it, the script attempts to fetch from http://localhost:3001/vista/rpc-catalog.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const GROUNDING = join(ROOT, 'docs', 'grounding');

// ---- Helpers ----

function loadJSON(path: string) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function formatDate() {
  return new Date().toISOString().split('T')[0];
}

// ---- Known wired RPCs in the API (from index.ts routes) ----
const WIRED_RPCS: Record<string, { endpoint: string; method: string; phase: string }> = {
  'ORQPT DEFAULT PATIENT LIST': {
    endpoint: 'GET /vista/default-patient-list',
    method: 'GET',
    phase: '4A',
  },
  'ORWPT LIST ALL': { endpoint: 'GET /vista/patient-search', method: 'GET', phase: '4B' },
  'ORWPT SELECT': { endpoint: 'GET /vista/patient-demographics', method: 'GET', phase: '5B' },
  'ORQQAL LIST': { endpoint: 'GET /vista/allergies', method: 'GET', phase: '5C' },
  'ORWDAL32 SAVE ALLERGY': { endpoint: 'POST /vista/allergies', method: 'POST', phase: '5D' },
  'ORQQVI VITALS': { endpoint: 'GET /vista/vitals', method: 'GET', phase: '6A' },
  'GMV ADD VM': { endpoint: 'POST /vista/vitals', method: 'POST', phase: '6B' },
  'TIU DOCUMENTS BY CONTEXT': { endpoint: 'GET /vista/notes', method: 'GET', phase: '7A' },
  'TIU CREATE RECORD': { endpoint: 'POST /vista/notes', method: 'POST', phase: '7B' },
  'TIU SET RECORD TEXT': { endpoint: 'POST /vista/notes', method: 'POST', phase: '7B' },
  'ORWPS ACTIVE': { endpoint: 'GET /vista/medications', method: 'GET', phase: '8A' },
  'ORWORR GETTXT': { endpoint: 'GET /vista/medications', method: 'GET', phase: '8A' },
  'ORWDXM AUTOACK': { endpoint: 'POST /vista/medications', method: 'POST', phase: '8B' },
  'ORWCH PROBLEM LIST': { endpoint: 'GET /vista/problems', method: 'GET', phase: '9A' },
  'ORQQCN LIST': { endpoint: 'GET /vista/consults', method: 'GET', phase: '12A' },
  'ORQQCN DETAIL': { endpoint: 'GET /vista/consults/detail', method: 'GET', phase: '12A' },
  'ORWSR LIST': { endpoint: 'GET /vista/surgery', method: 'GET', phase: '12B' },
  'ORWLRR INTERIM': { endpoint: 'GET /vista/labs', method: 'GET', phase: '12D' },
  'ORWRP REPORT LISTS': { endpoint: 'GET /vista/reports', method: 'GET', phase: '12E' },
  'ORWRP REPORT TEXT': { endpoint: 'GET /vista/reports/text', method: 'GET', phase: '12E' },
  'TIU GET RECORD TEXT': { endpoint: 'GET /vista/tiu-text', method: 'GET', phase: '12C' },
  'ORQQPL4 LEX': { endpoint: 'GET /vista/icd-search', method: 'GET', phase: '12F' },
  'ORWDX LOCK': { endpoint: 'POST /vista/medications', method: 'POST', phase: '14C' },
  'ORWDX UNLOCK': { endpoint: 'POST /vista/medications', method: 'POST', phase: '14C' },
  'XUS SIGNON SETUP': { endpoint: 'POST /auth/login', method: 'POST', phase: '13' },
  'XUS AV CODE': { endpoint: 'POST /auth/login', method: 'POST', phase: '13' },
  'XWB CREATE CONTEXT': { endpoint: 'POST /auth/login', method: 'POST', phase: '13' },
  'XUS GET USER INFO': { endpoint: 'POST /auth/login', method: 'POST', phase: '13' },
  'VE INTEROP HL7 LINKS': { endpoint: 'GET /vista/interop/hl7-links', method: 'GET', phase: '21' },
  'VE INTEROP HL7 MSGS': { endpoint: 'GET /vista/interop/hl7-msgs', method: 'GET', phase: '21' },
  'VE INTEROP HLO STATUS': {
    endpoint: 'GET /vista/interop/hlo-status',
    method: 'GET',
    phase: '21',
  },
  'VE INTEROP QUEUE DEPTH': {
    endpoint: 'GET /vista/interop/queue-depth',
    method: 'GET',
    phase: '21',
  },
  'VE LIST RPCS': { endpoint: 'GET /vista/rpc-catalog', method: 'GET', phase: '37B' },
};

// ---- Tab -> panel wiring ----
const TAB_PANEL_STATUS: Record<
  string,
  { panel: string; status: 'wired' | 'integration-pending' | 'extension'; rpcs: string[] }
> = {
  CT_COVER: {
    panel: 'CoverSheetPanel',
    status: 'wired',
    rpcs: ['ORQQAL LIST', 'ORQQVI VITALS', 'ORWPS ACTIVE', 'ORWCH PROBLEM LIST'],
  },
  CT_PROBLEMS: { panel: 'ProblemsPanel', status: 'wired', rpcs: ['ORWCH PROBLEM LIST'] },
  CT_MEDS: { panel: 'MedsPanel', status: 'wired', rpcs: ['ORWPS ACTIVE', 'ORWORR GETTXT'] },
  CT_ORDERS: { panel: 'OrdersPanel', status: 'wired', rpcs: ['ORWPS ACTIVE'] },
  CT_NOTES: {
    panel: 'NotesPanel',
    status: 'wired',
    rpcs: ['TIU DOCUMENTS BY CONTEXT', 'TIU GET RECORD TEXT', 'TIU CREATE RECORD'],
  },
  CT_CONSULTS: { panel: 'ConsultsPanel', status: 'wired', rpcs: ['ORQQCN LIST', 'ORQQCN DETAIL'] },
  CT_SURGERY: { panel: 'SurgeryPanel', status: 'wired', rpcs: ['ORWSR LIST'] },
  CT_DCSUMM: {
    panel: 'DCSummPanel',
    status: 'wired',
    rpcs: ['TIU DOCUMENTS BY CONTEXT', 'TIU GET RECORD TEXT'],
  },
  CT_LABS: { panel: 'LabsPanel', status: 'wired', rpcs: ['ORWLRR INTERIM'] },
  CT_REPORTS: {
    panel: 'ReportsPanel',
    status: 'wired',
    rpcs: ['ORWRP REPORT LISTS', 'ORWRP REPORT TEXT'],
  },
  CT_INTAKE: { panel: 'IntakePanel', status: 'extension', rpcs: [] },
  CT_TELEHEALTH: { panel: 'TelehealthPanel', status: 'extension', rpcs: [] },
  CT_TASKS: { panel: 'MessagingTasksPanel', status: 'extension', rpcs: [] },
  CT_AIASSIST: { panel: 'AIAssistPanel', status: 'extension', rpcs: [] },
};

// ---- Menu action status (mapped from CPRSMenuBar.tsx handleAction) ----
const MENU_ACTION_STATUS: Record<
  string,
  {
    status: 'wired' | 'integration-pending';
    handler: string;
    targetRpc?: string;
    targetPackage?: string;
  }
> = {
  selectPatient: { status: 'wired', handler: 'router.push(/cprs/patient-search)' },
  refresh: { status: 'wired', handler: 'window.location.reload()' },
  inbox: { status: 'wired', handler: 'router.push(/cprs/inbox)' },
  orderSets: { status: 'wired', handler: 'router.push(/cprs/order-sets)' },
  print: { status: 'wired', handler: 'openModal(print)' },
  printSetup: { status: 'wired', handler: 'openModal(printSetup)' },
  signOut: { status: 'wired', handler: 'logout()' },
  exit: { status: 'wired', handler: 'router.push(/cprs/login)' },
  copy: { status: 'wired', handler: 'navigator.clipboard.writeText()' },
  paste: { status: 'wired', handler: 'navigator.clipboard.readText()' },
  preferences: { status: 'wired', handler: 'router.push(/cprs/settings/preferences)' },
  graphing: { status: 'wired', handler: 'openModal(graphing)' },
  legacyConsole: { status: 'wired', handler: 'openModal(legacyConsole)' },
  remoteData: { status: 'wired', handler: 'openModal(remoteData)' },
  remoteDataPage: { status: 'wired', handler: 'router.push(/cprs/remote-data-viewer)' },
  keyboardShortcuts: { status: 'wired', handler: 'openModal(keyboardShortcuts)' },
  about: { status: 'wired', handler: 'openModal(about)' },
};

// Theme/density/layout actions
for (const t of ['theme:light', 'theme:dark']) {
  MENU_ACTION_STATUS[t] = { status: 'wired', handler: 'updatePreferences({theme})' };
}
for (const d of ['density:comfortable', 'density:compact', 'density:balanced', 'density:dense']) {
  MENU_ACTION_STATUS[d] = { status: 'wired', handler: 'updatePreferences({density})' };
}
for (const l of ['layout:cprs', 'layout:modern']) {
  MENU_ACTION_STATUS[l] = { status: 'wired', handler: 'updatePreferences({layoutMode})' };
}

// Tab navigation actions
for (const slug of [
  'cover',
  'problems',
  'meds',
  'orders',
  'notes',
  'consults',
  'surgery',
  'dcsumm',
  'labs',
  'reports',
]) {
  MENU_ACTION_STATUS[`tab:${slug}`] = {
    status: 'wired',
    handler: `router.push(/cprs/chart/{dfn}/${slug})`,
  };
}

// ---- Main ----

interface RuntimeRpc {
  ien: string;
  name: string;
  tag: string;
  routine: string;
}

async function fetchRuntimeCatalog(rpcFilePath?: string): Promise<RuntimeRpc[]> {
  if (rpcFilePath && existsSync(rpcFilePath)) {
    console.log(`[parity] Loading runtime RPC catalog from file: ${rpcFilePath}`);
    return loadJSON(rpcFilePath);
  }

  // Try fetching from API
  console.log(
    '[parity] Fetching runtime RPC catalog from http://localhost:3001/vista/rpc-catalog...'
  );
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch('http://localhost:3001/vista/rpc-catalog', {
      signal: controller.signal,
      credentials: 'include',
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = (await res.json()) as any;
      const rpcs = data.rpcs || data.catalog || [];
      // Save snapshot
      const snapPath = join(GROUNDING, 'runtime-rpc-catalog.json');
      writeFileSync(snapPath, JSON.stringify(rpcs, null, 2) + '\n');
      console.log(`[parity] Saved runtime snapshot to ${snapPath}`);
      return rpcs;
    }
  } catch {
    // Fallback: empty
  }

  console.log('[parity] Warning: Could not fetch runtime RPC catalog. Using empty set.');
  console.log('[parity] Run API with VistA Docker and install VE LIST RPCS first.');
  return [];
}

async function run() {
  mkdirSync(GROUNDING, { recursive: true });

  // Parse CLI args
  const args = process.argv.slice(2);
  let rpcFilePath: string | undefined;
  const rpcFileIdx = args.indexOf('--rpc-file');
  if (rpcFileIdx >= 0 && args[rpcFileIdx + 1]) {
    rpcFilePath = args[rpcFileIdx + 1];
  }

  // ---- Load sources ----
  const contractPath = join(GROUNDING, 'cprs-contract.extracted.json');
  if (!existsSync(contractPath)) {
    console.error(`[parity] Missing ${contractPath}. Run extract_cprs_contract.mjs first.`);
    process.exit(1);
  }
  const contract = loadJSON(contractPath);

  const vivianPath = join(GROUNDING, 'vivian-index.json');
  let vivianIndex: any = null;
  if (existsSync(vivianPath)) {
    vivianIndex = loadJSON(vivianPath);
  } else {
    console.log('[parity] Warning: vivian-index.json not found. Vivian grounding will be empty.');
  }

  const runtimeRpcs = await fetchRuntimeCatalog(rpcFilePath);
  const runtimeRpcSet = new Set(runtimeRpcs.map((r) => r.name));

  // ---- Build RPC parity entries ----
  type RpcParityEntry = {
    name: string;
    inDelphiSource: boolean;
    referenceCount: number;
    inRuntime: boolean;
    wiredInApi: boolean;
    apiEndpoint?: string;
    apiPhase?: string;
    targetPackage?: string;
    vivianGrounded: boolean;
    status: 'wired' | 'present-unwired' | 'absent';
  };

  const rpcParity: RpcParityEntry[] = [];
  const contractRpcs = contract.rpcs || [];

  // Map RPC prefix to Vivian package
  function guessPackage(rpcName: string): string | undefined {
    if (rpcName.startsWith('OR')) return 'OR';
    if (rpcName.startsWith('TIU')) return 'TIU';
    if (rpcName.startsWith('GMTS')) return 'GMTS';
    if (rpcName.startsWith('GMRA')) return 'GMRA';
    if (rpcName.startsWith('GMV') || rpcName.startsWith('GMRV')) return 'GMR';
    if (rpcName.startsWith('LR') || rpcName.startsWith('LRWU')) return 'LR';
    if (rpcName.startsWith('RA')) return 'RA';
    if (rpcName.startsWith('PSO')) return 'PSO';
    if (rpcName.startsWith('PSJ')) return 'PSJ';
    if (rpcName.startsWith('IB')) return 'IB';
    if (rpcName.startsWith('PRCA') || rpcName.startsWith('RCY')) return 'PRCA';
    if (rpcName.startsWith('XU') || rpcName.startsWith('XWB')) return 'XU';
    if (rpcName.startsWith('HL')) return 'HL';
    if (rpcName.startsWith('DG')) return 'DG';
    if (rpcName.startsWith('DDR')) return 'XU';
    if (rpcName.startsWith('VE ')) return 'VE (custom)';
    return undefined;
  }

  for (const rpc of contractRpcs) {
    const wired = WIRED_RPCS[rpc.name];
    const inRuntime = runtimeRpcSet.has(rpc.name);
    const pkg = guessPackage(rpc.name);
    const vivianGrounded = pkg && vivianIndex?.packages?.[pkg] ? true : false;

    let status: RpcParityEntry['status'] = 'absent';
    if (wired) status = 'wired';
    else if (inRuntime) status = 'present-unwired';

    rpcParity.push({
      name: rpc.name,
      inDelphiSource: true,
      referenceCount: rpc.referenceCount || 0,
      inRuntime,
      wiredInApi: !!wired,
      apiEndpoint: wired?.endpoint,
      apiPhase: wired?.phase,
      targetPackage: pkg,
      vivianGrounded: !!vivianGrounded,
      status,
    });
  }

  // ---- Build tab parity ----
  type TabParityEntry = {
    constant: string;
    label: string;
    delphiOriginal: boolean;
    panelComponent: string;
    status: 'wired' | 'integration-pending' | 'extension';
    rpcsUsed: string[];
    rpcsWired: number;
    rpcsTotal: number;
  };

  const tabParity: TabParityEntry[] = [];
  const delphiTabs = [
    'CT_COVER',
    'CT_PROBLEMS',
    'CT_MEDS',
    'CT_ORDERS',
    'CT_NOTES',
    'CT_CONSULTS',
    'CT_SURGERY',
    'CT_DCSUMM',
    'CT_LABS',
    'CT_REPORTS',
  ];
  const mainTabs = contract.mainTabs || [];

  for (const tab of mainTabs) {
    const panelInfo = TAB_PANEL_STATUS[tab.constant];
    if (!panelInfo) continue;

    tabParity.push({
      constant: tab.constant,
      label: tab.label,
      delphiOriginal: delphiTabs.includes(tab.constant),
      panelComponent: panelInfo.panel,
      status: panelInfo.status,
      rpcsUsed: panelInfo.rpcs,
      rpcsWired: panelInfo.rpcs.filter((r) => WIRED_RPCS[r]).length,
      rpcsTotal: panelInfo.rpcs.length,
    });
  }

  // ---- Build menu action parity ----
  type MenuParityEntry = {
    action: string;
    label: string;
    status: 'wired' | 'integration-pending';
    handler: string;
    targetRpc?: string;
    targetPackage?: string;
  };

  const menuParity: MenuParityEntry[] = [];
  // Build from the 5 menus in CPRSMenuBar
  const menuLabels: Record<string, string> = {};
  const menuItemsFromContract = contract.menuItems || [];
  for (const mi of menuItemsFromContract) {
    menuLabels[mi.name] = mi.path;
  }

  for (const [action, info] of Object.entries(MENU_ACTION_STATUS)) {
    menuParity.push({
      action,
      label: action,
      status: info.status,
      handler: info.handler,
      targetRpc: info.targetRpc,
      targetPackage: info.targetPackage,
    });
  }

  // ---- Summary stats ----
  const totalRpcs = rpcParity.length;
  const wiredRpcs = rpcParity.filter((r) => r.status === 'wired').length;
  const presentUnwired = rpcParity.filter((r) => r.status === 'present-unwired').length;
  const absentRpcs = rpcParity.filter((r) => r.status === 'absent').length;

  const totalTabs = tabParity.length;
  const wiredTabs = tabParity.filter((t) => t.status === 'wired').length;
  const extensionTabs = tabParity.filter((t) => t.status === 'extension').length;
  const pendingTabs = tabParity.filter((t) => t.status === 'integration-pending').length;

  const totalMenuActions = menuParity.length;
  const wiredMenuActions = menuParity.filter((m) => m.status === 'wired').length;
  const pendingMenuActions = menuParity.filter((m) => m.status === 'integration-pending').length;

  const unhandledUiActions = pendingTabs + pendingMenuActions;

  // ---- Write JSON ----
  const matrixJson = {
    _meta: {
      generatedAt: new Date().toISOString(),
      description: 'CPRS Parity Matrix: Delphi contract x Runtime RPCs x Vivian/DOX grounding',
      sources: {
        delphiContract: contractPath,
        runtimeCatalog:
          runtimeRpcs.length > 0 ? 'live /vista/rpc-catalog' : 'empty (API not available)',
        vivianIndex: vivianPath,
      },
    },
    summary: {
      rpc: { total: totalRpcs, wired: wiredRpcs, presentUnwired, absent: absentRpcs },
      tabs: { total: totalTabs, wired: wiredTabs, extension: extensionTabs, pending: pendingTabs },
      menuActions: {
        total: totalMenuActions,
        wired: wiredMenuActions,
        pending: pendingMenuActions,
      },
      unhandledUiActions,
    },
    rpcParity,
    tabParity,
    menuParity,
  };

  const jsonPath = join(GROUNDING, 'parity-matrix.json');
  writeFileSync(jsonPath, JSON.stringify(matrixJson, null, 2) + '\n');
  console.log(`[parity] Wrote ${jsonPath}`);

  // ---- Write Markdown ----
  const md: string[] = [];
  md.push('# CPRS Parity Matrix');
  md.push('');
  md.push(`> Generated: ${formatDate()}`);
  md.push(`>`);
  md.push(`> Sources: Delphi CPRS contract, Runtime VistA RPC catalog, Vivian/DOX grounding`);
  md.push('');
  md.push('## Summary');
  md.push('');
  md.push(`| Dimension | Total | Wired | Present (unwired) | Absent/Pending |`);
  md.push(`|-----------|-------|-------|-------------------|----------------|`);
  md.push(
    `| RPCs (from Delphi) | ${totalRpcs} | ${wiredRpcs} | ${presentUnwired} | ${absentRpcs} |`
  );
  md.push(
    `| Tabs | ${totalTabs} | ${wiredTabs} | - | ${pendingTabs} pending, ${extensionTabs} extensions |`
  );
  md.push(
    `| Menu Actions | ${totalMenuActions} | ${wiredMenuActions} | - | ${pendingMenuActions} |`
  );
  md.push('');
  md.push(`**Unhandled UI actions: ${unhandledUiActions}**`);
  md.push('');

  // Tab parity table
  md.push('## Tab Parity');
  md.push('');
  md.push('| Tab | Panel | Status | RPCs Used | Wired |');
  md.push('|-----|-------|--------|-----------|-------|');
  for (const t of tabParity) {
    md.push(
      `| ${t.label} | ${t.panelComponent} | ${t.status} | ${t.rpcsUsed.join(', ') || '-'} | ${t.rpcsWired}/${t.rpcsTotal} |`
    );
  }
  md.push('');

  // Menu parity table
  md.push('## Menu Action Parity');
  md.push('');
  md.push('| Action | Status | Handler |');
  md.push('|--------|--------|---------|');
  for (const m of menuParity) {
    md.push(`| ${m.action} | ${m.status} | ${m.handler} |`);
  }
  md.push('');

  // RPC parity by status
  md.push('## RPC Parity -- Wired');
  md.push('');
  md.push('| RPC Name | API Endpoint | Phase | Package |');
  md.push('|----------|-------------|-------|---------|');
  for (const r of rpcParity.filter((r) => r.status === 'wired')) {
    md.push(
      `| ${r.name} | ${r.apiEndpoint || '-'} | ${r.apiPhase || '-'} | ${r.targetPackage || '-'} |`
    );
  }
  md.push('');

  md.push('## RPC Parity -- Present in Runtime but Unwired');
  md.push('');
  if (presentUnwired > 0) {
    md.push('| RPC Name | Ref Count | Package | Vivian Grounded |');
    md.push('|----------|-----------|---------|-----------------|');
    for (const r of rpcParity
      .filter((r) => r.status === 'present-unwired')
      .sort((a, b) => b.referenceCount - a.referenceCount)) {
      md.push(
        `| ${r.name} | ${r.referenceCount} | ${r.targetPackage || '-'} | ${r.vivianGrounded ? 'Yes' : 'No'} |`
      );
    }
  } else {
    md.push('_Runtime catalog not available or no unwired RPCs found._');
  }
  md.push('');

  md.push('## RPC Parity -- Top 50 Absent (by reference count)');
  md.push('');
  md.push('| RPC Name | Ref Count | Package | Suggested Next Step |');
  md.push('|----------|-----------|---------|---------------------|');
  const topAbsent = rpcParity
    .filter((r) => r.status === 'absent')
    .sort((a, b) => b.referenceCount - a.referenceCount)
    .slice(0, 50);
  for (const r of topAbsent) {
    const step = r.targetPackage ? `Wire to ${r.targetPackage} package` : 'Identify target package';
    md.push(`| ${r.name} | ${r.referenceCount} | ${r.targetPackage || '?'} | ${step} |`);
  }
  md.push('');

  md.push('## Vivian/DOX Package Grounding');
  md.push('');
  if (vivianIndex?.packages) {
    md.push('| Package | Name | FileMan Files | Routines | Globals |');
    md.push('|---------|------|---------------|----------|---------|');
    for (const [prefix, pkg] of Object.entries(vivianIndex.packages) as [string, any][]) {
      md.push(
        `| ${prefix} | ${pkg.name} | ${(pkg.fileManFiles || []).length} | ${(pkg.routines || []).length} | ${(pkg.globals || []).length} |`
      );
    }
  } else {
    md.push('_Vivian index not available. Run vivian_snapshot.ts first._');
  }
  md.push('');

  md.push('---');
  md.push('');
  md.push(
    '*This report is auto-generated by `scripts/build_parity_matrix.ts`. Do not edit manually.*'
  );
  md.push('');

  const mdPath = join(GROUNDING, 'parity-matrix.md');
  writeFileSync(mdPath, md.join('\n'));
  console.log(`[parity] Wrote ${mdPath}`);
  console.log(
    `[parity] Summary: ${wiredRpcs}/${totalRpcs} RPCs wired, ${wiredTabs}/${totalTabs} tabs wired, ${unhandledUiActions} unhandled UI actions`
  );
}

run().catch((err) => {
  console.error('[parity] Fatal error:', err.message);
  process.exit(1);
});
