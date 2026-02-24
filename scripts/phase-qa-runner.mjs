#!/usr/bin/env node
/**
 * scripts/phase-qa-runner.mjs -- Phase 108: Phase Audit Harness
 *
 * Progressive Phase QA runner. Validates individual phases or ranges
 * by delegating to the generated Playwright + Vitest spec files.
 *
 * Commands:
 *   node scripts/phase-qa-runner.mjs phase 12        # Single phase
 *   node scripts/phase-qa-runner.mjs range 1 20      # Phase range
 *   node scripts/phase-qa-runner.mjs all              # All phases
 *   node scripts/phase-qa-runner.mjs index             # Rebuild phase-index.json
 *   node scripts/phase-qa-runner.mjs generate          # Regenerate test specs
 *
 * Exit: 0 = pass, 1 = failures
 *
 * Prerequisites:
 *   - API running on :3001 (for API spec tests)
 *   - Web running on :3000 (for E2E spec tests)
 *   - docs/qa/phase-index.json exists (run "index" command first)
 */

import { execSync } from "child_process";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const command = args[0] || "all";

const INDEX_PATH = join(ROOT, "docs", "qa", "phase-index.json");
const E2E_DIR = join(ROOT, "apps", "web", "e2e", "phases");
const API_TEST_DIR = join(ROOT, "apps", "api", "tests", "phases");

// ---- Helpers ----

function runCmd(cmd, label) {
  const start = Date.now();
  try {
    execSync(cmd, {
      cwd: ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 300_000,
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  PASS  ${label} (${elapsed}s)`);
    return true;
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  FAIL  ${label} (${elapsed}s)`);
    const output = err.stdout?.toString() || err.stderr?.toString() || "";
    const lines = output.split("\n").filter(Boolean).slice(-15);
    if (lines.length) console.log(`        ${lines.join("\n        ")}`);
    return false;
  }
}

function loadIndex() {
  if (!existsSync(INDEX_PATH)) {
    console.error("Phase index not found. Run: node scripts/phase-qa-runner.mjs index");
    process.exit(1);
  }
  const raw = readFileSync(INDEX_PATH, "utf-8");
  return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
}

function findSpecFiles(dir, phaseNumbers) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".spec.ts") || f.endsWith(".test.ts"))
    .filter((f) => {
      // Parse range from filename: phases-X-to-Y.spec.ts
      const match = f.match(/phases-(\w+)-to-(\w+)\./);
      if (!match) return false;
      // A spec file is relevant if any requested phase falls in its range
      // We check by reading the file header for phase numbers
      const content = readFileSync(join(dir, f), "utf-8");
      return phaseNumbers.some((pn) => {
        const re = new RegExp(`Phase ${pn}[:\\s]`);
        return re.test(content);
      });
    });
}

// ---- Commands ----

function runIndex() {
  console.log("\n=== Rebuilding phase-index.json ===\n");
  return runCmd("node scripts/build-phase-index.mjs", "build-phase-index");
}

function runGenerate() {
  console.log("\n=== Regenerating phase QA specs ===\n");
  return runCmd("node scripts/generate-phase-qa.mjs", "generate-phase-qa");
}

function runPhase(phaseNum) {
  console.log(`\n=== Phase QA: Phase ${phaseNum} ===\n`);
  const index = loadIndex();

  const phase = index.phases.find((p) => String(p.phaseNumber) === String(phaseNum));
  if (!phase) {
    console.error(`Phase ${phaseNum} not found in index (${index.phaseCount} phases available)`);
    process.exit(1);
  }

  console.log(`  Phase ${phase.phaseNumber}: ${phase.title}`);
  console.log(`  Routes: ${phase.routes.length}, RPCs: ${phase.rpcs.length}, UI: ${phase.uiComponents.length}\n`);

  let pass = 0;
  let fail = 0;

  // Find and run matching E2E specs
  const e2eSpecs = findSpecFiles(E2E_DIR, [String(phaseNum)]);
  for (const spec of e2eSpecs) {
    const ok = runCmd(
      `cd apps/web && pnpm exec playwright test e2e/phases/${spec} --reporter=list --grep "Phase ${phaseNum}:"`,
      `E2E: ${spec}`
    );
    ok ? pass++ : fail++;
  }

  // Find and run matching API specs
  const apiSpecs = findSpecFiles(API_TEST_DIR, [String(phaseNum)]);
  for (const spec of apiSpecs) {
    const ok = runCmd(
      `cd apps/api && pnpm exec vitest run tests/phases/${spec} --reporter=verbose`,
      `API: ${spec}`
    );
    ok ? pass++ : fail++;
  }

  if (pass + fail === 0) {
    console.log(`  INFO  Phase ${phaseNum} has no generated specs (no routes/UI)`);
    console.log(`        This phase may be infra-only or documentation.\n`);
    return true;
  }

  console.log(`\n=== Phase ${phaseNum}: ${pass} pass, ${fail} fail ===\n`);
  return fail === 0;
}

