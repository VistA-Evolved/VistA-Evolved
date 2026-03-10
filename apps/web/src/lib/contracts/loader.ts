/**
 * Contract loader -- loads and validates Phase 10 CPRS contract JSON at runtime.
 * Fails fast with clear errors if any required contract file is missing or malformed.
 */

import type { TabsContract, MenusContract, ContractTab, ContractMenuItem } from './types';

/* ------------------------------------------------------------------ */
/* Static contract data (inlined from design/contracts/cprs/v1/)       */
/* We import statically so Next.js can tree-shake and bundle them.     */
/* ------------------------------------------------------------------ */

import tabsData from './data/tabs.json';
import menusData from './data/menus.json';

/* ------------------------------------------------------------------ */
/* Validation helpers                                                  */
/* ------------------------------------------------------------------ */

function assertField(obj: unknown, field: string, ctx: string): void {
  if (typeof obj !== 'object' || obj === null || !(field in obj)) {
    throw new Error(`Contract validation failed: missing "${field}" in ${ctx}`);
  }
}

function validateTabs(data: unknown): TabsContract {
  const d = data as TabsContract;
  assertField(d, '_meta', 'tabs.json');
  assertField(d, 'mainTabs', 'tabs.json');
  if (!Array.isArray(d.mainTabs) || d.mainTabs.length === 0) {
    throw new Error('Contract validation failed: mainTabs is empty');
  }
  for (const tab of d.mainTabs) {
    if (!tab.constant || !tab.label || typeof tab.id !== 'number') {
      throw new Error(`Contract validation failed: invalid tab entry "${tab.constant}"`);
    }
  }
  return d;
}

function validateMenus(data: unknown): MenusContract {
  const d = data as MenusContract;
  assertField(d, '_meta', 'menus.json');
  assertField(d, 'mainMenus', 'menus.json');
  if (!Array.isArray(d.mainMenus) || d.mainMenus.length === 0) {
    throw new Error('Contract validation failed: mainMenus is empty');
  }
  return d;
}

/* ------------------------------------------------------------------ */
/* Loaded & validated contracts                                        */
/* ------------------------------------------------------------------ */

const tabs: TabsContract = validateTabs(tabsData);
const menus: MenusContract = validateMenus(menusData);

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Canonical tab slug from constant name (CT_COVER -> cover) */
function constantToSlug(constant: string): string {
  return constant.replace(/^CT_/, '').toLowerCase();
}

/** Tab order for display: Cover Sheet first, then creation order */
export function getChartTabs(): Array<ContractTab & { slug: string }> {
  const sorted = [...tabs.mainTabs].sort((a, b) => {
    // Cover Sheet always first
    if (a.constant === 'CT_COVER') return -1;
    if (b.constant === 'CT_COVER') return 1;
    return a.creationOrder - b.creationOrder;
  });
  return sorted.map((t) => ({ ...t, slug: constantToSlug(t.constant) }));
}

/** Get the main menu for fFrame (the chart frame -- has File/Edit/View/Tools/Help) */
export function getFrameMenu(): ContractMenuItem[] {
  // Look for the fFrame menu first (main chart frame)
  const frameMenu = menus.mainMenus.find((m) => m.file.includes('fFrame'));
  if (frameMenu) return frameMenu.items;
  // Fallback: use first menu with most items
  const sorted = [...menus.mainMenus].sort((a, b) => b.items.length - a.items.length);
  return sorted[0]?.items ?? [];
}

/** Clean Delphi '&' accelerator prefix from captions */
export function cleanCaption(caption: string): string {
  return caption.replace(/&/g, '');
}

/**
 * Sanitize restricted terminology per project rules:
 * - VistAWeb -> Remote Data Viewer
 * - Non-VA Meds -> External Medications
 * - Medical Center references -> Facility
 */
export function sanitizeLabel(text: string): string {
  return text
    .replace(/VistAWeb/gi, 'Remote Data Viewer')
    .replace(/Non-VA\s+Meds?/gi, 'External Medications')
    .replace(/VA\s+Medical\s+Center/gi, 'Facility');
}

/** Get tab slug -> id mapping */
export function getTabIdMap(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of tabs.mainTabs) {
    map[constantToSlug(t.constant)] = t.id;
  }
  return map;
}

/** Get all contract tabs raw */
export function getRawTabs(): TabsContract {
  return tabs;
}

/** Get all contract menus raw */
export function getRawMenus(): MenusContract {
  return menus;
}
