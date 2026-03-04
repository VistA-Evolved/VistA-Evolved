#!/usr/bin/env node
/**
 * Phase 54 -- Triage Generator
 *
 * Reads /artifacts/audit/audit-summary.json and produces
 * /artifacts/audit/triage.md with severity-ranked actionable items.
 *
 * Usage:
 *   npx tsx scripts/audit/generate-triage.ts
 *
 * Exit codes:
 *   0 = triage generated
 *   1 = summary not found
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { AuditSummary, AuditFinding } from './types.js';

const ROOT = process.cwd();
const AUDIT_DIR = join(ROOT, 'artifacts', 'audit');
const SUMMARY_FILE = join(AUDIT_DIR, 'audit-summary.json');
const TRIAGE_FILE = join(AUDIT_DIR, 'triage.md');

if (!existsSync(SUMMARY_FILE)) {
  console.error('ERROR: audit-summary.json not found. Run the audit first:');
  console.error('  npx tsx scripts/audit/run-audit.ts --mode=offline');
  process.exit(1);
}

const summary: AuditSummary = JSON.parse(readFileSync(SUMMARY_FILE, 'utf-8'));

// ── Severity rubric ─────────────────────────────────────────────

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const;
const SEVERITY_EMOJI: Record<string, string> = {
  critical: 'P0-CRITICAL',
  high: 'P1-HIGH',
  medium: 'P2-MEDIUM',
  low: 'P3-LOW',
  info: 'INFO',
};

// ── Collect failures and warnings ───────────────────────────────

interface TriageItem {
  severity: string;
  module: string;
  rule: string;
  message: string;
  file?: string;
  line?: number;
  fix?: string;
}

const items: TriageItem[] = [];

for (const mod of summary.modules) {
  for (const f of mod.findings) {
    if (f.status === 'fail' || f.status === 'warn') {
      items.push({
        severity: f.severity,
        module: mod.module,
        rule: f.rule,
        message: f.message,
        file: f.file,
        line: f.line,
        fix: f.fix,
      });
    }
  }
}

// Sort by severity
items.sort((a, b) => {
  const ai = SEVERITY_ORDER.indexOf(a.severity as any);
  const bi = SEVERITY_ORDER.indexOf(b.severity as any);
  return ai - bi;
});

// ── Generate markdown ───────────────────────────────────────────

const lines: string[] = [];
lines.push('# Alignment Audit Triage Report');
lines.push('');
lines.push(`Generated: ${summary.timestamp}`);
lines.push(`Mode: ${summary.mode}`);
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`| Metric | Count |`);
lines.push(`|--------|-------|`);
lines.push(
  `| Total findings | ${summary.totals.pass + summary.totals.fail + summary.totals.warn} |`
);
lines.push(`| Pass | ${summary.totals.pass} |`);
lines.push(`| Fail | ${summary.totals.fail} |`);
lines.push(`| Warn | ${summary.totals.warn} |`);
lines.push(`| Critical | ${summary.totals.critical} |`);
lines.push(`| High | ${summary.totals.high} |`);
lines.push(`| Medium | ${summary.totals.medium} |`);
lines.push(`| Low | ${summary.totals.low} |`);
lines.push('');

lines.push('## Severity Rubric');
lines.push('');
lines.push('| Priority | Meaning | SLA |');
lines.push('|----------|---------|-----|');
lines.push('| P0-CRITICAL | Security breach, data loss, system down | Fix immediately |');
lines.push('| P1-HIGH | Broken feature, fake success, ungated RPC | Fix this sprint |');
lines.push('| P2-MEDIUM | Quality/policy violation, potential PHI leak | Fix next sprint |');
lines.push('| P3-LOW | Cosmetic, documentation gaps, orphan code | Backlog |');
lines.push('| INFO | Informational, statistics | No action needed |');
lines.push('');

if (items.length === 0) {
  lines.push('## No actionable items found');
  lines.push('');
  lines.push('All audit modules passed. No triage needed.');
} else {
  lines.push('## Actionable Items');
  lines.push('');

  let currentSeverity = '';
  let itemNum = 0;

  for (const item of items) {
    const label = SEVERITY_EMOJI[item.severity] || item.severity.toUpperCase();
    if (item.severity !== currentSeverity) {
      currentSeverity = item.severity;
      lines.push(`### ${label}`);
      lines.push('');
    }

    itemNum++;
    const loc = item.file ? ` -- \`${item.file}${item.line ? ':' + item.line : ''}\`` : '';
    lines.push(`${itemNum}. **[${item.module}/${item.rule}]** ${item.message}${loc}`);
    if (item.fix) {
      lines.push(`   - Fix: ${item.fix}`);
    }
    lines.push('');
  }
}

// Module-by-module summary
lines.push('## Module Results');
lines.push('');
lines.push('| Module | Status | Pass | Fail | Warn | Time |');
lines.push('|--------|--------|------|------|------|------|');
for (const mod of summary.modules) {
  const pCount = mod.findings.filter((f) => f.status === 'pass').length;
  const fCount = mod.findings.filter((f) => f.status === 'fail').length;
  const wCount = mod.findings.filter((f) => f.status === 'warn').length;
  lines.push(
    `| ${mod.module} | ${mod.status.toUpperCase()} | ${pCount} | ${fCount} | ${wCount} | ${mod.duration_ms}ms |`
  );
}
lines.push('');

mkdirSync(AUDIT_DIR, { recursive: true });
writeFileSync(TRIAGE_FILE, lines.join('\n'), 'utf-8');

console.log(`Triage report written to ${TRIAGE_FILE}`);
console.log(`  ${items.length} actionable items`);
console.log(`  ${items.filter((i) => i.severity === 'critical').length} critical`);
console.log(`  ${items.filter((i) => i.severity === 'high').length} high`);
process.exit(0);
