#!/usr/bin/env node
/**
 * RCM Readiness Scan -- Phase 513 (Wave 37 B1)
 *
 * Scans the RCM codebase + country packs to produce an integration
 * readiness matrix. Outputs:
 *   data/rcm/rcm-readiness-matrix.json
 *   docs/rcm/rcm-readiness-matrix.md
 *
 * Usage:
 *   node scripts/rcm/rcm-readiness-scan.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";

const ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

/* ── Helpers ─────────────────────────────────────────────────── */

function readSafe(p) {
  try { return readFileSync(p, "utf-8"); } catch { return ""; }
}

function fileExists(p) { return existsSync(p); }

function listDir(p) {
  try { return readdirSync(p, { withFileTypes: true }); } catch { return []; }
}

/* ── Scan connectors ─────────────────────────────────────────── */

function scanConnectors() {
  const dir = join(ROOT, "apps/api/src/rcm/connectors");
  const entries = listDir(dir).filter(d => d.isFile() && d.name.endsWith(".ts") && d.name !== "types.ts");
  const connectors = [];

  for (const entry of entries) {
    const content = readSafe(join(dir, entry.name));
    const id = entry.name.replace(/\.ts$/, "");

    // Detect implementation status
    let status = "implemented";
    const hasIntegrationPending = /integration[_-]pending/i.test(content);
    const hasStubReturn = /return\s*\{[^}]*success:\s*false[^}]*feature[-_]flag/i.test(content);
    const hasTodoPlaceholder = /TODO|FIXME|placeholder|scaffold/i.test(content);
    const hasRealHttpCall = /https?:\/\/[^"'`\s]+\.(com|gov|net|org|io)/i.test(content);
    const hasEnvCreds = /process\.env\.\w*(KEY|TOKEN|SECRET|CERT|PASSWORD)/i.test(content);
    const implementsInterface = /implements\s+RcmConnector/i.test(content);

    if (!implementsInterface) {
      status = "helper"; // Not a connector
    } else if (hasStubReturn && !hasRealHttpCall) {
      status = "stub";
    } else if (hasIntegrationPending) {
      status = "integration_pending";
    } else if (hasEnvCreds && !hasRealHttpCall) {
      status = "needs_credentials";
    }

    const supportedModes = [];
    const modeMatch = content.match(/supportedModes\s*[:=]\s*\[([^\]]+)\]/);
    if (modeMatch) {
      for (const m of modeMatch[1].matchAll(/'([^']+)'|"([^"]+)"/g)) {
        supportedModes.push(m[1] || m[2]);
      }
    }

    const supportedTx = [];
    const txMatch = content.match(/supportedTransactions\s*[:=][^[]*\[([^\]]+)\]/);
    if (txMatch) {
      for (const m of txMatch[1].matchAll(/'([^']+)'|"([^"]+)"/g)) {
        supportedTx.push(m[1] || m[2]);
      }
    }

    connectors.push({
      id,
      file: `apps/api/src/rcm/connectors/${entry.name}`,
      status,
      implementsInterface,
      supportedModes,
      supportedTransactions: supportedTx,
      hasEnvCreds,
      hasRealHttpCall,
      hasTodoPlaceholder,
      lineCount: content.split("\n").length,
    });
  }

  return connectors;
}

/* ── Scan payer data ─────────────────────────────────────────── */

function scanPayerData() {
  const dir = join(ROOT, "data/payers");
  const files = listDir(dir).filter(d => d.isFile() && d.name.endsWith(".json"));
  const payers = [];

  for (const f of files) {
    try {
      const raw = readSafe(join(dir, f.name));
      const data = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
      const list = Array.isArray(data) ? data : [data];
      for (const p of list) {
        payers.push({
          id: p.id || p.payerId || f.name,
          name: p.name || p.canonicalName || "unknown",
          country: p.country || p.countryCode || "??",
          integrationMode: p.integrationMode || "not_classified",
          source: `data/payers/${f.name}`,
        });
      }
    } catch { /* skip malformed */ }
  }

  return payers;
}

