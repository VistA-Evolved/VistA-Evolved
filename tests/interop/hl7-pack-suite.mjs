#!/usr/bin/env node
/**
 * HL7v2 Message Pack Validation Suite
 * Phase 290 -- Interop Certification Harness
 *
 * Exercises the HL7 pack registry endpoints: list, get, validate, template.
 * Validates HL7v2.x message structure, segment ordering, and field coverage.
 *
 * Usage:
 *   node tests/interop/hl7-pack-suite.mjs
 *   node tests/interop/hl7-pack-suite.mjs --api http://staging:3001
 */

import {
  assert,
  assertJsonResponse,
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

// --- Test: List all HL7 packs ---
async function testListPacks() {
  log("\n=== HL7 Pack List ===");

  const res = await safeFetch(`${API_URL}/hl7/packs`);
  const result = await assertJsonResponse("GET /hl7/packs returns 200", res, 200);
  results.push(result);

  if (!result.passed || !result.body) {
    results.push(assert("HL7 pack list (integration-pending)", false,
      "HL7 pack endpoints not reachable"));
    return [];
  }

  const body = result.body;
  const packs = Array.isArray(body) ? body : body.packs || body.data || [];

  results.push(assert("At least 1 pack registered",
    packs.length >= 1,
    `Got ${packs.length} packs`));

  // Each pack should have an id/name
  for (const p of packs.slice(0, 5)) {
    const packId = p.id || p.name || p.packId;
    results.push(assert(`Pack "${packId}" has id/name`,
      !!packId,
      `keys: ${Object.keys(p).join(",")}`));
  }

  return packs;
}

// --- Test: Get individual pack detail ---
async function testGetPack(packId) {
  log(`\n=== HL7 Pack Detail: ${packId} ===`);

  const res = await safeFetch(`${API_URL}/hl7/packs/${encodeURIComponent(packId)}`);
  const result = await assertJsonResponse(`GET /hl7/packs/${packId} returns 200`, res, 200);
  results.push(result);

  if (result.passed && result.body) {
    const pack = result.body;

    // Structural checks
    results.push(assert(`Pack ${packId} has messageType`,
      !!pack.messageType || !!pack.type || !!pack.triggerEvent,
      `keys: ${Object.keys(pack).join(",")}`));

    // Check for segment definitions or examples
    const hasSegments = pack.segments || pack.segmentDefs || pack.structure;
    results.push(assert(`Pack ${packId} has segment definitions or structure`,
      !!hasSegments,
      hasSegments ? "present" : "missing"));
  }
}

// --- Test: Validate HL7 message ---
async function testValidateMessage() {
  log("\n=== HL7 Message Validation ===");

  // Construct a minimal HL7v2 ADT^A01 message
  const hl7Msg = [
    "MSH|^~\\&|SENDING|FACILITY|RECEIVING|FACILITY|20240101120000||ADT^A01|MSG001|P|2.4",
    "EVN|A01|20240101120000",
    "PID|1||PAT001^^^FACILITY||DOE^JOHN||19800101|M",
    "PV1|1|I|WARD^ROOM^BED||||ATT^ATTENDING^DOCTOR",
  ].join("\r");

  const res = await safeFetch(`${API_URL}/hl7/packs/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: hl7Msg }),
  });

  const result = await assertJsonResponse("POST /hl7/packs/validate returns 2xx", res);
  results.push(result);

  if (result.passed && result.body) {
    const validation = result.body;
    const isValid = validation.valid !== undefined ? validation.valid : validation.ok;

    results.push(assert("Validation returns valid/ok field",
      isValid !== undefined,
      `Got: ${JSON.stringify({ valid: validation.valid, ok: validation.ok })}`));

    if (validation.errors) {
      results.push(assert("Validation errors is array",
        Array.isArray(validation.errors),
        `Got: ${typeof validation.errors}`));
    }

    if (validation.segments) {
      results.push(assert("Validation returns parsed segments",
        Array.isArray(validation.segments) || typeof validation.segments === "object",
        `segment count: ${Array.isArray(validation.segments) ? validation.segments.length : Object.keys(validation.segments).length}`));
    }
  }
}

// --- Test: HL7 message template generation ---
async function testTemplateGeneration(packId) {
  log(`\n=== HL7 Template Generation: ${packId || "ADT_A01"} ===`);

  const target = packId || "ADT_A01";
  const res = await safeFetch(`${API_URL}/hl7/packs/${encodeURIComponent(target)}/template`);
  const result = await assertJsonResponse(`GET /hl7/packs/${target}/template returns 2xx`, res);
  results.push(result);

  if (result.passed && result.body) {
    const tmpl = result.body;
    const msg = tmpl.message || tmpl.template || tmpl.raw || "";

    results.push(assert("Template contains MSH segment",
      typeof msg === "string" && msg.includes("MSH|"),
      msg ? `starts with: ${msg.substring(0, 40)}...` : "empty message"));
  }
}

// --- Test: HL7 pipeline status ---
async function testPipelineStatus() {
  log("\n=== HL7 Pipeline Status ===");

  const res = await safeFetch(`${API_URL}/hl7/pipeline/status`);
  const result = await assertJsonResponse("GET /hl7/pipeline/status returns 2xx", res);
  results.push(result);

  if (result.passed && result.body) {
    const st = result.body;
    results.push(assert("Pipeline status has ok field",
      st.ok !== undefined,
      `Got keys: ${Object.keys(st).join(",")}`));
  }
}

// --- Test: HL7 segment ordering conformance ---
async function testSegmentOrdering() {
  log("\n=== HL7 Segment Ordering ===");

  // Validate ADT message ordering: MSH, EVN, PID, PV1
  const requiredOrder = ["MSH", "EVN", "PID", "PV1"];

  // We test ordering by sending a well-formed message and checking
  // that validation does not report ordering errors
  const hl7Msg = [
    "MSH|^~\\&|TEST|FAC|RECV|FAC|20240601||ADT^A01|M002|P|2.4",
    "EVN|A01|20240601",
    "PID|1||P002^^^FAC||SMITH^JANE||19900315|F",
    "PV1|1|O|CLINIC||||PROV^DOC^FIRST",
  ].join("\r");

  const res = await safeFetch(`${API_URL}/hl7/packs/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: hl7Msg }),
  });

  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (body) {
    const errors = body.errors || [];
    const orderingErrors = errors.filter(e =>
      (typeof e === "string" && /order|sequence/i.test(e)) ||
      (e?.type === "ordering")
    );
    results.push(assert("Well-ordered ADT has no ordering errors",
      orderingErrors.length === 0,
      `ordering errors: ${orderingErrors.length}`));
  } else {
    results.push(assert("Segment ordering validation", false,
      "Could not parse validation response"));
  }

  // Also test out-of-order (EVN before MSH should fail or warn)
  const badMsg = [
    "EVN|A01|20240601",
    "MSH|^~\\&|TEST|FAC|RECV|FAC|20240601||ADT^A01|M003|P|2.4",
    "PID|1||P003^^^FAC||BAD^ORDER||19850101|M",
    "PV1|1|O|CLINIC",
  ].join("\r");

  const badRes = await safeFetch(`${API_URL}/hl7/packs/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: badMsg }),
  });

  let badBody;
  try {
    badBody = await badRes.json();
  } catch {
    badBody = null;
  }

  if (badBody) {
    results.push(assert("Out-of-order message detected",
      badBody.valid === false || badBody.ok === false ||
      (badBody.errors && badBody.errors.length > 0) ||
      badBody.warnings?.length > 0,
      `valid=${badBody.valid}, errors=${(badBody.errors || []).length}`));
  }
}

// --- Main ---
async function main() {
  log("HL7v2 Message Pack Validation Suite");
  log(`API: ${API_URL}`);
  log("=".repeat(50));

  const packs = await testListPacks();
  const firstPack = packs[0];
  const firstPackId = firstPack?.id || firstPack?.name || firstPack?.packId;

  if (firstPackId) {
    await testGetPack(firstPackId);
    await testTemplateGeneration(firstPackId);
  }

  await testValidateMessage();
  await testSegmentOrdering();
  await testPipelineStatus();

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
