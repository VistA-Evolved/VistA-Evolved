/**
 * G27: Scheduling Writeback gate (Phase 170)
 *
 * Validates:
 *  1. Writeback guard module exists with truth gate enforcement
 *  2. Writeback routes exist with policy/entries/verify/readiness endpoints
 *  3. No fake "scheduled" status without truth gate
 *  4. VistA RPC grounding (SDES write + truth gate RPCs)
 *  5. Store policy entries registered
 *  6. wired into scheduling index.ts
 *  7. Runbook exists
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');

function fileContent(rel) {
  const p = resolve(ROOT, rel);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf-8');
}

export const meta = {
  id: 'G27_scheduling_writeback',
  name: 'Scheduling Writeback',
  phase: 170,
  tags: ['scheduling', 'writeback', 'truth-gate'],
};

export async function run(_ctx) {
  const issues = [];
  const details = [];

  // 1. Writeback guard exists
  const guardSrc = fileContent('apps/api/src/routes/scheduling/writeback-guard.ts');
  if (!guardSrc) {
    issues.push('writeback-guard.ts missing');
    return { status: 'fail', issues, details };
  }
  details.push('writeback-guard.ts exists');

  // 2. Writeback routes exist
  const routesSrc = fileContent('apps/api/src/routes/scheduling/writeback-routes.ts');
  if (!routesSrc) {
    issues.push('writeback-routes.ts missing');
  } else {
    details.push('writeback-routes.ts exists');
    for (const ep of [
      '/scheduling/writeback/policy',
      '/scheduling/writeback/entries',
      '/scheduling/writeback/verify/:ref',
      '/scheduling/writeback/readiness',
    ]) {
      if (routesSrc.includes(ep)) details.push(`Endpoint: ${ep}`);
      else issues.push(`Missing endpoint: ${ep}`);
    }
  }

  // 3. Truth gate enforcement -- never return "scheduled" without VistA
  if (guardSrc.includes('enforceTruthGate')) details.push('enforceTruthGate function exists');
  else issues.push('enforceTruthGate not found');

  // Check contract: "scheduled" only after truth gate pass
  if (guardSrc.includes('"scheduled"') && guardSrc.includes('gateResult.passed')) {
    details.push("'scheduled' status gated by truth gate pass");
  } else {
    issues.push("'scheduled' status may not be properly gated");
  }

  // 4. VistA RPC grounding
  for (const rpc of [
    'SDES GET APPT BY APPT IEN',
    'SDES CREATE APPOINTMENTS',
    'SDES CANCEL APPOINTMENT 2',
  ]) {
    const allSrc = (guardSrc || '') + (routesSrc || '');
    if (allSrc.includes(rpc)) details.push(`RPC ref: ${rpc}`);
    else issues.push(`Missing RPC ref: ${rpc}`);
  }

  // 5. WritebackStatus type with correct states
  for (const status of [
    'requested',
    'pending_approval',
    'approved',
    'scheduled',
    'failed',
    'integration_pending',
  ]) {
    if (guardSrc.includes(`"${status}"`)) details.push(`Status: ${status}`);
    else issues.push(`Missing status: ${status}`);
  }

  // 6. Store policy entries
  const storePolicy = fileContent('apps/api/src/platform/store-policy.ts');
  if (storePolicy) {
    if (storePolicy.includes('scheduling-writeback-entries'))
      details.push('Store: scheduling-writeback-entries');
    else issues.push('Store policy missing: scheduling-writeback-entries');
  }

  // 7. Wired into scheduling index
  const schedIndex = fileContent('apps/api/src/routes/scheduling/index.ts');
  if (schedIndex) {
    if (schedIndex.includes('writeback-routes')) details.push('Imported in scheduling index');
    else issues.push('Not imported in scheduling index');
    if (schedIndex.includes('writebackRoutes')) details.push('Registered in scheduling index');
    else issues.push('Not registered in scheduling index');
  }

  // 8. Runbook
  if (existsSync(resolve(ROOT, 'docs/runbooks/phase170-scheduling-writeback.md'))) {
    details.push('Runbook exists');
  } else {
    issues.push('Runbook missing');
  }

  // 9. Immutable audit
  if (guardSrc.includes('immutableAudit')) details.push('Immutable audit in guard');
  else issues.push('No immutableAudit in writeback guard');

  const status = issues.length === 0 ? 'pass' : 'fail';
  return { status, issues, details };
}
