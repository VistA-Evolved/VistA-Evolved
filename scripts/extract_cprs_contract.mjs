#!/usr/bin/env node
/**
 * Phase 37B -- Step 0: CPRS Contract Extraction
 *
 * Reads existing design/contracts/cprs/v1/ files and merges them
 * into a single docs/grounding/cprs-contract.extracted.json.
 *
 * This is used by build_parity_matrix.ts for triangulation.
 *
 * Usage: node --experimental-json-modules scripts/extract_cprs_contract.mjs
 *   or:  npx tsx scripts/extract_cprs_contract.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const CONTRACTS_DIR = join(ROOT, 'design', 'contracts', 'cprs', 'v1');
const OUTPUT_DIR = join(ROOT, 'docs', 'grounding');

function loadJSON(filename) {
  const raw = readFileSync(join(CONTRACTS_DIR, filename), 'utf-8');
  return JSON.parse(raw);
}

function run() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('[extract] Loading design contracts from', CONTRACTS_DIR);

  // ---- Load all source contracts ----
  const rpcCatalog = loadJSON('rpc_catalog.json');
  const screenRegistry = loadJSON('screen_registry.json');
  const tabsContract = loadJSON('tabs.json');
  const formsContract = loadJSON('forms.json');

  // Also load the web's menus.json (which has the fFrame main menu)
  const menusPath = join(ROOT, 'apps', 'web', 'src', 'lib', 'contracts', 'data', 'menus.json');
  const menusContract = JSON.parse(readFileSync(menusPath, 'utf-8'));

  // ---- Extract main tabs ----
  const mainTabs = (tabsContract.mainTabs || []).map((t) => ({
    constant: t.constant,
    label: t.label,
    id: t.id,
    creationOrder: t.creationOrder,
    conditional: t.conditional || false,
  }));

  // ---- Extract all RPCs with reference summary ----
  const rpcs = (rpcCatalog.rpcs || []).map((r) => ({
    name: r.name,
    isContext: r.isContext || false,
    referenceCount: (r.references || []).length,
    sourceFiles: [...new Set((r.references || []).map((ref) => ref.file))],
  }));

  // ---- Extract screen -> RPC mapping (simplified) ----
  const screens = {};
  const screenData = screenRegistry.screens || {};
  for (const [screenName, data] of Object.entries(screenData)) {
    const rpcNames = Object.keys(data.rpcs || {});
    screens[screenName] = {
      tab: data.tab || null,
      sourceFiles: data.sourceFiles || [],
      rpcCount: rpcNames.length,
      rpcs: rpcNames,
    };
  }

  // ---- Extract forms summary ----
  const forms = (formsContract.forms || []).map((f) => ({
    file: f.file,
    formName: f.formName,
    formClass: f.formClass,
    caption: f.caption || null,
    features: f.features || {},
  }));

  // ---- Extract frame menu items (fFrame.dfm) ----
  // Also extract menus from all .dfm sources (various forms)
  const allMenuSources = menusContract.mainMenus || [];
  const frameMenu = allMenuSources.find((m) =>
    (m.file || m.sourceFile || '').includes('fFrame.dfm')
  );
  const menuItems = [];
  function extractMenuItems(items, path = '', sourceFile = '') {
    for (const item of items || []) {
      const label = (item.caption || item.name || '').replace(/&/g, '');
      if (label === '-' || !label) continue;
      const fullPath = path ? `${path} > ${label}` : label;
      menuItems.push({
        path: fullPath,
        name: item.name,
        caption: item.caption || item.name,
        shortcut: item.shortcutKey || item.shortcut || null,
        enabled: item.enabled !== false,
        hasChildren: (item.items || []).length > 0,
        sourceFile: sourceFile,
      });
      if (item.items) {
        extractMenuItems(item.items, fullPath, sourceFile);
      }
    }
  }
  // Extract fFrame menu first (main CPRS menu bar)
  if (frameMenu) {
    extractMenuItems(frameMenu.items || [], '', frameMenu.file || 'fFrame.dfm');
  }
  // Also extract from all other form menus for completeness
  for (const menu of allMenuSources) {
    if (menu === frameMenu) continue;
    extractMenuItems(menu.items || [], `[${menu.name || menu.file}]`, menu.file || '');
  }

  // ---- Build UI actions catalog ----
  // Every UI element that a user can interact with
  const uiActions = [];

  // Tabs as actions
  for (const tab of mainTabs) {
    uiActions.push({
      type: 'tab',
      id: `tab:${tab.constant}`,
      label: tab.label,
      source: 'delphi-contract',
    });
  }

  // Menu items as actions (leaf items only)
  for (const mi of menuItems) {
    if (!mi.hasChildren) {
      uiActions.push({
        type: 'menu-item',
        id: `menu:${mi.name}`,
        label: mi.path,
        source: 'delphi-contract',
      });
    }
  }

  // Build output
  const output = {
    _meta: {
      source: 'design/contracts/cprs/v1/',
      generatedAt: new Date().toISOString(),
      description: 'Merged CPRS contract: Delphi tabs, menus, screens, RPCs, forms',
    },
    summary: {
      mainTabCount: mainTabs.length,
      rpcCount: rpcs.length,
      screenCount: Object.keys(screens).length,
      formCount: forms.length,
      menuItemCount: menuItems.length,
      uiActionCount: uiActions.length,
    },
    mainTabs,
    rpcs,
    screens,
    forms,
    menuItems,
    uiActions,
  };

  const outPath = join(OUTPUT_DIR, 'cprs-contract.extracted.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
  console.log(`[extract] Wrote ${outPath}`);
  console.log(
    `[extract] Summary: ${output.summary.mainTabCount} tabs, ${output.summary.rpcCount} RPCs, ${output.summary.screenCount} screens, ${output.summary.formCount} forms, ${output.summary.menuItemCount} menu items, ${output.summary.uiActionCount} UI actions`
  );
}

run();
