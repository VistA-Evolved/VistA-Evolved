#!/usr/bin/env node
/**
 * scripts/qa-gates/country-conformance-runner.mjs -- Phase 499 (W34-P9)
 *
 * Offline conformance runner that validates all country packs against the
 * Wave 34 regulatory enforcement gates (P2-P8). Produces per-pack evidence.
 *
 * Checks per pack:
 *   1. Pack loads and validates (values.json well-formed)
 *   2. Regulatory profile has required fields
 *   3. Consent profile exists for framework
 *   4. Data residency region is in catalog
 *   5. Retention policy has retentionMinYears > 0
 *   6. DSAR rights (rightToErasure, dataPortability) are boolean
 *   7. i18n locales exist in message bundles
 *   8. Terminology defaults are present
 *
 * Exit: 0 = all packs pass, 1 = any pack fails
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const PACKS_DIR = join(ROOT, "country-packs");
const WEB_MESSAGES_DIR = join(ROOT, "apps", "web", "public", "messages");
const PORTAL_MESSAGES_DIR = join(ROOT, "apps", "portal", "public", "messages");

// Known consent profiles from consent-engine.ts
const KNOWN_FRAMEWORKS = ["HIPAA", "DPA_PH", "DPA_GH"];

// Known data regions from data-residency.ts
const KNOWN_REGIONS = ["us-east", "us-west", "ph-mnl", "gh-acc", "eu-fra", "local"];

let totalPassed = 0;
let totalFailed = 0;
let totalWarned = 0;

function loadPack(dir) {
  const path = join(PACKS_DIR, dir, "values.json");
  const raw = readFileSync(path, "utf-8");
  const stripped = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(stripped);
}

function gate(packCode, name, condition, detail) {
  if (condition) {
    totalPassed++;
    console.log(`  PASS  [${packCode}] ${name}: ${detail}`);
    return { gate: name, status: "pass", detail };
  } else {
    totalFailed++;
    console.log(`  FAIL  [${packCode}] ${name}: ${detail}`);
    return { gate: name, status: "fail", detail };
  }
}

function warn(packCode, name, detail) {
  totalWarned++;
  console.log(`  WARN  [${packCode}] ${name}: ${detail}`);
  return { gate: name, status: "warn", detail };
}

function runPackConformance(dir) {
  const code = dir;
  const results = [];

  // Gate 1: Pack loads
  let pack;
  try {
    pack = loadPack(dir);
    results.push(gate(code, "pack-load", true, `Loaded ${pack.countryCode} v${pack.packVersion}`));
  } catch (err) {
    results.push(gate(code, "pack-load", false, `Failed: ${err.message}`));
    return { countryCode: code, gates: results, overall: "fail" };
  }

  // Gate 2: Regulatory profile fields
  const reg = pack.regulatoryProfile || {};
  results.push(gate(code, "regulatory-framework",
    typeof reg.framework === "string" && reg.framework.length > 0,
    `framework: ${reg.framework || "MISSING"}`));
  results.push(gate(code, "regulatory-consent-required",
    typeof reg.consentRequired === "boolean",
    `consentRequired: ${reg.consentRequired}`));
  results.push(gate(code, "regulatory-granularity",
    typeof reg.consentGranularity === "string",
    `consentGranularity: ${reg.consentGranularity || "MISSING"}`));

  // Gate 3: Consent profile exists
  results.push(gate(code, "consent-profile-known",
    KNOWN_FRAMEWORKS.includes(reg.framework),
    `${reg.framework} ${KNOWN_FRAMEWORKS.includes(reg.framework) ? "found" : "NOT found"} in consent engine`));

  // Gate 4: Data residency region
  const dr = pack.dataResidency || {};
  results.push(gate(code, "residency-region",
    typeof dr.region === "string" && KNOWN_REGIONS.includes(dr.region),
    `region: ${dr.region || "MISSING"}`));
  results.push(gate(code, "residency-cross-border",
    typeof dr.crossBorderTransferAllowed === "boolean",
    `crossBorderTransferAllowed: ${dr.crossBorderTransferAllowed}`));

  // Gate 5: Retention policy
  results.push(gate(code, "retention-min-years",
    typeof reg.retentionMinYears === "number" && reg.retentionMinYears > 0,
    `retentionMinYears: ${reg.retentionMinYears || "MISSING"}`));

  // Gate 6: DSAR rights are booleans
  results.push(gate(code, "dsar-right-to-erasure",
    typeof reg.rightToErasure === "boolean",
    `rightToErasure: ${reg.rightToErasure}`));
  results.push(gate(code, "dsar-data-portability",
    typeof reg.dataPortability === "boolean",
    `dataPortability: ${reg.dataPortability}`));

  // Gate 7: i18n locales
  const locales = pack.supportedLocales || [pack.defaultLocale || "en"];
  for (const locale of locales) {
    const webExists = existsSync(join(WEB_MESSAGES_DIR, `${locale}.json`));
    const portalExists = existsSync(join(PORTAL_MESSAGES_DIR, `${locale}.json`));

    if (webExists && portalExists) {
      results.push(gate(code, `i18n-${locale}`, true, `web + portal messages exist`));
    } else if (webExists || portalExists) {
      results.push(warn(code, `i18n-${locale}`,
        `${webExists ? "web" : "portal"} exists, ${!webExists ? "web" : "portal"} missing`));
    } else {
      results.push(gate(code, `i18n-${locale}`, false, `Neither web nor portal messages exist`));
    }
  }

  // Gate 8: Terminology defaults
  const term = pack.terminologyDefaults || {};
  results.push(gate(code, "terminology-dx",
    typeof term.diagnosisCodeSystem === "string",
    `diagnosisCodeSystem: ${term.diagnosisCodeSystem || "MISSING"}`));
  results.push(gate(code, "terminology-proc",
    typeof term.procedureCodeSystem === "string",
    `procedureCodeSystem: ${term.procedureCodeSystem || "MISSING"}`));

  const overall = results.some((r) => r.status === "fail") ? "fail" : "pass";
  return { countryCode: pack.countryCode, gates: results, overall };
}

// ── Main ───────────────────────────────────────────────────────

console.log("\n=== Country Conformance Runner (Phase 499) ===\n");

if (!existsSync(PACKS_DIR)) {
  console.log("  FAIL  country-packs/ directory does not exist");
  process.exit(1);
}

const packDirs = readdirSync(PACKS_DIR).filter((d) => {
  const p = join(PACKS_DIR, d);
  return statSync(p).isDirectory() && existsSync(join(p, "values.json"));
});

if (packDirs.length === 0) {
  console.log("  FAIL  No country packs found");
  process.exit(1);
}

console.log(`Found ${packDirs.length} packs: ${packDirs.join(", ")}\n`);

const evidence = [];
for (const dir of packDirs) {
  console.log(`--- ${dir} ---`);
  const result = runPackConformance(dir);
  evidence.push(result);
  console.log(`  => ${result.overall.toUpperCase()}\n`);
}

// ── Evidence Summary ───────────────────────────────────────────

console.log("=== Evidence Summary ===");
for (const e of evidence) {
  const passCount = e.gates.filter((g) => g.status === "pass").length;
  const failCount = e.gates.filter((g) => g.status === "fail").length;
  const warnCount = e.gates.filter((g) => g.status === "warn").length;
  console.log(`  ${e.countryCode}: ${passCount} pass, ${warnCount} warn, ${failCount} fail => ${e.overall.toUpperCase()}`);
}

console.log(`\n  --- Totals: ${totalPassed} passed, ${totalWarned} warned, ${totalFailed} failed ---`);

const allPassed = evidence.every((e) => e.overall === "pass");
process.exit(allPassed ? 0 : 1);
