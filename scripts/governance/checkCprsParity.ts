#!/usr/bin/env node
/**
 * Phase 55 -- CPRS Parity Gate
 *
 * CI/governance gate that reads artifacts/cprs/parity-matrix.json
 * and enforces:
 *   1. No "must" core action may be FAIL
 *   2. No dead clicks (wired action whose RPCs are missing from registry)
 *   3. Every action in web registry must have all RPCs in API registry
 *   4. Summary stats are printed for visibility
 *
 * Exit code 0 = PASS, 1 = FAIL
 *
 * Usage: npx tsx scripts/governance/checkCprsParity.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const MATRIX_PATH = join(ROOT, 'artifacts', 'cprs', 'parity-matrix.json');

interface GateEntry {
  actionId: string;
  label: string;
  gateLevel: string;
  gateResult: string;
  failReason?: string;
}

interface ActionEntry {
  actionId: string;
  status: string;
  rpcs: string[];
  allRpcsInRegistry: boolean;
}

interface MatrixFile {
  _meta: any;
  summary: {
    rpc: { total: number; wired: number; registered: number; inApi: number; inWeb: number };
    action: { total: number; wired: number; pending: number; stub: number };
    coreGates: { total: number; pass: number; warn: number; fail: number };
  };
  coreActionGates: GateEntry[];
  actionParity: ActionEntry[];
}

function main() {
  if (!existsSync(MATRIX_PATH)) {
    console.error('ERROR: artifacts/cprs/parity-matrix.json not found.');
    console.error('Run: npx tsx scripts/cprs/buildParityMatrix.ts');
    process.exit(1);
  }

  const matrix: MatrixFile = JSON.parse(readFileSync(MATRIX_PATH, 'utf-8'));
  const failures: string[] = [];
  const warnings: string[] = [];

  console.log('=== CPRS Parity Gate ===\n');

  // Gate 1: Core action gates
  console.log('--- Core Action Gates ---');
  for (const g of matrix.coreActionGates) {
    const icon = g.gateResult === 'PASS' ? 'PASS' : g.gateResult === 'WARN' ? 'WARN' : 'FAIL';
    console.log(`  [${icon}] ${g.actionId} (${g.gateLevel}) -- ${g.label}`);
    if (g.failReason) console.log(`         ${g.failReason}`);

    if (g.gateResult === 'FAIL') {
      failures.push(`Core gate FAIL: ${g.actionId} -- ${g.failReason}`);
    } else if (g.gateResult === 'WARN') {
      warnings.push(`Core gate WARN: ${g.actionId} -- ${g.failReason}`);
    }
  }

  // Gate 2: Dead click detection
  console.log('\n--- Dead Click Check ---');
  let deadClicks = 0;
  for (const a of matrix.actionParity) {
    if (a.status === 'wired' && !a.allRpcsInRegistry) {
      deadClicks++;
      const msg = `Dead click: ${a.actionId} has RPCs not in API registry: ${a.rpcs.join(', ')}`;
      console.log(`  [FAIL] ${msg}`);
      failures.push(msg);
    }
  }
  if (deadClicks === 0) console.log('  [PASS] No dead clicks detected');

  // Gate 3: Orphan RPCs in web actions
  console.log('\n--- Orphan RPC Check ---');
  let orphans = 0;
  for (const a of matrix.actionParity) {
    if (!a.allRpcsInRegistry) {
      orphans++;
      // Only fail if wired (pending/stub just warn)
      if (a.status !== 'wired') {
        warnings.push(`Orphan RPCs (non-wired): ${a.actionId}`);
      }
    }
  }
  if (orphans === 0) console.log('  [PASS] All action RPCs found in API registry');
  else console.log(`  ${orphans} action(s) reference RPCs not in API registry`);

  // Summary
  const s = matrix.summary;
  console.log('\n--- Summary ---');
  console.log(`  RPCs:     ${s.rpc.total} total, ${s.rpc.wired} wired, ${s.rpc.inApi} in API`);
  console.log(
    `  Actions:  ${s.action.total} total, ${s.action.wired} wired, ${s.action.stub} stub`
  );
  console.log(
    `  Gates:    ${s.coreGates.total} total, ${s.coreGates.pass} pass, ${s.coreGates.warn} warn, ${s.coreGates.fail} fail`
  );

  // Verdict
  console.log('\n--- Verdict ---');
  if (failures.length > 0) {
    console.log(`  FAIL (${failures.length} failure(s), ${warnings.length} warning(s))\n`);
    for (const f of failures) console.log(`  ! ${f}`);
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log(`  PASS with ${warnings.length} warning(s)\n`);
    for (const w of warnings) console.log(`  ~ ${w}`);
    process.exit(0);
  } else {
    console.log('  PASS -- all gates clean\n');
    process.exit(0);
  }
}

main();
