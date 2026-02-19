#!/usr/bin/env node
/**
 * Evidence Bundle Generator (Phase 34)
 *
 * Runs all quality gates and collects machine-readable results into
 * a deterministic folder: ./artifacts/evidence/<build-id>/
 *
 * Usage:
 *   node scripts/generate-evidence-bundle.mjs
 *   node scripts/generate-evidence-bundle.mjs --build-id ci-42
 *
 * Produces:
 *   - gate-results.json        (machine-readable gate pass/fail)
 *   - summary.md               (human-readable summary)
 *   - sbom.json                (CycloneDX SBOM if @cyclonedx/cyclonedx-npm available)
 *   - license-report.json      (dependency license listing)
 *   - secret-scan.json         (secret scan results)
 *   - phi-leak-scan.json       (PHI leak scan results)
 *   - unit-tests.json          (unit test results)
 *   - typecheck.json           (TSC results per app)
 */

import { execSync } from "child_process";
import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const buildId = process.argv.includes("--build-id")
  ? process.argv[process.argv.indexOf("--build-id") + 1]
  : new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

const outDir = join(ROOT, "artifacts", "evidence", buildId);
mkdirSync(outDir, { recursive: true });

const gates = [];
const startTime = Date.now();

function runGate(name, cmd, opts = {}) {
  const gate = { name, command: cmd, pass: false, output: "", durationMs: 0 };
  const gateStart = Date.now();
  try {
    gate.output = execSync(cmd, {
      cwd: ROOT,
      encoding: "utf-8",
      timeout: opts.timeout || 120_000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    gate.pass = true;
  } catch (err) {
    gate.output = (err.stdout || "") + "\n" + (err.stderr || "");
    gate.pass = opts.allowFail || false;
  }
  gate.durationMs = Date.now() - gateStart;
  gates.push(gate);
  const icon = gate.pass ? "PASS" : "FAIL";
  console.log(`  [${icon}] ${name} (${gate.durationMs}ms)`);
  return gate;
}

console.log(`\n=== Evidence Bundle Generator (Phase 34) ===`);
console.log(`Build ID: ${buildId}`);
console.log(`Output:   ${outDir}\n`);

/* ------------------------------------------------------------------ */
/* Gate 1: Install                                                     */
/* ------------------------------------------------------------------ */
console.log("--- Dependencies ---");
runGate("pnpm install", "pnpm -r install --frozen-lockfile", { timeout: 180_000 });

/* ------------------------------------------------------------------ */
/* Gate 2: Typecheck                                                   */
/* ------------------------------------------------------------------ */
console.log("\n--- TypeScript ---");
const tscApi = runGate("tsc: api", "pnpm -C apps/api exec tsc --noEmit");
const tscWeb = runGate("tsc: web", "pnpm -C apps/web exec tsc --noEmit");
const tscPortal = runGate("tsc: portal", "pnpm -C apps/portal exec tsc --noEmit");

writeFileSync(join(outDir, "typecheck.json"), JSON.stringify({
  api: { pass: tscApi.pass, output: tscApi.output },
  web: { pass: tscWeb.pass, output: tscWeb.output },
  portal: { pass: tscPortal.pass, output: tscPortal.output },
}, null, 2));

/* ------------------------------------------------------------------ */
/* Gate 3: Unit tests                                                  */
/* ------------------------------------------------------------------ */
console.log("\n--- Unit Tests ---");
const testGate = runGate("unit tests", "npx tsx --test apps/api/src/ai/redaction.test.ts apps/api/src/lib/logger.test.ts");

writeFileSync(join(outDir, "unit-tests.json"), JSON.stringify({
  pass: testGate.pass,
  output: testGate.output,
}, null, 2));

/* ------------------------------------------------------------------ */
/* Gate 4: Secret scan                                                 */
/* ------------------------------------------------------------------ */
console.log("\n--- Secret Scan ---");
const secretGate = runGate("secret scan", "node scripts/secret-scan.mjs");

writeFileSync(join(outDir, "secret-scan.json"), JSON.stringify({
  pass: secretGate.pass,
  output: secretGate.output,
}, null, 2));

/* ------------------------------------------------------------------ */
/* Gate 5: PHI leak scan                                               */
/* ------------------------------------------------------------------ */
console.log("\n--- PHI Leak Scan ---");
const phiGate = runGate("phi leak scan", "node scripts/phi-leak-scan.mjs");

writeFileSync(join(outDir, "phi-leak-scan.json"), JSON.stringify({
  pass: phiGate.pass,
  output: phiGate.output,
}, null, 2));

/* ------------------------------------------------------------------ */
/* Gate 6: License report                                              */
/* ------------------------------------------------------------------ */
console.log("\n--- License Report ---");
// Use pnpm licenses list -- works natively with pnpm
const licenseGate = runGate("license report",
  "pnpm licenses list --json 2>nul || echo {}", { allowFail: true });

writeFileSync(join(outDir, "license-report.json"), JSON.stringify({
  pass: true, // informational
  output: licenseGate.output.slice(0, 50000), // cap size
}, null, 2));

/* ------------------------------------------------------------------ */
/* Gate 7: SBOM generation (optional -- requires @cyclonedx/cyclonedx-npm) */
/* ------------------------------------------------------------------ */
console.log("\n--- SBOM ---");
let sbomPass = false;
try {
  execSync("npx --yes @cyclonedx/cyclonedx-npm --help", { stdio: "pipe", timeout: 30_000 });
  const sbomGate = runGate("sbom generation",
    `npx @cyclonedx/cyclonedx-npm --output-file "${join(outDir, "sbom.json")}" --spec-version 1.5`);
  sbomPass = sbomGate.pass;
} catch {
  console.log("  [SKIP] SBOM generation -- @cyclonedx/cyclonedx-npm not available");
  gates.push({ name: "sbom generation", pass: true, output: "skipped -- tool not installed", durationMs: 0 });
  writeFileSync(join(outDir, "sbom.json"), JSON.stringify({ note: "SBOM generation skipped -- install @cyclonedx/cyclonedx-npm to enable" }));
}

/* ------------------------------------------------------------------ */
/* Gate 8: Dependency vulnerability scan (npm audit as fallback)       */
/* ------------------------------------------------------------------ */
console.log("\n--- Vulnerability Scan ---");
const vulnGate = runGate("dependency vuln scan",
  "pnpm audit --json 2>nul || echo {}", { allowFail: true });

writeFileSync(join(outDir, "vuln-scan.json"), JSON.stringify({
  pass: true, // informational -- advisories don't block
  output: vulnGate.output.slice(0, 50000),
}, null, 2));

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */
const totalDuration = Date.now() - startTime;
const passCount = gates.filter(g => g.pass).length;
const failCount = gates.filter(g => !g.pass).length;

writeFileSync(join(outDir, "gate-results.json"), JSON.stringify({
  buildId,
  timestamp: new Date().toISOString(),
  totalDurationMs: totalDuration,
  gates: gates.map(g => ({ name: g.name, pass: g.pass, durationMs: g.durationMs })),
  summary: { total: gates.length, pass: passCount, fail: failCount },
}, null, 2));

const summaryMd = `# Evidence Bundle -- ${buildId}

**Generated:** ${new Date().toISOString()}
**Duration:** ${(totalDuration / 1000).toFixed(1)}s
**Result:** ${failCount === 0 ? "ALL GATES PASSED" : failCount + " GATE(S) FAILED"}

## Gates

| # | Gate | Result | Duration |
|---|------|--------|----------|
${gates.map((g, i) => `| ${i + 1} | ${g.name} | ${g.pass ? "PASS" : "FAIL"} | ${g.durationMs}ms |`).join("\n")}

## Files in Bundle

${readdirSync(outDir).map(f => `- ${f}`).join("\n")}

## Compliance Notes

- Secret scan: ${secretGate.pass ? "CLEAN" : "VIOLATIONS FOUND"}
- PHI leak scan: ${phiGate.pass ? "CLEAN" : "VIOLATIONS FOUND"}
- SBOM: ${sbomPass ? "Generated" : "Skipped (install @cyclonedx/cyclonedx-npm)"}
- License report: Informational (review license-report.json)
- Vulnerability scan: Informational (review vuln-scan.json)
`;

writeFileSync(join(outDir, "summary.md"), summaryMd);

console.log(`\n=== Bundle Complete ===`);
console.log(`  Pass: ${passCount}  Fail: ${failCount}`);
console.log(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`);
console.log(`  Output: ${outDir}\n`);

process.exit(failCount > 0 ? 1 : 0);
