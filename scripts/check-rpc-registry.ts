#!/usr/bin/env node
/**
 * Phase 47 -- RPC Registry Gating Check
 *
 * Ensures all RPC calls in the codebase go through the registry and that
 * every RPC name used is either in the Vivian index OR the allowlist.
 *
 * Checks:
 *   1. Every callRpc/safeCallRpc/callRpcWithList string literal is a known RPC
 *   2. Every registry entry is either in Vivian OR in RPC_EXCEPTIONS
 *   3. No orphaned registry entries (defined but never called)  [warn only]
 *   4. RPC_EXCEPTIONS all have non-empty reasons
 *
 * Usage:
 *   npx tsx scripts/check-rpc-registry.ts
 *
 * Exit codes:
 *   0 = all checks pass
 *   1 = hard failures found
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, relative, extname, dirname } from "path";

const ROOT = process.cwd();
const VIVIAN_INDEX = join(ROOT, "data", "vista", "vivian", "rpc_index.json");
const REGISTRY_FILE = join(ROOT, "apps", "api", "src", "vista", "rpcRegistry.ts");

interface CheckResult {
  check: string;
  status: "pass" | "fail" | "warn";
  message: string;
  details?: string[];
}

const results: CheckResult[] = [];

function pass(check: string, message: string) {
  results.push({ check, status: "pass", message });
}
function fail(check: string, message: string, details?: string[]) {
  results.push({ check, status: "fail", message, details });
}
function warn(check: string, message: string, details?: string[]) {
  results.push({ check, status: "warn", message, details });
}

/* ------------------------------------------------------------------ */
/* Load Vivian index                                                    */
/* ------------------------------------------------------------------ */

let vivianNames: Set<string>;
if (existsSync(VIVIAN_INDEX)) {
  const vivianData = JSON.parse(readFileSync(VIVIAN_INDEX, "utf-8"));
  vivianNames = new Set(
    (vivianData.rpcs || []).map((r: { name: string }) => r.name.toUpperCase()),
  );
  pass("vivian-loaded", `Loaded ${vivianNames.size} RPCs from Vivian index`);
} else {
  fail("vivian-loaded", "Vivian index not found at data/vista/vivian/rpc_index.json");
  printAndExit();
  process.exit(1); // unreachable but satisfies TS
}

/* ------------------------------------------------------------------ */
/* Load registry                                                       */
/* ------------------------------------------------------------------ */

if (!existsSync(REGISTRY_FILE)) {
  fail("registry-loaded", "rpcRegistry.ts not found");
  printAndExit();
  process.exit(1);
}

const registrySource = readFileSync(REGISTRY_FILE, "utf-8");

// Extract RPC names from RPC_REGISTRY array
const registryNamePattern = /name:\s*["']([^"']+)["']/g;
const registryNames: string[] = [];
let match: RegExpExecArray | null;

// Find the RPC_REGISTRY section
const registryStart = registrySource.indexOf("export const RPC_REGISTRY");
const exceptionsStart = registrySource.indexOf("export const RPC_EXCEPTIONS");

if (registryStart === -1 || exceptionsStart === -1) {
  fail("registry-parsed", "Could not find RPC_REGISTRY or RPC_EXCEPTIONS in rpcRegistry.ts");
  printAndExit();
  process.exit(1);
}

const registrySection = registrySource.slice(registryStart, exceptionsStart);
while ((match = registryNamePattern.exec(registrySection)) !== null) {
  registryNames.push(match[1]);
}

// Extract exceptions
const exceptionSection = registrySource.slice(exceptionsStart);
const exceptionNamePattern = /name:\s*["']([^"']+)["']/g;
const exceptionReasonPattern = /reason:\s*["']([^"']+)["']/g;
const exceptionNames: string[] = [];
const exceptionReasons: string[] = [];

while ((match = exceptionNamePattern.exec(exceptionSection)) !== null) {
  exceptionNames.push(match[1]);
}
while ((match = exceptionReasonPattern.exec(exceptionSection)) !== null) {
  exceptionReasons.push(match[1]);
}

const allKnown = new Set([
  ...registryNames.map((n) => n.toUpperCase()),
  ...exceptionNames.map((n) => n.toUpperCase()),
]);

pass("registry-parsed", `Registry: ${registryNames.length} RPCs, ${exceptionNames.length} exceptions`);

/* ------------------------------------------------------------------ */
/* Check 1: Registry entries in Vivian or exceptions                    */
/* ------------------------------------------------------------------ */

const notInVivianOrException: string[] = [];
for (const name of registryNames) {
  const upper = name.toUpperCase();
  if (!vivianNames.has(upper) && !exceptionNames.some((e) => e.toUpperCase() === upper)) {
    notInVivianOrException.push(name);
  }
}
if (notInVivianOrException.length === 0) {
  pass("registry-in-vivian", "All registry entries are in Vivian index or exception list");
} else {
  fail("registry-in-vivian", `${notInVivianOrException.length} registry entries not in Vivian or exceptions`, notInVivianOrException);
}

/* ------------------------------------------------------------------ */
/* Check 2: Exception entries have reasons                              */
/* ------------------------------------------------------------------ */

