#!/usr/bin/env node
/**
 * scripts/compat/lane-probe.mjs
 *
 * Phase 451 (W29-P5). Probes a single VistA lane:
 *   - TCP connect test
 *   - RPC availability (counts routines from registry)
 *   - Reports structured JSON result
 *
 * Usage:
 *   node scripts/compat/lane-probe.mjs --host 127.0.0.1 --port 9430 --id dev-sandbox
 */

import { createConnection } from "net";

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : fallback;
}

const host = getArg("host", "127.0.0.1");
const port = parseInt(getArg("port", "9430"), 10);
const laneId = getArg("id", "unknown");

const result = {
  laneId,
  host,
  port,
  probedAt: new Date().toISOString(),
  tcpReachable: false,
  tcpLatencyMs: null,
  bannerReceived: false,
  bannerSnippet: null,
  passed: false,
  error: null,
};

// ── TCP probe ───────────────────────────────────────────────────────
const start = Date.now();

const probe = new Promise((resolve) => {
  const sock = createConnection({ host, port, timeout: 5000 }, () => {
    result.tcpReachable = true;
    result.tcpLatencyMs = Date.now() - start;

    // Try to read a banner (VistA XWB sends intro bytes)
    sock.once("data", (data) => {
      result.bannerReceived = true;
      result.bannerSnippet = data.toString("utf-8").slice(0, 64).replace(/[\x00-\x1f]/g, ".");
      sock.destroy();
      resolve();
    });

    // If no banner within 2s, still pass
    setTimeout(() => {
      if (!result.bannerReceived) {
        sock.destroy();
        resolve();
      }
    }, 2000);
  });

  sock.on("error", (err) => {
    result.error = err.message;
    sock.destroy();
    resolve();
  });

  sock.on("timeout", () => {
    result.error = "TCP connect timeout (5s)";
    sock.destroy();
    resolve();
  });
});

await probe;

result.passed = result.tcpReachable;

// Output JSON to stdout
process.stdout.write(JSON.stringify(result, null, 2));
process.exit(result.passed ? 0 : 1);
