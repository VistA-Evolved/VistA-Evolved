/**
 * FHIR R4 Gateway CI Gate Tests — Phase 178.
 *
 * Validates the structural integrity and conformance of the FHIR R4
 * gateway scaffold: types, mappers, capability statement, route
 * registration, and US Core profile compliance.
 *
 * These tests do NOT require a running VistA or API server — they
 * exercise the pure mapping and structural layers only.
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
} from "../src/fhir/types.js";

/* ================================================================== */
/* Fixtures                                                             */
/* ================================================================== */

const PATIENT: PatientRecord = {
  dfn: "3",
  name: "CARTER,DAVID JR",
  ssn: "000-00-0003",
  dob: "2451225",
  sex: "M",
  veteran: true,
};

const ALLERGY: AllergyRecord = {
  id: "101",
  allergen: "PENICILLIN",
  reactions: ["HIVES", "RASH"],
  severity: "MODERATE",
  type: "DRUG",
  verified: true,
  enteredDate: "01/15/2023",
};

const PROBLEM: ProblemRecord = {
  id: "501",
  description: "Type 2 Diabetes Mellitus",
  icdCode: "E11.9",
  onset: "3200101",
  status: "ACTIVE",
  provider: "PROVIDER,CLYDE WV",
};

const VITAL: VitalRecord = {
  id: "201",
  type: "BLOOD PRESSURE",
  value: "120/80",
  unit: "mmHg",
  dateTime: "3240601.1430",
  facility: "WORLDVISTA",
};

const LAB: LabResult = {
  id: "301",
  testName: "GLUCOSE",
  result: "105",
  units: "mg/dL",
  refRange: "70-110",
  dateTime: "3240601.0800",
  status: "FINAL",
  abnormalFlag: "N",
};

const MED: MedicationRecord = {
  id: "401",
  name: "METFORMIN 500MG TAB",
  dose: "500MG",
  route: "ORAL",
  schedule: "BID",
  status: "ACTIVE",
  prescriber: "PROVIDER,CLYDE WV",
  startDate: "3240101",
};

const NOTE: NoteRecord = {
  id: "601",
  title: "PROGRESS NOTE",
  author: "PROVIDER,CLYDE WV",
  dateTime: "3240601.1000",
  status: "COMPLETED",
  text: "Patient seen for diabetes follow-up. A1C improved to 6.8%.",
};

const ENCOUNTER: EncounterRecord = {
  id: "701",
  patientDfn: "3",
  dateTime: "3240601.0900",
  status: "CHECKED OUT",
  class: "AMB",
  type: "FOLLOW-UP",
  clinic: "PRIMARY CARE",
  clinicIen: "44",
  provider: "PROVIDER,CLYDE WV",
  providerDuz: "87",
  reason: "Diabetes follow-up",
  duration: 30,
};

/* ================================================================== */
/* Test Suites                                                          */
/* ================================================================== */

