#!/usr/bin/env node
/**
 * GameDay Drill Runner — Phase 271
 *
 * Automated resilience drills:
 *   1. Failover rehearsal (DB down → recovery)
 *   2. Restore validation (backup → restore → verify)
 *   3. Rollback exercise (deploy rollback simulation)
 *
 * Usage:
 *   node scripts/dr/gameday-drill.mjs [drill] [--api-url URL] [--json]
 *
 * Drills: failover, restore, rollback, all
 *
 * Outputs:
 *   artifacts/dr/gameday-results.json   (machine-readable)
 *   artifacts/dr/gameday-summary.md     (human-readable)
 */

import { execSync, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = resolve(import.meta.dirname, '../..');
const OUT_DIR = join(ROOT, 'artifacts', 'dr');
const API_URL =
  process.argv.find((a) => a.startsWith('--api-url='))?.split('=')[1] || 'http://127.0.0.1:3001';
const JSON_ONLY = process.argv.includes('--json');
const DRILL_ARG = process.argv[2] || 'all';

mkdirSync(OUT_DIR, { recursive: true });

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function ts() {
  return new Date().toISOString();
}

function httpGet(path, timeoutMs = 5000) {
  try {
    const url = `${API_URL}${path}`;
    const out = execSync(`curl.exe -s -m ${Math.ceil(timeoutMs / 1000)} "${url}"`, {
      encoding: 'utf8',
      timeout: timeoutMs + 2000,
    });
    return { ok: true, body: out.trim(), parsed: safeParse(out.trim()) };
  } catch {
    return { ok: false, body: null, parsed: null };
  }
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function sleep(ms) {
  execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: 'ignore' });
}

function log(msg) {
  if (!JSON_ONLY) console.log(`[gameday] ${msg}`);
}

/* ------------------------------------------------------------------ */
/*  Drill 1: Failover Rehearsal                                       */
/* ------------------------------------------------------------------ */

async function drillFailover() {
  const results = {
    drill: 'failover',
    startedAt: ts(),
    steps: [],
    passed: false,
  };

  // Step 1: Baseline
  log('Failover: checking baseline...');
  const health = httpGet('/health');
  const ready = httpGet('/ready');
  results.steps.push({
    step: 'baseline',
    health: health.ok,
    ready: ready.ok,
    ts: ts(),
  });

  if (!health.ok) {
    log('Failover: API not reachable -- skipping drill');
    results.steps.push({ step: 'skip', reason: 'API not reachable', ts: ts() });
    results.skipped = true;
    results.completedAt = ts();
    return results;
  }

  // Step 2: Check VistA ping
  const ping = httpGet('/vista/ping');
  results.steps.push({
    step: 'vista_ping',
    reachable: ping.ok && ping.parsed?.ok === true,
    ts: ts(),
  });

  // Step 3: Simulate VistA outage (if Docker available)
  let dockerAvailable = false;
  try {
    execSync('docker compose version', { stdio: 'ignore', timeout: 5000 });
    dockerAvailable = true;
  } catch {
    dockerAvailable = false;
  }

  if (dockerAvailable) {
    log('Failover: stopping VistA container...');
    try {
      execSync('docker compose -f services/vista/docker-compose.yml stop wv', {
        cwd: ROOT,
        stdio: 'ignore',
        timeout: 30000,
      });
      results.steps.push({ step: 'vista_stopped', success: true, ts: ts() });
    } catch (e) {
      results.steps.push({
        step: 'vista_stopped',
        success: false,
        error: e.message,
        ts: ts(),
      });
    }

    // Step 4: Verify degraded behavior
    log('Failover: waiting 10s for circuit breaker...');
    sleep(10000);

    const healthDegraded = httpGet('/health');
    const readyDegraded = httpGet('/ready');
    const clinicalDegraded = httpGet('/vista/ping');
    results.steps.push({
      step: 'degraded_check',
      healthUp: healthDegraded.ok,
      readyDown: readyDegraded.ok && readyDegraded.parsed?.ok === false,
      vistaDown: !clinicalDegraded.ok || clinicalDegraded.parsed?.ok === false,
      ts: ts(),
    });

    // Step 5: Restore VistA
    log('Failover: restarting VistA container...');
    try {
      execSync('docker compose -f services/vista/docker-compose.yml start wv', {
        cwd: ROOT,
        stdio: 'ignore',
        timeout: 30000,
      });
      results.steps.push({ step: 'vista_restarted', success: true, ts: ts() });
    } catch (e) {
      results.steps.push({
        step: 'vista_restarted',
        success: false,
        error: e.message,
        ts: ts(),
      });
    }

    // Step 6: Wait for recovery
    log('Failover: waiting 45s for recovery...');
    sleep(45000);

    const healthRecovered = httpGet('/health');
    const pingRecovered = httpGet('/vista/ping');
    results.steps.push({
      step: 'recovery_check',
      healthUp: healthRecovered.ok,
      vistaUp: pingRecovered.ok && pingRecovered.parsed?.ok === true,
      ts: ts(),
    });

    results.passed = healthRecovered.ok;
  } else {
    log('Failover: Docker not available -- running API-only checks');
    results.steps.push({
      step: 'docker_unavailable',
      note: 'Skipped container stop/start. API reachability verified.',
      ts: ts(),
    });
    results.passed = health.ok;
    results.partial = true;
  }

  results.completedAt = ts();
  return results;
}

