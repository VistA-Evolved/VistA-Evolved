#!/usr/bin/env node
/**
 * G0 -- Prompts Integrity Gate
 *
 * Wraps existing:
 *   - scripts/qa-gates/prompts-tree-health.mjs
 *   - scripts/qa-gates/phase-index-gate.mjs
 */

import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

export const id = "G0_prompts_integrity";
export const name = "Prompts Integrity";

export async function run() {
  const start = Date.now();
  const details = [];
  let status = "pass";

  const gates = [
    { label: "prompts-tree-health", cmd: "node scripts/qa-gates/prompts-tree-health.mjs" },
    { label: "phase-index-gate", cmd: "node scripts/qa-gates/phase-index-gate.mjs" },
    { label: "prompts-quality-gate", cmd: "node scripts/qa-gates/prompts-quality-gate.mjs" },
  ];

  for (const g of gates) {
    try {
      execSync(g.cmd, { cwd: ROOT, stdio: "pipe", timeout: 60_000 });
      details.push(`${g.label}: PASS`);
    } catch (err) {
      const out = err.stdout?.toString().slice(-200) || err.stderr?.toString().slice(-200) || "";
      details.push(`${g.label}: FAIL -- ${out.trim().split("\n").pop()}`);
      status = "fail";
    }
  }

  return { id, name, status, details, durationMs: Date.now() - start };
}
