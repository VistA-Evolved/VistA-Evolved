#!/usr/bin/env node
/**
 * Phase 522 (W38-C1): Clinical Readiness Scan Matrix
 *
 * Scans store-policy.ts for all service-line, device, and radiology stores.
 * Reports durability status, VistA alignment, and migration readiness.
 *
 * Usage:
 *   node scripts/clinical/clinical-readiness-scan.mjs [--json] [--domain <domain>]
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");

// ── Parse store-policy.ts ──────────────────────────────────────────

function parseStorePolicy() {
  const raw = readFileSync(join(ROOT, "apps/api/src/platform/store-policy.ts"), "utf-8");

  const stores = [];
  // Match store entry objects: { id: "...", file: "...", ... }
  const entryRe = /\{\s*\n\s*id:\s*"([^"]+)",\s*\n\s*file:\s*"([^"]+)",\s*\n\s*variable:\s*"([^"]+)",\s*\n\s*description:\s*"([^"]*)",\s*\n\s*classification:\s*"([^"]+)"/gs;

  let m;
  while ((m = entryRe.exec(raw)) !== null) {
    const [, id, file, variable, description, classification] = m;

    // Extract durability
    const durRe = new RegExp(
      `id:\\s*"${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[\\s\\S]*?durability:\\s*"([^"]+)"`,
      "m"
    );
    const durMatch = raw.match(durRe);
    const durability = durMatch ? durMatch[1] : "unknown";

    // Extract migration target
    const migRe = new RegExp(
      `id:\\s*"${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[\\s\\S]*?migrationTarget:\\s*"([^"]*)"`,
      "m"
    );
    const migMatch = raw.match(migRe);
    const migrationTarget = migMatch ? migMatch[1] : "";

    // Extract domain
    const domRe = new RegExp(
      `id:\\s*"${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[\\s\\S]*?domain:\\s*"([^"]*)"`,
      "m"
    );
    const domMatch = raw.match(domRe);
    const domain = domMatch ? domMatch[1] : "unknown";

    stores.push({ id, file, variable, description, classification, durability, migrationTarget, domain });
  }

  return stores;
}

// ── Parse RPC registry ─────────────────────────────────────────────

function parseRpcRegistry() {
  try {
    const raw = readFileSync(join(ROOT, "apps/api/src/vista/rpcRegistry.ts"), "utf-8");
    const rpcs = [];
    const rpcRe = /["']([A-Z][A-Z0-9 ]+)["']\s*:\s*\{/g;
    let m;
    while ((m = rpcRe.exec(raw)) !== null) {
      rpcs.push(m[1]);
    }
    return rpcs;
  } catch {
    return [];
  }
}

// ── VistA alignment per domain ─────────────────────────────────────

function getVistaAlignment(domain) {
  const alignmentMap = {
    clinical: {
      edis: { rpc: "EDIS RPCs", status: "integration_pending", note: "VistA EDIS (Emergency Department Integration Software) not available in sandbox" },
      surgery: { rpc: "SRS RPCs", status: "integration_pending", note: "VistA Surgery package File 130, 131.7" },
      icu: { rpc: "GMRV VITALS RPCs", status: "partial", note: "GMRV MARK VITALS available; ICU-specific flowsheet RPCs limited" },
    },
    devices: {
      equipment: { rpc: "Equipment File 6914", status: "integration_pending", note: "VistA Equipment file not populated in sandbox" },
      vitals: { rpc: "GMRC SAVE VITALS", status: "integration_pending", note: "Target for device observation writeback" },
    },
    radiology: {
      orders: { rpc: "ORWDXR NEW ORDER", status: "integration_pending", note: "Radiology order placement via CPRS" },
      reports: { rpc: "TIU CREATE RECORD", status: "available", note: "TIU note creation available for rad reports" },
      accession: { rpc: "RA ASSIGN ACC#", status: "integration_pending", note: "Native accession number generator" },
    },
  };

  return alignmentMap[domain] || {};
}

// ── Classify stores into domains ───────────────────────────────────

function classifyStore(store) {
  if (store.file.startsWith("service-lines/ed/")) return "ed";
  if (store.file.startsWith("service-lines/or/")) return "or";
  if (store.file.startsWith("service-lines/icu/")) return "icu";
  if (store.file.startsWith("devices/")) return "devices";
  if (store.file.startsWith("radiology/")) return "radiology";
  return "other";
}

// ── Main ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const domainFilter = args.includes("--domain") ? args[args.indexOf("--domain") + 1] : null;

const allStores = parseStorePolicy();
const rpcs = parseRpcRegistry();

// Filter to service-line/device/radiology stores
const targetDomains = ["ed", "or", "icu", "devices", "radiology"];
let targetStores = allStores.filter(s => {
  const d = classifyStore(s);
  return targetDomains.includes(d);
});

if (domainFilter) {
  targetStores = targetStores.filter(s => classifyStore(s) === domainFilter);
}

// Build scan result
const scanResult = {
  generatedAt: new Date().toISOString(),
  totalStoresScanned: targetStores.length,
  summary: {
    critical_in_memory: 0,
    critical_pg_backed: 0,
    operational_in_memory: 0,
    clinical_in_memory: 0,
    cache_in_memory: 0,
    registry_in_memory: 0,
    audit_in_memory: 0,
  },
  domains: {},
  vistaAlignment: {
    clinical: getVistaAlignment("clinical"),
    devices: getVistaAlignment("devices"),
    radiology: getVistaAlignment("radiology"),
  },
  rpcRegistryCount: rpcs.length,
  gaps: [],
};

for (const store of targetStores) {
  const domain = classifyStore(store);
  const key = `${store.classification}_${store.durability}`.replace(/ /g, "_");

  if (store.classification === "critical" && store.durability === "in_memory_only") {
    scanResult.summary.critical_in_memory++;
    scanResult.gaps.push({
      storeId: store.id,
      severity: "HIGH",
      reason: "Critical store with no PG backing - data lost on restart",
      migrationTarget: store.migrationTarget,
    });
  } else if (store.classification === "critical" && store.durability === "pg_backed") {
    scanResult.summary.critical_pg_backed++;
  } else if (store.classification === "operational") {
    scanResult.summary.operational_in_memory++;
  } else if (store.classification === "clinical_data") {
    scanResult.summary.clinical_in_memory++;
    scanResult.gaps.push({
      storeId: store.id,
      severity: "MEDIUM",
      reason: "Clinical data store with no PG backing",
      migrationTarget: store.migrationTarget,
    });
  } else if (store.classification === "cache") {
    scanResult.summary.cache_in_memory++;
  } else if (store.classification === "registry") {
    scanResult.summary.registry_in_memory++;
  } else if (store.classification === "audit") {
    scanResult.summary.audit_in_memory++;
  }

  if (!scanResult.domains[domain]) {
    scanResult.domains[domain] = { stores: [], storeCount: 0, gapCount: 0 };
  }
  scanResult.domains[domain].stores.push({
    id: store.id,
    file: store.file,
    variable: store.variable,
    classification: store.classification,
    durability: store.durability,
    migrationTarget: store.migrationTarget,
  });
  scanResult.domains[domain].storeCount++;
  if (store.durability === "in_memory_only" && (store.classification === "critical" || store.classification === "clinical_data")) {
    scanResult.domains[domain].gapCount++;
  }
}

// ── Output ─────────────────────────────────────────────────────────

if (jsonMode) {
  process.stdout.write(JSON.stringify(scanResult, null, 2));
} else {
  console.log("=== Clinical Readiness Scan Matrix (Phase 522, W38-C1) ===\n");
  console.log(`Scanned: ${scanResult.totalStoresScanned} stores across ${Object.keys(scanResult.domains).length} domains`);
  console.log(`RPC Registry: ${scanResult.rpcRegistryCount} registered RPCs\n`);

  console.log("--- Summary ---");
  console.log(`  Critical (in-memory):    ${scanResult.summary.critical_in_memory} -- HIGH RISK`);
  console.log(`  Critical (PG-backed):    ${scanResult.summary.critical_pg_backed}`);
  console.log(`  Clinical (in-memory):    ${scanResult.summary.clinical_in_memory} -- MEDIUM RISK`);
  console.log(`  Operational (in-memory): ${scanResult.summary.operational_in_memory}`);
  console.log(`  Cache (in-memory):       ${scanResult.summary.cache_in_memory}`);
  console.log(`  Registry (in-memory):    ${scanResult.summary.registry_in_memory}`);
  console.log(`  Audit (in-memory):       ${scanResult.summary.audit_in_memory}`);
  console.log();

  for (const [domain, info] of Object.entries(scanResult.domains)) {
    console.log(`--- ${domain.toUpperCase()} (${info.storeCount} stores, ${info.gapCount} gaps) ---`);
    for (const s of info.stores) {
      const flag = s.durability === "in_memory_only" && (s.classification === "critical" || s.classification === "clinical_data")
        ? " *** GAP ***"
        : "";
      console.log(`  ${s.id}: ${s.classification} / ${s.durability}${flag}`);
    }
    console.log();
  }

  console.log("--- VistA Alignment ---");
  for (const [domain, alignment] of Object.entries(scanResult.vistaAlignment)) {
    console.log(`  ${domain}:`);
    for (const [key, info] of Object.entries(alignment)) {
      console.log(`    ${key}: ${info.status} -- ${info.note}`);
    }
  }

  if (scanResult.gaps.length > 0) {
    console.log(`\n--- Gaps (${scanResult.gaps.length}) ---`);
    for (const g of scanResult.gaps) {
      console.log(`  [${g.severity}] ${g.storeId}: ${g.reason}`);
      console.log(`         Target: ${g.migrationTarget}`);
    }
  }
}

// Write evidence JSON
const evidenceDir = join(ROOT, "artifacts", "wave-38");
try {
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(
    join(evidenceDir, "clinical-readiness-scan.json"),
    JSON.stringify(scanResult, null, 2)
  );
  if (!jsonMode) {
    console.log(`\nEvidence written to: artifacts/wave-38/clinical-readiness-scan.json`);
  }
} catch {
  // artifacts dir may not exist in CI
}
