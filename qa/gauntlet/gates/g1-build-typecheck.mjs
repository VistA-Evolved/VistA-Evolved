#!/usr/bin/env node
/**
 * G1 -- Build + TypeCheck Gate
 *
 * Runs TypeScript type-checking across all packages.
 * Build is optional in FAST mode (typecheck only).
 */

import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

export const id = "G1_build_typecheck";
export const name = "Build + TypeCheck";

export async function run(opts = {}) {
  const start = Date.now();
  const details = [];
  let status = "pass";

  // TypeScript type-check for API (the primary backend)
  try {
    execSync("cd apps/api && npx tsc --noEmit", {
      cwd: ROOT,
      stdio: "pipe",
      timeout: 120_000,
    });
    details.push("API typecheck: PASS");
  } catch (err) {
    const out = err.stdout?.toString().slice(-300) || "";
    details.push(`API typecheck: FAIL -- ${out.trim().split("\n").slice(-3).join("; ")}`);
    status = "fail";
  }

  // In RC/FULL mode, also build web + portal
  if (opts.suite === "rc" || opts.suite === "full") {
    for (const app of ["web", "portal"]) {
      try {
        execSync(`cd apps/${app} && npx next build`, {
          cwd: ROOT,
          stdio: "pipe",
          timeout: 300_000,
          env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
        });
        details.push(`${app} build: PASS`);
      } catch (err) {
        const out = err.stdout?.toString().slice(-200) || "";
        details.push(`${app} build: FAIL -- ${out.trim().split("\n").pop()}`);
        status = "fail";
      }
    }
  }

  return { id, name, status, details, durationMs: Date.now() - start };
}
