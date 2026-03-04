/**
 * buildImmuPlan.ts — Phase 65: Generate immunization plan artifact.
 *
 * Reads the Vivian grounding index, extracts immunization RPCs,
 * and writes artifacts/phase65/immu-plan.json.
 *
 * Usage: npx tsx scripts/immunizations/buildImmuPlan.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const VIVIAN_PATH = path.resolve('docs/grounding/vivian-index.json');
const OUTPUT_PATH = path.resolve('artifacts/phase65/immu-plan.json');

interface VivianEntry {
  name: string;
  tag?: string;
  routine?: string;
  _package?: string;
  returnType?: string;
  description?: string;
}

function main() {
  // Try to load Vivian index for enrichment
  let vivianEntries: VivianEntry[] = [];
  if (fs.existsSync(VIVIAN_PATH)) {
    try {
      const raw = JSON.parse(fs.readFileSync(VIVIAN_PATH, 'utf-8'));
      vivianEntries = Array.isArray(raw) ? raw : raw.rpcs || raw.entries || [];
    } catch {
      console.warn('Could not parse Vivian index — using hardcoded list');
    }
  }

  // Known immunization RPCs from Vivian documentation
  const IMMUNIZATION_RPCS = [
    'ORQQPX IMMUN LIST',
    'PXVIMM VIMM DATA',
    'PXVIMM IMM SHORT LIST',
    'PXVIMM IMMDATA',
    'ORWPCE GET IMMUNIZATION TYPE',
    'PX SAVE DATA',
    'PXVIMM ADMIN ROUTE',
    'PXVIMM ADMIN SITE',
    'PXVIMM INFO SOURCE',
    'PXVIMM IMM LOT',
    'PXVIMM IMM MAN',
    'PXVIMM VIS',
    'PXVIMM ICR LIST',
    'PXVIMM IMM DETAILED',
    'PXVIMM IMM FORMAT',
    'PX ICE WEB',
    'ORWPCE IMM',
  ];

  const found = vivianEntries.filter((e) => IMMUNIZATION_RPCS.includes(e.name));

  const plan = {
    phase: 65,
    title: 'Immunization Plan (VistA-First)',
    generatedDate: new Date().toISOString().slice(0, 10),
    vivianRpcsFound: found.length,
    totalKnown: IMMUNIZATION_RPCS.length,
    readPath: {
      primary: {
        rpc: 'ORQQPX IMMUN LIST',
        vivianVerified: found.some((e) => e.name === 'ORQQPX IMMUN LIST'),
      },
      catalog: {
        rpc: 'PXVIMM IMM SHORT LIST',
        vivianVerified: found.some((e) => e.name === 'PXVIMM IMM SHORT LIST'),
      },
    },
    writePath: {
      status: 'deferred',
      targetRpc: 'PX SAVE DATA',
      reason: 'PCE encounter context required',
    },
    allKnownRpcs: IMMUNIZATION_RPCS,
    vivianMatches: found.map((e) => ({
      name: e.name,
      tag: e.tag,
      routine: e.routine,
      package: e._package,
    })),
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(plan, null, 2) + '\n');
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`  Vivian matches: ${found.length}/${IMMUNIZATION_RPCS.length}`);
}

main();
