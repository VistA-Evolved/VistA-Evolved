/**
 * extract-rpcs.mjs — Extract all RPC names and where they're referenced.
 *
 * Sources:
 *   - All .pas files under CPRS-Chart and broader CPRS tree
 *   - RPC call patterns:
 *       sCallV('RPC NAME', [...])
 *       tCallV(result, 'RPC NAME', [...])
 *       CallV('RPC NAME', [...])
 *       CallVistA('RPC NAME', [...], ...)
 *       RemoteProcedure := 'RPC NAME'
 *       Broker.remoteprocedure := 'RPC NAME'
 *       CreateContext('CONTEXT NAME')
 *
 * Output:
 *   - design/contracts/cprs/v1/rpc_catalog.json
 *   - design/contracts/cprs/v1/screen_registry.json
 *   - design/contracts/cprs/v1/coverage_report.md
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { globPasFiles, CPRS_CHART_DIR, OUTPUT_DIR } from './lib/paths.mjs';

/**
 * Known screen → tab mappings derived from CPRS tab constants + form names.
 */
const SCREEN_MAP = {
  fCover: { screen: 'Cover Sheet', tab: 'CT_COVER' },
  fProbs: { screen: 'Problem List', tab: 'CT_PROBLEMS' },
  fMeds: { screen: 'Medications', tab: 'CT_MEDS' },
  fNotes: { screen: 'Progress Notes', tab: 'CT_NOTES' },
  fConsults: { screen: 'Consults', tab: 'CT_CONSULTS' },
  fDCSumm: { screen: 'Discharge Summaries', tab: 'CT_DCSUMM' },
  fLabs: { screen: 'Laboratory', tab: 'CT_LABS' },
  fReports: { screen: 'Reports', tab: 'CT_REPORTS' },
  fSurgery: { screen: 'Surgery', tab: 'CT_SURGERY' },
  fGraphs: { screen: 'Graphs', tab: 'CT_GRAPHS' },
  fvit: { screen: 'Vitals', tab: 'CT_VITALS' },
  fVitals: { screen: 'Vitals', tab: 'CT_VITALS' },
  fPtSel: { screen: 'Patient Selection', tab: null },
  fFrame: { screen: 'Main Frame', tab: null },
  fEncnt: { screen: 'Encounter', tab: null },
  fReview: { screen: 'Review/Sign', tab: null },

  // r* files are RPC wrappers for specific domains
  rCore: { screen: 'Core/Shared', tab: null },
  rCover: { screen: 'Cover Sheet', tab: 'CT_COVER' },
  rProbs: { screen: 'Problem List', tab: 'CT_PROBLEMS' },
  rMeds: { screen: 'Medications', tab: 'CT_MEDS' },
  rTIU: { screen: 'Progress Notes (TIU)', tab: 'CT_NOTES' },
  rDCSumm: { screen: 'Discharge Summaries', tab: 'CT_DCSUMM' },
  rLabs: { screen: 'Laboratory', tab: 'CT_LABS' },
  rReports: { screen: 'Reports', tab: 'CT_REPORTS' },
  rSurgery: { screen: 'Surgery', tab: 'CT_SURGERY' },
  rGraphs: { screen: 'Graphs', tab: null },
  rMisc: { screen: 'Miscellaneous', tab: null },
  rECS: { screen: 'Event Capture', tab: null },
  rReminders: { screen: 'Reminders', tab: null },
  rEventHooks: { screen: 'Event Hooks', tab: null },
  rOTH: { screen: 'OTH', tab: null },

  // Orders subdirectory
  fOrders: { screen: 'Orders', tab: 'CT_ORDERS' },
  rOrders: { screen: 'Orders', tab: 'CT_ORDERS' },
  rODMeds: { screen: 'Orders - Medications', tab: 'CT_ORDERS' },
  rODLab: { screen: 'Orders - Lab', tab: 'CT_ORDERS' },
  rODRad: { screen: 'Orders - Radiology', tab: 'CT_ORDERS' },
  rODDiet: { screen: 'Orders - Diet', tab: 'CT_ORDERS' },
  rODAllergy: { screen: 'Orders - Allergy', tab: 'CT_ORDERS' },
};

