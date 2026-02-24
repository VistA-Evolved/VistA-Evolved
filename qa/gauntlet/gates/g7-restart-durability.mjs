#!/usr/bin/env node
/**
 * G7 -- Restart Durability Gate
 *
 * Wraps existing scripts/qa-gates/restart-durability.mjs.
 * If the gate script doesn't exist, FAIL (required since Phase 114).
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

export const id = "G7_restart_durability";
export const name = "Restart Durability";

export async function run() {
  const start = Date.now();
  const details = [];

  const gatePath = resolve(ROOT, "scripts/qa-gates/restart-durability.mjs");
  if (!existsSync(gatePath)) {
    details.push("restart-durability.mjs not found -- FAIL (required since Phase 114)");
    return { id, name, status: "fail", details, durationMs: Date.now() - start };
  }

  try {
    execSync("node scripts/qa-gates/restart-durability.mjs", {
      cwd: ROOT,
      stdio: "pipe",
      timeout: 60_000,
    });
    details.push("restart-durability: PASS");
    return { id, name, status: "pass", details, durationMs: Date.now() - start };
  } catch (err) {
    const out = err.stdout?.toString().slice(-300) || err.stderr?.toString().slice(-300) || "";
    details.push(`restart-durability: FAIL -- ${out.trim().split("\n").slice(-3).join("; ")}`);
    return { id, name, status: "fail", details, durationMs: Date.now() - start };
  }
}
