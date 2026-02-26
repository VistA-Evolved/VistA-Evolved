#!/usr/bin/env node
/**
 * G19 -- System Audit Snapshot Gate (Phase 145)
 *
 * Hard gate: ensures the system audit can be generated and produces
 * valid schema in qa/gauntlet/system-gap-matrix.json.
 *
 * Checks:
 *   1. system-audit.mjs exits 0
 *   2. system-gap-matrix.json is valid JSON
 *   3. Has 'domains' array with >= 15 entries
 *   4. Every domain has 'domain', 'status', 'topGaps', 'evidence'
 *   5. headSha and generatedAt are present
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const MATRIX_PATH = resolve(ROOT, "qa/gauntlet/system-gap-matrix.json");

export const id = "G19_system_audit_snapshot";
export const name = "System Audit Snapshot";

export async function run(opts = {}) {
  const start = Date.now();
  const details = [];
  let status = "pass";

  // 1. Run the audit script
  try {
    execSync("node scripts/audit/system-audit.mjs", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 90_000,
    });
    details.push("PASS: system-audit.mjs exit 0");
  } catch (err) {
    details.push(`FAIL: system-audit.mjs crashed -- ${(err.message || "").slice(0, 200)}`);
    return { id, name, status: "fail", details, durationMs: Date.now() - start };
  }

  // 2. Validate JSON parse
  if (!existsSync(MATRIX_PATH)) {
    details.push("FAIL: system-gap-matrix.json does not exist after audit run");
    return { id, name, status: "fail", details, durationMs: Date.now() - start };
  }

  let matrix;
  try {
    const raw = readFileSync(MATRIX_PATH, "utf8");
    matrix = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
    details.push("PASS: system-gap-matrix.json is valid JSON");
  } catch (err) {
    details.push(`FAIL: system-gap-matrix.json parse error -- ${err.message}`);
    return { id, name, status: "fail", details, durationMs: Date.now() - start };
  }

  // 3. Domain count
  const domains = matrix.domains || [];
  if (domains.length < 15) {
    details.push(`FAIL: domains count = ${domains.length} (expected >= 15)`);
    status = "fail";
  } else {
    details.push(`PASS: ${domains.length} domains`);
  }

  // 4. Schema check on every domain
  const requiredFields = ["domain", "status", "topGaps", "evidence"];
  let badDomains = 0;
  for (const d of domains) {
    for (const field of requiredFields) {
      if (!(field in d)) {
        badDomains++;
        break;
      }
    }
  }
  if (badDomains > 0) {
    details.push(`FAIL: ${badDomains} domains missing required fields (domain/status/topGaps/evidence)`);
    status = "fail";
  } else {
    details.push("PASS: all domains have required schema fields");
  }

  // 5. Meta fields
  if (!matrix.headSha) {
    details.push("FAIL: headSha missing");
    status = "fail";
  }
  if (!matrix.generatedAt) {
    details.push("FAIL: generatedAt missing");
    status = "fail";
  }
  if (matrix.headSha && matrix.generatedAt) {
    details.push(`PASS: headSha=${matrix.headSha}, generatedAt present`);
  }

  return { id, name, status, details, durationMs: Date.now() - start };
}
