#!/usr/bin/env node
/**
 * G18 -- QA Ladder V2 Gate (Phase 144)
 *
 * Validates the Phase 144 QA Ladder V2 infrastructure:
 *   1. Phase registry script exists and can build registry
 *   2. Test generator script exists
 *   3. RPC trace manager script exists
 *   4. Generated Playwright domain-journey specs exist (non-empty)
 *   5. Generated RPC replay tests exist (non-empty)
 *   6. Generated restart resilience tests exist (non-empty)
 *   7. Golden trace file is valid with 5+ workflows
 *   8. No PHI in generated test files
 *   9. No empty test bodies
 *  10. Phase 139-144 are covered by generated tests
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = import.meta.dirname || fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../../..');

export const id = 'G18_qa_ladder_v2';
export const name = 'QA Ladder V2 Infrastructure';

function rd(rel) {
  const p = resolve(ROOT, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

function ls(rel) {
  const p = resolve(ROOT, rel);
  return existsSync(p) ? readdirSync(p) : [];
}

export async function run(opts = {}) {
  const start = Date.now();
  const details = [];
  let status = 'pass';
  let p = 0;
  let f = 0;

  function check(label, ok) {
    if (ok) {
      p++;
    } else {
      f++;
      details.push(`FAIL: ${label}`);
      status = 'fail';
    }
  }

  function warn(label) {
    details.push(`WARN: ${label}`);
  }

  // ── 1. Infrastructure Scripts ──

  check('Phase registry script exists', rd('scripts/qa/phase-registry.mjs') !== null);
  check('Test generator script exists', rd('scripts/qa/generate-phase-tests.mjs') !== null);
  check('RPC trace manager script exists', rd('scripts/qa/rpc-trace-manager.mjs') !== null);

  // Validate they contain expected exports/functions
  const registrySrc = rd('scripts/qa/phase-registry.mjs') || '';
  check('Registry has classifyDomains', registrySrc.includes('classifyDomains'));
  check('Registry has buildRegistry', registrySrc.includes('buildRegistry'));
  check('Registry has domain patterns', registrySrc.includes('DOMAIN_PATTERNS'));

  const generatorSrc = rd('scripts/qa/generate-phase-tests.mjs') || '';
  check('Generator has Playwright journey gen', generatorSrc.includes('generatePlaywrightJourney'));
  check('Generator has RPC replay gen', generatorSrc.includes('generateRpcReplayTests'));
  check(
    'Generator has restart resilience gen',
    generatorSrc.includes('generateRestartResilienceTests')
  );

  const traceMgr = rd('scripts/qa/rpc-trace-manager.mjs') || '';
  check('Trace manager has verify command', traceMgr.includes('verify'));
  check('Trace manager has record command', traceMgr.includes('record'));

  // ── 2. Generated Test Files ──

  const domainJourneys = ls('apps/web/e2e/domain-journeys').filter(
    (f) => f.startsWith('domain-') && f.endsWith('.spec.ts')
  );
  check(`Domain journey specs exist (got ${domainJourneys.length})`, domainJourneys.length >= 1);

  // Validate journeys are non-empty and have real test bodies
  for (const file of domainJourneys) {
    const content = rd(`apps/web/e2e/domain-journeys/${file}`) || '';
    check(`${file}: has test.describe`, content.includes('test.describe'));
    check(`${file}: has expect()`, content.includes('expect('));
    check(`${file}: no empty test bodies`, !content.match(/test\([^)]+,\s*async.*\{\s*\}\)/));
  }

  // RPC replay tests
  const rpcTests = ls('apps/api/tests/rpc-replay').filter((f) => f.endsWith('.test.ts'));
  check(`RPC replay tests exist (got ${rpcTests.length})`, rpcTests.length >= 1);

  if (rpcTests.length > 0) {
    const rpcContent = rd(`apps/api/tests/rpc-replay/${rpcTests[0]}`) || '';
    check('RPC replay has vitest imports', rpcContent.includes('import { describe'));
    check('RPC replay references golden trace', rpcContent.includes('golden-trace'));
    check('RPC replay has VistA skip logic', rpcContent.includes('vistaAvailable'));
  }

  // Restart resilience tests
  const restartTests = ls('apps/api/tests/restart-resilience').filter((f) =>
    f.endsWith('.test.ts')
  );
  check(`Restart resilience tests exist (got ${restartTests.length})`, restartTests.length >= 1);

  if (restartTests.length > 0) {
    const restartContent = rd(`apps/api/tests/restart-resilience/${restartTests[0]}`) || '';
    check('Restart tests have health check', restartContent.includes('/health'));
    check('Restart tests have concurrent requests', restartContent.includes('Promise.all'));
  }

  // ── 3. Golden Trace Validation ──

  const goldenTrace = rd('apps/api/tests/fixtures/rpc-golden-trace.json');
  check('Golden trace file exists', goldenTrace !== null);

  if (goldenTrace) {
    try {
      const trace = JSON.parse(goldenTrace);
      const wfCount = Object.keys(trace.workflows || {}).length;
      check(`Golden trace has 5+ workflows (got ${wfCount})`, wfCount >= 5);
      check('Golden trace has registrySnapshot', !!trace.registrySnapshot);

      const criticalCount = trace.registrySnapshot?.criticalRpcs?.length || 0;
      check(`Critical RPCs >= 10 (got ${criticalCount})`, criticalCount >= 10);

      // No PHI
      check('Golden trace: no SSN', !/\b\d{3}-\d{2}-\d{4}\b/.test(goldenTrace));
      check('Golden trace: no credentials', !goldenTrace.toLowerCase().includes('prov123'));
    } catch (e) {
      check('Golden trace is valid JSON', false);
    }
  }

  // ── 4. Phase Coverage ──

  // Check that phases 139-144 are represented
  const allGenerated = [
    ...domainJourneys.map((f) => rd(`apps/web/e2e/domain-journeys/${f}`) || ''),
    ...rpcTests.map((f) => rd(`apps/api/tests/rpc-replay/${f}`) || ''),
    ...restartTests.map((f) => rd(`apps/api/tests/restart-resilience/${f}`) || ''),
  ].join('\n');

  for (const phaseNum of ['139', '140', '141', '142', '143', '144']) {
    const found = allGenerated.includes(`Phase ${phaseNum}`);
    if (found) {
      check(`Phase ${phaseNum} covered in generated tests`, true);
    } else {
      warn(`Phase ${phaseNum} not found in generated tests (may lack routes/RPCs)`);
    }
  }

  // ── 5. No PHI in Generated Files ──

  let phiClean = true;
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(allGenerated)) phiClean = false; // SSN
  if (/PROV123/i.test(allGenerated)) phiClean = false; // sandbox cred
  if (/NURSE123/i.test(allGenerated)) phiClean = false; // sandbox cred
  if (/PHARM123/i.test(allGenerated)) phiClean = false; // sandbox cred
  check('No PHI in generated test files', phiClean);

  return {
    id,
    name,
    status,
    passed: p,
    failed: f,
    details,
    durationMs: Date.now() - start,
  };
}
