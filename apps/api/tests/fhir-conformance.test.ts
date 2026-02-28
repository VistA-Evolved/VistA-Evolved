/**
 * FHIR R4 Conformance Test Suite — Phase 179 (Q196).
 *
 * Structural conformance tests that validate the FHIR R4 gateway
 * follows HL7 FHIR R4 and US Core IG rules:
 *
 *   - Resource structure completeness
 *   - US Core profile references
 *   - CapabilityStatement completeness
 *   - SMART on FHIR configuration
 *   - Bundle structure
 *   - ETag / caching support
 *   - Mapper edge cases
 *
 * These tests exercise the pure mapping and structural layers only.
 * No running VistA or API server required.
 */

import { describe, it, expect } from "vitest";

import {
  toFhirPatient,
  toFhirAllergyIntolerance,
  toFhirCondition,
  toFhirVitalObservation,
  toFhirLabObservation,
  toFhirMedicationRequest,
  toFhirDocumentReference,
  toFhirEncounter,
  toSearchBundle,
} from "../src/fhir/mappers.js";

import { buildCapabilityStatement } from "../src/fhir/capability-statement.js";
import { buildSmartConfiguration } from "../src/fhir/smart-configuration.js";
import { getFhirCacheStats, clearFhirCache } from "../src/fhir/fhir-cache.js";

import type {
  PatientRecord,
  AllergyRecord,
  VitalRecord,
  NoteRecord,
  MedicationRecord,
  ProblemRecord,
  LabResult,
  EncounterRecord,
} from "../src/adapters/types.js";

import type {
  FhirPatient,
  FhirAllergyIntolerance,
  FhirCondition,
  FhirObservation,
  FhirMedicationRequest,
  FhirDocumentReference,
  FhirEncounter,
  FhirBundle,
  FhirCapabilityStatement,
  FhirResource,
} from "../src/fhir/types.js";

/* ================================================================== */
/* Fixtures                                                             */
/* ================================================================== */

const BASE_URL = "http://localhost:3001";

const PATIENT: PatientRecord = {
  dfn: "3", name: "CARTER,DAVID JR", ssn: "000-00-0003", dob: "2451225", sex: "M", veteran: true,
};

const ALLERGY: AllergyRecord = {
  id: "101", allergen: "PENICILLIN", reactions: ["HIVES", "RASH"], severity: "MODERATE",
  type: "DRUG", verified: true, enteredDate: "01/15/2023",
};

const PROBLEM: ProblemRecord = {
  id: "501", description: "Type 2 Diabetes Mellitus", icdCode: "E11.9",
  onset: "3200101", status: "ACTIVE", provider: "PROVIDER,CLYDE WV",
};

const VITAL: VitalRecord = {
  id: "201", type: "BLOOD PRESSURE", value: "120/80", unit: "mmHg",
  dateTime: "3240601.1430", facility: "WORLDVISTA",
};

const LAB: LabResult = {
  id: "301", testName: "GLUCOSE", result: "105", units: "mg/dL",
  refRange: "70-110", dateTime: "3240601.0800", status: "FINAL", abnormalFlag: "N",
};

const MED: MedicationRecord = {
  id: "401", name: "METFORMIN 500MG TAB", dose: "500MG", route: "ORAL",
  schedule: "BID", status: "ACTIVE", prescriber: "PROVIDER,CLYDE WV", startDate: "3240101",
};

const NOTE: NoteRecord = {
  id: "601", title: "PROGRESS NOTE", author: "PROVIDER,CLYDE WV",
  dateTime: "3240601.1000", status: "COMPLETED",
  text: "Patient seen for diabetes follow-up.",
};

const ENCOUNTER: EncounterRecord = {
  id: "701", patientDfn: "3", dateTime: "3240601.0900", status: "CHECKED OUT",
  class: "AMB", type: "FOLLOW-UP", clinic: "PRIMARY CARE", clinicIen: "44",
  provider: "PROVIDER,CLYDE WV", providerDuz: "87", reason: "Diabetes follow-up", duration: 30,
};

/* ================================================================== */
/* Test Suites                                                          */
/* ================================================================== */

