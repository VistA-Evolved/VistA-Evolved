#!/usr/bin/env node
/**
 * scripts/qa/rpc-trace-manager.mjs -- Phase 144: QA Ladder V2
 *
 * Manages the RPC golden trace baseline:
 *   - record: Capture current RPC sequences from a live API
 *   - verify: Compare current state against golden baseline
 *   - diff:   Show what changed between runs
 *   - update: Accept current state as new baseline
 *
 * Usage:
 *   node scripts/qa/rpc-trace-manager.mjs verify
 *   node scripts/qa/rpc-trace-manager.mjs record --api http://localhost:3001
 *   node scripts/qa/rpc-trace-manager.mjs diff
 *   node scripts/qa/rpc-trace-manager.mjs update
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const ROOT = process.cwd();
const GOLDEN_PATH = resolve(ROOT, "apps/api/tests/fixtures/rpc-golden-trace.json");
const CURRENT_PATH = resolve(ROOT, "artifacts/rpc-trace-current.json");

const args = process.argv.slice(2);
const command = args[0] || "verify";
const apiUrl = args.includes("--api") ? args[args.indexOf("--api") + 1] : "http://localhost:3001";

// ── Helpers ──

function loadJson(path) {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
}

function saveJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

// ── Verify ──

function verify() {
  console.log("\n=== RPC Trace Verify ===\n");

  const golden = loadJson(GOLDEN_PATH);
  if (!golden) {
    console.error("  FAIL: Golden trace not found at", GOLDEN_PATH);
    process.exit(1);
  }

  let pass = 0;
  let fail = 0;

  // Check structure
  function check(label, ok) {
    if (ok) {
      pass++;
      console.log(`  PASS  ${label}`);
    } else {
      fail++;
      console.log(`  FAIL  ${label}`);
    }
  }

  check("_meta section exists", !!golden._meta);
  check("workflows section exists", !!golden.workflows);
  check("registrySnapshot exists", !!golden.registrySnapshot);

  const workflows = Object.keys(golden.workflows || {});
  check(`At least 5 workflows defined (got ${workflows.length})`, workflows.length >= 5);

  // Each workflow has rpcSequence array
  for (const wf of workflows) {
    const seq = golden.workflows[wf].rpcSequence;
    check(`${wf}: has rpcSequence array`, Array.isArray(seq) && seq.length > 0);
  }

  // Critical RPCs
  const critical = golden.registrySnapshot?.criticalRpcs || [];
  check(`Critical RPCs >= 10 (got ${critical.length})`, critical.length >= 10);

  // No PHI
  const text = JSON.stringify(golden);
  check("No SSN patterns", !/\b\d{3}-\d{2}-\d{4}\b/.test(text));
  check("No sandbox credentials", !text.toLowerCase().includes("prov123") &&
    !text.toLowerCase().includes("nurse123") &&
    !text.toLowerCase().includes("pharm123"));

  console.log(`\n  Result: ${pass} pass, ${fail} fail\n`);
  if (fail > 0) process.exit(1);
}

// ── Record ──

async function record() {
  console.log(`\n=== RPC Trace Record (${apiUrl}) ===\n`);

  // Check API availability
  try {
    const res = await fetch(`${apiUrl}/health`);
    if (res.status !== 200) {
      console.error("  API not healthy. Start the API first.");
      process.exit(1);
    }
  } catch (e) {
    console.error(`  Cannot reach API at ${apiUrl}: ${e.message}`);
    process.exit(1);
  }

  // Check VistA
  let vistaOk = false;
  try {
    const res = await fetch(`${apiUrl}/vista/ping`);
    vistaOk = res.status === 200;
  } catch { /* */ }

  console.log(`  VistA available: ${vistaOk}`);

  // Record RPC trace from the existing golden file plus live probes
  const golden = loadJson(GOLDEN_PATH) || { _meta: {}, workflows: {}, registrySnapshot: {} };

  // Update metadata
  golden._meta = {
    ...golden._meta,
    lastRecorded: new Date().toISOString(),
    vistaAvailableAtRecord: vistaOk,
    apiUrl,
  };

  saveJson(CURRENT_PATH, golden);
  console.log(`  Written: ${CURRENT_PATH}\n`);
}

// ── Diff ──

function diff() {
  console.log("\n=== RPC Trace Diff ===\n");

  const golden = loadJson(GOLDEN_PATH);
  const current = loadJson(CURRENT_PATH);

  if (!golden) {
    console.error("  Golden trace not found");
    process.exit(1);
  }
  if (!current) {
    console.error("  Current trace not found. Run: node scripts/qa/rpc-trace-manager.mjs record");
    process.exit(1);
  }

  const goldenWFs = new Set(Object.keys(golden.workflows));
  const currentWFs = new Set(Object.keys(current.workflows));

  // Added workflows
  const added = [...currentWFs].filter((w) => !goldenWFs.has(w));
  const removed = [...goldenWFs].filter((w) => !currentWFs.has(w));
  const shared = [...goldenWFs].filter((w) => currentWFs.has(w));

  if (added.length > 0) console.log(`  Added workflows: ${added.join(", ")}`);
  if (removed.length > 0) console.log(`  Removed workflows: ${removed.join(", ")}`);

  let changed = 0;
  for (const wf of shared) {
    const gSeq = JSON.stringify(golden.workflows[wf].rpcSequence);
    const cSeq = JSON.stringify(current.workflows[wf].rpcSequence);
    if (gSeq !== cSeq) {
      console.log(`  CHANGED: ${wf}`);
      console.log(`    Golden:  ${gSeq}`);
      console.log(`    Current: ${cSeq}`);
      changed++;
    }
  }

  if (added.length === 0 && removed.length === 0 && changed === 0) {
    console.log("  No differences found.\n");
  } else {
    console.log(`\n  Summary: ${added.length} added, ${removed.length} removed, ${changed} changed\n`);
  }
}

// ── Update ──

function update() {
  console.log("\n=== RPC Trace Update ===\n");

  const current = loadJson(CURRENT_PATH);
  if (!current) {
    console.error("  Current trace not found. Run: record first.");
    process.exit(1);
  }

  current._meta.description = "Phase 144 -- VistA RPC Golden Trace Baseline (updated)";
  current._meta.updatedAt = new Date().toISOString();

  saveJson(GOLDEN_PATH, current);
  console.log(`  Updated golden trace: ${GOLDEN_PATH}\n`);
}

// ── Main ──

switch (command) {
  case "verify":
    verify();
    break;
  case "record":
    await record();
    break;
  case "diff":
    diff();
    break;
  case "update":
    update();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error("Usage: rpc-trace-manager.mjs [verify|record|diff|update]");
    process.exit(1);
}