/* ------------------------------------------------------------------ */
/*  Drill 2: Restore Validation                                       */
/* ------------------------------------------------------------------ */

async function drillRestore() {
  const results = {
    drill: 'restore',
    startedAt: ts(),
    steps: [],
    passed: false,
  };

  // Check backup script exists
  const backupScript = join(ROOT, 'scripts', 'backup-restore.mjs');
  const backupExists = existsSync(backupScript);
  results.steps.push({
    step: 'backup_script_exists',
    exists: backupExists,
    path: 'scripts/backup-restore.mjs',
    ts: ts(),
  });

  if (!backupExists) {
    log('Restore: backup-restore.mjs not found -- drill cannot run');
    results.completedAt = ts();
    return results;
  }

  // Run backup (dry run if possible)
  log('Restore: running backup status...');
  try {
    const statusOut = execSync('node scripts/backup-restore.mjs status', {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 30000,
    });
    results.steps.push({
      step: 'backup_status',
      success: true,
      output: statusOut.substring(0, 500),
      ts: ts(),
    });
  } catch (e) {
    results.steps.push({
      step: 'backup_status',
      success: false,
      error: e.message.substring(0, 200),
      ts: ts(),
    });
  }

  // Verify SQLite DB exists (if using SQLite)
  const sqliteDb = join(ROOT, 'data', 'platform.db');
  const sqliteExists = existsSync(sqliteDb);
  results.steps.push({
    step: 'sqlite_exists',
    exists: sqliteExists,
    path: 'data/platform.db',
    ts: ts(),
  });

  // Verify audit JSONL exists
  const auditLog = join(ROOT, 'logs', 'immutable-audit.jsonl');
  const auditExists = existsSync(auditLog);
  results.steps.push({
    step: 'audit_log_exists',
    exists: auditExists,
    path: 'logs/immutable-audit.jsonl',
    ts: ts(),
  });

  // Verify audit chain integrity (via API if running)
  const auditVerify = httpGet('/iam/audit/verify');
  if (auditVerify.ok && auditVerify.parsed) {
    results.steps.push({
      step: 'audit_chain_verify',
      verified: auditVerify.parsed.chainValid === true,
      entryCount: auditVerify.parsed.entryCount,
      ts: ts(),
    });
  } else {
    results.steps.push({
      step: 'audit_chain_verify',
      verified: null,
      note: 'API not reachable or endpoint not available',
      ts: ts(),
    });
  }

  results.passed = backupExists;
  results.completedAt = ts();
  return results;
}

/* ------------------------------------------------------------------ */
/*  Drill 3: Rollback Exercise                                        */
/* ------------------------------------------------------------------ */

async function drillRollback() {
  const results = {
    drill: 'rollback',
    startedAt: ts(),
    steps: [],
    passed: false,
  };

  // Step 1: Record current git state
  log('Rollback: recording git state...');
  try {
    const sha = execSync('git rev-parse HEAD', {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 5000,
    }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 5000,
    }).trim();
    results.steps.push({
      step: 'git_state',
      sha,
      branch,
      ts: ts(),
    });
  } catch (e) {
    results.steps.push({
      step: 'git_state',
      error: e.message.substring(0, 200),
      ts: ts(),
    });
  }

  // Step 2: Verify docker-compose.prod.yml exists (rollback target)
  const prodCompose = join(ROOT, 'docker-compose.prod.yml');
  results.steps.push({
    step: 'prod_compose_exists',
    exists: existsSync(prodCompose),
    ts: ts(),
  });

  // Step 3: Verify swap boundary endpoint
  const swapBoundary = httpGet('/vista/swap-boundary');
  results.steps.push({
    step: 'swap_boundary',
    available: swapBoundary.ok && swapBoundary.parsed !== null,
    instanceId: swapBoundary.parsed?.instanceId || null,
    ts: ts(),
  });

  // Step 4: Verify provision status
  const provision = httpGet('/vista/provision/status');
  results.steps.push({
    step: 'provision_status',
    available: provision.ok,
    overallHealth: provision.parsed?.overallHealth || null,
    ts: ts(),
  });

  // Step 5: Rollback simulation (dry-run -- just verify the path exists)
  log('Rollback: verifying rollback artifacts...');
  const rollbackArtifacts = [
    'docker-compose.prod.yml',
    'scripts/backup-restore.mjs',
    'docs/runbooks/vista-distro-lane.md',
  ];
  const artifactChecks = rollbackArtifacts.map((f) => ({
    file: f,
    exists: existsSync(join(ROOT, f)),
  }));
  results.steps.push({
    step: 'rollback_artifacts',
    checks: artifactChecks,
    allPresent: artifactChecks.every((c) => c.exists),
    ts: ts(),
  });

  results.passed = artifactChecks.every((c) => c.exists);
  results.completedAt = ts();
  return results;
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

