#!/usr/bin/env node
/**
 * qa/gauntlet/cli.mjs -- Phase 119: QA Gauntlet CLI
 *
 * Unified QA framework that runs phase-by-phase regression with
 * grouped suites (FAST / RC / FULL) and CI-enforced gates.
 *
 * Usage:
 *   node qa/gauntlet/cli.mjs --suite fast
 *   node qa/gauntlet/cli.mjs --suite rc
 *   node qa/gauntlet/cli.mjs --suite full
 *   node qa/gauntlet/cli.mjs --phase 112 --suite rc
 *   node qa/gauntlet/cli.mjs --tag rcm --suite rc
 *   node qa/gauntlet/cli.mjs --strict         (tighter thresholds)
 *   node qa/gauntlet/cli.mjs --ci             (machine-readable, no prompts)
 *
 * Outputs:
 *   - Human-readable summary to stdout
 *   - Machine output: artifacts/qa-gauntlet.json (gitignored)
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const ARTIFACTS_DIR = resolve(ROOT, "artifacts");
const MANIFEST_PATH = resolve(__dirname, "phase-manifest.json");

// ── Parse CLI args ──────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  if (idx < 0) return undefined;
  return args[idx + 1] || true;
}

const suiteName = getArg("suite") || "fast";
const phaseFilter = getArg("phase");
const tagFilter = getArg("tag");
const strict = args.includes("--strict");
const ciMode = args.includes("--ci");

// ── Suite definitions ───────────────────────────────────────

const SUITE_GATES = {
  fast: [
    "G0_prompts_integrity",
    "G1_build_typecheck",
    "G2_unit_tests",
    "G3_security_scans",
    "G4_contract_alignment",
  ],
  rc: [
    "G0_prompts_integrity",
    "G1_build_typecheck",
    "G2_unit_tests",
    "G3_security_scans",
    "G4_contract_alignment",
    "G5_api_smoke",
    "G7_restart_durability",
    "G8_ui_dead_click",
    "G10_system_audit",
    "G11_tenant_isolation",
    "G12_data_plane",
  ],
  full: [
    "G0_prompts_integrity",
    "G1_build_typecheck",
    "G2_unit_tests",
    "G3_security_scans",
    "G4_contract_alignment",
    "G5_api_smoke",
    "G6_vista_probe",
    "G7_restart_durability",
    "G8_ui_dead_click",
    "G9_performance_budget",
    "G10_system_audit",
    "G11_tenant_isolation",
    "G12_data_plane",
  ],
};

if (!SUITE_GATES[suiteName]) {
  console.error(`Unknown suite: ${suiteName}. Available: fast, rc, full`);
  process.exit(1);
}

// ── Gate module registry ────────────────────────────────────

const GATE_MODULES = {
  G0_prompts_integrity: "gates/g0-prompts-integrity.mjs",
  G1_build_typecheck: "gates/g1-build-typecheck.mjs",
  G2_unit_tests: "gates/g2-unit-tests.mjs",
  G3_security_scans: "gates/g3-security-scans.mjs",
  G4_contract_alignment: "gates/g4-contract-alignment.mjs",
  G5_api_smoke: "gates/g5-api-smoke.mjs",
  G6_vista_probe: "gates/g6-vista-probe.mjs",
  G7_restart_durability: "gates/g7-restart-durability.mjs",
  G8_ui_dead_click: "gates/g8-ui-dead-click.mjs",
  G9_performance_budget: "gates/g9-performance-budget.mjs",
  G10_system_audit: "gates/g10-system-audit.mjs",
  G11_tenant_isolation: "gates/g11-tenant-isolation.mjs",
  G12_data_plane: "gates/g12-data-plane.mjs",
};

// ── Resolve which gates to run ──────────────────────────────

let gateIds = [...SUITE_GATES[suiteName]];

// If filtering by phase, add phase-specific gates from manifest
if (phaseFilter && existsSync(MANIFEST_PATH)) {
  try {
    const raw = readFileSync(MANIFEST_PATH, "utf-8");
    const manifest = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
    const phase = manifest.phases.find((p) => String(p.phaseId) === String(phaseFilter));
    if (phase) {
      const phaseSuiteGates = phase.suites[suiteName] || [];
      // Merge phase-specific gates
      for (const g of phaseSuiteGates) {
        if (!gateIds.includes(g)) gateIds.push(g);
      }
    }
  } catch { /* manifest parse error -- proceed with suite defaults */ }
}

// If filtering by tag, add tag-specific gates
if (tagFilter && existsSync(MANIFEST_PATH)) {
  try {
    const raw = readFileSync(MANIFEST_PATH, "utf-8");
    const manifest = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
    const tagPhases = manifest.phases.filter((p) =>
      p.tags.includes(tagFilter.toLowerCase())
    );
    for (const phase of tagPhases) {
      const phaseSuiteGates = phase.suites[suiteName] || [];
      for (const g of phaseSuiteGates) {
        if (!gateIds.includes(g)) gateIds.push(g);
      }
    }
  } catch { /* proceed with defaults */ }
}

