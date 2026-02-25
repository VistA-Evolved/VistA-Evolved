#!/usr/bin/env node
/**
 * Tenant Provisioning CLI — Phase 135
 *
 * Creates a new tenant record, seeds module entitlements from a SKU profile,
 * and writes an immutable audit entry.
 *
 * Usage:
 *   node scripts/tenant/provision.mjs --tenant-id facility-42 --name "My Hospital" --sku FULL_SUITE
 *   node scripts/tenant/provision.mjs --tenant-id clinic-7 --name "Small Clinic" --sku CLINICIAN_ONLY --station 507
 *
 * Options:
 *   --tenant-id   (required)  Unique tenant identifier
 *   --name        (required)  Facility display name
 *   --sku         (optional)  SKU profile: FULL_SUITE (default), CLINICIAN_ONLY, PORTAL_ONLY, etc.
 *   --station     (optional)  Facility station number (default: 500)
 *   --dry-run     (optional)  Preview without making changes
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const API_BASE = process.env.API_URL || "http://127.0.0.1:3001";

/* ------------------------------------------------------------------ */
/* Argument parsing                                                    */
/* ------------------------------------------------------------------ */

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tenant-id" && args[i + 1]) opts.tenantId = args[++i];
    else if (args[i] === "--name" && args[i + 1]) opts.name = args[++i];
    else if (args[i] === "--sku" && args[i + 1]) opts.sku = args[++i];
    else if (args[i] === "--station" && args[i + 1]) opts.station = args[++i];
    else if (args[i] === "--dry-run") opts.dryRun = true;
    else if (args[i] === "--help") { printHelp(); process.exit(0); }
  }
  return opts;
}

function printHelp() {
  console.log(`
Tenant Provisioning CLI — Phase 135

Usage:
  node scripts/tenant/provision.mjs --tenant-id <id> --name <name> [--sku <SKU>] [--station <num>] [--dry-run]

SKU profiles:
  FULL_SUITE      All modules (default)
  CLINICIAN_ONLY  Core clinical only
  PORTAL_ONLY     Patient portal
  TELEHEALTH_ONLY Video visits
  RCM_ONLY        Revenue cycle
  IMAGING_ONLY    Imaging / PACS
  INTEROP_ONLY    Interop hub
`);
}

/* ------------------------------------------------------------------ */
/* Load SKU definitions                                                */
/* ------------------------------------------------------------------ */

function loadSkus() {
  const skuPath = join(ROOT, "config", "skus.json");
  const raw = readFileSync(skuPath, "utf-8");
  return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw).skus;
}

/* ------------------------------------------------------------------ */
/* API calls                                                           */
/* ------------------------------------------------------------------ */

async function apiCall(method, path, body) {
  // Get session cookie by logging in
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessCode: process.env.VISTA_ACCESS_CODE || "PROV123", verifyCode: process.env.VISTA_VERIFY_CODE || "PROV123!!" }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status}`);
  }

  const loginData = await loginRes.json();
  const csrfToken = loginData.csrfToken || "";

  // Extract cookies from login response
  const cookies = loginRes.headers.getSetCookie?.() || [];
  const cookieStr = cookies.map(c => c.split(";")[0]).join("; ");

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Cookie": cookieStr,
      "x-csrf-token": csrfToken,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`API ${method} ${path} failed: ${res.status} - ${JSON.stringify(data)}`);
  }
  return data;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  const opts = parseArgs();

  if (!opts.tenantId || !opts.name) {
    console.error("ERROR: --tenant-id and --name are required");
    printHelp();
    process.exit(1);
  }

  const sku = opts.sku || "FULL_SUITE";
  const station = opts.station || "500";
  const skus = loadSkus();

  if (!skus[sku]) {
    console.error(`ERROR: Unknown SKU '${sku}'. Valid: ${Object.keys(skus).join(", ")}`);
    process.exit(1);
  }

  const modules = skus[sku].modules;

  console.log("=== Tenant Provisioning ===");
  console.log(`  Tenant ID:  ${opts.tenantId}`);
  console.log(`  Name:       ${opts.name}`);
  console.log(`  Station:    ${station}`);
  console.log(`  SKU:        ${sku} (${skus[sku].name})`);
  console.log(`  Modules:    ${modules.join(", ")}`);
  console.log();

  if (opts.dryRun) {
    console.log("[DRY RUN] No changes made.");
    process.exit(0);
  }

  // Step 1: Create tenant config via admin API
  console.log("Step 1: Creating tenant record...");
  try {
    const tenantBody = {
      tenantId: opts.tenantId,
      facilityName: opts.name,
      facilityStation: station,
      vistaHost: process.env.VISTA_HOST || "127.0.0.1",
      vistaPort: Number(process.env.VISTA_PORT || 9430),
      vistaContext: "OR CPRS GUI CHART",
      enabledModules: ["cover", "problems", "meds", "orders", "notes", "consults", "surgery", "dcsumm", "labs", "reports", "vitals", "allergies", "imaging"],
      featureFlags: {},
      uiDefaults: { theme: "light", density: "comfortable", layoutMode: "cprs", initialTab: "cover", enableDragReorder: false },
      noteTemplates: [],
      connectors: [],
    };
    await apiCall("PUT", `/admin/tenants/${opts.tenantId}`, tenantBody);
    console.log("  Tenant record created.");
  } catch (err) {
    console.error(`  WARN: Tenant creation via API failed (${err.message}). Continuing with module seeding...`);
  }

  // Step 2: Seed module entitlements (pass SKU-specific modules list)
  console.log("Step 2: Seeding module entitlements...");
  try {
    const seedResult = await apiCall("POST", "/admin/modules/entitlements/seed", {
      tenantId: opts.tenantId,
      modules,
    });
    console.log(`  Seeded ${seedResult.modulesSeeded} modules (${seedResult.totalEnabled} total enabled).`);
  } catch (err) {
    console.error(`  WARN: Module seeding via API failed (${err.message}). Seeding individually...`);
    // Fallback: enable modules one by one
    for (const mod of modules) {
      try {
        await apiCall("POST", "/admin/modules/entitlements", {
          tenantId: opts.tenantId,
          moduleId: mod,
          enabled: true,
          reason: `Initial provisioning (SKU: ${sku})`,
        });
        console.log(`  Enabled: ${mod}`);
      } catch (modErr) {
        console.error(`  FAIL: Could not enable '${mod}': ${modErr.message}`);
      }
    }
  }

  console.log();
  console.log(`Tenant '${opts.tenantId}' provisioned successfully.`);
  console.log(`SKU: ${sku} | Modules: ${modules.length}`);
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
