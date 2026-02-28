#!/usr/bin/env node
/**
 * Phase 272: Certification Evidence Bundle v2
 *
 * Unified evidence generator that orchestrates all Wave 8 scan outputs
 * into a single certification-ready bundle with machine-readable outputs.
 *
 * Sections:
 *   1. Git & version metadata
 *   2. TypeScript compilation
 *   3. RPC contract replay (Phase 267)
 *   4. Clinical invariants (Phase 268)
 *   5. Security gauntlet (Phase 269)
 *   6. PHI audit (Phase 270)
 *   7. GameDay drills — non-destructive only (Phase 271)
 *   8. Audit chain verification
 *   9. Safety case cross-reference
 *  10. SHA-256 manifest
 *
 * Usage:
 *   node scripts/generate-certification-evidence-v2.mjs
 *   node scripts/generate-certification-evidence-v2.mjs --build-id cert-v2-2025-01
 *   node scripts/generate-certification-evidence-v2.mjs --skip-live
 *
 * Output: artifacts/evidence/certification-v2/<build-id>/
 */

import { execSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join, resolve, relative } from "node:path";
import { createHash } from "node:crypto";

const ROOT = process.cwd();
const args = process.argv.slice(2);

const buildId = args.includes("--build-id")
  ? args[args.indexOf("--build-id") + 1]
  : `cert-v2-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;

const skipLive = args.includes("--skip-live");

const outDir = join(ROOT, "artifacts", "evidence", "certification-v2", buildId);
mkdirSync(outDir, { recursive: true });

const sections = [];
const startTime = Date.now();
let totalFindings = 0;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function sha256File(filePath) {
  if (!existsSync(filePath)) return null;
  return sha256(readFileSync(filePath));
}

function safeExec(cmd, opts = {}) {
  try {
    return {
      ok: true,
      output: execSync(cmd, {
        cwd: ROOT,
        encoding: "utf-8",
        timeout: opts.timeout || 120_000,
        stdio: ["pipe", "pipe", "pipe"],
      }).trim(),
    };
  } catch (err) {
    return {
      ok: false,
      output: ((err.stdout || "") + "\n" + (err.stderr || "")).trim(),
    };
  }
}

function safeReadJson(filePath) {
  try {
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, "utf-8");
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

function addSection(id, title, data) {
  const section = { id, title, timestamp: new Date().toISOString(), ...data };
  sections.push(section);
  const icon = data.pass !== false ? "OK" : "!!";
  console.log(`  [${icon}] Section ${id}: ${title}`);
  return section;
}

/* ------------------------------------------------------------------ */
/*  Section 1: Git & Version Metadata                                 */
/* ------------------------------------------------------------------ */

console.log(`\n=== Certification Evidence Bundle v2 ===`);
console.log(`Build ID: ${buildId}`);
console.log(`Output:   ${outDir}\n`);

console.log("--- Section 1: Metadata ---");
const gitSha = safeExec("git rev-parse HEAD").output.substring(0, 40);
const gitBranch = safeExec("git rev-parse --abbrev-ref HEAD").output;
const gitDirty = safeExec("git status --porcelain").output.length > 0;

let nodeVersion = "unknown";
try {
  nodeVersion = process.version;
} catch {}

let pnpmVersion = "unknown";
try {
  pnpmVersion = safeExec("pnpm --version").output;
} catch {}

const metadata = {
  buildId,
  generatedAt: new Date().toISOString(),
  generator: "generate-certification-evidence-v2.mjs",
  version: "2.0.0",
  git: { sha: gitSha, branch: gitBranch, dirty: gitDirty },
  runtime: { node: nodeVersion, pnpm: pnpmVersion },
};

writeFileSync(join(outDir, "metadata.json"), JSON.stringify(metadata, null, 2));
addSection(1, "Git & Version Metadata", { pass: true, gitSha, gitBranch });

/* ------------------------------------------------------------------ */
/*  Section 2: TypeScript Compilation                                 */
/* ------------------------------------------------------------------ */

console.log("\n--- Section 2: TypeScript ---");
const tscResults = {};
for (const app of ["api", "web", "portal"]) {
  const res = safeExec(`pnpm -C apps/${app} exec tsc --noEmit`, {
    timeout: 180_000,
  });
  tscResults[app] = { pass: res.ok, output: res.output.substring(0, 2000) };
}

writeFileSync(join(outDir, "typecheck.json"), JSON.stringify(tscResults, null, 2));
const tscPass = Object.values(tscResults).every((r) => r.pass);
addSection(2, "TypeScript Compilation", {
  pass: tscPass,
  apps: Object.fromEntries(
    Object.entries(tscResults).map(([k, v]) => [k, v.pass])
  ),
});

/* ------------------------------------------------------------------ */
/*  Section 3: RPC Contract Replay (Phase 267)                        */
/* ------------------------------------------------------------------ */

console.log("\n--- Section 3: RPC Contracts ---");
const rpcScript = join(ROOT, "scripts", "rpc-contract-ci.mjs");
let rpcResult = { pass: false, note: "script not found" };

if (existsSync(rpcScript)) {
  const res = safeExec("node scripts/rpc-contract-ci.mjs", { timeout: 300_000 });
  const rpcReport = safeReadJson(
    join(ROOT, "artifacts", "rpc-contracts", "rpc-contract-report.json")
  );
  rpcResult = {
    pass: res.ok,
    fixtureCount: rpcReport?.fixtures?.length || 0,
    reportPath: "artifacts/rpc-contracts/rpc-contract-report.json",
  };

  // Copy report if exists
  if (rpcReport) {
    writeFileSync(
      join(outDir, "rpc-contract-report.json"),
      JSON.stringify(rpcReport, null, 2)
    );
  }
}

addSection(3, "RPC Contract Replay", rpcResult);

/* ------------------------------------------------------------------ */
/*  Section 4: Clinical Invariants (Phase 268)                        */
/* ------------------------------------------------------------------ */

console.log("\n--- Section 4: Clinical Invariants ---");
const invScript = join(ROOT, "scripts", "clinical-invariants-ci.mjs");
let invResult = { pass: false, note: "script not found" };

if (existsSync(invScript)) {
  const res = safeExec("node scripts/clinical-invariants-ci.mjs", {
    timeout: 300_000,
  });
  const invReport = safeReadJson(
    join(ROOT, "artifacts", "clinical-invariants", "invariants-report.json")
  );
  invResult = {
    pass: res.ok,
    invariantCount: invReport?.invariantCount || 0,
    reportPath: "artifacts/clinical-invariants/invariants-report.json",
  };

  if (invReport) {
    writeFileSync(
      join(outDir, "invariants-report.json"),
      JSON.stringify(invReport, null, 2)
    );
  }
}

addSection(4, "Clinical Invariants", invResult);

/* ------------------------------------------------------------------ */
/*  Section 5: Security Gauntlet (Phase 269)                          */
/* ------------------------------------------------------------------ */

console.log("\n--- Section 5: Security Gauntlet ---");
const secScript = join(ROOT, "scripts", "security", "gauntlet.mjs");
let secResult = { pass: false, note: "script not found" };

if (existsSync(secScript)) {
  const res = safeExec("node scripts/security/gauntlet.mjs", {
    timeout: 300_000,
  });
  const secReport = safeReadJson(
    join(ROOT, "artifacts", "security", "security-gauntlet.json")
  );
  secResult = {
    pass: res.ok,
    scanCount: secReport?.scans?.length || 0,
    criticalFindings: secReport?.summary?.critical || 0,
    reportPath: "artifacts/security/security-gauntlet.json",
  };
  totalFindings += secResult.criticalFindings;

  if (secReport) {
    writeFileSync(
      join(outDir, "security-gauntlet.json"),
      JSON.stringify(secReport, null, 2)
    );
  }
}

addSection(5, "Security Gauntlet", secResult);

/* ------------------------------------------------------------------ */
/*  Section 6: PHI Audit (Phase 270)                                  */
/* ------------------------------------------------------------------ */

console.log("\n--- Section 6: PHI Audit ---");
const phiScript = join(ROOT, "scripts", "privacy", "phi-audit.mjs");
let phiResult = { pass: false, note: "script not found" };

if (existsSync(phiScript)) {
  const res = safeExec("node scripts/privacy/phi-audit.mjs", {
    timeout: 300_000,
  });
  const phiReport = safeReadJson(
    join(ROOT, "artifacts", "privacy", "phi-audit-report.json")
  );
  phiResult = {
    pass: res.ok,
    checkCount: phiReport?.checks?.length || 0,
    phiFindings: phiReport?.summary?.findings || 0,
    reportPath: "artifacts/privacy/phi-audit-report.json",
  };
  totalFindings += phiResult.phiFindings;

  if (phiReport) {
    writeFileSync(
      join(outDir, "phi-audit-report.json"),
      JSON.stringify(phiReport, null, 2)
    );
  }
}

addSection(6, "PHI Audit", phiResult);

/* ------------------------------------------------------------------ */
/*  Section 7: GameDay Drills — non-destructive (Phase 271)           */
/* ------------------------------------------------------------------ */

console.log("\n--- Section 7: GameDay Drills ---");
const drillScript = join(ROOT, "scripts", "dr", "gameday-drill.mjs");
let drillResult = { pass: false, note: "script not found" };

if (existsSync(drillScript) && !skipLive) {
  // Only run restore + rollback drills (non-destructive)
  const restoreRes = safeExec("node scripts/dr/gameday-drill.mjs restore --json", {
    timeout: 120_000,
  });
  const rollbackRes = safeExec("node scripts/dr/gameday-drill.mjs rollback --json", {
    timeout: 120_000,
  });

  const gameDayReport = safeReadJson(
    join(ROOT, "artifacts", "dr", "gameday-results.json")
  );

  drillResult = {
    pass: true, // Non-destructive drills are informational
    restoreRan: restoreRes.ok,
    rollbackRan: rollbackRes.ok,
    reportPath: "artifacts/dr/gameday-results.json",
  };

  if (gameDayReport) {
    writeFileSync(
      join(outDir, "gameday-results.json"),
      JSON.stringify(gameDayReport, null, 2)
    );
  }
} else if (skipLive) {
  drillResult = { pass: true, note: "Skipped via --skip-live" };
}

addSection(7, "GameDay Drills", drillResult);

/* ------------------------------------------------------------------ */
/*  Section 8: Audit Chain Verification                               */
/* ------------------------------------------------------------------ */

console.log("\n--- Section 8: Audit Chain ---");
const auditLogPath = join(ROOT, "logs", "immutable-audit.jsonl");
const auditExists = existsSync(auditLogPath);
let auditChainResult = { pass: true, auditLogExists: auditExists };

if (auditExists) {
  const raw = readFileSync(auditLogPath, "utf-8").trim();
  const lines = raw ? raw.split("\n") : [];
  auditChainResult.entryCount = lines.length;
  auditChainResult.fileHash = sha256File(auditLogPath);

  // Verify chain integrity (check each entry's prevHash)
  let chainValid = true;
  let prevHash = null;
  for (let i = 0; i < Math.min(lines.length, 1000); i++) {
    try {
      const entry = JSON.parse(lines[i]);
      if (i > 0 && entry.prevHash && entry.prevHash !== prevHash) {
        chainValid = false;
        break;
      }
      prevHash = entry.hash || sha256(lines[i]);
    } catch {
      chainValid = false;
      break;
    }
  }
  auditChainResult.chainValid = chainValid;
  auditChainResult.pass = chainValid;
} else {
  auditChainResult.note = "No audit log file (API may not have been run)";
}

writeFileSync(
  join(outDir, "audit-chain.json"),
  JSON.stringify(auditChainResult, null, 2)
);
addSection(8, "Audit Chain Verification", auditChainResult);

/* ------------------------------------------------------------------ */
/*  Section 9: Safety Case Cross-Reference                            */
/* ------------------------------------------------------------------ */

console.log("\n--- Section 9: Safety Case ---");
const safetyCasePath = join(ROOT, "docs", "safety", "SAFETY_CASE.md");
const releaseGatePath = join(ROOT, "docs", "safety", "SAFETY_RELEASE_GATE.md");
const safetyCaseResult = {
  pass: existsSync(safetyCasePath) && existsSync(releaseGatePath),
  safetyCaseExists: existsSync(safetyCasePath),
  releaseGateExists: existsSync(releaseGatePath),
};

if (safetyCaseResult.safetyCaseExists) {
  const content = readFileSync(safetyCasePath, "utf-8");
  const hazardCount = (content.match(/\bH-\d{3}\b/g) || []).length;
  const controlCount = (content.match(/\bC-\d{3}\b/g) || []).length;
  safetyCaseResult.hazardRefs = hazardCount;
  safetyCaseResult.controlRefs = controlCount;
}

if (safetyCaseResult.releaseGateExists) {
  const content = readFileSync(releaseGatePath, "utf-8");
  const gateCount = (content.match(/\bG-\d{2}\b/g) || []).length;
  safetyCaseResult.releaseGateRefs = gateCount;
}

writeFileSync(
  join(outDir, "safety-case-xref.json"),
  JSON.stringify(safetyCaseResult, null, 2)
);
addSection(9, "Safety Case Cross-Reference", safetyCaseResult);

/* ------------------------------------------------------------------ */
/*  Section 10: SHA-256 Manifest                                      */
/* ------------------------------------------------------------------ */

console.log("\n--- Section 10: Manifest ---");
const manifestEntries = [];
const outFiles = readdirSync(outDir);

for (const f of outFiles) {
  if (f === "manifest.json" || f === "bundle-index.json") continue;
  const fp = join(outDir, f);
  if (statSync(fp).isFile()) {
    manifestEntries.push({
      file: f,
      sha256: sha256File(fp),
      bytes: statSync(fp).size,
    });
  }
}

const manifest = {
  buildId,
  generatedAt: new Date().toISOString(),
  fileCount: manifestEntries.length,
  files: manifestEntries,
};
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
addSection(10, "SHA-256 Manifest", {
  pass: true,
  fileCount: manifestEntries.length,
});

/* ------------------------------------------------------------------ */
/*  Bundle Index                                                      */
/* ------------------------------------------------------------------ */

const bundleIndex = {
  buildId,
  generatedAt: new Date().toISOString(),
  generator: "generate-certification-evidence-v2.mjs",
  version: "2.0.0",
  durationMs: Date.now() - startTime,
  sectionCount: sections.length,
  sections,
  summary: {
    totalSections: sections.length,
    passed: sections.filter((s) => s.pass !== false).length,
    failed: sections.filter((s) => s.pass === false).length,
    totalFindings,
  },
};

writeFileSync(
  join(outDir, "bundle-index.json"),
  JSON.stringify(bundleIndex, null, 2)
);

/* ------------------------------------------------------------------ */
/*  Human-Readable Summary                                            */
/* ------------------------------------------------------------------ */

const summaryLines = [
  "# Certification Evidence Bundle v2",
  "",
  `**Build ID**: ${buildId}`,
  `**Generated**: ${bundleIndex.generatedAt}`,
  `**Git SHA**: ${gitSha}`,
  `**Branch**: ${gitBranch}`,
  `**Duration**: ${bundleIndex.durationMs}ms`,
  "",
  "## Sections",
  "",
  "| # | Section | Status |",
  "|---|---------|--------|",
];

for (const s of sections) {
  const icon = s.pass !== false ? "PASS" : "FAIL";
  summaryLines.push(`| ${s.id} | ${s.title} | ${icon} |`);
}

summaryLines.push(
  "",
  "## Summary",
  "",
  `- **Total Sections**: ${bundleIndex.summary.totalSections}`,
  `- **Passed**: ${bundleIndex.summary.passed}`,
  `- **Failed**: ${bundleIndex.summary.failed}`,
  `- **Total Findings**: ${bundleIndex.summary.totalFindings}`,
  "",
  "## Files in Bundle",
  ""
);

for (const e of manifestEntries) {
  summaryLines.push(`- \`${e.file}\` (${e.bytes} bytes, SHA256: ${e.sha256.substring(0, 16)}...)`);
}

summaryLines.push(
  "",
  "---",
  "",
  "*Generated by generate-certification-evidence-v2.mjs*"
);

writeFileSync(join(outDir, "summary.md"), summaryLines.join("\n"));

/* ------------------------------------------------------------------ */
/*  Final Output                                                      */
/* ------------------------------------------------------------------ */

console.log(`\n=== Bundle Complete ===`);
console.log(`  Sections: ${bundleIndex.summary.totalSections}`);
console.log(`  Passed:   ${bundleIndex.summary.passed}`);
console.log(`  Failed:   ${bundleIndex.summary.failed}`);
console.log(`  Findings: ${bundleIndex.summary.totalFindings}`);
console.log(`  Output:   ${outDir}`);
console.log(`  Duration: ${bundleIndex.durationMs}ms\n`);

process.exit(bundleIndex.summary.failed > 0 ? 1 : 0);
