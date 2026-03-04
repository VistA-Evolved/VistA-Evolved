/**
 * extract-tabs.mjs — Extract tab labels, order, and position from CPRS Delphi source.
 *
 * Sources:
 *   - uConst.pas: CT_* constants define tab IDs
 *   - fFrame.pas: CreateTab() calls define label + order
 *   - fFrame.dfm: tabPage TTabControl shows TabPosition (tpBottom = bottom tabs)
 *   - *.dfm: any TPageControl / TTabControl / TTabSheet for sub-tabs
 *
 * Output: design/contracts/cprs/v1/tabs.json
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { globDfmFiles, globPasFiles, CPRS_CHART_DIR, OUTPUT_DIR } from './lib/paths.mjs';

/**
 * Parse CT_* constants from uConst.pas
 */
async function parseCtConstants() {
  const constFile = join(CPRS_CHART_DIR, 'uConst.pas');
  const src = await readFile(constFile, 'latin1');
  const re = /CT_(\w+)\s*=\s*(\d+)\s*;.*?\/\/\s*(.*)/g;
  const constants = {};
  let m;
  while ((m = re.exec(src)) !== null) {
    constants[`CT_${m[1]}`] = { id: parseInt(m[2], 10), comment: m[3].trim() };
  }
  return constants;
}

/**
 * Parse CreateTab() calls from fFrame.pas to get tab labels and creation order.
 */
async function parseFrameTabs() {
  const frameFile = join(CPRS_CHART_DIR, 'fFrame.pas');
  const src = await readFile(frameFile, 'latin1');
  // CreateTab(CT_PROBLEMS, 'Problems');
  const re = /CreateTab\(\s*(CT_\w+)\s*,\s*'([^']+)'\s*\)/g;
  const tabs = [];
  let m;
  let order = 0;
  while ((m = re.exec(src)) !== null) {
    tabs.push({
      constant: m[1],
      label: m[2],
      creationOrder: order++,
    });
  }
  // Check for conditional tabs (e.g., Surgery)
  const conditionalRe = /if\s+(\w+)\s+then\s+CreateTab\(\s*(CT_\w+)\s*,\s*'([^']+)'\s*\)/g;
  // Already captured above — annotate conditional ones
  const condRe = /if\s+\w+\s+then\s+CreateTab\(\s*(CT_\w+)/g;
  const conditionals = new Set();
  while ((m = condRe.exec(src)) !== null) {
    conditionals.add(m[1]);
  }
  for (const tab of tabs) {
    tab.conditional = conditionals.has(tab.constant);
  }
  return tabs;
}

/**
 * Parse the main tabPage control from fFrame.dfm to check TabPosition.
 */
async function parseFrameDfmTabPosition() {
  const dfmFile = join(CPRS_CHART_DIR, 'fFrame.dfm');
  const src = await readFile(dfmFile, 'latin1');

  // Find the tabPage TTabControl block
  const tabPageMatch = src.match(
    /object\s+tabPage\s*:\s*TTabControl[\s\S]*?(?=\n\s{2,4}(?:object|end)\b)/
  );
  if (!tabPageMatch) return { position: 'unknown', align: 'unknown' };

  const block = tabPageMatch[0];
  const posMatch = block.match(/TabPosition\s*=\s*(\w+)/);
  const alignMatch = block.match(/Align\s*=\s*(\w+)/);

  return {
    position: posMatch ? posMatch[1] : 'tpTop',
    align: alignMatch ? alignMatch[1] : 'unknown',
  };
}

/**
 * Scan all .dfm files for TPageControl, TTabControl, TTabSheet instances.
 * Returns sub-tab info across all forms.
 */
async function parseAllDfmTabs() {
  const dfmFiles = await globDfmFiles();
  const allTabs = [];

  for (const filePath of dfmFiles) {
    const src = await readFile(filePath, 'latin1');
    const relPath = filePath.replace(/\\/g, '/').split('CPRS-Chart/')[1] || filePath;

    // Find TPageControl / TTabControl
    const controlRe = /object\s+(\w+)\s*:\s*T(PageControl|TabControl)/g;
    let m;
    while ((m = controlRe.exec(src)) !== null) {
      const controlName = m[1];
      const controlType = m[2];

      // Find TabPosition if present
      const afterControl = src.slice(m.index, m.index + 2000);
      const posMatch = afterControl.match(/TabPosition\s*=\s*(\w+)/);

      allTabs.push({
        file: relPath,
        controlName,
        controlType: `T${controlType}`,
        tabPosition: posMatch ? posMatch[1] : 'tpTop',
      });
    }

    // Find TTabSheet instances (children of page controls)
    const sheetRe = /object\s+(\w+)\s*:\s*TTabSheet/g;
    while ((m = sheetRe.exec(src)) !== null) {
      const sheetName = m[1];
      // Try to find Caption
      const afterSheet = src.slice(m.index, m.index + 500);
      const captionMatch = afterSheet.match(/Caption\s*=\s*'([^']+)'/);

      allTabs.push({
        file: relPath,
        controlName: sheetName,
        controlType: 'TTabSheet',
        caption: captionMatch ? captionMatch[1] : sheetName,
      });
    }
  }
  return allTabs;
}

export async function extractTabs() {
  const [ctConstants, frameTabs, mainTabPosition, subTabs] = await Promise.all([
    parseCtConstants(),
    parseFrameTabs(),
    parseFrameDfmTabPosition(),
    parseAllDfmTabs(),
  ]);

  // Merge CT_ constant info into frame tabs
  const mainTabs = frameTabs.map((tab) => ({
    ...tab,
    id: ctConstants[tab.constant]?.id ?? null,
    description: ctConstants[tab.constant]?.comment ?? '',
    tabPosition: mainTabPosition.position,
    align: mainTabPosition.align,
    isBottomTab: mainTabPosition.position === 'tpBottom',
  }));

  const result = {
    _meta: {
      source: 'reference/cprs/Packages/Order Entry Results Reporting/CPRS/CPRS-Chart/',
      extractedAt: new Date().toISOString(),
      description: 'CPRS main chart tabs and sub-tabs extracted from Delphi source',
    },
    mainTabControl: {
      component: 'tabPage',
      type: 'TTabControl',
      tabPosition: mainTabPosition.position,
      align: mainTabPosition.align,
      isBottomTabs: mainTabPosition.position === 'tpBottom',
    },
    mainTabs,
    subTabs: subTabs.filter(
      (t) => t.controlType === 'TTabSheet' || t.controlType === 'TPageControl'
    ),
    allTabControls: subTabs.filter(
      (t) => t.controlType === 'TPageControl' || t.controlType === 'TTabControl'
    ),
    summary: {
      mainTabCount: mainTabs.length,
      subTabSheetCount: subTabs.filter((t) => t.controlType === 'TTabSheet').length,
      pageControlCount: subTabs.filter((t) => t.controlType === 'TPageControl').length,
      tabControlCount: subTabs.filter((t) => t.controlType === 'TTabControl').length,
      bottomTabControls: subTabs.filter((t) => t.tabPosition === 'tpBottom').length,
    },
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(join(OUTPUT_DIR, 'tabs.json'), JSON.stringify(result, null, 2));
  console.log(
    `  ✓ tabs.json — ${result.summary.mainTabCount} main tabs, ${result.summary.subTabSheetCount} sub-tabs`
  );
  return result;
}

// Allow direct execution
if (
  import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('extract-tabs.mjs')
) {
  extractTabs().catch(console.error);
}
