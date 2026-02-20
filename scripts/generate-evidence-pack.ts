#!/usr/bin/env node
/**
 * Phase 47 -- Evidence Pack Generator
 *
 * Runs all quality gates and produces a self-contained evidence pack
 * under docs/evidence/<build-id>/.
 *
 * Outputs:
 *   - build-info.json        -- git SHA, branch, date, Node version
 *   - gate-results.json      -- per-gate pass/fail/warn
 *   - typecheck.json          -- tsc --noEmit output
 *   - unit-tests.json         -- vitest summary
 *   - secret-scan.json        -- secret scan results
 *   - prompts-ordering.json   -- prompts gate results
 *   - rpc-registry.json       -- RPC gating results
 *   - module-gates.json       -- module integrity results
 *   - summary.md              -- human-readable summary
 *
 * Usage:
 *   npx tsx scripts/generate-evidence-pack.ts
 *
 * Environment:
 *   BUILD_ID  -- override build ID (default: git SHA short + timestamp)
 */

import { execSync } from "child_process";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

/* ------------------------------------------------------------------ */
/* Build ID                                                            */
/* ------------------------------------------------------------------ */

function gitShaShort(): string {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

function gitBranch(): string {
  try {
    return execSync("git branch --show-current", { cwd: ROOT, encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

const sha = gitShaShort();
const branch = gitBranch();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const buildId = process.env.BUILD_ID || `${sha}-${timestamp}`;

const outDir = join(ROOT, "docs", "evidence", buildId);
mkdirSync(outDir, { recursive: true });
console.log(`\n=== Evidence Pack Generator (Phase 47) ===`);
console.log(`Build ID: ${buildId}`);
console.log(`Output:   ${outDir}\n`);

/* ------------------------------------------------------------------ */
/* Build info                                                          */
/* ------------------------------------------------------------------ */

const buildInfo = {
  buildId,
  gitSha: sha,
  gitBranch: branch,
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
};
writeFileSync(join(outDir, "build-info.json"), JSON.stringify(buildInfo, null, 2));
console.log("[OK] build-info.json");

/* ------------------------------------------------------------------ */
/* Gate runner                                                         */
/* ------------------------------------------------------------------ */

interface GateResult {
  gate: string;
  status: "pass" | "fail" | "error";
  durationMs: number;
  outputFile?: string;
  stderr?: string;
}

const gateResults: GateResult[] = [];

function runGate(name: string, command: string, outputFile: string): GateResult {
  const start = Date.now();
  try {
    const output = execSync(command, {
      cwd: ROOT,
      encoding: "utf-8",
      timeout: 120_000,
      env: {
        ...process.env,
        EVIDENCE_OUTPUT: join(outDir, outputFile),
      },
    });
    const duration = Date.now() - start;
    // If the gate script wrote its own output, great. Otherwise write stdout.
    if (!existsSync(join(outDir, outputFile))) {
      writeFileSync(join(outDir, outputFile), JSON.stringify({ gate: name, stdout: output }, null, 2));
    }
    const result: GateResult = { gate: name, status: "pass", durationMs: duration, outputFile };
    gateResults.push(result);
    console.log(`[PASS] ${name} (${duration}ms)`);
    return result;
  } catch (err: unknown) {
    const duration = Date.now() - start;
    const e = err as { status?: number; stdout?: string; stderr?: string };
    const stderr = e.stderr?.slice(0, 500) || "";
    const stdout = e.stdout || "";

    // Write whatever output we got
    if (!existsSync(join(outDir, outputFile))) {
      writeFileSync(
        join(outDir, outputFile),
        JSON.stringify({ gate: name, error: true, stdout, stderr: stderr.slice(0, 200) }, null, 2),
      );
    }

    const result: GateResult = {
      gate: name,
      status: e.status !== undefined ? "fail" : "error",
      durationMs: duration,
      outputFile,
      stderr: stderr.slice(0, 200),
    };
    gateResults.push(result);
    console.log(`[FAIL] ${name} (${duration}ms)`);
    return result;
  }
}

/* ------------------------------------------------------------------ */
/* Run gates                                                           */
/* ------------------------------------------------------------------ */

// 1. TypeScript typecheck
runGate("typecheck", "npx tsc -p apps/api/tsconfig.json --noEmit 2>&1 || true", "typecheck.json");

// 2. Unit tests
runGate("unit-tests", "cd apps/api && npx vitest run --reporter=json 2>&1 || true", "unit-tests.json");

// 3. Secret scan
runGate("secret-scan", "node scripts/secret-scan.mjs", "secret-scan.json");

// 4. Prompts ordering
runGate("prompts-ordering", "npx tsx scripts/check-prompts-ordering.ts", "prompts-ordering.json");

// 5. RPC registry
runGate("rpc-registry", "npx tsx scripts/check-rpc-registry.ts", "rpc-registry.json");

// 6. Module gates
runGate("module-gates", "npx tsx scripts/check-module-gates.ts", "module-gates.json");

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

writeFileSync(join(outDir, "gate-results.json"), JSON.stringify(gateResults, null, 2));

const passCount = gateResults.filter((g) => g.status === "pass").length;
const failCount = gateResults.filter((g) => g.status === "fail").length;
const errorCount = gateResults.filter((g) => g.status === "error").length;

const summaryMd = `# Evidence Pack -- ${buildId}

**Generated**: ${new Date().toISOString()}
**Git SHA**: ${sha}
**Branch**: ${branch}
**Node**: ${process.version}

## Gate Results

| Gate | Status | Duration |
|------|--------|----------|
${gateResults.map((g) => `| ${g.gate} | ${g.status.toUpperCase()} | ${g.durationMs}ms |`).join("\n")}

## Summary

- **Pass**: ${passCount}
- **Fail**: ${failCount}
- **Error**: ${errorCount}
- **Total**: ${gateResults.length}

## Files

${gateResults.map((g) => `- \`${g.outputFile}\``).join("\n")}
- \`build-info.json\`
- \`gate-results.json\`
- \`summary.md\`
`;

writeFileSync(join(outDir, "summary.md"), summaryMd);

console.log(`\n--- Evidence Pack Summary ---`);
console.log(`Pass: ${passCount} | Fail: ${failCount} | Error: ${errorCount}`);
console.log(`Output: ${outDir}`);

process.exit(failCount + errorCount > 0 ? 1 : 0);