describe("FHIR R4 Gateway — Phase 178", () => {

  /* ---------------------------------------------------------------- */
  /* Patient mapper                                                    */
  /* ---------------------------------------------------------------- */
  describe("Patient mapper", () => {
    it("maps VistA PatientRecord to FHIR Patient", () => {
      const result = toFhirPatient(PATIENT);
      expect(result.resourceType).toBe("Patient");
      expect(result.id).toBe("3");
      expect(result.meta?.profile).toContain("http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient");
      expect(result.meta?.source).toBe("vista");
    });

    it("parses VistA LAST,FIRST name format", () => {
      const result = toFhirPatient(PATIENT);
      expect(result.name?.[0]?.family).toBe("CARTER");
      expect(result.name?.[0]?.given).toContain("DAVID");
      expect(result.name?.[0]?.given).toContain("JR");
    });

    it("maps gender correctly", () => {
      expect(toFhirPatient({ ...PATIENT, sex: "M" }).gender).toBe("male");
      expect(toFhirPatient({ ...PATIENT, sex: "F" }).gender).toBe("female");
      expect(toFhirPatient({ ...PATIENT, sex: "X" }).gender).toBe("unknown");
    });

    it("includes DFN as MRN identifier", () => {
      const result = toFhirPatient(PATIENT);
      const mrn = result.identifier?.find((i) => i.type?.coding?.some((c) => c.code === "MR"));
      expect(mrn).toBeDefined();
      expect(mrn?.value).toBe("3");
    });

    it("converts VistA FM date to ISO", () => {
      const result = toFhirPatient(PATIENT);
      // 2451225 → 1700+245=1945, month 12, day 25
      expect(result.birthDate).toBe("1945-12-25");
    });
  });

  /* ---------------------------------------------------------------- */
  /* AllergyIntolerance mapper                                         */
  /* ---------------------------------------------------------------- */
  describe("AllergyIntolerance mapper", () => {
    it("maps VistA AllergyRecord to FHIR AllergyIntolerance", () => {
      const result = toFhirAllergyIntolerance(ALLERGY, "3");
      expect(result.resourceType).toBe("AllergyIntolerance");
      expect(result.patient.reference).toBe("Patient/3");
      expect(result.code?.text).toBe("PENICILLIN");
    });

    it("maps reactions as manifestations", () => {
      const result = toFhirAllergyIntolerance(ALLERGY, "3");
      expect(result.reaction?.length).toBe(1);
      expect(result.reaction?.[0]?.manifestation?.length).toBe(2);
      expect(result.reaction?.[0]?.manifestation?.[0]?.text).toBe("HIVES");
    });

    it("maps drug type to medication category", () => {
      const result = toFhirAllergyIntolerance(ALLERGY, "3");
      expect(result.category).toContain("medication");
    });

    it("maps verified status", () => {
      const result = toFhirAllergyIntolerance(ALLERGY, "3");
      expect(result.verificationStatus?.coding?.[0]?.code).toBe("confirmed");
    });

    it("maps severity to criticality", () => {
      const result = toFhirAllergyIntolerance(ALLERGY, "3");
      expect(result.criticality).toBe("low"); // MODERATE maps to low
    });
  });

  /* ---------------------------------------------------------------- */
  /* Condition mapper                                                   */
  /* ---------------------------------------------------------------- */
  describe("Condition mapper", () => {
    it("maps VistA ProblemRecord to FHIR Condition", () => {
      const result = toFhirCondition(PROBLEM, "3");
      expect(result.resourceType).toBe("Condition");
      expect(result.subject.reference).toBe("Patient/3");
      expect(result.code?.text).toBe("Type 2 Diabetes Mellitus");
    });

    it("includes ICD-10 coding when available", () => {
      const result = toFhirCondition(PROBLEM, "3");
      expect(result.code?.coding?.[0]?.system).toBe("http://hl7.org/fhir/sid/icd-10-cm");
      expect(result.code?.coding?.[0]?.code).toBe("E11.9");
    });

    it("sets problem-list-item category", () => {
      const result = toFhirCondition(PROBLEM, "3");
      expect(result.category?.[0]?.coding?.[0]?.code).toBe("problem-list-item");
    });

    it("maps active clinical status", () => {
      const result = toFhirCondition(PROBLEM, "3");
      expect(result.clinicalStatus?.coding?.[0]?.code).toBe("active");
    });

    it("handles missing ICD code gracefully", () => {
      const noCodingProblem = { ...PROBLEM, icdCode: undefined };
      const result = toFhirCondition(noCodingProblem, "3");
      expect(result.code?.text).toBe("Type 2 Diabetes Mellitus");
      expect(result.code?.coding).toBeUndefined();
    });
  });

  /* ---------------------------------------------------------------- */
  /* Observation (vitals) mapper                                        */
  /* ---------------------------------------------------------------- */
  describe("Observation (vitals) mapper", () => {
    it("maps VistA VitalRecord to FHIR Observation", () => {
      const result = toFhirVitalObservation(VITAL, "3");
      expect(result.resourceType).toBe("Observation");
      expect(result.status).toBe("final");
      expect(result.category?.[0]?.coding?.[0]?.code).toBe("vital-signs");
    });

    it("maps BLOOD PRESSURE to LOINC 85354-9", () => {
      const result = toFhirVitalObservation(VITAL, "3");
      expect(result.code.coding?.[0]?.system).toBe("http://loinc.org");
      expect(result.code.coding?.[0]?.code).toBe("85354-9");
    });

    it("handles non-numeric vital values (e.g., 120/80) as valueString", () => {
      const result = toFhirVitalObservation(VITAL, "3");
      // "120/80" is not a valid number, so it should be valueString
      expect(result.valueString).toBe("120/80");
      expect(result.valueQuantity).toBeUndefined();
    });

    it("handles numeric vital values as valueQuantity", () => {
      const tempVital: VitalRecord = { ...VITAL, type: "TEMPERATURE", value: "98.6", unit: "F" };
      const result = toFhirVitalObservation(tempVital, "3");
      expect(result.valueQuantity?.value).toBe(98.6);
      expect(result.valueQuantity?.unit).toBe("F");
    });

    it("converts FM date with time", () => {
      const result = toFhirVitalObservation(VITAL, "3");
      // 3240601.1430 → 1700+324=2024, 06, 01, 14:30:00
      expect(result.effectiveDateTime).toBe("2024-06-01T14:30:00");
    });
  });

  /* ---------------------------------------------------------------- */
  /* Observation (labs) mapper                                          */
  /* ---------------------------------------------------------------- */
  describe("Observation (labs) mapper", () => {
    it("maps VistA LabResult to FHIR Observation with laboratory category", () => {
      const result = toFhirLabObservation(LAB, "3");
      expect(result.resourceType).toBe("Observation");
      expect(result.category?.[0]?.coding?.[0]?.code).toBe("laboratory");
    });

    it("maps numeric lab result to valueQuantity", () => {
      const result = toFhirLabObservation(LAB, "3");
      expect(result.valueQuantity?.value).toBe(105);
      expect(result.valueQuantity?.unit).toBe("mg/dL");
    });

    it("includes reference range", () => {
      const result = toFhirLabObservation(LAB, "3");
      expect(result.referenceRange?.[0]?.text).toBe("70-110");
    });

    it("maps abnormal flag to interpretation", () => {
      const highLab: LabResult = { ...LAB, abnormalFlag: "H" };
      const result = toFhirLabObservation(highLab, "3");
      expect(result.interpretation?.[0]?.coding?.[0]?.code).toBe("H");
    });
  });

  /* ---------------------------------------------------------------- */
  /* MedicationRequest mapper                                           */
  /* ---------------------------------------------------------------- */
  describe("MedicationRequest mapper", () => {
    it("maps VistA MedicationRecord to FHIR MedicationRequest", () => {
      const result = toFhirMedicationRequest(MED, "3");
      expect(result.resourceType).toBe("MedicationRequest");
      expect(result.status).toBe("active");
      expect(result.intent).toBe("order");
      expect(result.subject.reference).toBe("Patient/3");
    });

    it("maps medication name to medicationCodeableConcept", () => {
      const result = toFhirMedicationRequest(MED, "3");
      expect(result.medicationCodeableConcept?.text).toBe("METFORMIN 500MG TAB");
    });

    it("includes dosage instruction", () => {
      const result = toFhirMedicationRequest(MED, "3");
      expect(result.dosageInstruction?.length).toBe(1);
      expect(result.dosageInstruction?.[0]?.text).toContain("500MG");
      expect(result.dosageInstruction?.[0]?.text).toContain("ORAL");
    });

    it("maps status values", () => {
      expect(toFhirMedicationRequest({ ...MED, status: "HOLD" }, "3").status).toBe("on-hold");
      expect(toFhirMedicationRequest({ ...MED, status: "DISCONTINUED" }, "3").status).toBe("stopped");
      expect(toFhirMedicationRequest({ ...MED, status: "EXPIRED" }, "3").status).toBe("completed");
    });
  });

  /* ---------------------------------------------------------------- */
  /* DocumentReference mapper                                           */
  /* ---------------------------------------------------------------- */
  describe("DocumentReference mapper", () => {
    it("maps VistA NoteRecord to FHIR DocumentReference", () => {
      const result = toFhirDocumentReference(NOTE, "3");
      expect(result.resourceType).toBe("DocumentReference");
      expect(result.status).toBe("current");
      expect(result.subject?.reference).toBe("Patient/3");
    });

    it("includes note text as base64 attachment", () => {
      const result = toFhirDocumentReference(NOTE, "3");
      expect(result.content[0].attachment.contentType).toBe("text/plain");
      expect(result.content[0].attachment.data).toBeDefined();
      // Decode and verify
      const decoded = Buffer.from(result.content[0].attachment.data!, "base64").toString("utf-8");
      expect(decoded).toContain("diabetes follow-up");
    });

    it("includes author when available", () => {
      const result = toFhirDocumentReference(NOTE, "3");
      expect(result.author?.[0]?.display).toBe("PROVIDER,CLYDE WV");
    });
  });

  /* ---------------------------------------------------------------- */
  /* Bundle builder                                                     */
  /* ---------------------------------------------------------------- */
  describe("Bundle builder", () => {
    it("creates a searchset Bundle", () => {
      const patients = [toFhirPatient(PATIENT)];
      const bundle = toSearchBundle(patients, 1, "http://localhost:3001", "Patient");
      expect(bundle.resourceType).toBe("Bundle");
      expect(bundle.type).toBe("searchset");
      expect(bundle.total).toBe(1);
      expect(bundle.entry?.length).toBe(1);
    });

    it("sets fullUrl on each entry", () => {
      const patients = [toFhirPatient(PATIENT)];
      const bundle = toSearchBundle(patients, 1, "http://localhost:3001", "Patient");
      expect(bundle.entry?.[0]?.fullUrl).toBe("http://localhost:3001/fhir/Patient/3");
    });

    it("includes self link", () => {
      const bundle = toSearchBundle([], 0, "http://localhost:3001", "Patient");
      expect(bundle.link?.[0]?.relation).toBe("self");
      expect(bundle.link?.[0]?.url).toBe("http://localhost:3001/fhir/Patient");
    });

    it("handles empty result sets", () => {
      const bundle = toSearchBundle([], 0, "http://localhost:3001", "Condition");
      expect(bundle.total).toBe(0);
      expect(bundle.entry?.length).toBe(0);
    });
  });

  /* ---------------------------------------------------------------- */
  /* CapabilityStatement                                                */
  /* ---------------------------------------------------------------- */
  describe("CapabilityStatement", () => {
    it("returns a valid CapabilityStatement resource", () => {
      const cs = buildCapabilityStatement("http://localhost:3001");
      expect(cs.resourceType).toBe("CapabilityStatement");
      expect(cs.fhirVersion).toBe("4.0.1");
      expect(cs.kind).toBe("instance");
      expect(cs.status).toBe("draft");
    });

    it("declares all 7 supported resource types", () => {
      const cs = buildCapabilityStatement("http://localhost:3001");
      const resourceTypes = cs.rest?.[0]?.resource?.map((r) => r.type) || [];
      expect(resourceTypes).toContain("Patient");
      expect(resourceTypes).toContain("AllergyIntolerance");
      expect(resourceTypes).toContain("Condition");
      expect(resourceTypes).toContain("Observation");
      expect(resourceTypes).toContain("MedicationRequest");
      expect(resourceTypes).toContain("DocumentReference");
      expect(resourceTypes).toContain("Encounter");
      expect(resourceTypes.length).toBe(7);
    });

    it("declares read interaction for Patient", () => {
      const cs = buildCapabilityStatement("http://localhost:3001");
      const patient = cs.rest?.[0]?.resource?.find((r) => r.type === "Patient");
      const interactions = patient?.interaction?.map((i) => i.code) || [];
      expect(interactions).toContain("read");
      expect(interactions).toContain("search-type");
    });

    it("declares search-type interaction for all resource types", () => {
      const cs = buildCapabilityStatement("http://localhost:3001");
      const resources = cs.rest?.[0]?.resource || [];
      for (const r of resources) {
        const interactions = r.interaction?.map((i) => i.code) || [];
        expect(interactions).toContain("search-type");
      }
    });

    it("includes software and implementation metadata", () => {
      const cs = buildCapabilityStatement("http://localhost:3001");
      expect(cs.software?.name).toBe("VistA-Evolved");
      expect(cs.implementation?.description).toContain("FHIR R4");
    });

    it("uses application/fhir+json format", () => {
      const cs = buildCapabilityStatement("http://localhost:3001");
      expect(cs.format).toContain("application/fhir+json");
    });
  });

  /* ---------------------------------------------------------------- */
  /* Structural integrity                                               */
  /* ---------------------------------------------------------------- */
  describe("Structural integrity", () => {
    it("all mappers produce valid resourceType", () => {
      expect(toFhirPatient(PATIENT).resourceType).toBe("Patient");
      expect(toFhirAllergyIntolerance(ALLERGY, "3").resourceType).toBe("AllergyIntolerance");
      expect(toFhirCondition(PROBLEM, "3").resourceType).toBe("Condition");
      expect(toFhirVitalObservation(VITAL, "3").resourceType).toBe("Observation");
      expect(toFhirLabObservation(LAB, "3").resourceType).toBe("Observation");
      expect(toFhirMedicationRequest(MED, "3").resourceType).toBe("MedicationRequest");
      expect(toFhirDocumentReference(NOTE, "3").resourceType).toBe("DocumentReference");
    });

    it("all mappers produce US Core profile references", () => {
      const profiles = [
        toFhirPatient(PATIENT).meta?.profile,
        toFhirAllergyIntolerance(ALLERGY, "3").meta?.profile,
        toFhirCondition(PROBLEM, "3").meta?.profile,
        toFhirVitalObservation(VITAL, "3").meta?.profile,
        toFhirLabObservation(LAB, "3").meta?.profile,
        toFhirMedicationRequest(MED, "3").meta?.profile,
        toFhirDocumentReference(NOTE, "3").meta?.profile,
      ];
      for (const p of profiles) {
        expect(p).toBeDefined();
        expect(p!.length).toBeGreaterThanOrEqual(1);
        expect(p![0]).toMatch(/^http:\/\/hl7\.org\/fhir\/us\/core/);
      }
    });

    it("all mappers set meta.source to vista", () => {
      const sources = [
        toFhirPatient(PATIENT).meta?.source,
        toFhirAllergyIntolerance(ALLERGY, "3").meta?.source,
        toFhirCondition(PROBLEM, "3").meta?.source,
        toFhirVitalObservation(VITAL, "3").meta?.source,
        toFhirLabObservation(LAB, "3").meta?.source,
        toFhirMedicationRequest(MED, "3").meta?.source,
        toFhirDocumentReference(NOTE, "3").meta?.source,
      ];
      for (const s of sources) {
        expect(s).toBe("vista");
      }
    });

    it("all patient-scoped resources reference the correct patient", () => {
      const refs = [
        (toFhirAllergyIntolerance(ALLERGY, "3") as any).patient?.reference,
        toFhirCondition(PROBLEM, "3").subject.reference,
        toFhirVitalObservation(VITAL, "3").subject?.reference,
        toFhirLabObservation(LAB, "3").subject?.reference,
        toFhirMedicationRequest(MED, "3").subject.reference,
        toFhirDocumentReference(NOTE, "3").subject?.reference,
      ];
      for (const r of refs) {
        expect(r).toBe("Patient/3");
      }
    });

    it("mapper IDs include resource-type prefix for uniqueness", () => {
      expect(toFhirAllergyIntolerance(ALLERGY, "3").id).toMatch(/^allergy-/);
      expect(toFhirCondition(PROBLEM, "3").id).toMatch(/^condition-/);
      expect(toFhirVitalObservation(VITAL, "3").id).toMatch(/^vital-/);
      expect(toFhirLabObservation(LAB, "3").id).toMatch(/^lab-/);
      expect(toFhirMedicationRequest(MED, "3").id).toMatch(/^med-/);
      expect(toFhirDocumentReference(NOTE, "3").id).toMatch(/^doc-/);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Date normalization edge cases                                      */
  /* ---------------------------------------------------------------- */
  describe("Date normalization", () => {
    it("passes through ISO dates unchanged", () => {
      const rec: VitalRecord = { ...VITAL, dateTime: "2024-06-01T14:30:00Z" };
      const result = toFhirVitalObservation(rec, "3");
      expect(result.effectiveDateTime).toBe("2024-06-01T14:30:00Z");
    });

    it("converts US date format MM/DD/YYYY", () => {
      const rec: AllergyRecord = { ...ALLERGY, enteredDate: "01/15/2023" };
      const result = toFhirAllergyIntolerance(rec, "3");
      expect(result.recordedDate).toBe("2023-01-15");
    });

    it("converts VistA FM date without time", () => {
      const rec: ProblemRecord = { ...PROBLEM, onset: "3200101" };
      const result = toFhirCondition(rec, "3");
      // 3200101 → 1700+320=2020, 01, 01
      expect(result.onsetDateTime).toBe("2020-01-01");
    });

    it("converts VistA FM date with time component", () => {
      const rec: VitalRecord = { ...VITAL, dateTime: "3240601.143000" };
      const result = toFhirVitalObservation(rec, "3");
      expect(result.effectiveDateTime).toBe("2024-06-01T14:30:00");
    });

    it("converts VistA FM date with 2-digit time (hours only) [L3]", () => {
      const rec: VitalRecord = { ...VITAL, dateTime: "3240601.14" };
      const result = toFhirVitalObservation(rec, "3");
      expect(result.effectiveDateTime).toBe("2024-06-01T14:00:00");
    });
  });

  /* ---------------------------------------------------------------- */
  /* Audit hardening: C1 + M5 numeric edge cases                       */
  /* ---------------------------------------------------------------- */
  describe("Audit hardening — numeric parsing", () => {
    it("[C1] lab result with qualifier '>100' → valueString, not valueQuantity", () => {
      const qualifierLab: LabResult = { ...LAB, result: ">100" };
      const result = toFhirLabObservation(qualifierLab, "3");
      expect(result.valueString).toBe(">100");
      expect(result.valueQuantity).toBeUndefined();
    });

    it("[C1] lab result with qualifier '<0.5' → valueString", () => {
      const qualifierLab: LabResult = { ...LAB, result: "<0.5" };
      const result = toFhirLabObservation(qualifierLab, "3");
      expect(result.valueString).toBe("<0.5");
      expect(result.valueQuantity).toBeUndefined();
    });

    it("[C1] lab result 'POSITIVE' → valueString", () => {
      const textLab: LabResult = { ...LAB, result: "POSITIVE" };
      const result = toFhirLabObservation(textLab, "3");
      expect(result.valueString).toBe("POSITIVE");
      expect(result.valueQuantity).toBeUndefined();
    });

    it("[C1] lab result with space '105 ' → valueString (untrimmed check)", () => {
      // Result has trailing space — after trim, "105" is clean numeric
      const spaceLab: LabResult = { ...LAB, result: "105 " };
      const result = toFhirLabObservation(spaceLab, "3");
      // trimmedResult = "105" which is a clean number → valueQuantity
      expect(result.valueQuantity?.value).toBe(105);
    });

    it("[M5] vital with trailing zero '98.60' → valueQuantity", () => {
      const tzVital: VitalRecord = { ...VITAL, type: "TEMPERATURE", value: "98.60", unit: "F" };
      const result = toFhirVitalObservation(tzVital, "3");
      expect(result.valueQuantity?.value).toBe(98.6);
      expect(result.valueQuantity?.unit).toBe("F");
    });

    it("[M5] vital '37.0' → valueQuantity (trailing zero after decimal)", () => {
      const tzVital: VitalRecord = { ...VITAL, type: "TEMPERATURE", value: "37.0", unit: "C" };
      const result = toFhirVitalObservation(tzVital, "3");
      expect(result.valueQuantity?.value).toBe(37);
    });

    it("[C1] lab result '-1.5' (negative) → valueQuantity", () => {
      const negLab: LabResult = { ...LAB, result: "-1.5" };
      const result = toFhirLabObservation(negLab, "3");
      expect(result.valueQuantity?.value).toBe(-1.5);
    });

    it("[C1] lab result '7.4' (clean decimal) → valueQuantity", () => {
      const decLab: LabResult = { ...LAB, result: "7.4" };
      const result = toFhirLabObservation(decLab, "3");
      expect(result.valueQuantity?.value).toBe(7.4);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Encounter mapper (Phase 179)                                      */
  /* ---------------------------------------------------------------- */
  describe("Encounter mapper", () => {
    it("maps VistA EncounterRecord to FHIR Encounter", () => {
      const result = toFhirEncounter(ENCOUNTER) as FhirEncounter;
      expect(result.resourceType).toBe("Encounter");
      expect(result.id).toBe("encounter-701");
      expect(result.status).toBe("finished");
      expect(result.class.code).toBe("AMB");
      expect(result.class.system).toBe("http://terminology.hl7.org/CodeSystem/v3-ActCode");
      expect(result.subject?.reference).toBe("Patient/3");
      expect(result.meta?.profile?.[0]).toContain("us-core-encounter");
    });

    it("maps encounter period from VistA FM datetime", () => {
      const result = toFhirEncounter(ENCOUNTER) as FhirEncounter;
      expect(result.period?.start).toBe("2024-06-01T09:00:00");
      expect(result.period?.end).toBeDefined(); // computed from duration
    });

    it("maps participant from provider", () => {
      const result = toFhirEncounter(ENCOUNTER) as FhirEncounter;
      expect(result.participant?.length).toBe(1);
      expect(result.participant?.[0].individual?.display).toBe("PROVIDER,CLYDE WV");
      expect(result.participant?.[0].individual?.reference).toBe("Practitioner/87");
    });

    it("maps serviceProvider from clinic", () => {
      const result = toFhirEncounter(ENCOUNTER) as FhirEncounter;
      expect(result.serviceProvider?.display).toBe("PRIMARY CARE");
    });

    it("maps location from clinic", () => {
      const result = toFhirEncounter(ENCOUNTER) as FhirEncounter;
      expect(result.location?.length).toBe(1);
      expect(result.location?.[0].location.display).toBe("PRIMARY CARE");
      expect(result.location?.[0].location.reference).toBe("Location/44");
    });

    it("maps type from encounter type", () => {
      const result = toFhirEncounter(ENCOUNTER) as FhirEncounter;
      expect(result.type?.[0].text).toBe("FOLLOW-UP");
    });

    it("maps reasonCode from reason", () => {
      const result = toFhirEncounter(ENCOUNTER) as FhirEncounter;
      expect(result.reasonCode?.[0].text).toBe("Diabetes follow-up");
    });

    it("maps length from duration", () => {
      const result = toFhirEncounter(ENCOUNTER) as FhirEncounter;
      expect(result.length?.value).toBe(30);
      expect(result.length?.unit).toBe("min");
    });

    it("maps various encounter statuses", () => {
      expect((toFhirEncounter({ ...ENCOUNTER, status: "CHECKED OUT" }) as FhirEncounter).status).toBe("finished");
      expect((toFhirEncounter({ ...ENCOUNTER, status: "CHECKED IN" }) as FhirEncounter).status).toBe("in-progress");
      expect((toFhirEncounter({ ...ENCOUNTER, status: "SCHEDULED" }) as FhirEncounter).status).toBe("planned");
      expect((toFhirEncounter({ ...ENCOUNTER, status: "CANCELLED" }) as FhirEncounter).status).toBe("cancelled");
      expect((toFhirEncounter({ ...ENCOUNTER, status: "" }) as FhirEncounter).status).toBe("unknown");
    });

    it("maps encounter class codes", () => {
      expect((toFhirEncounter({ ...ENCOUNTER, class: "IMP" }) as FhirEncounter).class.code).toBe("IMP");
      expect((toFhirEncounter({ ...ENCOUNTER, class: "EMER" }) as FhirEncounter).class.code).toBe("EMER");
      expect((toFhirEncounter({ ...ENCOUNTER, class: "INPATIENT" }) as FhirEncounter).class.code).toBe("IMP");
      expect((toFhirEncounter({ ...ENCOUNTER, class: "EMERGENCY" }) as FhirEncounter).class.code).toBe("EMER");
    });

    it("handles minimal encounter (no optional fields)", () => {
      const minimal: EncounterRecord = {
        id: "800",
        patientDfn: "5",
        dateTime: "3240101",
        status: "finished",
        class: "AMB",
      };
      const result = toFhirEncounter(minimal) as FhirEncounter;
      expect(result.resourceType).toBe("Encounter");
      expect(result.id).toBe("encounter-800");
      expect(result.subject?.reference).toBe("Patient/5");
      expect(result.participant).toBeUndefined();
      expect(result.serviceProvider).toBeUndefined();
      expect(result.location).toBeUndefined();
      expect(result.type).toBeUndefined();
      expect(result.reasonCode).toBeUndefined();
      expect(result.length).toBeUndefined();
    });
  });

  /* ---------------------------------------------------------------- */
  /* CapabilityStatement includes Encounter (Phase 179)                */
  /* ---------------------------------------------------------------- */
  describe("CapabilityStatement — Encounter", () => {
    it("declares Encounter resource type", () => {
      const cs = buildCapabilityStatement("http://localhost:3001");
      const encounter = cs.rest?.[0]?.resource?.find((r) => r.type === "Encounter");
      expect(encounter).toBeDefined();
      expect(encounter?.profile).toContain("us-core-encounter");
      expect(encounter?.interaction?.map((i) => i.code)).toContain("search-type");
      expect(encounter?.searchParam?.map((p) => p.name)).toContain("patient");
    });
  });

  /* ---------------------------------------------------------------- */  /* FHIR Cache / ETag (Phase 179 Q194)                                */
  /* ---------------------------------------------------------------- */
  describe("FHIR Cache — ETag", () => {
    it("fhir-cache module exports getFhirCacheStats", async () => {
      const { getFhirCacheStats } = await import("../src/fhir/fhir-cache.js");
      const stats = getFhirCacheStats();
      expect(stats.enabled).toBe(true);
      expect(stats.ttlMs).toBeGreaterThan(0);
      expect(stats.maxEntries).toBeGreaterThan(0);
      expect(typeof stats.size).toBe("number");
    });

    it("fhir-cache module exports clearFhirCache", async () => {
      const { clearFhirCache, getFhirCacheStats } = await import("../src/fhir/fhir-cache.js");
      clearFhirCache();
      expect(getFhirCacheStats().size).toBe(0);
    });

    it("fhir-cache.ts source uses SHA-256 for ETag computation", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const cachePath = path.resolve(import.meta.dirname, "../src/fhir/fhir-cache.ts");
      const content = fs.readFileSync(cachePath, "utf-8");
      expect(content).toContain("sha256");
      expect(content).toContain('W/"');
      expect(content).toContain("If-None-Match");
      expect(content).toContain("304");
    });

    it("fhir-cache supports cache-control header", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const cachePath = path.resolve(import.meta.dirname, "../src/fhir/fhir-cache.ts");
      const content = fs.readFileSync(cachePath, "utf-8");
      expect(content).toContain("cache-control");
      expect(content).toContain("private");
    });
  });

  /* ---------------------------------------------------------------- */
  /* SMART on FHIR posture (Phase 179 Q195)                            */
  /* ---------------------------------------------------------------- */
  describe("SMART on FHIR posture", () => {
    it("buildSmartConfiguration returns required fields", async () => {
      const { buildSmartConfiguration } = await import("../src/fhir/smart-configuration.js");
      const config = buildSmartConfiguration("http://localhost:3001");
      expect(config.capabilities).toBeDefined();
      expect(config.capabilities.length).toBeGreaterThan(0);
      expect(config.grant_types_supported).toBeDefined();
      expect(config["x-vista-evolved-fhir-base"]).toBe("http://localhost:3001/fhir");
    });

    it("includes patient scope declarations", async () => {
      const { buildSmartConfiguration } = await import("../src/fhir/smart-configuration.js");
      const config = buildSmartConfiguration("http://localhost:3001");
      expect(config.scopes_supported).toContain("patient/*.read");
      expect(config.scopes_supported).toContain("launch");
    });

    it("smart-configuration endpoint is public in AUTH_RULES", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const secPath = path.resolve(import.meta.dirname, "../src/middleware/security.ts");
      const content = fs.readFileSync(secPath, "utf-8");
      expect(content).toContain("smart-configuration");
      expect(content).toContain('"none"');
    });

    it("advertises Encounter scope", async () => {
      const { buildSmartConfiguration } = await import("../src/fhir/smart-configuration.js");
      const config = buildSmartConfiguration("http://localhost:3001");
      expect(config.scopes_supported).toContain("patient/Encounter.read");
    });
  });

  /* ---------------------------------------------------------------- */  /* Audit hardening: CapabilityStatement _count param [L5]            */
  /* ---------------------------------------------------------------- */
  describe("Audit hardening — CapabilityStatement", () => {
    it("[L5] Patient declares _count search parameter", () => {
      const cs = buildCapabilityStatement("http://localhost:3001");
      const patient = cs.rest?.[0]?.resource?.find((r) => r.type === "Patient");
      const paramNames = patient?.searchParam?.map((p) => p.name) || [];
      expect(paramNames).toContain("_count");
    });
  });

  /* ---------------------------------------------------------------- */
  /* Audit hardening: module registration [M6]                         */
  /* ---------------------------------------------------------------- */
  describe("Audit hardening — module governance", () => {
    it("[M6] config/modules.json includes fhir module", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const modulesPath = path.resolve(import.meta.dirname, "../../../config/modules.json");
      const raw = fs.readFileSync(modulesPath, "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.modules.fhir).toBeDefined();
      expect(parsed.modules.fhir.routePatterns).toContain("^/fhir/");
      expect(parsed.modules.fhir.dependencies).toContain("kernel");
      expect(parsed.modules.fhir.dependencies).toContain("clinical");
    });
  });

  /* ---------------------------------------------------------------- */
  /* Audit hardening: AUTH_RULES metadata public [M7]                  */
  /* ---------------------------------------------------------------- */
  describe("Audit hardening — security rules", () => {
    it("[M7] /fhir/metadata auth rule is 'none' (public) in security.ts", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const secPath = path.resolve(import.meta.dirname, "../src/middleware/security.ts");
      const content = fs.readFileSync(secPath, "utf-8");
      // Must have a metadata-specific rule with "none" auth BEFORE the /fhir/ session rule
      const metadataRuleIdx = content.indexOf('/fhir\\/metadata');
      const sessionRuleIdx = content.indexOf('/fhir\\//');
      expect(metadataRuleIdx).toBeGreaterThan(-1);
      expect(metadataRuleIdx).toBeLessThan(sessionRuleIdx);
      // The metadata rule line should contain "none"
      const metadataLine = content.substring(metadataRuleIdx - 50, metadataRuleIdx + 100);
      expect(metadataLine).toContain('"none"');
    });
  });
});
