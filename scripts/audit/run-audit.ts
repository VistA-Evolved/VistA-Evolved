#!/usr/bin/env node
/**
 * Phase 54 -- Alignment Audit v2 Entrypoint
 *
 * Runs all audit modules in sequence and produces:
 *   /artifacts/audit/audit-summary.json
 *   /artifacts/audit/audit-summary.txt
 *
 * Usage:
 *   npx tsx scripts/audit/run-audit.ts --mode=offline
 *   npx tsx scripts/audit/run-audit.ts --mode=integration
 *
 * Exit codes:
 *   0 = no critical/high failures
 *   1 = critical or high failures found
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { AuditMode, AuditModule, AuditSummary, ModuleResult, FindingStatus } from './types.js';

// -- Module imports -----------------------------------------------
import { promptsAudit } from './modules/promptsAudit.js';
import { docsPolicyAudit } from './modules/docsPolicyAudit.js';
import { rpcGatingAudit } from './modules/rpcGatingAudit.js';
import { actionTraceAudit } from './modules/actionTraceAudit.js';
import { deadClickAudit } from './modules/deadClickAudit.js';
import { secretScanAudit } from './modules/secretScanAudit.js';
import { phiLogScanAudit } from './modules/phiLogScanAudit.js';
import { fakeSuccessAudit } from './modules/fakeSuccessAudit.js';
import { authRegressionAudit } from './modules/authRegressionAudit.js';
import { perfSmokeAudit } from './modules/perfSmokeAudit.js';

const ALL_MODULES: AuditModule[] = [
  promptsAudit,
  docsPolicyAudit,
  rpcGatingAudit,
  actionTraceAudit,
  deadClickAudit,
  secretScanAudit,
  phiLogScanAudit,
  fakeSuccessAudit,
  authRegressionAudit,
  perfSmokeAudit,
];

// -- Arg parsing --------------------------------------------------

function parseArgs(): AuditMode {
  const modeArg = process.argv.find((a) => a.startsWith('--mode='));
  if (modeArg) {
    const val = modeArg.split('=')[1];
    if (val === 'offline' || val === 'integration') return val;
  }
  return 'offline';
}

// -- Main ---------------------------------------------------------

async function main() {
  const mode = parseArgs();
  const root = process.cwd();
  const artifactDir = join(root, 'artifacts', 'audit');
  mkdirSync(artifactDir, { recursive: true });

  console.log(`\n=== Alignment Audit v2 (mode=${mode}) ===\n`);

  const moduleResults: ModuleResult[] = [];

  for (const mod of ALL_MODULES) {
    // Skip integration-only modules in offline mode
    if (mod.requires === 'integration' && mode === 'offline') {
      console.log(`  [SKIP] ${mod.name} (requires integration mode)`);
      moduleResults.push({
        module: mod.name,
        status: 'skip',
        findings: [],
        duration_ms: 0,
      });
      continue;
    }

    const t0 = Date.now();
    try {
      console.log(`  [RUN]  ${mod.name} ...`);
      const findings = await mod.run(root);
      const elapsed = Date.now() - t0;

      // Determine module-level status
      let status: FindingStatus = 'pass';
      if (findings.some((f) => f.status === 'fail')) status = 'fail';
      else if (findings.some((f) => f.status === 'warn')) status = 'warn';

      const fCount = findings.filter((f) => f.status === 'fail').length;
      const wCount = findings.filter((f) => f.status === 'warn').length;
      const pCount = findings.filter((f) => f.status === 'pass').length;
      const tag = status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'WARN';
      console.log(`  [${tag}] ${mod.name} (${elapsed}ms) - ${pCount}P/${fCount}F/${wCount}W`);

      moduleResults.push({ module: mod.name, status, findings, duration_ms: elapsed });
    } catch (err: any) {
      const elapsed = Date.now() - t0;
      console.log(`  [ERR]  ${mod.name} - ${err.message}`);
      moduleResults.push({
        module: mod.name,
        status: 'fail',
        findings: [
          {
            rule: 'module-error',
            status: 'fail',
            severity: 'critical',
            message: `Module threw: ${err.message}`,
          },
        ],
        duration_ms: elapsed,
      });
    }
  }

  // -- Compute totals ---------------------------------------------
  const allFindings = moduleResults.flatMap((m) => m.findings);
  const totals = {
    pass: allFindings.filter((f) => f.status === 'pass').length,
    fail: allFindings.filter((f) => f.status === 'fail').length,
    warn: allFindings.filter((f) => f.status === 'warn').length,
    skip: moduleResults.filter((m) => m.status === 'skip').length,
    critical: allFindings.filter((f) => f.severity === 'critical').length,
    high: allFindings.filter((f) => f.severity === 'high').length,
    medium: allFindings.filter((f) => f.severity === 'medium').length,
    low: allFindings.filter((f) => f.severity === 'low').length,
    info: allFindings.filter((f) => f.severity === 'info').length,
  };

  const summary: AuditSummary = {
    version: '2.0',
    mode,
    timestamp: new Date().toISOString(),
    modules: moduleResults,
    totals,
  };

  // -- Write JSON -------------------------------------------------
  const jsonPath = join(artifactDir, 'audit-summary.json');
  writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf-8');

  // -- Write TXT --------------------------------------------------
  const lines: string[] = [];
  lines.push(`Alignment Audit v2.0 -- ${summary.timestamp}`);
  lines.push(`Mode: ${mode}`);
  lines.push(
    `Totals: ${totals.pass} pass, ${totals.fail} fail, ${totals.warn} warn, ${totals.skip} skip`
  );
  lines.push(
    `Severity: ${totals.critical} critical, ${totals.high} high, ${totals.medium} medium, ${totals.low} low, ${totals.info} info`
  );
  lines.push('');

  for (const mod of moduleResults) {
    lines.push(`--- ${mod.module} [${mod.status.toUpperCase()}] (${mod.duration_ms}ms) ---`);
    for (const f of mod.findings) {
      const loc = f.file ? ` (${f.file}${f.line ? ':' + f.line : ''})` : '';
      lines.push(`  [${f.status.toUpperCase()}] ${f.severity} | ${f.rule}: ${f.message}${loc}`);
    }
    if (mod.findings.length === 0) lines.push('  (no findings)');
    lines.push('');
  }

  const txtPath = join(artifactDir, 'audit-summary.txt');
  writeFileSync(txtPath, lines.join('\n'), 'utf-8');

  // -- Summary ----------------------------------------------------
  console.log(`\n=== Summary ===`);
  console.log(`  Pass:     ${totals.pass}`);
  console.log(`  Fail:     ${totals.fail}`);
  console.log(`  Warn:     ${totals.warn}`);
  console.log(`  Skip:     ${totals.skip}`);
  console.log(`  Critical: ${totals.critical}`);
  console.log(`  High:     ${totals.high}`);
  console.log(`\nArtifacts: ${jsonPath}`);
  console.log(`           ${txtPath}\n`);

  // Exit 1 only if critical or high failures exist
  const blockingFailures = allFindings.filter(
    (f) => f.status === 'fail' && (f.severity === 'critical' || f.severity === 'high')
  );
  if (blockingFailures.length > 0) {
    console.log(`BLOCKED: ${blockingFailures.length} critical/high failure(s)\n`);
    process.exit(1);
  }

  console.log('CLEAN: no blocking failures\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Audit runner crashed:', err);
  process.exit(2);
});