/* ── Scan country packs ──────────────────────────────────────── */

function scanCountryPacks() {
  const dir = join(ROOT, "country-packs");
  const packs = [];

  for (const d of listDir(dir).filter(e => e.isDirectory())) {
    const valuesPath = join(dir, d.name, "values.json");
    if (!fileExists(valuesPath)) continue;
    try {
      const raw = readSafe(valuesPath);
      const data = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
      packs.push({
        countryCode: data.countryCode || d.name,
        countryName: data.countryName || d.name,
        status: data.status || "unknown",
        enabledModules: data.enabledModules || [],
        payerModules: data.payerModules || [],
        featureFlags: data.featureFlags || {},
        rcmEnabled: (data.enabledModules || []).includes("rcm"),
        x12Enabled: data.featureFlags?.x12_edi_enabled || false,
        philhealthEnabled: data.featureFlags?.philhealth_eclaims || false,
      });
    } catch { /* skip */ }
  }

  return packs;
}

/* ── Cross-reference analysis ────────────────────────────────── */

function analyzeReadiness(connectors, payers, packs) {
  const issues = [];
  const connectorIndex = new Map(connectors.filter(c => c.implementsInterface).map(c => [c.id, c]));

  // Check: connector claims "implemented" but is clearly a stub
  for (const c of connectors) {
    if (c.status === "implemented" && c.hasTodoPlaceholder && !c.hasRealHttpCall) {
      issues.push({
        severity: "error",
        category: "connector-false-positive",
        id: c.id,
        message: `Connector '${c.id}' marked implemented but has TODO/placeholder markers and no real HTTP calls`,
      });
    }
  }

  // Check: country pack enables RCM but no connector strategy
  for (const pack of packs) {
    if (pack.rcmEnabled) {
      const hasConnector = connectors.some(c =>
        c.implementsInterface &&
        (c.id.includes(pack.countryCode.toLowerCase()) ||
         c.supportedModes.some(m => m.includes(pack.countryCode.toLowerCase())))
      );
      if (!hasConnector && !pack.x12Enabled && !pack.philhealthEnabled) {
        issues.push({
          severity: "warning",
          category: "pack-no-connector",
          id: pack.countryCode,
          message: `Country pack '${pack.countryCode}' enables RCM module but no connector strategy found`,
        });
      }
    }
  }

  return issues;
}

/* ── Generate matrix ─────────────────────────────────────────── */

