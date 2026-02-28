#!/usr/bin/env node
/**
 * Data Migration QA Gate -- Phase 281 (Wave 9)
 *
 * Validates all 4 Phase 281 deliverables:
 *   1. FHIR Bundle Parser
 *   2. CCD/CCDA Parser
 *   3. Reconciliation Engine
 *   4. Migration Orchestrator
 *
 * 21 gates total.
 *
 * Usage: node scripts/qa-gates/data-migration-gate.mjs
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..", "..");
const MIG = join(ROOT, "apps", "api", "src", "migration");

let pass = 0;
let fail = 0;

function gate(name, fn) {
  try {
    const result = fn();
    if (result) {
      console.log(`  PASS  ${name}`);
      pass++;
    } else {
      console.log(`  FAIL  ${name}`);
      fail++;
    }
  } catch (e) {
    console.log(`  FAIL  ${name} -- ${e.message}`);
    fail++;
  }
}

console.log("=== Data Migration QA Gate (Phase 281) ===\n");

/* ------------------------------------------------------------------ */
/* Structure Gates (1-4)                                               */
/* ------------------------------------------------------------------ */

console.log("-- Structure Gates --");

gate("1. fhir-bundle-parser.ts exists", () =>
  existsSync(join(MIG, "fhir-bundle-parser.ts")),
);

gate("2. ccda-parser.ts exists", () =>
  existsSync(join(MIG, "ccda-parser.ts")),
);

gate("3. reconciliation.ts exists", () =>
  existsSync(join(MIG, "reconciliation.ts")),
);

gate("4. migration-orchestrator.ts exists", () =>
  existsSync(join(MIG, "migration-orchestrator.ts")),
);

/* ------------------------------------------------------------------ */
/* FHIR Bundle Parser Gates (5-9)                                      */
/* ------------------------------------------------------------------ */

console.log("\n-- FHIR Bundle Parser Gates --");

const fhirSrc = existsSync(join(MIG, "fhir-bundle-parser.ts"))
  ? readFileSync(join(MIG, "fhir-bundle-parser.ts"), "utf-8")
  : "";

gate("5. Exports parseFhirBundle function", () =>
  fhirSrc.includes("export function parseFhirBundle"),
);

gate("6. Exports extractPatientsFromBundle function", () =>
  fhirSrc.includes("export function extractPatientsFromBundle"),
);

gate("7. Exports listSupportedFhirResourceTypes function", () =>
  fhirSrc.includes("export function listSupportedFhirResourceTypes"),
);

gate("8. Handles Bundle.entry[].resource extraction", () =>
  fhirSrc.includes("entry") &&
  fhirSrc.includes("resource") &&
  fhirSrc.includes("resourceType"),
);

gate("9. Returns typed FhirImportResult with entities + warnings", () =>
  fhirSrc.includes("FhirImportResult") &&
  fhirSrc.includes("parsed") &&
  fhirSrc.includes("warnings"),
);

/* ------------------------------------------------------------------ */
/* CCD/CCDA Parser Gates (10-13)                                       */
/* ------------------------------------------------------------------ */

console.log("\n-- CCD/CCDA Parser Gates --");

const ccdaSrc = existsSync(join(MIG, "ccda-parser.ts"))
  ? readFileSync(join(MIG, "ccda-parser.ts"), "utf-8")
  : "";

gate("10. Exports parseCcdaDocument function", () =>
  ccdaSrc.includes("export function parseCcdaDocument"),
);

gate("11. Extracts patient demographics section", () =>
  ccdaSrc.includes("extractPatientDemographics") &&
  ccdaSrc.includes("recordTarget"),
);

gate("12. Extracts problems/conditions section", () =>
  ccdaSrc.includes("extractProblemsSection") &&
  ccdaSrc.includes("11450-4"),
);

gate("13. Returns CcdaImportResult with integration-pending markers", () =>
  ccdaSrc.includes("CcdaImportResult") &&
  ccdaSrc.includes("integration-pending"),
);

/* ------------------------------------------------------------------ */
/* Reconciliation Gates (14-17)                                        */
/* ------------------------------------------------------------------ */

console.log("\n-- Reconciliation Gates --");

const reconSrc = existsSync(join(MIG, "reconciliation.ts"))
  ? readFileSync(join(MIG, "reconciliation.ts"), "utf-8")
  : "";

gate("14. Exports reconcileImport function", () =>
  reconSrc.includes("export function reconcileImport"),
);

gate("15. Generates matched/mismatched/missing/extra counts", () =>
  reconSrc.includes("matched") &&
  reconSrc.includes("mismatched") &&
  reconSrc.includes("missing-in-target") &&
  reconSrc.includes("extra-in-target"),
);

gate("16. Uses SHA-256 content hashing", () =>
  reconSrc.includes("sha256") && reconSrc.includes("createHash"),
);

gate("17. Returns ReconciliationReport with evidence entries", () =>
  reconSrc.includes("ReconciliationReport") &&
  reconSrc.includes("entries") &&
  reconSrc.includes("reportHash"),
);

/* ------------------------------------------------------------------ */
/* Orchestrator Gates (18-21)                                          */
/* ------------------------------------------------------------------ */

console.log("\n-- Orchestrator Gates --");

const orchSrc = existsSync(join(MIG, "migration-orchestrator.ts"))
  ? readFileSync(join(MIG, "migration-orchestrator.ts"), "utf-8")
  : "";

gate("18. Exports createMigrationPlan function", () =>
  orchSrc.includes("export function createMigrationPlan"),
);

gate("19. Exports executeMigrationPlan function", () =>
  orchSrc.includes("export async function executeMigrationPlan"),
);

gate("20. Enforces dependency order (patients before dependents)", () =>
  orchSrc.includes("topologicalSort") &&
  orchSrc.includes('patient: []') &&
  orchSrc.includes('problem: ["patient"]'),
);

gate("21. Supports dry-run mode", () =>
  orchSrc.includes("dryRun") && orchSrc.includes("plan.dryRun"),
);

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

console.log(`\n=== Results: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
