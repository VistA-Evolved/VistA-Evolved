#!/usr/bin/env node
/**
 * G16 -- DR & Chaos Restart Gate (Phase 134)
 *
 * Validates disaster recovery infrastructure:
 *   - Backup + restore scripts exist and are well-formed
 *   - CI workflow for nightly DR drills exists
 *   - No PHI in DR artifacts
 *   - Backups are gitignored
 *
 * Wraps scripts/qa-gates/restart-chaos-gate.mjs.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

export const id = "G16_dr_chaos";
export const name = "DR & Chaos Restart";

export async function run() {
  const start = Date.now();
  const details = [];

  const gatePath = resolve(ROOT, "scripts/qa-gates/restart-chaos-gate.mjs");
  if (!existsSync(gatePath)) {
    details.push("restart-chaos-gate.mjs not found -- FAIL");
    return { id, name, status: "fail", details, durationMs: Date.now() - start };
  }

  try {
    const out = execSync("node scripts/qa-gates/restart-chaos-gate.mjs", {
      cwd: ROOT,
      stdio: "pipe",
      timeout: 30_000,
      encoding: "utf-8",
    });

    // Extract pass/fail from output
    const passMatch = out.match(/(\d+)P\/(\d+)F/);
    if (passMatch) {
      details.push(`DR chaos gate: ${passMatch[1]}P/${passMatch[2]}F`);
    }

    details.push("DR infrastructure validated");
    return { id, name, status: "pass", details, durationMs: Date.now() - start };
  } catch (err) {
    const out = (err.stdout || err.stderr || "").toString().slice(-500);
    const lines = out.trim().split("\n").filter(l => l.includes("FAIL"));
    details.push(`DR chaos gate: FAIL -- ${lines.slice(-5).join("; ") || "unknown error"}`);
    return { id, name, status: "fail", details, durationMs: Date.now() - start };
  }
}
