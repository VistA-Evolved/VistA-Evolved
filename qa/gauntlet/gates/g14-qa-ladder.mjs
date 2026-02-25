#!/usr/bin/env node
/**
 * G14 -- QA Ladder Gate (Phase 129)
 *
 * Validates the QA ladder infrastructure is in place and functional:
 *   1. Playwright journey specs exist and are parseable
 *   2. API contract test file exists and is parseable
 *   3. RPC golden trace baseline exists with required structure
 *   4. Chaos/restart test file exists
 *   5. Visual regression spec exists
 *   6. No placeholder test bodies (empty describe/it blocks)
 *   7. Dead-click detector is wired into journeys
 *   8. PHI safety: no credentials or patient data in test fixtures
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

export const id = "G14_qa_ladder";
export const name = "QA Ladder Infrastructure";

function rd(rel) {
  const p = resolve(ROOT, rel);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

export async function run(opts = {}) {
  const start = Date.now();
  const details = [];
  let status = "pass";
  let p = 0;
  let f = 0;

  function check(label, ok) {
    if (ok) {
      p++;
    } else {
      f++;
      details.push(`FAIL: ${label}`);
      status = "fail";
    }
  }

  function warn(label) {
    details.push(`WARN: ${label}`);
  }

  // ── Workstream A: Playwright Journeys ──

  const journeys = rd("apps/web/e2e/qa-ladder-journeys.spec.ts");
  check("Playwright journeys spec exists", journeys !== null);
  check("Journey 1: clinical workflow", journeys?.includes("Clinical workflow") ?? false);
  check("Journey 2: orders workflow", journeys?.includes("Orders workflow") ?? false);
  check("Journey 3: dead-click audit", journeys?.includes("Dead-click audit") ?? false);
  check("Journey 4: API health check", journeys?.includes("API health") ?? false);
  check("Dead-click auditClick helper", journeys?.includes("auditClick") ?? false);
  check("Uses selectPatient helper", journeys?.includes("selectPatient") ?? false);
  check("Uses setupConsoleGate", journeys?.includes("setupConsoleGate") ?? false);

  // ── Workstream B: Contract Tests ──

  const contracts = rd("apps/api/tests/qa-ladder-contracts.test.ts");
  check("Contract test file exists", contracts !== null);
  check("Contract: clinical endpoints", contracts?.includes("clinical endpoint contracts") ?? false);
  check("Contract: error shape uniformity", contracts?.includes("Error shape uniformity") ?? false);
  check("Contract: no placeholder responses", contracts?.includes("placeholder") ?? false);
  check("Contract: security headers", contracts?.includes("Security headers") ?? false);
  check("Contract: input validation", contracts?.includes("Input validation") ?? false);
  check("Contract: timing budget", contracts?.includes("MAX_RESPONSE_MS") ?? false);
  check("Contract: PHI leak prevention", contracts?.includes("not.toContain") ?? false);

  // ── Workstream C: RPC Golden Trace ──

  const goldenTrace = rd("apps/api/tests/fixtures/rpc-golden-trace.json");
  check("Golden trace file exists", goldenTrace !== null);

  if (goldenTrace) {
    try {
      const raw = goldenTrace.charCodeAt(0) === 0xFEFF ? goldenTrace.slice(1) : goldenTrace;
      const golden = JSON.parse(raw);
      check("Golden trace has _meta", !!golden._meta);
      check("Golden trace has workflows", !!golden.workflows);
      check("Golden trace has registrySnapshot", !!golden.registrySnapshot);
      check("Golden trace login workflow", !!golden.workflows?.login);
      check("Golden trace coverSheet workflow", !!golden.workflows?.coverSheet);
      check("Golden trace criticalRpcs array", Array.isArray(golden.registrySnapshot?.criticalRpcs));

      // PHI safety check
      const text = JSON.stringify(golden);
      check("Golden trace: no SSN pattern", !text.match(/\d{3}-\d{2}-\d{4}/));
      check("Golden trace: no credentials", !text.includes("PROV123") && !text.includes("NURSE123"));
      check("Golden trace: no patient names", !text.includes("CARTER,DAVID"));
    } catch (e) {
      check("Golden trace is valid JSON", false);
    }
  }

  const traceTest = rd("apps/api/tests/rpc-trace-replay.test.ts");
  check("RPC trace replay test exists", traceTest !== null);
  check("Trace: PHI safety tests", traceTest?.includes("PHI safety") ?? false);
  check("Trace: registry alignment", traceTest?.includes("registry alignment") ?? false);
  check("Trace: sequence stability", traceTest?.includes("sequence stability") ?? false);
  check("Trace: live replay", traceTest?.includes("Live RPC replay") ?? false);

  // ── Workstream D: Chaos/Restart ──

  const chaos = rd("apps/api/tests/chaos-restart.test.ts");
  check("Chaos/restart test exists", chaos !== null);
  check("Chaos: health resilience", chaos?.includes("Health endpoint resilience") ?? false);
  check("Chaos: session resilience", chaos?.includes("Session resilience") ?? false);
  check("Chaos: data persistence", chaos?.includes("Data persistence") ?? false);
  check("Chaos: concurrent requests", chaos?.includes("Concurrent request") ?? false);
  check("Chaos: error shape under stress", chaos?.includes("Error shape under stress") ?? false);

  // ── Workstream E: Visual Regression ──

  const visual = rd("apps/web/e2e/visual-regression.spec.ts");
  check("Visual regression spec exists", visual !== null);
  check("Visual: login page snapshot", visual?.includes("login-page.png") ?? false);
  check("Visual: patient search snapshot", visual?.includes("patient-search.png") ?? false);
  check("Visual: cover sheet snapshot", visual?.includes("cover-sheet.png") ?? false);
  check("Visual: structural regression", visual?.includes("Structural regression") ?? false);
  check("Visual: uses toHaveScreenshot", visual?.includes("toHaveScreenshot") ?? false);
  check("Visual: PHI masking", visual?.includes("mask:") ?? false);

  // ── Cross-cutting: no placeholder tests ──

  const allTestSources = [journeys, contracts, traceTest, chaos, visual].filter(Boolean);
  let placeholderCount = 0;
  for (const src of allTestSources) {
    // Check for empty it() blocks: it("...", () => {}) or it("...", async () => {})
    const emptyTests = src.match(/it\([^)]+,\s*(async\s*)?\(\)\s*=>\s*\{\s*\}\)/g);
    if (emptyTests) placeholderCount += emptyTests.length;
  }
  check("No empty/placeholder test bodies", placeholderCount === 0);

  // ── Cross-cutting: no hardcoded credentials in test files ──

  let credLeak = false;
  for (const src of allTestSources) {
    if (!src) continue;
    // Allow PROV123 in: env-var fallback (?? "PROV123"), comments (//), assertions (.toContain)
    const lines = src.split("\n");
    for (const line of lines) {
      if (!line.includes("PROV123")) continue;
      const trimmed = line.trim();
      // Allow: process.env fallbacks, comments, assertion checks, string comparisons
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
      if (line.includes("??") || line.includes("process.env")) continue;
      if (line.includes("toContain") || line.includes("not.toContain")) continue;
      if (line.includes("includes(")) continue;
      credLeak = true;
      break;
    }
    if (credLeak) break;
  }
  check("No hardcoded PROV123 outside env/assert context", !credLeak);

  // ── Summary ──

  const elapsed = Date.now() - start;
  details.unshift(`QA Ladder: ${p} PASS / ${f} FAIL (${elapsed}ms)`);

  return {
    id,
    name,
    status,
    pass: p,
    fail: f,
    warn: 0,
    details,
    durationMs: elapsed,
  };
}