/**
 * Extract RPC names from a single .pas file.
 */
function extractRpcsFromPas(src, relPath) {
  const rpcs = [];
  const fileName = basename(relPath, '.pas');

  // Pattern 1: sCallV('RPC NAME', ...) / tCallV(..., 'RPC NAME', ...) / CallV('RPC NAME', ...)
  const callVRe = /(?:s|t)?CallV(?:istA)?\s*\(\s*(?:[^,]+,\s*)?'([A-Z][A-Z0-9 _]+)'/g;
  let m;
  while ((m = callVRe.exec(src)) !== null) {
    rpcs.push({
      rpcName: m[1].trim(),
      pattern: 'CallV-family',
      file: relPath,
      line: src.slice(0, m.index).split('\n').length,
    });
  }

  // Pattern 2: RemoteProcedure := 'RPC NAME'
  const remoteProcRe = /RemoteProcedure\s*:=\s*'([A-Z][A-Z0-9 _]+)'/gi;
  while ((m = remoteProcRe.exec(src)) !== null) {
    rpcs.push({
      rpcName: m[1].trim(),
      pattern: 'RemoteProcedure',
      file: relPath,
      line: src.slice(0, m.index).split('\n').length,
    });
  }

  // Pattern 3: CreateContext('CONTEXT NAME')
  const contextRe = /CreateContext\s*\(\s*(?:TX_OPTION|'([^']+)')/g;
  while ((m = contextRe.exec(src)) !== null) {
    if (m[1]) {
      rpcs.push({
        rpcName: m[1].trim(),
        pattern: 'CreateContext',
        file: relPath,
        line: src.slice(0, m.index).split('\n').length,
        isContext: true,
      });
    }
  }

  // Pattern 4: Literal RPC names in string constants: 'ORWPT ...' etc.
  const constRe =
    /'((?:ORW|ORWU|ORWD|ORWDAL|ORWOR|ORWPS|ORWPT|ORQPT|ORB|ORVAA|TIU|GMR|GMRA|XUS|DG|PXRM|SR|SD|ORBSMART|ORWRP|ORWMC|ORWTPP|ORWTPO|ORWTPN|ORIMO|ORWPCE|ORWGRPC|ORWCV|ORWCH)[A-Z0-9 _]*[A-Z0-9])'/g;
  while ((m = constRe.exec(src)) !== null) {
    // Avoid duplicates from CallV matches
    const name = m[1].trim();
    if (
      name.length >= 5 &&
      !rpcs.some((r) => r.rpcName === name && r.line === src.slice(0, m.index).split('\n').length)
    ) {
      rpcs.push({
        rpcName: name,
        pattern: 'string-constant',
        file: relPath,
        line: src.slice(0, m.index).split('\n').length,
      });
    }
  }

  return rpcs;
}

/**
 * Determine the function/procedure name surrounding a given line.
 */
function findEnclosingProcedure(src, lineNum) {
  const lines = src.split('\n');
  for (let i = lineNum - 1; i >= 0; i--) {
    const procMatch = lines[i].match(/(?:procedure|function)\s+([\w.]+)/i);
    if (procMatch) return procMatch[1];
  }
  return null;
}

/**
 * Build the screen registry: maps screens → actions → RPC names.
 */
function buildScreenRegistry(allRpcs) {
  const registry = {};

  for (const rpc of allRpcs) {
    const fileName = basename(rpc.file, '.pas');
    const mapped = SCREEN_MAP[fileName];
    const screen = mapped?.screen || fileName;

    if (!registry[screen]) {
      registry[screen] = {
        tab: mapped?.tab || null,
        sourceFiles: new Set(),
        rpcs: {},
      };
    }

    registry[screen].sourceFiles.add(rpc.file);

    if (!registry[screen].rpcs[rpc.rpcName]) {
      registry[screen].rpcs[rpc.rpcName] = {
        callSites: [],
        patterns: new Set(),
        isContext: rpc.isContext || false,
      };
    }

    registry[screen].rpcs[rpc.rpcName].callSites.push({
      file: rpc.file,
      line: rpc.line,
      procedure: rpc.procedure || null,
    });
    registry[screen].rpcs[rpc.rpcName].patterns.add(rpc.pattern);
  }

  // Convert Sets to arrays for JSON serialization
  const serializable = {};
  for (const [screen, data] of Object.entries(registry)) {
    serializable[screen] = {
      tab: data.tab,
      sourceFiles: [...data.sourceFiles],
      rpcs: {},
    };
    for (const [rpcName, rpcData] of Object.entries(data.rpcs)) {
      serializable[screen].rpcs[rpcName] = {
        callSiteCount: rpcData.callSites.length,
        callSites: rpcData.callSites,
        patterns: [...rpcData.patterns],
        isContext: rpcData.isContext,
      };
    }
  }
  return serializable;
}

/**
 * Generate coverage_report.md summarizing what was extracted.
 */
function generateCoverageReport(catalog, registry, formsResult, tabsResult, menusResult) {
  const lines = [
    '# CPRS Extraction Coverage Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Unique RPC names | ${catalog.summary.uniqueRpcCount} |`,
    `| Total RPC call sites | ${catalog.summary.totalCallSites} |`,
    `| Context strings | ${catalog.summary.contextCount} |`,
    `| Source files with RPCs | ${catalog.summary.filesWithRpcs} |`,
    `| Screens mapped | ${Object.keys(registry).length} |`,
    `| Forms (DFM) | ${formsResult?.summary?.totalForms ?? 'N/A'} |`,
    `| Main tabs | ${tabsResult?.summary?.mainTabCount ?? 'N/A'} |`,
    `| Menu items | ${menusResult?.summary?.totalMenuItemCount ?? 'N/A'} |`,
    '',
    '## Main Chart Tabs',
    '',
  ];

  if (tabsResult?.mainTabs) {
    lines.push('| Order | Label | Constant | Bottom Tab | Conditional |');
    lines.push('|-------|-------|----------|------------|-------------|');
    for (const tab of tabsResult.mainTabs) {
      lines.push(
        `| ${tab.creationOrder} | ${tab.label} | ${tab.constant} | ${tab.isBottomTab ? 'Yes' : 'No'} | ${tab.conditional ? 'Yes' : 'No'} |`
      );
    }
    lines.push('');
  }

  lines.push('## Screens → RPC Count', '');
  lines.push('| Screen | Tab | RPC Count | Source Files |');
  lines.push('|--------|-----|-----------|-------------|');

  const sortedScreens = Object.entries(registry).sort(
    (a, b) => Object.keys(b[1].rpcs).length - Object.keys(a[1].rpcs).length
  );
  for (const [screen, data] of sortedScreens) {
    lines.push(
      `| ${screen} | ${data.tab || '—'} | ${Object.keys(data.rpcs).length} | ${data.sourceFiles.length} |`
    );
  }
  lines.push('');

  lines.push('## Top 30 Most-Referenced RPCs', '');
  lines.push('| RPC Name | Call Sites | Screens |');
  lines.push('|----------|-----------|---------|');

  // Build global RPC reference counts
  const rpcRefs = {};
  for (const [screen, data] of Object.entries(registry)) {
    for (const [rpcName, rpcData] of Object.entries(data.rpcs)) {
      if (!rpcRefs[rpcName]) rpcRefs[rpcName] = { count: 0, screens: new Set() };
      rpcRefs[rpcName].count += rpcData.callSiteCount;
      rpcRefs[rpcName].screens.add(screen);
    }
  }
  const topRpcs = Object.entries(rpcRefs)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 30);
  for (const [name, data] of topRpcs) {
    lines.push(`| ${name} | ${data.count} | ${[...data.screens].join(', ')} |`);
  }
  lines.push('');

  lines.push('## Extraction Patterns Used', '');
  lines.push("- `sCallV('RPC NAME', [...])` — single-value RPC call");
  lines.push("- `tCallV(result, 'RPC NAME', [...])` — list RPC call");
  lines.push("- `CallV('RPC NAME', [...])` — standard RPC call");
  lines.push("- `CallVistA('RPC NAME', [...], ...)` — newer call pattern");
  lines.push("- `RemoteProcedure := 'RPC NAME'` — direct broker assignment");
  lines.push("- `CreateContext('CONTEXT')` — security context establishment");
  lines.push('- String constants matching known RPC prefixes (ORW*, TIU*, GMR*, etc.)');
  lines.push('');

  lines.push('## Files Produced', '');
  lines.push('- `tabs.json` — Main chart tabs and sub-tab controls');
  lines.push('- `menus.json` — Menu structures from all forms');
  lines.push('- `forms.json` — Complete form inventory with captions');
  lines.push('- `rpc_catalog.json` — All RPC names with call sites');
  lines.push('- `screen_registry.json` — Screen → action → RPC mapping');
  lines.push('- `coverage_report.md` — This file');

  return lines.join('\n');
}

