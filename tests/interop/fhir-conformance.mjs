#!/usr/bin/env node
/**
 * FHIR R4 Conformance Test Suite
 * Phase 290 -- Interop Certification Harness
 *
 * Validates FHIR R4 CapabilityStatement, resource endpoints, and
 * content-type headers against ONC/HL7 conformance expectations.
 *
 * Usage:
 *   node tests/interop/fhir-conformance.mjs
 *   node tests/interop/fhir-conformance.mjs --api http://staging:3001
 *   node tests/interop/fhir-conformance.mjs --out results/fhir.json
 */

import {
  assert,
  assertJsonResponse,
  assertResourceType,
  assertSupportsResource,
  assertBundle,
  summarize,
} from "./assertions/fhir-assertions.mjs";

const API_URL = process.argv.includes("--api")
  ? process.argv[process.argv.indexOf("--api") + 1]
  : process.env.API_URL || "http://localhost:3001";

const OUT_FILE = process.argv.includes("--out")
  ? process.argv[process.argv.indexOf("--out") + 1]
  : null;

const results = [];

function log(msg) {
  console.log(msg);
}

async function safeFetch(url, opts = {}) {
  try {
    return await fetch(url, { ...opts, signal: AbortSignal.timeout(10000) });
  } catch (e) {
    return { status: 0, json: async () => ({}), text: async () => e.message, ok: false };
  }
}

// --- Test: FHIR metadata endpoint (CapabilityStatement) ---
async function testCapabilityStatement() {
  log("\n=== FHIR CapabilityStatement ===");

  const res = await safeFetch(`${API_URL}/fhir/metadata`);
  const csResult = await assertJsonResponse("GET /fhir/metadata returns 200", res, 200);

  if (!csResult.passed) {
    // If FHIR not yet implemented, record the failure
    results.push(csResult);
    return null;
  }

  results.push(csResult);
  const capStmt = csResult.body;

  if (capStmt) {
    results.push(assertResourceType(capStmt, "CapabilityStatement"));
    results.push(assert("fhirVersion is 4.0.x", /^4\.0/.test(capStmt.fhirVersion || ""),
      `Got fhirVersion: ${capStmt.fhirVersion}`));
    results.push(assert("status is active", capStmt.status === "active",
      `Got status: ${capStmt.status}`));
    results.push(assert("kind is instance", capStmt.kind === "instance",
      `Got kind: ${capStmt.kind}`));

    // Check for required resource types (US Core)
    const coreResources = ["Patient", "AllergyIntolerance", "Condition", "MedicationRequest"];
    for (const rt of coreResources) {
      results.push(assertSupportsResource(capStmt, rt));
    }
  }

  return capStmt;
}

// --- Test: Patient search ---
async function testPatientSearch() {
  log("\n=== Patient Search ===");

  const res = await safeFetch(`${API_URL}/fhir/Patient?_count=5`);
  const result = await assertJsonResponse("GET /fhir/Patient returns 2xx", res);

  if (result.passed && result.body) {
    const bundleResults = assertBundle(result.body);
    results.push(...bundleResults);
    results.push(assert("Bundle type is searchset",
      result.body.type === "searchset",
      `Got type: ${result.body.type}`));
  } else {
    results.push(result);
    // If FHIR not implemented, mark as expected-miss
    results.push(assert("Patient search (integration-pending)", false,
      "FHIR Patient endpoint not yet implemented"));
  }
}

// --- Test: AllergyIntolerance search ---
async function testAllergySearch() {
  log("\n=== AllergyIntolerance Search ===");

  const res = await safeFetch(`${API_URL}/fhir/AllergyIntolerance?patient=3`);
  const result = await assertJsonResponse("GET /fhir/AllergyIntolerance returns 2xx", res);

  if (result.passed && result.body) {
    const bundleResults = assertBundle(result.body);
    results.push(...bundleResults);
  } else {
    results.push(result);
    results.push(assert("AllergyIntolerance search (integration-pending)", false,
      "FHIR AllergyIntolerance endpoint not yet implemented"));
  }
}

// --- Test: Content-Type header ---
async function testContentType() {
  log("\n=== Content-Type Header ===");

  const res = await safeFetch(`${API_URL}/fhir/metadata`);
  const ct = res.headers?.get?.("content-type") || "";
  results.push(assert(
    "FHIR content-type is application/fhir+json or application/json",
    ct.includes("fhir+json") || ct.includes("application/json"),
    `Got content-type: ${ct}`
  ));
}

// --- Main ---
async function main() {
  log("FHIR R4 Conformance Test Suite");
  log(`API: ${API_URL}`);
  log("=".repeat(50));

  await testCapabilityStatement();
  await testPatientSearch();
  await testAllergySearch();
  await testContentType();

  const summary = summarize(results);

  log("\n" + "=".repeat(50));
  log(`Results: ${summary.passed}/${summary.total} passed, ${summary.failed} failed`);
  for (const r of summary.results) {
    const icon = r.passed ? "PASS" : "FAIL";
    const color = r.passed ? "\x1b[32m" : "\x1b[31m";
    log(`  ${color}${icon}\x1b[0m ${r.name}${r.detail ? ` (${r.detail})` : ""}`);
  }

  if (OUT_FILE) {
    const fs = await import("node:fs");
    const dir = await import("node:path");
    fs.mkdirSync(dir.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(summary, null, 2));
    log(`\nResults written to: ${OUT_FILE}`);
  }

  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(2);
});