function generateMatrix() {
  console.log("=== RCM Readiness Scan (Phase 513) ===\n");

  const connectors = scanConnectors();
  console.log(`Scanned ${connectors.length} connector files`);

  const payers = scanPayerData();
  console.log(`Scanned ${payers.length} payer records`);

  const packs = scanCountryPacks();
  console.log(`Scanned ${packs.length} country packs`);

  const issues = analyzeReadiness(connectors, payers, packs);
  console.log(`Found ${issues.length} issues\n`);

  const matrix = {
    generatedAt: new Date().toISOString(),
    phase: 513,
    wave: 37,
    summary: {
      connectors: {
        total: connectors.filter(c => c.implementsInterface).length,
        implemented: connectors.filter(c => c.status === "implemented").length,
        stub: connectors.filter(c => c.status === "stub").length,
        integrationPending: connectors.filter(c => c.status === "integration_pending").length,
        needsCredentials: connectors.filter(c => c.status === "needs_credentials").length,
      },
      payers: {
        total: payers.length,
        byCountry: Object.fromEntries(
          Object.entries(
            payers.reduce((acc, p) => { acc[p.country] = (acc[p.country] || 0) + 1; return acc; }, {})
          )
        ),
      },
      countryPacks: {
        total: packs.length,
        rcmEnabled: packs.filter(p => p.rcmEnabled).length,
      },
      issues: {
        errors: issues.filter(i => i.severity === "error").length,
        warnings: issues.filter(i => i.severity === "warning").length,
      },
    },
    connectors: connectors.filter(c => c.implementsInterface),
    helpers: connectors.filter(c => !c.implementsInterface),
    payers,
    countryPacks: packs,
    issues,
  };

  // Write JSON
  const jsonDir = join(ROOT, "data/rcm");
  if (!existsSync(jsonDir)) mkdirSync(jsonDir, { recursive: true });
  writeFileSync(join(jsonDir, "rcm-readiness-matrix.json"), JSON.stringify(matrix, null, 2));
  console.log("Wrote data/rcm/rcm-readiness-matrix.json");

  // Write markdown
  const mdDir = join(ROOT, "docs/rcm");
  if (!existsSync(mdDir)) mkdirSync(mdDir, { recursive: true });

  let md = `# RCM Integration Readiness Matrix\n\n`;
  md += `> Auto-generated by \`scripts/rcm/rcm-readiness-scan.mjs\` (Phase 513)\n`;
  md += `> Generated: ${matrix.generatedAt}\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Count |\n|--------|-------|\n`;
  md += `| Connectors (total) | ${matrix.summary.connectors.total} |\n`;
  md += `| Connectors (implemented) | ${matrix.summary.connectors.implemented} |\n`;
  md += `| Connectors (stub) | ${matrix.summary.connectors.stub} |\n`;
  md += `| Connectors (integration-pending) | ${matrix.summary.connectors.integrationPending} |\n`;
  md += `| Connectors (needs-credentials) | ${matrix.summary.connectors.needsCredentials} |\n`;
  md += `| Payer records | ${matrix.summary.payers.total} |\n`;
  md += `| Country packs | ${matrix.summary.countryPacks.total} |\n`;
  md += `| Country packs with RCM | ${matrix.summary.countryPacks.rcmEnabled} |\n`;
  md += `| Issues (errors) | ${matrix.summary.issues.errors} |\n`;
  md += `| Issues (warnings) | ${matrix.summary.issues.warnings} |\n\n`;

  md += `## Connectors\n\n`;
  md += `| ID | Status | Modes | Transactions | Env Creds | HTTP Calls | Lines |\n`;
  md += `|----|--------|-------|-------------|-----------|------------|-------|\n`;
  for (const c of matrix.connectors) {
    md += `| ${c.id} | ${c.status} | ${c.supportedModes.join(", ") || "-"} | ${c.supportedTransactions.join(", ") || "-"} | ${c.hasEnvCreds ? "Y" : "N"} | ${c.hasRealHttpCall ? "Y" : "N"} | ${c.lineCount} |\n`;
  }

  md += `\n## Country Packs\n\n`;
  md += `| Code | Name | RCM | X12 | PhilHealth | Status |\n`;
  md += `|------|------|-----|-----|------------|--------|\n`;
  for (const p of matrix.countryPacks) {
    md += `| ${p.countryCode} | ${p.countryName} | ${p.rcmEnabled ? "Y" : "N"} | ${p.x12Enabled ? "Y" : "N"} | ${p.philhealthEnabled ? "Y" : "N"} | ${p.status} |\n`;
  }

  if (issues.length > 0) {
    md += `\n## Issues\n\n`;
    md += `| Severity | Category | ID | Message |\n`;
    md += `|----------|----------|----|---------|\n`;
    for (const i of issues) {
      md += `| ${i.severity} | ${i.category} | ${i.id} | ${i.message} |\n`;
    }
  }

  writeFileSync(join(mdDir, "rcm-readiness-matrix.md"), md);
  console.log("Wrote docs/rcm/rcm-readiness-matrix.md");

  // Print summary
  console.log("\n--- Readiness Summary ---");
  for (const [k, v] of Object.entries(matrix.summary.connectors)) {
    console.log(`  Connectors ${k}: ${v}`);
  }
  for (const i of issues) {
    const icon = i.severity === "error" ? "FAIL" : "WARN";
    console.log(`  ${icon}  ${i.message}`);
  }

  if (issues.filter(i => i.severity === "error").length > 0) {
    console.log("\n  RESULT: ERRORS FOUND");
  } else {
    console.log("\n  RESULT: PASS (no errors)");
  }

  return matrix;
}

generateMatrix();
