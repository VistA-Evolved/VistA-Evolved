#!/usr/bin/env node
/**
 * scripts/qa/phase-registry.mjs -- Phase 144: QA Ladder V2
 *
 * Builds an enriched phase registry with domain classification,
 * route-to-test mapping, RPC workflow mapping, and store dependencies.
 *
 * Reads from:
 *   - docs/qa/phase-index.json (Phase 108 index)
 *   - prompts/ folder structure
 *   - apps/api/src/ for route + store discovery
 *
 * Usage:
 *   node scripts/qa/phase-registry.mjs [--out path] [--json]
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const ROOT = process.cwd();
const INDEX_PATH = resolve(ROOT, "docs/qa/phase-index.json");
const OUT_PATH = resolve(ROOT, "artifacts/phase-registry.json");

// ── Domain Classification ──

const DOMAIN_PATTERNS = [
  { domain: "clinical",    patterns: [/\/vista\//, /\/cprs\//, /cover.?sheet/i, /allerg/i, /vital/i, /problem/i, /medication/i, /note/i, /order/i, /lab/i] },
  { domain: "portal",      patterns: [/\/portal\//, /portal/i, /patient.?self/i, /consent/i, /document/i] },
  { domain: "imaging",     patterns: [/\/imaging\//, /dicom/i, /orthanc/i, /ohif/i, /worklist/i] },
  { domain: "rcm",         patterns: [/\/rcm\//, /claim/i, /payer/i, /billing/i, /edi/i, /remit/i, /denial/i] },
  { domain: "telehealth",  patterns: [/\/telehealth\//, /jitsi/i, /room.*video/i] },
  { domain: "iam",         patterns: [/\/iam\//, /\/auth\//, /oidc/i, /passkey/i, /policy.*engine/i, /break.?glass/i] },
  { domain: "analytics",   patterns: [/\/analytics\//, /aggregat/i, /etl/i, /rocto/i] },
  { domain: "intake",      patterns: [/\/intake\//, /intake/i, /brain.*provider/i, /questionnaire/i] },
  { domain: "scheduling",  patterns: [/\/scheduling\//, /appointment/i, /clinic.*pref/i, /check.?in/i] },
  { domain: "interop",     patterns: [/\/interop\//, /hl7/i, /hlo/i, /fhir/i] },
  { domain: "observability", patterns: [/\/posture\//, /\/metrics\//, /otel/i, /prometheus/i, /jaeger/i] },
  { domain: "modules",     patterns: [/\/modules\//, /\/capabilities\//, /\/adapters\//, /sku/i, /module.*guard/i] },
];

/**
 * Classify a phase into one or more domains based on routes, RPCs, title, and files.
 */
export function classifyDomains(phase) {
  const text = [
    phase.title,
    ...phase.routes,
    ...phase.rpcs,
    ...phase.uiComponents,
    ...phase.filesTouched,
  ].join(" ");

  const domains = new Set();
  for (const { domain, patterns } of DOMAIN_PATTERNS) {
    if (patterns.some((p) => p.test(text))) {
      domains.add(domain);
    }
  }
  // Default to "infrastructure" if no domain matched
  if (domains.size === 0) domains.add("infrastructure");
  return [...domains];
}

// ── RPC Workflow Mapping ──

const RPC_WORKFLOWS = {
  login:              { rpcs: ["XUS SIGNON SETUP", "XUS AV CODE", "XWB CREATE CONTEXT", "XUS GET USER INFO"], domain: "iam" },
  patientSearch:      { rpcs: ["ORWPT LIST ALL"], domain: "clinical" },
  defaultPatientList: { rpcs: ["ORQPT DEFAULT LIST SOURCE", "ORWPT LIST ALL"], domain: "clinical" },
  coverSheet:         { rpcs: ["ORQQAL LIST", "GMV V/M ALLDATA", "ORQQPL PROBLEM LIST", "ORWPS ACTIVE", "TIU DOCUMENTS BY CONTEXT"], domain: "clinical" },
  allergies:          { rpcs: ["ORQQAL LIST"], domain: "clinical" },
  vitals:             { rpcs: ["GMV V/M ALLDATA"], domain: "clinical" },
  problems:           { rpcs: ["ORQQPL PROBLEM LIST"], domain: "clinical" },
  medications:        { rpcs: ["ORWPS ACTIVE"], domain: "clinical" },
  notes:              { rpcs: ["TIU DOCUMENTS BY CONTEXT"], domain: "clinical" },
  orders:             { rpcs: ["ORWORB FASTUSER", "ORWDX WRLST"], domain: "clinical" },
  addAllergy:         { rpcs: ["ORWDAL32 ALLERGY MATCH", "ORWDAL32 SAVE ALLERGY"], domain: "clinical" },
  clinicalReports:    { rpcs: ["ORWRP REPORT TEXT"], domain: "clinical" },
  encounters:         { rpcs: ["ORWPCE ACTIVE PROV", "ORWPCE PCE4NOTE"], domain: "rcm" },
  tiuCreate:          { rpcs: ["TIU CREATE RECORD", "TIU SET DOCUMENT TEXT"], domain: "intake" },
};

