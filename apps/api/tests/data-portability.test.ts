/**
 * Data Portability Exports Tests -- Phase 264 (Wave 8 P8)
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const API_SRC = path.resolve(__dirname, "../src");

describe("Data Portability Exports -- Phase 264", () => {
  describe("Data Portability Engine", () => {
    const storePath = path.join(API_SRC, "exports", "data-portability.ts");

    it("engine file exists", () => {
      expect(fs.existsSync(storePath)).toBe(true);
    });

    it("exports BulkExportJob type", () => {
      const c = fs.readFileSync(storePath, "utf-8");
      expect(c).toContain("BulkExportJob");
    });

    it("exports kickoffBulkExport", () => {
      const c = fs.readFileSync(storePath, "utf-8");
      expect(c).toContain("export function kickoffBulkExport");
    });

    it("exports generatePatientChart", () => {
      const c = fs.readFileSync(storePath, "utf-8");
      expect(c).toContain("export function generatePatientChart");
    });

    it("exports kickoffTenantExport", () => {
      const c = fs.readFileSync(storePath, "utf-8");
      expect(c).toContain("export function kickoffTenantExport");
    });

    it("exports verifyExportManifest", () => {
      const c = fs.readFileSync(storePath, "utf-8");
      expect(c).toContain("export function verifyExportManifest");
    });

    it("supports 7 FHIR resource types", () => {
      const c = fs.readFileSync(storePath, "utf-8");
      expect(c).toContain("SUPPORTED_FHIR_RESOURCE_TYPES");
      for (const rt of [
        "Patient",
        "AllergyIntolerance",
        "Condition",
        "Observation",
        "MedicationRequest",
        "DocumentReference",
        "Encounter",
      ]) {
        expect(c).toContain(`"${rt}"`);
      }
    });

    it("supports 7 tenant export scopes", () => {
      const c = fs.readFileSync(storePath, "utf-8");
      for (const s of [
        "clinical",
        "rcm",
        "audit",
        "analytics",
        "platform",
        "imaging",
        "integrations",
      ]) {
        expect(c).toContain(`"${s}"`);
      }
    });

    it("uses SHA-256 for manifest hashing", () => {
      const c = fs.readFileSync(storePath, "utf-8");
      expect(c).toContain("sha256");
    });

    it("has 3 bulk export levels", () => {
      const c = fs.readFileSync(storePath, "utf-8");
      expect(c).toContain('"system"');
      expect(c).toContain('"patient"');
      expect(c).toContain('"group"');
    });
  });

  describe("Data Portability Routes", () => {
    const routePath = path.join(
      API_SRC,
      "routes",
      "data-portability-routes.ts",
    );

    it("routes file exists", () => {
      expect(fs.existsSync(routePath)).toBe(true);
    });

    it("has bulk export kickoff", () => {
      const c = fs.readFileSync(routePath, "utf-8");
      expect(c).toContain("/admin/exports/bulk/kickoff");
    });

    it("has bulk export status", () => {
      const c = fs.readFileSync(routePath, "utf-8");
      expect(c).toContain("/admin/exports/bulk/:id/status");
    });

    it("has patient chart export", () => {
      const c = fs.readFileSync(routePath, "utf-8");
      expect(c).toContain("/admin/exports/patient-chart");
    });

    it("has tenant export kickoff", () => {
      const c = fs.readFileSync(routePath, "utf-8");
      expect(c).toContain("/admin/exports/tenant/kickoff");
    });

    it("has manifest verification", () => {
      const c = fs.readFileSync(routePath, "utf-8");
      expect(c).toContain("/admin/exports/verify-manifest");
    });

    it("has capabilities endpoint", () => {
      const c = fs.readFileSync(routePath, "utf-8");
      expect(c).toContain("/admin/exports/portability/capabilities");
    });

    it("returns 202 for async kickoffs", () => {
      const c = fs.readFileSync(routePath, "utf-8");
      expect(c).toContain(".code(202)");
    });
  });

  describe("Existing Export Infrastructure Untouched", () => {
    it("export-engine.ts preserved", () => {
      expect(
        fs.existsSync(path.join(API_SRC, "exports", "export-engine.ts")),
      ).toBe(true);
    });

    it("export-formats.ts preserved", () => {
      expect(
        fs.existsSync(path.join(API_SRC, "exports", "export-formats.ts")),
      ).toBe(true);
    });

    it("fhir/types.ts preserved", () => {
      expect(
        fs.existsSync(path.join(API_SRC, "fhir", "types.ts")),
      ).toBe(true);
    });
  });
});