const emptyReasons: string[] = [];
for (let i = 0; i < exceptionNames.length; i++) {
  if (!exceptionReasons[i] || exceptionReasons[i].trim().length < 5) {
    emptyReasons.push(exceptionNames[i]);
  }
}
if (emptyReasons.length === 0) {
  pass("exception-reasons", `All ${exceptionNames.length} exceptions have valid reasons`);
} else {
  fail("exception-reasons", `Exceptions with missing/short reasons: ${emptyReasons.join(", ")}`);
}

/* ------------------------------------------------------------------ */
/* Check 3: Scan source for RPC calls with unknown names                */
/* ------------------------------------------------------------------ */

const SRC_DIR = join(ROOT, "apps", "api", "src");
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "test", "tests"]);

function walkDir(dir: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory() && !SKIP_DIRS.has(entry)) {
      files.push(...walkDir(fullPath));
    } else if (stat.isFile() && extname(entry) === ".ts") {
      files.push(fullPath);
    }
  }
  return files;
}

const sourceFiles = walkDir(SRC_DIR);

// Pattern: callRpc("NAME" or callRpc('NAME' or safeCallRpc("NAME" or callRpcWithList("NAME"
const rpcCallPattern = /(?:callRpc|safeCallRpc|callRpcWithList)\s*\(\s*["']([^"']+)["']/g;

const calledRpcs = new Map<string, string[]>(); // RPC name -> list of files
const unknownCalls: Array<{ rpc: string; file: string }> = [];

for (const filePath of sourceFiles) {
  const content = readFileSync(filePath, "utf-8");
  let callMatch: RegExpExecArray | null;
  const localPattern = new RegExp(rpcCallPattern.source, "g");
  while ((callMatch = localPattern.exec(content)) !== null) {
    const rpcName = callMatch[1];
    const relPath = relative(ROOT, filePath).replace(/\\/g, "/");

    if (!calledRpcs.has(rpcName.toUpperCase())) {
      calledRpcs.set(rpcName.toUpperCase(), []);
    }
    calledRpcs.get(rpcName.toUpperCase())!.push(relPath);

    if (!allKnown.has(rpcName.toUpperCase())) {
      unknownCalls.push({ rpc: rpcName, file: relPath });
    }
  }
}

if (unknownCalls.length === 0) {
  pass("no-unknown-rpcs", `All ${calledRpcs.size} unique RPC calls reference known registry entries`);
} else {
  fail(
    "no-unknown-rpcs",
    `${unknownCalls.length} calls to unknown RPCs`,
    unknownCalls.map((c) => `${c.rpc} in ${c.file}`),
  );
}

/* ------------------------------------------------------------------ */
/* Check 4: Orphaned registry entries (warn only)                       */
/* ------------------------------------------------------------------ */

const orphaned: string[] = [];
for (const name of registryNames) {
  if (!calledRpcs.has(name.toUpperCase())) {
    orphaned.push(name);
  }
}
if (orphaned.length === 0) {
  pass("no-orphans", "All registry entries are referenced in source code");
} else {
  warn("no-orphans", `${orphaned.length} registry entries not directly called in source (may be used via lookup)`, orphaned);
}

/* ------------------------------------------------------------------ */
/* Output                                                              */
/* ------------------------------------------------------------------ */

function printAndExit() {
  console.log("\n=== RPC Registry Gating Check (Phase 47) ===\n");

  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;
  const warnCount = results.filter((r) => r.status === "warn").length;

  for (const r of results) {
    const icon = r.status === "pass" ? "PASS" : r.status === "fail" ? "FAIL" : "WARN";
    console.log(`  [${icon}] ${r.check}: ${r.message}`);
    if (r.details && r.details.length > 0) {
      for (const d of r.details.slice(0, 10)) {
        console.log(`         - ${d}`);
      }
      if (r.details.length > 10) {
        console.log(`         ... and ${r.details.length - 10} more`);
      }
    }
  }

  console.log(`\nSummary: ${passCount} pass, ${failCount} fail, ${warnCount} warn`);
  console.log(`Registry: ${registryNames.length} RPCs + ${exceptionNames.length} exceptions`);
  console.log(`Vivian:   ${vivianNames.size} RPCs`);
  console.log(`Source:   ${calledRpcs.size} unique RPCs called across ${sourceFiles.length} files`);

  // Output JSON for evidence pack
  if (process.env.EVIDENCE_OUTPUT) {
    mkdirSync(dirname(process.env.EVIDENCE_OUTPUT), { recursive: true });
    writeFileSync(
      process.env.EVIDENCE_OUTPUT,
      JSON.stringify({
        gate: "rpc-registry",
        results,
        summary: {
          passCount, failCount, warnCount,
          registryCount: registryNames.length,
          exceptionCount: exceptionNames.length,
          vivianCount: vivianNames.size,
          uniqueCallsCount: calledRpcs.size,
          sourceFilesScanned: sourceFiles.length,
        },
      }, null, 2),
    );
  }

  process.exit(failCount > 0 ? 1 : 0);
}

printAndExit();
