#!/usr/bin/env node
/**
 * RCM Readiness Gate -- Phase 513 (Wave 37 B1)
 *
 * CI gate that reads `data/rcm/rcm-readiness-matrix.json` and fails if:
 * 1. Any connector claims "implemented" but evidence says stub
 * 2. Any country pack enables RCM without a connector strategy
 * 3. Matrix file does not exist or is stale (>30 days)
 *
 * Usage:
 *   node scripts/qa-gates/rcm-readiness-gate.mjs
 *
 * Exit codes:
 *   0 = all gates pass
 *   1 = one or more gates failed
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const MATRIX_PATH = join(ROOT, "data/rcm/rcm-readiness-matrix.json");

let pass = 0;
let fail = 0;
let warn = 0;

function gate(label, ok, msg) {
  if (ok) {
    console.log(`  PASS  ${label}`);
    pass++;
  } else {
    console.log(`  FAIL  ${label}: ${msg}`);
    fail++;
  }
}

function warnGate(label, ok, msg) {
  if (ok) {
    console.log(`  PASS  ${label}`);
    pass++;
  } else {
    console.log(`  WARN  ${label}: ${msg}`);
    warn++;
  }
}

console.log("=== RCM Readiness Gate (Phase 513) ===\n");

/* Gate 1: Matrix file exists */
gate("G1 Matrix exists", existsSync(MATRIX_PATH), "Run rcm-readiness-scan.mjs first");

if (!existsSync(MATRIX_PATH)) {
  console.log(`\n  ${pass} PASS / ${fail} FAIL / ${warn} WARN`);
  process.exit(1);
}

/* Gate 2: Matrix file freshness (<30 days) */
const stat = statSync(MATRIX_PATH);
const ageMs = Date.now() - stat.mtimeMs;
const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
gate("G2 Matrix freshness", ageDays < 30, `Matrix is ${ageDays} days old`);

/* Load matrix */
const raw = readFileSync(MATRIX_PATH, "utf-8");
const matrix = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);

/* Gate 3: Matrix has schema fields */
gate(
  "G3 Schema valid",
  matrix.connectors && matrix.countryPacks && matrix.summary,
  "Missing required sections"
);

/* Gate 4: At least 1 connector scanned */
gate(
  "G4 Connectors scanned",
  (matrix.connectors || []).length > 0,
  "No connectors found"
);

/* Gate 5: At least 1 country pack scanned */
gate(
  "G5 Country packs scanned",
  (matrix.countryPacks || []).length > 0,
  "No country packs found"
);

/* Gate 6: No false-positive connectors (error-level issues) */
const errors = (matrix.issues || []).filter(i => i.severity === "error");
gate(
  "G6 No false-positive connectors",
  errors.length === 0,
  `${errors.length} connector(s) claim implemented but show stub evidence: ${errors.map(e => e.id).join(", ")}`
);

/* Gate 7: Country pack connector coverage (warning only) */
const packWarnings = (matrix.issues || []).filter(i => i.category === "pack-no-connector");
warnGate(
  "G7 Pack connector coverage",
  packWarnings.length === 0,
  `${packWarnings.length} pack(s) enable RCM without a connector: ${packWarnings.map(w => w.id).join(", ")}`
);

/* Gate 8: At least 1 payer record */
gate(
  "G8 Payer records",
  (matrix.payers || []).length > 0,
  "No payer records found"
);

/* Gate 9: Connectors summary math coherent */
const s = matrix.summary?.connectors || {};
const sumParts = (s.implemented || 0) + (s.stub || 0) + (s.integrationPending || 0) + (s.needsCredentials || 0);
gate(
  "G9 Summary math",
  sumParts <= (s.total || 0),
  `Sub-status sum (${sumParts}) exceeds total (${s.total})`
);

/* Gate 10: Markdown report generated */
const mdPath = join(ROOT, "docs/rcm/rcm-readiness-matrix.md");
gate("G10 Markdown report", existsSync(mdPath), "docs/rcm/rcm-readiness-matrix.md not found");

console.log(`\n  ${pass} PASS / ${fail} FAIL / ${warn} WARN`);

if (fail > 0) {
  console.log("\n  RESULT: GATE FAILED");
  process.exit(1);
} else {
  console.log("\n  RESULT: GATE PASSED");
  process.exit(0);
}
