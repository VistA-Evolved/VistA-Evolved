#!/usr/bin/env node
/**
 * G6 -- VistA Probe Gate (conditional)
 *
 * Wraps existing scripts/qa-gates/vista-probe.mjs.
 * If VistA Docker isn't running, returns SKIP (not FAIL).
 */

import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection } from "node:net";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

export const id = "G6_vista_probe";
export const name = "VistA Probe";

function isTcpOpen(host, port, timeoutMs = 3000) {
  return new Promise((res) => {
    const sock = createConnection({ host, port }, () => {
      sock.destroy();
      res(true);
    });
    sock.on("error", () => res(false));
    sock.setTimeout(timeoutMs, () => { sock.destroy(); res(false); });
  });
}

export async function run() {
  const start = Date.now();
  const details = [];

  // Quick TCP check for VistA on port 9430
  const vistaUp = await isTcpOpen("127.0.0.1", 9430, 3000);
  if (!vistaUp) {
    details.push("VistA not reachable on port 9430 -- SKIP");
    return { id, name, status: "skip", details, durationMs: Date.now() - start };
  }

  // Run existing vista-probe gate
  try {
    execSync("node scripts/qa-gates/vista-probe.mjs", {
      cwd: ROOT,
      stdio: "pipe",
      timeout: 30_000,
    });
    details.push("vista-probe: PASS");
    return { id, name, status: "pass", details, durationMs: Date.now() - start };
  } catch (err) {
    const out = err.stdout?.toString().slice(-200) || err.stderr?.toString().slice(-200) || "";
    details.push(`vista-probe: FAIL -- ${out.trim().split("\n").pop()}`);
    return { id, name, status: "fail", details, durationMs: Date.now() - start };
  }
}
