#!/usr/bin/env tsx
/**
 * RPC Contract Recorder — Phase 250
 *
 * Dev-only tool: connects to a live VistA, calls each contracted RPC,
 * sanitizes the output, and writes fixture files.
 *
 * Usage:
 *   VISTA_CONTRACT_MODE=record npx tsx scripts/vista-contracts-record.ts
 *
 * Requires: VistA Docker running on port 9430, .env.local credentials
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

// These will be resolved at runtime when VistA is available
// In record mode the RPC broker must be connected first
const FIXTURE_ROOT = join(__dirname, '../apps/api/tests/fixtures/vista');

interface RecordPlan {
  rpcName: string;
  params?: string[];
  listParams?: Record<string, string>;
  description: string;
}

// Record plan for each contracted RPC
// NOTE: Some RPCs require patient context (DFN) or specific params
const RECORD_PLANS: RecordPlan[] = [
  {
    rpcName: 'XUS SIGNON SETUP',
    description: 'Pre-auth setup, returns server info',
  },
  {
    rpcName: 'ORWPT LIST ALL',
    params: ['A', '1'],
    description: "Patient list starting at 'A', page 1",
  },
  {
    rpcName: 'ORQQAL LIST',
    params: ['3'],
    description: 'Allergy list for DFN=3 (demo patient)',
  },
  {
    rpcName: 'GMV V/M ALLDATA',
    params: ['3'],
    description: 'Vitals for DFN=3',
  },
  {
    rpcName: 'ORWPS ACTIVE',
    params: ['3'],
    description: 'Active meds for DFN=3',
  },
  {
    rpcName: 'ORQQPL LIST',
    params: ['3'],
    description: 'Problem list for DFN=3',
  },
  {
    rpcName: 'TIU DOCUMENTS BY CONTEXT',
    params: ['3', '1', '0', '', '0', '', '0'],
    description: 'TIU documents for DFN=3, context=signed',
  },
  {
    rpcName: 'ORWORB FASTUSER',
    description: 'Notification count for current user',
  },
  {
    rpcName: 'ORWLRR INTERIMG',
    params: ['3'],
    description: 'Interim labs for DFN=3',
  },
  {
    rpcName: 'ORQPT DEFAULT LIST SOURCE',
    description: 'Default patient list source',
  },
];

async function main() {
  console.log('=== VistA RPC Contract Recorder ===');
  console.log('This tool records live RPC responses and saves sanitized fixtures.');
  console.log('Requires: VistA Docker + .env.local credentials + VISTA_CONTRACT_MODE=record\n');

  const mode = process.env.VISTA_CONTRACT_MODE;
  if (mode !== 'record') {
    console.error('ERROR: Set VISTA_CONTRACT_MODE=record to use this tool.');
    console.error('  VISTA_CONTRACT_MODE=record npx tsx scripts/vista-contracts-record.ts');
    process.exit(1);
  }

  // Dynamic import so this file can exist without VistA deps at lint time
  let callRpc: (name: string, params?: string[]) => Promise<string>;
  let connect: () => Promise<void>;
  let disconnect: () => void;

  try {
    const broker = await import('../apps/api/src/vista/rpcBrokerClient.js');
    callRpc = broker.callRpc;
    connect = broker.connect;
    disconnect = broker.disconnect;
  } catch {
    console.error('ERROR: Cannot import rpcBrokerClient. Run from repo root.');
    process.exit(1);
  }

  let sanitizeRpcOutput: (rpcName: string, lines: string[]) => string[];
  try {
    const contracts = await import('../apps/api/src/vista/contracts/index.js');
    sanitizeRpcOutput = contracts.sanitizeRpcOutput;
  } catch {
    console.error('ERROR: Cannot import contracts module.');
    process.exit(1);
  }

  console.log('Connecting to VistA...');
  await connect();
  console.log('Connected.\n');

  let recorded = 0;
  let failed = 0;

  for (const plan of RECORD_PLANS) {
    const safeName = plan.rpcName.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '');
    const dir = join(FIXTURE_ROOT, safeName);
    mkdirSync(dir, { recursive: true });

    try {
      console.log(`Recording: ${plan.rpcName} — ${plan.description}`);
      const raw = await callRpc(plan.rpcName, plan.params);
      const lines = raw.split('\n').filter((l) => l.length > 0);
      const sanitized = sanitizeRpcOutput(plan.rpcName, lines);

      const fixture = {
        rpcName: plan.rpcName,
        recordedAt: new Date().toISOString(),
        sanitized: true,
        response: sanitized,
      };

      const outPath = join(dir, 'success.json');
      writeFileSync(outPath, JSON.stringify(fixture, null, 2) + '\n');
      console.log(`  -> ${sanitized.length} lines saved to ${safeName}/success.json`);
      recorded++;
    } catch (err) {
      console.error(`  FAILED: ${plan.rpcName} — ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  disconnect();

  console.log(`\nDone: ${recorded} recorded, ${failed} failed.`);
  console.log('Review fixtures in apps/api/tests/fixtures/vista/ before committing.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