/**
 * For a given phase, find which RPC workflows it touches.
 */
export function mapRpcWorkflows(phase) {
  const phaseRpcs = new Set(phase.rpcs);
  const matched = [];
  for (const [name, wf] of Object.entries(RPC_WORKFLOWS)) {
    if (wf.rpcs.some((r) => phaseRpcs.has(r))) {
      matched.push(name);
    }
  }
  return matched;
}

// ── Store Dependencies ──

const STORE_PATTERNS = [
  { store: "session-store",     pattern: /session.?store/i },
  { store: "claim-store",       pattern: /claim.?store/i },
  { store: "room-store",        pattern: /room.?store/i },
  { store: "analytics-store",   pattern: /analytics.?store/i },
  { store: "imaging-worklist",  pattern: /imaging.?worklist/i },
  { store: "imaging-ingest",    pattern: /imaging.?ingest/i },
  { store: "payer-registry",    pattern: /payer.?registry/i },
  { store: "brain-registry",    pattern: /brain.?registry/i },
  { store: "immutable-audit",   pattern: /immutable.?audit/i },
  { store: "platform-db",       pattern: /platform.?db|sqlite/i },
  { store: "pg",                pattern: /postgres|pg.?pool|pg.?migrate/i },
];

export function mapStores(phase) {
  const text = [...phase.filesTouched, ...phase.routes, phase.title].join(" ");
  return STORE_PATTERNS.filter((s) => s.pattern.test(text)).map((s) => s.store);
}

// ── Test Classification ──

/**
 * Determine which test types are appropriate for a phase.
 */
export function classifyTests(enrichedPhase) {
  const tests = [];

  // Playwright journey if there are navigable UI routes
  const uiRoutes = enrichedPhase.routes.filter(
    (r) => r.startsWith("/cprs") || r.startsWith("/portal") || r.startsWith("/admin")
  );
  if (uiRoutes.length > 0 || enrichedPhase.uiComponents.length > 0) {
    tests.push("playwright-journey");
  }

  // RPC replay if phase touches VistA RPCs
  if (enrichedPhase.rpcWorkflows.length > 0) {
    tests.push("rpc-replay");
  }

  // Restart resilience if phase uses durable stores
  const durableStores = enrichedPhase.stores.filter(
    (s) => s === "platform-db" || s === "pg" || s === "claim-store" || s === "session-store"
  );
  if (durableStores.length > 0) {
    tests.push("restart-resilience");
  }

  // API contract if there are API routes
  const apiRoutes = enrichedPhase.routes.filter(
    (r) => r.startsWith("/") && !r.startsWith("/cprs") && !r.startsWith("/portal")
  );
  if (apiRoutes.length > 0) {
    tests.push("api-contract");
  }

  // Visual regression for stable UI pages
  if (enrichedPhase.uiComponents.length > 0 && enrichedPhase.domains.includes("clinical")) {
    tests.push("visual-regression");
  }

  return tests;
}

// ── Main ──

export function buildRegistry() {
  if (!existsSync(INDEX_PATH)) {
    console.error("Phase index not found. Run: node scripts/build-phase-index.mjs");
    process.exit(1);
  }

  const raw = readFileSync(INDEX_PATH, "utf-8");
  const index = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);

  const enriched = index.phases.map((phase) => {
    const domains = classifyDomains(phase);
    const rpcWorkflows = mapRpcWorkflows(phase);
    const stores = mapStores(phase);
    const ep = { ...phase, domains, rpcWorkflows, stores };
    const testTypes = classifyTests(ep);
    return { ...ep, testTypes };
  });

  return {
    generatedAt: new Date().toISOString(),
    generator: "scripts/qa/phase-registry.mjs",
    phaseCount: enriched.length,
    domainSummary: summarizeDomains(enriched),
    rpcWorkflows: RPC_WORKFLOWS,
    phases: enriched,
  };
}

function summarizeDomains(phases) {
  const summary = {};
  for (const p of phases) {
    for (const d of p.domains) {
      if (!summary[d]) summary[d] = { count: 0, phases: [] };
      summary[d].count++;
      summary[d].phases.push(p.phaseNumber);
    }
  }
  return summary;
}

// CLI entry
const args = process.argv.slice(2);
if (!args.includes("--lib")) {
  const registry = buildRegistry();
  const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : OUT_PATH;

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(registry, null, 2) + "\n");

  console.log(`\n=== Phase Registry V2 (Phase 144) ===`);
  console.log(`  Phases: ${registry.phaseCount}`);
  console.log(`  Domains:`);
  for (const [d, info] of Object.entries(registry.domainSummary)) {
    console.log(`    ${d.padEnd(18)} ${info.count} phases`);
  }
  console.log(`\n  Test type coverage:`);
  const testCounts = {};
  for (const p of registry.phases) {
    for (const t of p.testTypes) {
      testCounts[t] = (testCounts[t] || 0) + 1;
    }
  }
  for (const [t, c] of Object.entries(testCounts)) {
    console.log(`    ${t.padEnd(22)} ${c} phases`);
  }
  console.log(`\n  Written: ${out}\n`);

  if (args.includes("--json")) {
    process.stdout.write(JSON.stringify(registry));
  }
}