describe("FHIR R4 Conformance Suite — Phase 179", () => {

  /* ---------------------------------------------------------------- */
  /* 1. All resources have required resourceType and id                */
  /* ---------------------------------------------------------------- */
  describe("Resource structure — required fields", () => {
    const allResources: FhirResource[] = [
      toFhirPatient(PATIENT),
      toFhirAllergyIntolerance(ALLERGY, "3"),
      toFhirCondition(PROBLEM, "3"),
      toFhirVitalObservation(VITAL, "3"),
      toFhirLabObservation(LAB, "3"),
      toFhirMedicationRequest(MED, "3"),
      toFhirDocumentReference(NOTE, "3"),
      toFhirEncounter(ENCOUNTER),
    ];

    it("every resource has a non-empty resourceType", () => {
      for (const r of allResources) {
        expect(r.resourceType).toBeTruthy();
        expect(typeof r.resourceType).toBe("string");
      }
    });

    it("every resource has a non-empty id", () => {
      for (const r of allResources) {
        expect(r.id).toBeTruthy();
        expect(typeof r.id).toBe("string");
      }
    });

    it("every resource has meta with US Core profile", () => {
      for (const r of allResources) {
        expect(r.meta).toBeDefined();
        expect(r.meta?.profile?.length).toBeGreaterThan(0);
        // All profiles should reference hl7.org
        for (const p of r.meta?.profile || []) {
          expect(p).toContain("hl7.org/fhir");
        }
      }
    });

    it("every resource has meta.source = 'vista'", () => {
      for (const r of allResources) {
        expect(r.meta?.source).toBe("vista");
      }
    });
  });

  /* ---------------------------------------------------------------- */
  /* 2. US Core mandatory element coverage                             */
  /* ---------------------------------------------------------------- */
  describe("US Core mandatory elements", () => {
    it("Patient has name", () => {
      const p = toFhirPatient(PATIENT) as FhirPatient;
      expect(p.name).toBeDefined();
      expect(p.name!.length).toBeGreaterThan(0);
      expect(p.name![0].family).toBeTruthy();
    });

    it("AllergyIntolerance has patient reference", () => {
      const a = toFhirAllergyIntolerance(ALLERGY, "3") as FhirAllergyIntolerance;
      expect(a.patient.reference).toBe("Patient/3");
    });

    it("Condition has subject and category", () => {
      const c = toFhirCondition(PROBLEM, "3") as FhirCondition;
      expect(c.subject.reference).toBe("Patient/3");
      expect(c.category).toBeDefined();
      expect(c.category!.length).toBeGreaterThan(0);
    });

    it("Observation has status, code, and subject", () => {
      const v = toFhirVitalObservation(VITAL, "3") as FhirObservation;
      expect(v.status).toBe("final");
      expect(v.code).toBeDefined();
      expect(v.subject?.reference).toBe("Patient/3");
    });

    it("MedicationRequest has status, intent, and subject", () => {
      const m = toFhirMedicationRequest(MED, "3") as FhirMedicationRequest;
      expect(m.status).toBe("active");
      expect(m.intent).toBe("order");
      expect(m.subject.reference).toBe("Patient/3");
    });

    it("DocumentReference has status and content", () => {
      const d = toFhirDocumentReference(NOTE, "3") as FhirDocumentReference;
      expect(d.status).toBe("current");
      expect(d.content.length).toBeGreaterThan(0);
    });

    it("Encounter has status, class, and subject", () => {
      const e = toFhirEncounter(ENCOUNTER) as FhirEncounter;
      expect(e.status).toBe("finished");
      expect(e.class).toBeDefined();
      expect(e.class.system).toBeTruthy();
      expect(e.class.code).toBeTruthy();
      expect(e.subject?.reference).toBe("Patient/3");
    });
  });

  /* ---------------------------------------------------------------- */
  /* 3. Bundle structure                                               */
  /* ---------------------------------------------------------------- */
  describe("Bundle structure", () => {
    it("search bundle has type='searchset'", () => {
      const b = toSearchBundle([], 0, BASE_URL);
      expect(b.type).toBe("searchset");
    });

    it("search bundle has correct total", () => {
      const resources = [toFhirPatient(PATIENT)];
      const b = toSearchBundle(resources, 1, BASE_URL, "Patient");
      expect(b.total).toBe(1);
    });

    it("search bundle entries have fullUrl and search.mode", () => {
      const resources = [toFhirPatient(PATIENT), toFhirEncounter(ENCOUNTER)];
      const b = toSearchBundle(resources, 2, BASE_URL);
      for (const entry of b.entry || []) {
        expect(entry.fullUrl).toBeTruthy();
        expect(entry.fullUrl).toContain(BASE_URL);
        expect(entry.search?.mode).toBe("match");
      }
    });

    it("search bundle link[0] has self relation", () => {
      const b = toSearchBundle([], 0, BASE_URL, "Patient");
      expect(b.link?.[0]?.relation).toBe("self");
      expect(b.link?.[0]?.url).toContain("/fhir/Patient");
    });
  });

  /* ---------------------------------------------------------------- */
  /* 4. CapabilityStatement completeness                               */
  /* ---------------------------------------------------------------- */
  describe("CapabilityStatement completeness", () => {
    const cs = buildCapabilityStatement(BASE_URL);

    it("declares fhirVersion 4.0.1", () => {
      expect(cs.fhirVersion).toBe("4.0.1");
    });

    it("declares application/fhir+json format", () => {
      expect(cs.format).toContain("application/fhir+json");
    });

    it("declares kind='instance'", () => {
      expect(cs.kind).toBe("instance");
    });

    it("declares status='draft'", () => {
      expect(cs.status).toBe("draft");
    });

    it("has software name and version", () => {
      expect(cs.software?.name).toBe("VistA-Evolved");
      expect(cs.software?.version).toBeTruthy();
    });

    it("has implementation description with URL", () => {
      expect(cs.implementation?.description).toBeTruthy();
      expect(cs.implementation?.url).toBe(BASE_URL);
    });

    it("declares 7 resource types", () => {
      const types = cs.rest?.[0]?.resource?.map((r) => r.type) || [];
      expect(types.length).toBe(7);
      expect(types).toContain("Patient");
      expect(types).toContain("AllergyIntolerance");
      expect(types).toContain("Condition");
      expect(types).toContain("Observation");
      expect(types).toContain("MedicationRequest");
      expect(types).toContain("DocumentReference");
      expect(types).toContain("Encounter");
    });

    it("every resource has at least one interaction", () => {
      for (const resource of cs.rest?.[0]?.resource || []) {
        expect(resource.interaction).toBeDefined();
        expect(resource.interaction!.length).toBeGreaterThan(0);
      }
    });

    it("every resource has a US Core profile", () => {
      for (const resource of cs.rest?.[0]?.resource || []) {
        expect(resource.profile).toBeTruthy();
        expect(resource.profile).toContain("us-core");
      }
    });

    it("Patient has read + search-type interactions", () => {
      const patient = cs.rest?.[0]?.resource?.find((r) => r.type === "Patient");
      const codes = patient?.interaction?.map((i) => i.code) || [];
      expect(codes).toContain("read");
      expect(codes).toContain("search-type");
    });

    it("all non-Patient resources have search-type interaction", () => {
      for (const resource of cs.rest?.[0]?.resource || []) {
        if (resource.type === "Patient") continue;
        const codes = resource.interaction?.map((i) => i.code) || [];
        expect(codes).toContain("search-type");
      }
    });

    it("patient-scoped resources have 'patient' search param", () => {
      const patientScoped = ["AllergyIntolerance", "Condition", "Observation",
        "MedicationRequest", "DocumentReference", "Encounter"];
      for (const typeName of patientScoped) {
        const resource = cs.rest?.[0]?.resource?.find((r) => r.type === typeName);
        const paramNames = resource?.searchParam?.map((p) => p.name) || [];
        expect(paramNames).toContain("patient");
      }
    });
  });

  /* ---------------------------------------------------------------- */
  /* 5. SMART on FHIR configuration                                    */
  /* ---------------------------------------------------------------- */
  describe("SMART on FHIR configuration", () => {
    const config = buildSmartConfiguration(BASE_URL);

    it("has capabilities array", () => {
      expect(config.capabilities).toBeDefined();
      expect(config.capabilities.length).toBeGreaterThan(0);
    });

    it("advertises launch-ehr capability", () => {
      expect(config.capabilities).toContain("launch-ehr");
    });

    it("has grant_types_supported", () => {
      expect(config.grant_types_supported).toBeDefined();
      expect(config.grant_types_supported).toContain("authorization_code");
    });

    it("advertises all 7 resource scopes", () => {
      const scopes = config.scopes_supported || [];
      expect(scopes).toContain("patient/Patient.read");
      expect(scopes).toContain("patient/AllergyIntolerance.read");
      expect(scopes).toContain("patient/Condition.read");
      expect(scopes).toContain("patient/Observation.read");
      expect(scopes).toContain("patient/MedicationRequest.read");
      expect(scopes).toContain("patient/DocumentReference.read");
      expect(scopes).toContain("patient/Encounter.read");
    });

    it("includes FHIR base URL extension", () => {
      expect(config["x-vista-evolved-fhir-base"]).toBe(`${BASE_URL}/fhir`);
    });
  });

  /* ---------------------------------------------------------------- */
  /* 6. Cache / ETag infrastructure                                    */
  /* ---------------------------------------------------------------- */
  describe("FHIR cache infrastructure", () => {
    it("cache module is loadable", () => {
      const stats = getFhirCacheStats();
      expect(stats).toBeDefined();
      expect(typeof stats.enabled).toBe("boolean");
    });

    it("cache can be cleared", () => {
      clearFhirCache();
      expect(getFhirCacheStats().size).toBe(0);
    });

    it("cache has sane defaults", () => {
      const stats = getFhirCacheStats();
      expect(stats.ttlMs).toBeGreaterThanOrEqual(1000);
      expect(stats.maxEntries).toBeGreaterThanOrEqual(100);
    });
  });

  /* ---------------------------------------------------------------- */
  /* 7. Mapper edge cases — empty/minimal data                         */
  /* ---------------------------------------------------------------- */
  describe("Mapper edge cases", () => {
    it("Patient with only dfn+name produces valid resource", () => {
      const p = toFhirPatient({ dfn: "99", name: "TEST,MINIMAL" }) as FhirPatient;
      expect(p.resourceType).toBe("Patient");
      expect(p.id).toBe("99");
      expect(p.name?.[0]?.family).toBe("TEST");
    });

    it("Allergy with only id+allergen produces valid resource", () => {
      const a = toFhirAllergyIntolerance({ id: "1", allergen: "ASPIRIN" }, "5") as FhirAllergyIntolerance;
      expect(a.resourceType).toBe("AllergyIntolerance");
      expect(a.patient.reference).toBe("Patient/5");
    });

    it("Encounter with minimal fields produces valid resource", () => {
      const e = toFhirEncounter({
        id: "1", patientDfn: "5", dateTime: "3240101", status: "finished", class: "AMB",
      }) as FhirEncounter;
      expect(e.resourceType).toBe("Encounter");
      expect(e.status).toBe("finished");
      expect(e.class.code).toBe("AMB");
    });

    it("Lab with non-numeric result uses valueString", () => {
      const lab: LabResult = { id: "1", testName: "CULTURE", result: ">10000 CFU", dateTime: "3240101" };
      const o = toFhirLabObservation(lab, "3") as FhirObservation;
      expect(o.valueString).toBe(">10000 CFU");
      expect(o.valueQuantity).toBeUndefined();
    });

    it("Vital with numeric value uses valueQuantity", () => {
      const v: VitalRecord = { id: "1", type: "TEMPERATURE", value: "98.6", unit: "F", dateTime: "3240101" };
      const o = toFhirVitalObservation(v, "3") as FhirObservation;
      expect(o.valueQuantity?.value).toBe(98.6);
    });
  });

  /* ---------------------------------------------------------------- */
  /* 8. File structure conformance                                     */
  /* ---------------------------------------------------------------- */
  describe("File structure conformance", () => {
    it("fhir-routes.ts exists and exports default function", async () => {
      const mod = await import("../src/fhir/fhir-routes.js");
      expect(typeof mod.default).toBe("function");
    });

    it("smart-configuration.ts exists and exports buildSmartConfiguration", async () => {
      const mod = await import("../src/fhir/smart-configuration.js");
      expect(typeof mod.buildSmartConfiguration).toBe("function");
      expect(typeof mod.default).toBe("function"); // route plugin
    });

    it("fhir-cache.ts exists and exports cache utilities", async () => {
      const mod = await import("../src/fhir/fhir-cache.js");
      expect(typeof mod.registerFhirCache).toBe("function");
      expect(typeof mod.getFhirCacheStats).toBe("function");
      expect(typeof mod.clearFhirCache).toBe("function");
    });

    it("index.ts barrel exports all expected symbols", async () => {
      const mod = await import("../src/fhir/index.js");
      expect(mod.fhirRoutes).toBeDefined();
      expect(mod.buildCapabilityStatement).toBeDefined();
      expect(mod.toFhirPatient).toBeDefined();
      expect(mod.toFhirEncounter).toBeDefined();
      expect(mod.toSearchBundle).toBeDefined();
      expect(mod.getFhirCacheStats).toBeDefined();
      expect(mod.clearFhirCache).toBeDefined();
    });
  });
});
