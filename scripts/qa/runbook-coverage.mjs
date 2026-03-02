#!/usr/bin/env node
// scripts/qa/runbook-coverage.mjs
// Phase 508 -- Operational Runbook Coverage verification
// Validates that critical operational domains have runbook coverage.
//
// Usage: node scripts/qa/runbook-coverage.mjs

import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

let passes = 0;
let failures = 0;
const results = [];

function check(label, ok, detail = "") {
  const tag = ok ? "PASS" : "FAIL";
  console.log(`  [${tag}] ${label}${detail ? " -- " + detail : ""}`);
  if (ok) passes++;
  else failures++;
  results.push({ label, status: tag, detail });
}

console.log("=== Operational Runbook Coverage (Phase 508) ===\n");

// Read all runbook filenames
const runbookDir = join(ROOT, "docs/runbooks");
const runbooks = existsSync(runbookDir)
  ? readdirSync(runbookDir).filter((f) => f.endsWith(".md"))
  : [];
check(`Runbook directory has files (${runbooks.length})`, runbooks.length >= 50);

// -------------------------------------------------------------------
// Critical runbook categories -- each must have at least 1 matching file
// -------------------------------------------------------------------
const categories = [
  { name: "VistA connectivity", pattern: /vista.*(connect|rpc|docker|provision)/i },
  { name: "Backup / restore", pattern: /backup|restore|pitr/i },
  { name: "Incident response", pattern: /incident/i },
  { name: "Go-live / upgrade", pattern: /go.live|upgrade|cutover|deploy/i },
  { name: "Observability / monitoring", pattern: /observ|monitor|telem/i },
  { name: "Security / auth", pattern: /security|auth|iam|tls/i },
  { name: "Imaging", pattern: /imaging|orthanc|dicom|ohif/i },
  { name: "RCM / billing", pattern: /rcm|billing|payer|claim/i },
  { name: "Telehealth", pattern: /telehealth/i },
  { name: "Performance", pattern: /perform|load.test|budget/i },
  { name: "Disaster recovery", pattern: /disaster|gameday|rollback/i },
  { name: "Tenant / multi-tenant", pattern: /tenant|multitenant/i },
];

for (const cat of categories) {
  const matches = runbooks.filter((f) => cat.pattern.test(f));
  check(
    `Runbook category: ${cat.name}`,
    matches.length > 0,
    `${matches.length} runbook(s)`
  );
}

// -------------------------------------------------------------------
// AGENTS.md onboarding guide
// -------------------------------------------------------------------
const agentsFile = join(ROOT, "AGENTS.md");
const agentsSrc = existsSync(agentsFile) ? readFileSync(agentsFile, "utf-8") : "";
check("AGENTS.md exists", agentsSrc.length > 100);
check("AGENTS.md has credentials section", agentsSrc.includes("Credentials") || agentsSrc.includes("credentials"));
check("AGENTS.md has architecture map", agentsSrc.includes("Architecture") || agentsSrc.includes("architecture"));
check("AGENTS.md has bug tracker reference", agentsSrc.includes("BUG-TRACKER") || agentsSrc.includes("Bug Tracker"));

// -------------------------------------------------------------------
// .env.example exists (template for credentials)
// -------------------------------------------------------------------
const envExample = join(ROOT, "apps/api/.env.example");
check(".env.example exists for credential template", existsSync(envExample));

// -------------------------------------------------------------------
// Docker compose files exist for key services
// -------------------------------------------------------------------
const dockerFiles = [
  { name: "VistA Docker", path: "services/vista/docker-compose.yml" },
  { name: "Prod compose", path: "docker-compose.prod.yml" },
];
for (const df of dockerFiles) {
  check(`Docker compose: ${df.name}`, existsSync(join(ROOT, df.path)));
}

// -------------------------------------------------------------------
// Verification scripts exist
// -------------------------------------------------------------------
const verifyScripts = [
  "scripts/verify-rc.ps1",
  "scripts/verify-latest.ps1",
];
for (const vs of verifyScripts) {
  check(`Verify script: ${vs}`, existsSync(join(ROOT, vs)));
}

// -------------------------------------------------------------------
// Demo reset: sandbox credentials documented
// -------------------------------------------------------------------
check(
  "Sandbox credentials documented in AGENTS.md",
  agentsSrc.includes("PROV123") && agentsSrc.includes("PHARM123") && agentsSrc.includes("NURSE123")
);

// -------------------------------------------------------------------
// VistA routine installer exists
// -------------------------------------------------------------------
check(
  "Unified VistA routine installer exists",
  existsSync(join(ROOT, "scripts/install-vista-routines.ps1"))
);

// -------------------------------------------------------------------
// Summary
// -------------------------------------------------------------------
console.log(`\n=== Runbook Coverage: ${passes} pass, ${failures} fail ===`);

const report = {
  generatedAt: new Date().toISOString(),
  pass: passes,
  fail: failures,
  totalRunbooks: runbooks.length,
  results,
};

const evDir = join(ROOT, "evidence/wave-35/508-W35-P9-OPERATIONAL-RUNBOOKS");
if (!existsSync(evDir)) mkdirSync(evDir, { recursive: true });
writeFileSync(join(evDir, "runbook-coverage-report.json"), JSON.stringify(report, null, 2));
console.log(`Report: ${join(evDir, "runbook-coverage-report.json")}`);

process.exit(failures > 0 ? 1 : 0);
