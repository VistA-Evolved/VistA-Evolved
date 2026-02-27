#!/usr/bin/env node
/**
 * G29 — Certification Evidence Export (Phase 172)
 *
 * Validates:
 *  1. Evidence generator script exists and is executable
 *  2. API routes file exists with 4 endpoints
 *  3. All audit trail sources present (immutable, imaging, RCM)
 *  4. Compliance docs present (>= 4 of 6 required)
 *  5. System gap matrix exists
 *  6. Posture modules present (>= 7)
 *  7. Store inventory (store-policy.ts) exists
 *  8. No PHI in generator script
 *  9. Index.ts wiring
 * 10. Runbook exists
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

export const meta = {
  id: "G29_certification_evidence",
  name: "Certification Evidence Export",
  phase: 172,
  tags: ["compliance", "evidence", "audit"],
};

export async function run(_ctx) {
  const issues = [];
  const details = [];
  const root = resolve(import.meta.dirname, "../../..");

  // 1. Evidence generator script
  const genScript = resolve(root, "scripts/generate-certification-evidence.mjs");
  if (existsSync(genScript)) {
    const content = readFileSync(genScript, "utf-8");
    const hasSections = [
      "Quality Gates",
      "Posture Snapshots",
      "Audit Chain",
      "Gap Matrix",
      "Compliance",
      "Configuration",
      "Runbook Coverage",
      "Gauntlet",
      "Store Inventory",
      "PHI Scan",
    ].filter((s) => content.includes(s));
    if (hasSections.length >= 8) {
      details.push(`PASS: Evidence generator has ${hasSections.length}/10 sections`);
    } else {
      issues.push(`Evidence generator missing sections (${hasSections.length}/10)`);
    }
    // SHA-256 manifest
    if (content.includes("sha256") || content.includes("SHA-256")) {
      details.push("PASS: SHA-256 manifest generation present");
    } else {
      issues.push("Evidence generator missing SHA-256 manifest");
    }
  } else {
    issues.push("generate-certification-evidence.mjs not found");
  }

  // 2. API routes
  const routeFile = resolve(root, "apps/api/src/routes/certification-evidence.ts");
  if (existsSync(routeFile)) {
    const content = readFileSync(routeFile, "utf-8");
    const endpoints = [
      "/admin/certification/status",
      "/admin/certification/generate",
      "/admin/certification/bundles",
      "/admin/certification/bundle/",
    ];
    const found = endpoints.filter((e) => content.includes(e));
    if (found.length >= 4) {
      details.push(`PASS: ${found.length} certification API endpoints`);
    } else {
      issues.push(`Only ${found.length}/4 certification endpoints found`);
    }
    // requireSession check
    if (content.includes("requireSession")) {
      details.push("PASS: Admin auth enforced on certification routes");
    } else {
      issues.push("Missing requireSession on certification routes");
    }
  } else {
    issues.push("certification-evidence.ts route file not found");
  }

  // 3. Audit trail sources
  const auditTrails = [
    "apps/api/src/lib/immutable-audit.ts",
    "apps/api/src/services/imaging-audit.ts",
    "apps/api/src/rcm/audit/rcm-audit.ts",
  ];
  const trailsPresent = auditTrails.filter((f) => existsSync(resolve(root, f)));
  if (trailsPresent.length === 3) {
    details.push("PASS: All 3 audit trail sources present");
  } else {
    issues.push(`Only ${trailsPresent.length}/3 audit trail sources found`);
  }

  // 4. Compliance docs
  const complianceDocs = [
    "docs/compliance/compliance-mapping.md",
    "docs/compliance/data-classification.md",
    "docs/compliance/access-control-policy.md",
    "docs/compliance/incident-response.md",
    "docs/compliance/threat-model.md",
    "docs/compliance/logging-policy.md",
  ];
  const docsPresent = complianceDocs.filter((f) => existsSync(resolve(root, f)));
  if (docsPresent.length >= 4) {
    details.push(`PASS: ${docsPresent.length}/6 compliance docs present`);
  } else {
    issues.push(`Only ${docsPresent.length}/6 compliance docs found`);
  }

  // 5. System gap matrix
  const gapMatrix = resolve(root, "qa/gauntlet/system-gap-matrix.json");
  if (existsSync(gapMatrix)) {
    try {
      const data = JSON.parse(readFileSync(gapMatrix, "utf-8"));
      details.push(`PASS: System gap matrix present (${data.domains?.length || 0} domains)`);
    } catch {
      issues.push("System gap matrix is invalid JSON");
    }
  } else {
    issues.push("system-gap-matrix.json not found");
  }

  // 6. Posture modules
  const postureModules = [
    "observability-posture.ts",
    "tenant-posture.ts",
    "perf-posture.ts",
    "backup-posture.ts",
    "data-plane-posture.ts",
    "audit-shipping-posture.ts",
    "certification-posture.ts",
  ];
  const postureDir = resolve(root, "apps/api/src/posture");
  const posturePresent = postureModules.filter((f) => existsSync(resolve(postureDir, f)));
  if (posturePresent.length >= 7) {
    details.push(`PASS: ${posturePresent.length}/7 posture modules present`);
  } else {
    issues.push(`Only ${posturePresent.length}/7 posture modules found`);
  }

  // 7. Store inventory
  const storePolicy = resolve(root, "apps/api/src/platform/store-policy.ts");
  if (existsSync(storePolicy)) {
    details.push("PASS: Store policy/inventory exists");
  } else {
    issues.push("store-policy.ts not found");
  }

  // 8. No PHI in generator
  if (existsSync(genScript)) {
    const content = readFileSync(genScript, "utf-8");
    const phiPatterns = [/PROV123!!/g, /NURSE123!!/g, /PHARM123!!/g, /\b\d{3}-\d{2}-\d{4}\b/g];
    const phiFound = phiPatterns.some((p) => p.test(content));
    if (!phiFound) {
      details.push("PASS: No PHI in evidence generator");
    } else {
      issues.push("PHI detected in evidence generator script");
    }
  }

  // 9. Index.ts wiring
  const indexFile = resolve(root, "apps/api/src/index.ts");
  if (existsSync(indexFile)) {
    const content = readFileSync(indexFile, "utf-8");
    if (content.includes("certification-evidence") || content.includes("certificationEvidence")) {
      details.push("PASS: Certification routes wired in index.ts");
    } else {
      issues.push("Certification routes not wired in index.ts");
    }
  }

  // 10. Runbook
  const runbook = resolve(root, "docs/runbooks/phase172-certification-evidence.md");
  if (existsSync(runbook)) {
    details.push("PASS: Phase 172 runbook exists");
  } else {
    issues.push("Phase 172 runbook not found");
  }

  return {
    status: issues.length === 0 ? "pass" : "fail",
    issues,
    details,
  };
}
