#!/usr/bin/env node
/**
 * G10 -- System Audit Gate (RC/FULL only)
 *
 * Runs the system audit script and validates that:
 *   1. system-audit.mjs exits 0
 *   2. artifacts/system-audit.json is valid JSON with required sections
 *   3. qa/gauntlet/system-gap-matrix.json is valid JSON with domains[]
 *   4. docs/audits/system-audit.md exists and is non-empty
 *
 * In strict mode, also checks:
 *   - Gap matrix has >= 15 domains
 *   - No domain has status "unknown"
 *   - Zero high-severity gaps across all domains (Phase 149)
 *   - Zero high-severity top risks (Phase 149)
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

export const id = "G10_system_audit";
export const name = "System Audit";

export async function run(opts = {}) {
  const start = Date.now();
  const details = [];
  let status = "pass";
  const strict = opts.strict || false;

  // 1. Run the audit script
  try {
    execSync("node scripts/audit/system-audit.mjs", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 90_000,
    });
    details.push("system-audit.mjs: exit 0");
  } catch (err) {
    details.push(`system-audit.mjs: FAIL -- ${(err.message || "").slice(0, 200)}`);
    return { id, name, status: "fail", details, durationMs: Date.now() - start };
  }

  // 2. Validate artifacts/system-audit.json
  const auditPath = resolve(ROOT, "artifacts/system-audit.json");
  if (!existsSync(auditPath)) {
    details.push("artifacts/system-audit.json: MISSING");
    status = "fail";
  } else {
    try {
      const raw = readFileSync(auditPath, "utf8");
      const audit = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
      const requiredSections = ["meta", "promptsTree", "uiInventory", "apiInventory", "rpcUsage", "persistenceInventory", "externalSystems", "ciInventory", "knownGaps"];
      const present = requiredSections.filter(s => audit[s] != null);
      const missing = requiredSections.filter(s => audit[s] == null);
      details.push(`artifacts/system-audit.json: ${present.length}/${requiredSections.length} sections`);
      if (missing.length > 0) {
        details.push(`  missing sections: ${missing.join(", ")}`);
        status = "fail";
      }
    } catch (err) {
      details.push(`artifacts/system-audit.json: FAIL -- ${err.message}`);
      status = "fail";
    }
  }

  // 3. Validate qa/gauntlet/system-gap-matrix.json
  const matrixPath = resolve(ROOT, "qa/gauntlet/system-gap-matrix.json");
  if (!existsSync(matrixPath)) {
    details.push("system-gap-matrix.json: MISSING");
    status = "fail";
  } else {
    try {
      const raw = readFileSync(matrixPath, "utf8");
      const matrix = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
      const domCount = (matrix.domains || []).length;
      details.push(`system-gap-matrix.json: ${domCount} domains`);

      if (strict) {
        if (domCount < 15) {
          details.push(`  strict: < 15 domains`);
          status = "fail";
        }
        const unknowns = (matrix.domains || []).filter(d => d.status === "unknown");
        if (unknowns.length > 0) {
          details.push(`  strict: ${unknowns.length} domains with status=unknown`);
          status = "fail";
        }
        // Phase 149: zero high-severity gaps
        const highGaps = (matrix.domains || []).flatMap(d =>
          (d.topGaps || []).filter(g => g.severity === "high")
        );
        if (highGaps.length > 0) {
          details.push(`  strict: ${highGaps.length} high-severity domain gaps (must be 0)`);
          for (const g of highGaps.slice(0, 5)) {
            details.push(`    - ${g.gap}`);
          }
          status = "fail";
        } else {
          details.push(`  strict: 0 high-severity domain gaps`);
        }
        const highRisks = (matrix.topRisks || []).filter(r => r.severity === "high");
        if (highRisks.length > 0) {
          details.push(`  strict: ${highRisks.length} high-severity top risks (must be 0)`);
          status = "fail";
        } else {
          details.push(`  strict: 0 high-severity top risks`);
        }
      }
    } catch (err) {
      details.push(`system-gap-matrix.json: FAIL -- ${err.message}`);
      status = "fail";
    }
  }

  // 4. Validate docs/audits/system-audit.md
  const mdPath = resolve(ROOT, "docs/audits/system-audit.md");
  if (!existsSync(mdPath)) {
    details.push("docs/audits/system-audit.md: MISSING");
    status = "fail";
  } else {
    const content = readFileSync(mdPath, "utf8");
    if (content.length < 100) {
      details.push(`docs/audits/system-audit.md: too short (${content.length} chars)`);
      status = "fail";
    } else {
      details.push(`docs/audits/system-audit.md: ${content.length} chars`);
    }
  }

  return { id, name, status, details, durationMs: Date.now() - start };
}