// Deduplicate and sort by gate number
gateIds = [...new Set(gateIds)].sort((a, b) => {
  const na = parseInt(a.replace(/\D/g, "")) || 0;
  const nb = parseInt(b.replace(/\D/g, "")) || 0;
  return na - nb;
});

// ── Run gates ───────────────────────────────────────────────

const results = [];
let totalPass = 0;
let totalFail = 0;
let totalSkip = 0;
let totalWarn = 0;

const header = `QA Gauntlet: suite=${suiteName}${phaseFilter ? ` phase=${phaseFilter}` : ""}${tagFilter ? ` tag=${tagFilter}` : ""}${strict ? " [STRICT]" : ""}`;

if (!ciMode) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${header}`);
  console.log(`  Gates: ${gateIds.length}`);
  console.log(`${"=".repeat(60)}\n`);
}

const runStart = Date.now();

for (const gateId of gateIds) {
  const modulePath = GATE_MODULES[gateId];
  if (!modulePath) {
    const result = { id: gateId, name: gateId, status: "skip", details: ["Gate module not found"], durationMs: 0 };
    results.push(result);
    totalSkip++;
    if (!ciMode) console.log(`  SKIP  ${gateId} (module not found)`);
    continue;
  }

  try {
    const fullPath = pathToFileURL(resolve(__dirname, modulePath)).href;
    const mod = await import(fullPath);
    const result = await mod.run({ suite: suiteName, strict, ci: ciMode });
    results.push(result);

    if (result.status === "pass") {
      totalPass++;
      if (!ciMode) console.log(`  PASS  ${result.name} (${result.durationMs}ms)`);
    } else if (result.status === "skip") {
      totalSkip++;
      if (!ciMode) console.log(`  SKIP  ${result.name} -- ${result.details?.[0] || ""}`);
    } else if (result.status === "warn") {
      totalWarn++;
      if (!ciMode) console.log(`  WARN  ${result.name} -- ${result.details?.[0] || ""}`);
    } else {
      totalFail++;
      if (!ciMode) {
        console.log(`  FAIL  ${result.name} (${result.durationMs}ms)`);
        for (const d of (result.details || []).filter((d) => d.includes("FAIL"))) {
          console.log(`        ${d}`);
        }
      }
    }
  } catch (err) {
    const result = { id: gateId, name: gateId, status: "fail", details: [`Gate threw: ${err.message}`], durationMs: 0 };
    results.push(result);
    totalFail++;
    if (!ciMode) console.log(`  FAIL  ${gateId} (threw: ${err.message})`);
  }
}

const totalDuration = Date.now() - runStart;

// ── Summary ─────────────────────────────────────────────────

if (!ciMode) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  QA Gauntlet Summary`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  Suite:    ${suiteName}${strict ? " (strict)" : ""}`);
  console.log(`  Total:    ${results.length} gates`);
  console.log(`  PASS:     ${totalPass}`);
  console.log(`  FAIL:     ${totalFail}`);
  console.log(`  SKIP:     ${totalSkip}`);
  console.log(`  WARN:     ${totalWarn}`);
  console.log(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`${"=".repeat(60)}\n`);

  if (totalFail > 0) {
    console.log("Failed gates:");
    for (const r of results.filter((r) => r.status === "fail")) {
      console.log(`  - ${r.name}`);
      for (const d of (r.details || []).filter((d) => d.includes("FAIL"))) {
        console.log(`    ${d}`);
      }
    }
    console.log("");
  }
}

// ── Machine output ──────────────────────────────────────────

const machineOutput = {
  generatedAt: new Date().toISOString(),
  suite: suiteName,
  strict,
  phase: phaseFilter || null,
  tag: tagFilter || null,
  totals: { pass: totalPass, fail: totalFail, skip: totalSkip, warn: totalWarn },
  durationMs: totalDuration,
  gates: results,
};

try {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  writeFileSync(
    resolve(ARTIFACTS_DIR, "qa-gauntlet.json"),
    JSON.stringify(machineOutput, null, 2) + "\n",
    "utf-8"
  );
  if (!ciMode) console.log("Machine output: artifacts/qa-gauntlet.json\n");
} catch (err) {
  if (!ciMode) console.warn(`Could not write artifacts: ${err.message}`);
}

// ── CI output ───────────────────────────────────────────────

if (ciMode) {
  // Print JSON to stdout for CI consumption
  console.log(JSON.stringify(machineOutput));
}

// ── Exit code ───────────────────────────────────────────────
// Allow event loop to drain before exiting (Node 24 UV_HANDLE_CLOSING)
setTimeout(() => process.exit(totalFail > 0 ? 1 : 0), 50);
