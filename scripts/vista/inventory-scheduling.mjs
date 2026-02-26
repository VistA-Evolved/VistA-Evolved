#!/usr/bin/env node
/**
 * Scheduling RPC Inventory — Phase 139
 *
 * Reads the RPC registry + capabilities.json and outputs a JSON artifact
 * showing which scheduling RPCs are registered, their status, and gaps.
 *
 * Usage: node scripts/vista/inventory-scheduling.mjs
 * Output: artifacts/scheduling-inventory.json (gitignored)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

/* ---- Read RPC Registry ----------------------------------------------- */
const registryPath = join(ROOT, "apps", "api", "src", "vista", "rpcRegistry.ts");
const registrySource = readFileSync(registryPath, "utf-8");

// Extract RPC_REGISTRY entries (array of { name, domain, tag, description })
const rpcEntries = [];
const registryMatch = registrySource.match(/RPC_REGISTRY[^=]*=\s*\[([\s\S]*?)\];/);
if (registryMatch) {
  const body = registryMatch[1];
  const entryRe = /\{\s*name:\s*"([^"]+)"[^}]*?tag:\s*"(\w+)"[^}]*?description:\s*"([^"]*)"[^}]*?\}/g;
  let m;
  while ((m = entryRe.exec(body)) !== null) {
    rpcEntries.push({ name: m[1], tag: m[2], description: m[3] });
  }
}

// Extract RPC_EXCEPTIONS
const exceptions = [];
const exceptionsMatch = registrySource.match(/RPC_EXCEPTIONS[^=]*=\s*\[([\s\S]*?)\];/);
if (exceptionsMatch) {
  const body = exceptionsMatch[1];
  const entryRe = /\{\s*name:\s*"([^"]+)"/g;
  let m;
  while ((m = entryRe.exec(body)) !== null) {
    exceptions.push({ name: m[1], tag: "exception" });
  }
}

/* ---- Filter scheduling RPCs ------------------------------------------ */
const schedulingKeywords = ["SD", "SDOE", "SDEC", "SDES", "ORWPT APT", "SC ", "APPOINTMENT", "SCHEDUL"];
const schedulingRpcs = rpcEntries.filter((r) =>
  schedulingKeywords.some((k) => r.name.toUpperCase().includes(k))
);
const schedulingExceptions = exceptions.filter((r) =>
  schedulingKeywords.some((k) => r.name.toUpperCase().includes(k))
);

/* ---- Read capabilities.json ------------------------------------------ */
const capsPath = join(ROOT, "config", "capabilities.json");
const capsRaw = readFileSync(capsPath, "utf-8");
// Strip BOM
const capsJson = JSON.parse(capsRaw.charCodeAt(0) === 0xfeff ? capsRaw.slice(1) : capsRaw);
// capabilities.json has { _meta, capabilities: { "key": {...}, ... } }
const capsObj = capsJson.capabilities || capsJson;
const capsArray = Object.entries(capsObj).map(([id, v]) => ({ id, ...v }));
const schedulingCaps = capsArray.filter((c) => c.id?.startsWith("scheduling."));

/* ---- Known target RPCs not yet available ------------------------------ */
const targetRpcs = [
  { name: "SDEC APPADD", status: "not_in_sandbox", purpose: "Create new appointment" },
  { name: "SDEC APPDEL", status: "not_in_sandbox", purpose: "Delete/cancel appointment" },
  { name: "SDEC APPSLOTS", status: "not_in_sandbox", purpose: "Query available slots" },
  { name: "SDVW MAKE APPT API APP", status: "not_in_sandbox", purpose: "VS GUI appointment booking" },
  { name: "SDES GET PATIENT APPOINTMENTS", status: "not_in_sandbox", purpose: "Patient appointment list (new API)" },
];

/* ---- Build inventory ------------------------------------------------- */
const inventory = {
  generatedAt: new Date().toISOString(),
  phase: 139,
  summary: {
    registeredSchedulingRpcs: schedulingRpcs.length,
    schedulingExceptions: schedulingExceptions.length,
    schedulingCapabilities: schedulingCaps.length,
    targetRpcsNotInSandbox: targetRpcs.length,
  },
  registeredRpcs: schedulingRpcs,
  exceptions: schedulingExceptions,
  capabilities: schedulingCaps.map((c) => ({
    id: c.id,
    status: c.status,
    rpc: c.rpc,
    module: c.module,
  })),
  targetRpcsNotInSandbox: targetRpcs,
  lifecycleStates: [
    "requested",
    "waitlisted",
    "booked",
    "checked_in",
    "completed",
    "cancelled",
    "no_show",
  ],
  pgTables: [
    "scheduling_waitlist_request (Phase 128)",
    "scheduling_booking_lock (Phase 128)",
    "scheduling_lifecycle (Phase 131)",
    "clinic_preferences (Phase 139)",
  ],
  existingEndpoints: [
    "GET /scheduling/health",
    "GET /scheduling/appointments?dfn=X",
    "GET /scheduling/appointments/range?startDate=X&endDate=Y",
    "GET /scheduling/clinics",
    "GET /scheduling/providers",
    "GET /scheduling/slots?clinicIen=X&startDate=Y&endDate=Z",
    "POST /scheduling/appointments/request",
    "POST /scheduling/appointments/:id/cancel",
    "POST /scheduling/appointments/:id/reschedule",
    "GET /scheduling/requests",
    "GET /scheduling/encounters/:ien/detail",
    "GET /scheduling/encounters/:ien/providers",
    "GET /scheduling/encounters/:ien/diagnoses",
    "GET /scheduling/waitlist",
    "GET /scheduling/appointments/cprs?dfn=X",
    "GET /scheduling/reference-data",
    "GET /scheduling/posture",
    "GET /scheduling/lifecycle",
    "POST /scheduling/lifecycle/transition",
  ],
  phase139NewEndpoints: [
    "POST /scheduling/appointments/:id/checkin",
    "POST /scheduling/appointments/:id/checkout",
    "POST /scheduling/requests/:id/approve",
    "POST /scheduling/requests/:id/reject",
    "GET /scheduling/clinic/:ien/preferences",
    "PUT /scheduling/clinic/:ien/preferences",
  ],
};

/* ---- Write output ---------------------------------------------------- */
const outDir = join(ROOT, "artifacts");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "scheduling-inventory.json");
writeFileSync(outPath, JSON.stringify(inventory, null, 2) + "\n", "utf-8");

console.log(`Scheduling inventory written to: ${outPath}`);
console.log(`  Registered RPCs: ${inventory.summary.registeredSchedulingRpcs}`);
console.log(`  Exceptions: ${inventory.summary.schedulingExceptions}`);
console.log(`  Capabilities: ${inventory.summary.schedulingCapabilities}`);
console.log(`  Target RPCs (not in sandbox): ${inventory.summary.targetRpcsNotInSandbox}`);