export async function extractRpcs(formsResult, tabsResult, menusResult) {
  const pasFiles = await globPasFiles();
  const allRpcs = [];
  const filesWithRpcs = new Set();

  for (const filePath of pasFiles) {
    const src = await readFile(filePath, 'latin1');
    const relPath = filePath.replace(/\\/g, '/').split('CPRS-Chart/')[1] || filePath;
    const rpcs = extractRpcsFromPas(src, relPath);

    // Attempt to find enclosing procedure for each RPC
    for (const rpc of rpcs) {
      rpc.procedure = findEnclosingProcedure(src, rpc.line);
    }

    if (rpcs.length > 0) {
      filesWithRpcs.add(relPath);
      allRpcs.push(...rpcs);
    }
  }

  // Deduplicate RPC names and build catalog
  const rpcMap = {};
  for (const rpc of allRpcs) {
    if (!rpcMap[rpc.rpcName]) {
      rpcMap[rpc.rpcName] = {
        name: rpc.rpcName,
        isContext: rpc.isContext || false,
        references: [],
      };
    }
    rpcMap[rpc.rpcName].references.push({
      file: rpc.file,
      line: rpc.line,
      pattern: rpc.pattern,
      procedure: rpc.procedure,
    });
    if (rpc.isContext) rpcMap[rpc.rpcName].isContext = true;
  }

  const catalog = {
    _meta: {
      source: 'reference/cprs/Packages/Order Entry Results Reporting/CPRS/CPRS-Chart/',
      extractedAt: new Date().toISOString(),
      description: 'All RPC names found in CPRS Delphi source with call site references',
    },
    rpcs: Object.values(rpcMap).sort((a, b) => a.name.localeCompare(b.name)),
    summary: {
      uniqueRpcCount: Object.keys(rpcMap).length,
      totalCallSites: allRpcs.length,
      contextCount: Object.values(rpcMap).filter((r) => r.isContext).length,
      filesWithRpcs: filesWithRpcs.size,
    },
  };

  // Build screen registry
  const registry = buildScreenRegistry(allRpcs);

  // Generate coverage report
  const coverageReport = generateCoverageReport(
    catalog,
    registry,
    formsResult,
    tabsResult,
    menusResult
  );

  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    writeFile(join(OUTPUT_DIR, 'rpc_catalog.json'), JSON.stringify(catalog, null, 2)),
    writeFile(
      join(OUTPUT_DIR, 'screen_registry.json'),
      JSON.stringify(
        {
          _meta: {
            source: 'reference/cprs/Packages/Order Entry Results Reporting/CPRS/CPRS-Chart/',
            extractedAt: new Date().toISOString(),
            description: 'CPRS screen → action → RPC name mapping',
          },
          screens: registry,
          summary: {
            screenCount: Object.keys(registry).length,
            totalUniqueRpcs: catalog.summary.uniqueRpcCount,
          },
        },
        null,
        2
      )
    ),
    writeFile(join(OUTPUT_DIR, 'coverage_report.md'), coverageReport),
  ]);

  console.log(
    `  ✓ rpc_catalog.json — ${catalog.summary.uniqueRpcCount} unique RPCs across ${catalog.summary.totalCallSites} call sites`
  );
  console.log(`  ✓ screen_registry.json — ${Object.keys(registry).length} screens mapped`);
  console.log(`  ✓ coverage_report.md — summary generated`);

  return { catalog, registry };
}

if (
  import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('extract-rpcs.mjs')
) {
  extractRpcs().catch(console.error);
}
