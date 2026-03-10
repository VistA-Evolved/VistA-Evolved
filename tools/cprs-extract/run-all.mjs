/**
 * run-all.mjs -- Orchestrator that runs all CPRS extraction scripts in sequence.
 *
 * Output directory: design/contracts/cprs/v1/
 * Files produced:
 *   - tabs.json
 *   - menus.json
 *   - forms.json
 *   - rpc_catalog.json
 *   - screen_registry.json
 *   - coverage_report.md
 */

import { mkdir } from 'node:fs/promises';
import { OUTPUT_DIR } from './lib/paths.mjs';
import { extractTabs } from './extract-tabs.mjs';
import { extractMenus } from './extract-menus.mjs';
import { extractForms } from './extract-forms.mjs';
import { extractRpcs } from './extract-rpcs.mjs';

async function main() {
  const t0 = Date.now();
  console.log('CPRS Delphi Source Extraction');
  console.log('============================\n');

  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Run extractors in sequence (rpcs depends on the others for coverage report)
  console.log('[1/4] Extracting tabs...');
  const tabsResult = await extractTabs();

  console.log('[2/4] Extracting menus...');
  const menusResult = await extractMenus();

  console.log('[3/4] Extracting forms...');
  const formsResult = await extractForms();

  console.log('[4/4] Extracting RPCs + building registry + coverage report...');
  await extractRpcs(formsResult, tabsResult, menusResult);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s -- output in design/contracts/cprs/v1/`);
}

main().catch((err) => {
  console.error('Extraction failed:', err);
  process.exit(1);
});
