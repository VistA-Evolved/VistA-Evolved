/**
 * Edge Gateway Sidecar Runtime (Scaffold)
 *
 * Phase 379 (W21-P2): Minimal gateway runtime that demonstrates the
 * outbound-only uplink pattern. Sends heartbeats to the cloud API
 * and accepts local device connections (future phases wire protocol adapters).
 *
 * This runs inside the edge-gateway Docker container, NOT inside the main API.
 * It communicates with the API via HTTP POST to /edge-gateways/uplink and
 * /edge-gateways/:id/heartbeat endpoints.
 */

import { randomBytes } from "node:crypto";
import http from "node:http";
import https from "node:https";

// ---------------------------------------------------------------------------
// Config from environment
// ---------------------------------------------------------------------------

const GATEWAY_ID = process.env.GATEWAY_ID || "eg-dev-001";
const GATEWAY_NAME = process.env.GATEWAY_NAME || "Dev Gateway";
const API_UPLINK_URL = process.env.API_UPLINK_URL || "http://localhost:3001";
const SERVICE_KEY =
  process.env.GATEWAY_SERVICE_KEY ||
  "dev-gateway-key-change-in-production";
const HEARTBEAT_INTERVAL =
  parseInt(process.env.HEARTBEAT_INTERVAL_MS || "30000", 10);
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

// ---------------------------------------------------------------------------
// HTTP client helper (zero deps)
// ---------------------------------------------------------------------------

function post(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_UPLINK_URL);
    const mod = url.protocol === "https:" ? https : http;
    const data = JSON.stringify(body);
    const req = mod.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          "X-Service-Key": SERVICE_KEY,
        },
        timeout: 10000,
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(chunks) });
          } catch {
            resolve({ status: res.statusCode, body: chunks });
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.write(data);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Heartbeat loop
// ---------------------------------------------------------------------------

async function sendHeartbeat() {
  try {
    const result = await post(`/edge-gateways/${GATEWAY_ID}/heartbeat`, {
      firmwareVersion: "0.1.0-scaffold",
    });
    if (LOG_LEVEL === "debug") {
      console.log(`[heartbeat] ${result.status}`, result.body);
    }
  } catch (err) {
    console.error(`[heartbeat] failed:`, err.message);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`Edge Gateway ${GATEWAY_ID} (${GATEWAY_NAME}) starting...`);
console.log(`Uplink: ${API_UPLINK_URL}`);
console.log(`Heartbeat interval: ${HEARTBEAT_INTERVAL}ms`);

// Initial heartbeat
sendHeartbeat();

// Periodic heartbeat
const hbTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
hbTimer.unref();

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Gateway shutting down...");
  clearInterval(hbTimer);
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Gateway shutting down...");
  clearInterval(hbTimer);
  process.exit(0);
});