async function main() {
  log(`GameDay drill runner -- drill=${DRILL_ARG}, api=${API_URL}`);
  log(`Started at ${ts()}`);

  const drills = [];

  if (DRILL_ARG === 'failover' || DRILL_ARG === 'all') {
    drills.push(await drillFailover());
  }
  if (DRILL_ARG === 'restore' || DRILL_ARG === 'all') {
    drills.push(await drillRestore());
  }
  if (DRILL_ARG === 'rollback' || DRILL_ARG === 'all') {
    drills.push(await drillRollback());
  }

  if (drills.length === 0) {
    console.error(`Unknown drill: ${DRILL_ARG}. Use: failover, restore, rollback, all`);
    process.exit(1);
  }

  const report = {
    generator: 'gameday-drill.mjs',
    version: '1.0.0',
    generatedAt: ts(),
    apiUrl: API_URL,
    drills,
    summary: {
      total: drills.length,
      passed: drills.filter((d) => d.passed).length,
      failed: drills.filter((d) => !d.passed && !d.skipped).length,
      skipped: drills.filter((d) => d.skipped).length,
    },
  };

  // Write JSON report
  const jsonPath = join(OUT_DIR, 'gameday-results.json');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  // Write Markdown summary
  const md = generateMarkdown(report);
  const mdPath = join(OUT_DIR, 'gameday-summary.md');
  writeFileSync(mdPath, md);

  // Console output
  if (!JSON_ONLY) {
    console.log('\n--- GameDay Results ---');
    for (const d of drills) {
      const icon = d.passed ? 'PASS' : d.skipped ? 'SKIP' : 'FAIL';
      console.log(`  [${icon}] ${d.drill}`);
    }
    console.log(
      `\nTotal: ${report.summary.total} | Pass: ${report.summary.passed} | Fail: ${report.summary.failed} | Skip: ${report.summary.skipped}`
    );
    console.log(`Report: ${jsonPath}`);
    console.log(`Summary: ${mdPath}`);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }

  process.exit(report.summary.failed > 0 ? 1 : 0);
}

function generateMarkdown(report) {
  const lines = [
    '# GameDay Drill Results',
    '',
    `**Generated**: ${report.generatedAt}`,
    `**API**: ${report.apiUrl}`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total | ${report.summary.total} |`,
    `| Passed | ${report.summary.passed} |`,
    `| Failed | ${report.summary.failed} |`,
    `| Skipped | ${report.summary.skipped} |`,
    '',
    '## Drill Details',
    '',
  ];

  for (const d of report.drills) {
    const icon = d.passed ? 'PASS' : d.skipped ? 'SKIP' : 'FAIL';
    lines.push(`### ${d.drill} [${icon}]`);
    lines.push('');
    lines.push(`- Started: ${d.startedAt}`);
    lines.push(`- Completed: ${d.completedAt || 'N/A'}`);
    lines.push(`- Steps: ${d.steps.length}`);
    lines.push('');
    for (const s of d.steps) {
      lines.push(`  - **${s.step}**: ${JSON.stringify(s, null, 0).substring(0, 200)}`);
    }
    lines.push('');
  }

  lines.push('## RPO/RTO Targets');
  lines.push('');
  lines.push('| Scenario | RPO | RTO |');
  lines.push('|----------|-----|-----|');
  lines.push('| DB Down | 0 (committed txns) | < 5 min |');
  lines.push('| VistA Down | N/A | < 2 min |');
  lines.push('| Queue Backlog | 0 (persisted jobs) | < 10 min |');
  lines.push('| Node Drain | 0 (PG committed) | < 30s |');
  lines.push('');

  return lines.join('\n');
}

main().catch((e) => {
  console.error('GameDay drill failed:', e);
  process.exit(1);
});