function runRange(from, to) {
  console.log(`\n=== Phase QA Range: ${from}..${to} ===\n`);
  const index = loadIndex();

  // Collect phase numbers in range (handles alphanumeric like "37B")
  const phaseNums = index.phases
    .filter((p) => {
      const numPart = parseInt(p.phaseNumber);
      return numPart >= parseInt(from) && numPart <= parseInt(to);
    })
    .map((p) => String(p.phaseNumber));

  if (phaseNums.length === 0) {
    console.error(`No phases found in range ${from}..${to}`);
    process.exit(1);
  }

  console.log(`  Phases in range: ${phaseNums.join(", ")}\n`);

  let pass = 0;
  let fail = 0;

  // Run all matching E2E specs
  const e2eSpecs = findSpecFiles(E2E_DIR, phaseNums);
  const uniqueE2e = [...new Set(e2eSpecs)];
  for (const spec of uniqueE2e) {
    const ok = runCmd(
      `cd apps/web && pnpm exec playwright test e2e/phases/${spec} --reporter=list`,
      `E2E: ${spec}`
    );
    ok ? pass++ : fail++;
  }

  // Run all matching API specs
  const apiSpecs = findSpecFiles(API_TEST_DIR, phaseNums);
  const uniqueApi = [...new Set(apiSpecs)];
  for (const spec of uniqueApi) {
    const ok = runCmd(
      `cd apps/api && pnpm exec vitest run tests/phases/${spec} --reporter=verbose`,
      `API: ${spec}`
    );
    ok ? pass++ : fail++;
  }

  console.log(`\n=== Range ${from}..${to}: ${pass} pass, ${fail} fail (${phaseNums.length} phases) ===\n`);
  return fail === 0;
}

function runAll() {
  console.log("\n=== Phase QA: ALL ===\n");

  let pass = 0;
  let fail = 0;

  // Run all E2E phase specs
  if (existsSync(E2E_DIR)) {
    const specs = readdirSync(E2E_DIR).filter((f) => f.endsWith(".spec.ts")).sort();
    for (const spec of specs) {
      const ok = runCmd(
        `cd apps/web && pnpm exec playwright test e2e/phases/${spec} --reporter=list`,
        `E2E: ${spec}`
      );
      ok ? pass++ : fail++;
    }
  }

  // Run all API phase specs
  if (existsSync(API_TEST_DIR)) {
    const specs = readdirSync(API_TEST_DIR).filter((f) => f.endsWith(".test.ts")).sort();
    for (const spec of specs) {
      const ok = runCmd(
        `cd apps/api && pnpm exec vitest run tests/phases/${spec} --reporter=verbose`,
        `API: ${spec}`
      );
      ok ? pass++ : fail++;
    }
  }

  console.log(`\n=== ALL Phases: ${pass} pass, ${fail} fail ===\n`);
  return fail === 0;
}

// ---- Main ----

let success = true;

switch (command) {
  case "index":
    success = runIndex();
    break;

  case "generate":
    success = runGenerate();
    break;

  case "phase": {
    const num = args[1];
    if (!num) {
      console.error("Usage: node scripts/phase-qa-runner.mjs phase <number>");
      process.exit(1);
    }
    success = runPhase(num);
    break;
  }

  case "range": {
    const from = args[1];
    const to = args[2];
    if (!from || !to) {
      console.error("Usage: node scripts/phase-qa-runner.mjs range <from> <to>");
      process.exit(1);
    }
    success = runRange(from, to);
    break;
  }

  case "all":
    success = runAll();
    break;

  default:
    console.error(`Unknown command: ${command}`);
    console.error("Usage: phase | range <from> <to> | all | index | generate");
    process.exit(1);
}

process.exit(success ? 0 : 1);
