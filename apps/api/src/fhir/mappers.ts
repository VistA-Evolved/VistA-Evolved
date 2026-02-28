/**
 * FHIR R4 Mappers — Phase 178.
 *
 * Pure functions that transform VistA adapter record types into FHIR R4
 * resources. Each mapper is deterministic and side-effect free.
 *
 * Mapping strategy:
 *   - Use VistA IEN as FHIR resource `id` (prefixed with source system)
 *   - Patient DFN → Patient/{dfn}
 *   - Missing data → omit field (FHIR allows most fields to be absent)
 *   - Coding systems use standard OIDs where possible
 *   - US Core profiles referenced in resource.meta.profile
 *
 * Zero external dependencies.
 */

import type {
  PatientRecord,
  AllergyRecord,
  VitalRecord,
  NoteRecord,
  MedicationRecord,
  ProblemRecord,
  LabResult,
  EncounterRecord,
} from "../adapters/types.js";

import type {
  FhirPatient,
  FhirAllergyIntolerance,
  FhirCondition,
  FhirObservation,
  FhirMedicationRequest,
  FhirDocumentReference,
  FhirEncounter,
  FhirBundle,
  FhirBundleEntry,
  FhirResource,
  FhirCodeableConcept,
} from "./types.js";

/* ================================================================== */
/* Constants                                                            */
/* ================================================================== */

const US_CORE_PATIENT = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient";
const US_CORE_ALLERGY = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance";
const US_CORE_CONDITION = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns";
const US_CORE_VITAL = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-vital-signs";
const US_CORE_LAB = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab";
const US_CORE_MEDREQUEST = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest";
const US_CORE_DOCREF = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-documentreference";
const US_CORE_ENCOUNTER = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-encounter";
const ENCOUNTER_CLASS_SYSTEM = "http://terminology.hl7.org/CodeSystem/v3-ActCode";

const LOINC_SYSTEM = "http://loinc.org";
const SNOMED_SYSTEM = "http://snomed.info/sct";
const ICD10_SYSTEM = "http://hl7.org/fhir/sid/icd-10-cm";
const CONDITION_CATEGORY_SYSTEM = "http://terminology.hl7.org/CodeSystem/condition-category";
const OBSERVATION_CATEGORY_SYSTEM = "http://terminology.hl7.org/CodeSystem/observation-category";
const CLINICAL_STATUS_SYSTEM = "http://terminology.hl7.org/CodeSystem/condition-clinical";
const VERIFICATION_SYSTEM = "http://terminology.hl7.org/CodeSystem/condition-ver-status";
const ALLERGY_CLINICAL_SYSTEM = "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical";
const ALLERGY_VERIFICATION_SYSTEM = "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification";

/** VistA vital type abbreviation → LOINC code map. */
const VITAL_TYPE_LOINC: Record<string, { code: string; display: string }> = {
  "T": { code: "8310-5", display: "Body temperature" },
  "TEMPERATURE": { code: "8310-5", display: "Body temperature" },
  "P": { code: "8867-4", display: "Heart rate" },
  "PULSE": { code: "8867-4", display: "Heart rate" },
  "R": { code: "9279-1", display: "Respiratory rate" },
  "RESPIRATION": { code: "9279-1", display: "Respiratory rate" },
  "BP": { code: "85354-9", display: "Blood pressure panel" },
  "BLOOD PRESSURE": { code: "85354-9", display: "Blood pressure panel" },
  "HT": { code: "8302-2", display: "Body height" },
  "HEIGHT": { code: "8302-2", display: "Body height" },
  "WT": { code: "29463-7", display: "Body weight" },
  "WEIGHT": { code: "29463-7", display: "Body weight" },
  "BMI": { code: "39156-5", display: "Body mass index" },
  "PO2": { code: "2708-6", display: "Oxygen saturation" },
  "PULSE OXIMETRY": { code: "2708-6", display: "Oxygen saturation" },
  "PN": { code: "72514-3", display: "Pain severity" },
  "PAIN": { code: "72514-3", display: "Pain severity" },
  "CVP": { code: "60985-9", display: "Central venous pressure" },
  "CG": { code: "9269-2", display: "Glasgow coma score total" },
  "CIRCUMFERENCE/GIRTH": { code: "56086-2", display: "Circumference/Girth" },
};

/* ================================================================== */
/* Patient                                                              */
/* ================================================================== */

export function toFhirPatient(rec: PatientRecord): FhirPatient {
  const resource: FhirPatient = {
    resourceType: "Patient",
    id: rec.dfn,
    meta: { profile: [US_CORE_PATIENT], source: "vista" },
    name: [parseName(rec.name)],
  };

  if (rec.dob) resource.birthDate = normalizeDate(rec.dob);
  if (rec.sex) resource.gender = mapGender(rec.sex);

  const identifiers: FhirPatient["identifier"] = [];
  // DFN as MRN
  identifiers.push({
    type: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/v2-0203", code: "MR", display: "Medical Record Number" }] },
    system: "urn:oid:2.16.840.1.113883.6.233",
    value: rec.dfn,
  });
  if (identifiers.length) resource.identifier = identifiers;

  return resource;
}

/* ================================================================== */
/* AllergyIntolerance                                                   */
/* ================================================================== */

export function toFhirAllergyIntolerance(rec: AllergyRecord, patientDfn: string): FhirAllergyIntolerance {
  const resource: FhirAllergyIntolerance = {
    resourceType: "AllergyIntolerance",
    id: `allergy-${rec.id}`,
    meta: { profile: [US_CORE_ALLERGY], source: "vista" },
    patient: { reference: `Patient/${patientDfn}` },
    code: { text: rec.allergen },
  };

  // Clinical status
  if (rec.verified !== undefined) {
    resource.clinicalStatus = {
      coding: [{ system: ALLERGY_CLINICAL_SYSTEM, code: "active", display: "Active" }],
    };
    resource.verificationStatus = {
      coding: [{
        system: ALLERGY_VERIFICATION_SYSTEM,
        code: rec.verified ? "confirmed" : "unconfirmed",
        display: rec.verified ? "Confirmed" : "Unconfirmed",
      }],
    };
  }

  // Category
  if (rec.type) {
    const cat = mapAllergyCategory(rec.type);
    if (cat) resource.category = [cat];
  }

  // Severity → criticality
  if (rec.severity) {
    resource.criticality = mapCriticality(rec.severity);
  }

  // Reactions
  if (rec.reactions?.length) {
    resource.reaction = [{
      manifestation: rec.reactions.map((r) => ({
        coding: [{ system: SNOMED_SYSTEM, display: r }],
        text: r,
      })),
    }];
  }

  if (rec.enteredDate) resource.recordedDate = normalizeDate(rec.enteredDate);

  return resource;
}

/* ================================================================== */
/* Condition (Problem List)                                             */
/* ================================================================== */

export function toFhirCondition(rec: ProblemRecord, patientDfn: string): FhirCondition {
  const resource: FhirCondition = {
    resourceType: "Condition",
    id: `condition-${rec.id}`,
    meta: { profile: [US_CORE_CONDITION], source: "vista" },
    subject: { reference: `Patient/${patientDfn}` },
    category: [{
      coding: [{ system: CONDITION_CATEGORY_SYSTEM, code: "problem-list-item", display: "Problem List Item" }],
    }],
  };

  // Code — use ICD-10 if available, otherwise text-only
  const code: FhirCodeableConcept = { text: rec.description };
  if (rec.icdCode) {
    code.coding = [{ system: ICD10_SYSTEM, code: rec.icdCode, display: rec.description }];
  }
  resource.code = code;

  // Clinical status
  const status = rec.status?.toUpperCase();
  if (status === "ACTIVE" || status === "A") {
    resource.clinicalStatus = {
      coding: [{ system: CLINICAL_STATUS_SYSTEM, code: "active", display: "Active" }],
    };
  } else if (status === "INACTIVE" || status === "I") {
    resource.clinicalStatus = {
      coding: [{ system: CLINICAL_STATUS_SYSTEM, code: "inactive", display: "Inactive" }],
    };
  } else if (status === "RESOLVED" || status === "R") {
    resource.clinicalStatus = {
      coding: [{ system: CLINICAL_STATUS_SYSTEM, code: "resolved", display: "Resolved" }],
    };
  }

  if (rec.onset) resource.onsetDateTime = normalizeDate(rec.onset);
  if (rec.provider) resource.recorder = { display: rec.provider };

  return resource;
}

/* ================================================================== */
/* Observation (Vital Signs)                                            */
/* ================================================================== */

export function toFhirVitalObservation(rec: VitalRecord, patientDfn: string): FhirObservation {
  const typeKey = rec.type?.toUpperCase()?.trim() || "";
  const loincEntry = VITAL_TYPE_LOINC[typeKey];

  const resource: FhirObservation = {
    resourceType: "Observation",
    id: `vital-${rec.id}`,
    meta: { profile: [US_CORE_VITAL], source: "vista" },
    status: "final",
    category: [{
      coding: [{ system: OBSERVATION_CATEGORY_SYSTEM, code: "vital-signs", display: "Vital Signs" }],
    }],
    code: loincEntry
      ? { coding: [{ system: LOINC_SYSTEM, code: loincEntry.code, display: loincEntry.display }], text: rec.type }
      : { text: rec.type },
    subject: { reference: `Patient/${patientDfn}` },
  };

  if (rec.dateTime) resource.effectiveDateTime = normalizeDate(rec.dateTime);

  // Attempt numeric parse for valueQuantity — must be a clean number
  const trimmedValue = rec.value.trim();
  const numVal = parseFloat(trimmedValue);
  if (!isNaN(numVal) && /^-?\d+(\.\d+)?$/.test(trimmedValue)) {
    resource.valueQuantity = { value: numVal };
    if (rec.unit) {
      resource.valueQuantity.unit = rec.unit;
      resource.valueQuantity.system = "http://unitsofmeasure.org";
      resource.valueQuantity.code = rec.unit;
    }
  } else {
    resource.valueString = rec.value;
  }

  return resource;
}

/* ================================================================== */
/* Observation (Lab Results)                                            */
/* ================================================================== */

export function toFhirLabObservation(rec: LabResult, patientDfn: string): FhirObservation {
  const resource: FhirObservation = {
    resourceType: "Observation",
    id: `lab-${rec.id}`,
    meta: { profile: [US_CORE_LAB], source: "vista" },
    status: mapLabStatus(rec.status),
    category: [{
      coding: [{ system: OBSERVATION_CATEGORY_SYSTEM, code: "laboratory", display: "Laboratory" }],
    }],
    code: { text: rec.testName },
    subject: { reference: `Patient/${patientDfn}` },
  };

  if (rec.dateTime) resource.effectiveDateTime = normalizeDate(rec.dateTime);

  // Attempt numeric parse — strict: must be a clean number, not ">100" etc.
  const trimmedResult = rec.result.trim();
  const numVal = parseFloat(trimmedResult);
  if (!isNaN(numVal) && /^-?\d+(\.\d+)?$/.test(trimmedResult)) {
    resource.valueQuantity = { value: numVal };
    if (rec.units) {
      resource.valueQuantity.unit = rec.units;
      resource.valueQuantity.system = "http://unitsofmeasure.org";
      resource.valueQuantity.code = rec.units;
    }
  } else {
    resource.valueString = rec.result;
  }

  // Reference range
  if (rec.refRange) {
    resource.referenceRange = [{ text: rec.refRange }];
  }

  // Interpretation (abnormal flag)
  if (rec.abnormalFlag) {
    resource.interpretation = [{
      coding: [{
        system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
        code: mapAbnormalFlag(rec.abnormalFlag),
        display: rec.abnormalFlag,
      }],
    }];
  }

  return resource;
}

/* ================================================================== */
/* MedicationRequest                                                    */
/* ================================================================== */

export function toFhirMedicationRequest(rec: MedicationRecord, patientDfn: string): FhirMedicationRequest {
  const resource: FhirMedicationRequest = {
    resourceType: "MedicationRequest",
    id: `med-${rec.id}`,
    meta: { profile: [US_CORE_MEDREQUEST], source: "vista" },
    status: mapMedStatus(rec.status),
    intent: "order",
    subject: { reference: `Patient/${patientDfn}` },
    medicationCodeableConcept: { text: rec.name },
  };

  if (rec.prescriber) resource.requester = { display: rec.prescriber };

  // Dosage instruction
  if (rec.dose || rec.route || rec.schedule) {
    const dosage: NonNullable<FhirMedicationRequest["dosageInstruction"]>[0] = {};
    const parts: string[] = [];
    if (rec.dose) parts.push(rec.dose);
    if (rec.route) parts.push(rec.route);
    if (rec.schedule) parts.push(rec.schedule);
    dosage.text = parts.join(" ");
    if (rec.route) dosage.route = { text: rec.route };
    resource.dosageInstruction = [dosage];
  }

  return resource;
}

/* ================================================================== */
/* DocumentReference (Clinical Notes)                                   */
/* ================================================================== */

export function toFhirDocumentReference(rec: NoteRecord, patientDfn: string): FhirDocumentReference {
  const resource: FhirDocumentReference = {
    resourceType: "DocumentReference",
    id: `doc-${rec.id}`,
    meta: { profile: [US_CORE_DOCREF], source: "vista" },
    status: "current",
    subject: { reference: `Patient/${patientDfn}` },
    type: { text: rec.title },
    content: [{
      attachment: {
        contentType: "text/plain",
        title: rec.title,
      },
    }],
  };

  if (rec.dateTime) resource.date = normalizeDate(rec.dateTime);
  if (rec.author) resource.author = [{ display: rec.author }];

  // Include text content as base64 if available
  if (rec.text) {
    resource.content[0].attachment.data = Buffer.from(rec.text, "utf-8").toString("base64");
  }

  return resource;
}

/* ================================================================== */
/* Encounter (Phase 179)                                                */
/* ================================================================== */

export function toFhirEncounter(rec: EncounterRecord): FhirEncounter {
  const resource: FhirEncounter = {
    resourceType: "Encounter",
    id: `encounter-${rec.id}`,
    meta: { profile: [US_CORE_ENCOUNTER], source: "vista" },
    status: mapEncounterStatus(rec.status),
    class: {
      system: ENCOUNTER_CLASS_SYSTEM,
      code: mapEncounterClass(rec.class),
      display: mapEncounterClassDisplay(rec.class),
    },
    subject: { reference: `Patient/${rec.patientDfn}` },
  };

  // Type
  if (rec.type) {
    resource.type = [{ text: rec.type }];
  }

  // Period
  if (rec.dateTime) {
    const start = normalizeDate(rec.dateTime);
    resource.period = { start };
    if (rec.duration) {
      // Estimate end time from duration
      try {
        const startDate = new Date(start);
        if (!isNaN(startDate.getTime())) {
          startDate.setMinutes(startDate.getMinutes() + rec.duration);
          resource.period.end = startDate.toISOString();
        }
      } catch { /* ignore date parse errors */ }
    }
  }

  // Length
  if (rec.duration) {
    resource.length = {
      value: rec.duration,
      unit: "min",
      system: "http://unitsofmeasure.org",
      code: "min",
    };
  }

  // Participant (provider)
  if (rec.provider) {
    resource.participant = [{
      type: [{
        coding: [{
          system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
          code: "ATND",
          display: "attender",
        }],
      }],
      individual: {
        reference: rec.providerDuz ? `Practitioner/${rec.providerDuz}` : undefined,
        display: rec.provider,
      },
    }];
  }

  // ServiceProvider (clinic/location)
  if (rec.clinic) {
    resource.serviceProvider = { display: rec.clinic };
    resource.location = [{
      location: {
        reference: rec.clinicIen ? `Location/${rec.clinicIen}` : undefined,
        display: rec.clinic,
      },
    }];
  }

  // Reason
  if (rec.reason) {
    resource.reasonCode = [{ text: rec.reason }];
  }

  return resource;
}

/* ================================================================== */
/* Bundle builder                                                       */
/* ================================================================== */

export function toSearchBundle(
  resources: FhirResource[],
  total: number,
  baseUrl: string,
  resourceType?: string,
): FhirBundle {
  const selfUrl = resourceType ? `${baseUrl}/fhir/${resourceType}` : `${baseUrl}/fhir`;
  const entries: FhirBundleEntry[] = resources.map((r) => ({
    fullUrl: `${baseUrl}/fhir/${r.resourceType}/${r.id}`,
    resource: r,
    search: { mode: "match" as const },
  }));

  return {
    resourceType: "Bundle",
    type: "searchset",
    total,
    link: [{ relation: "self", url: selfUrl }],
    entry: entries,
  };
}

/* ================================================================== */
/* Helpers (private)                                                    */
/* ================================================================== */

function parseName(fullName: string): NonNullable<FhirPatient["name"]>[0] {
  // VistA names are typically "LAST,FIRST MI" or "LAST,FIRST"
  const parts = fullName.split(",");
  const family = parts[0]?.trim() || "";
  const givenStr = parts.slice(1).join(",").trim();
  const given = givenStr ? givenStr.split(/\s+/) : [];
  return { use: "official", family, given, text: fullName };
}

function normalizeDate(raw: string): string {
  // Already ISO? Pass through.
  if (/^\d{4}-\d{2}/.test(raw)) return raw;
  // VistA FM date: YYYMMDD.HHMMSS → YYYY-MM-DDTHH:MM:SS
  if (/^\d{7}/.test(raw)) {
    const y = 1700 + parseInt(raw.substring(0, 3), 10);
    const m = raw.substring(3, 5);
    const d = raw.substring(5, 7);
    const timePart = raw.includes(".") ? raw.split(".")[1] || "" : "";
    if (timePart.length >= 4) {
      const hh = timePart.substring(0, 2);
      const mm = timePart.substring(2, 4);
      const ss = timePart.length >= 6 ? timePart.substring(4, 6) : "00";
      return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
    }
    if (timePart.length >= 2) {
      // L3: handle 2-digit FM time (hours only, e.g. "3240601.14")
      const hh = timePart.substring(0, 2);
      return `${y}-${m}-${d}T${hh}:00:00`;
    }
    return `${y}-${m}-${d}`;
  }
  // MM/DD/YYYY → YYYY-MM-DD
  const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usMatch) {
    return `${usMatch[3]}-${usMatch[1].padStart(2, "0")}-${usMatch[2].padStart(2, "0")}`;
  }
  return raw; // pass through unknown formats
}

function mapGender(sex: string): FhirPatient["gender"] {
  const s = sex?.toUpperCase()?.charAt(0);
  if (s === "M") return "male";
  if (s === "F") return "female";
  return "unknown";
}

function mapAllergyCategory(type: string): "food" | "medication" | "environment" | "biologic" | null {
  const t = type?.toUpperCase() || "";
  if (t.includes("DRUG") || t.includes("MED") || t.includes("PHARM")) return "medication";
  if (t.includes("FOOD")) return "food";
  if (t.includes("ENV") || t.includes("OTHER")) return "environment";
  return null;
}

function mapCriticality(severity: string): "low" | "high" | "unable-to-assess" {
  const s = severity?.toUpperCase() || "";
  if (s.includes("SEVERE") || s.includes("HIGH")) return "high";
  if (s.includes("MILD") || s.includes("LOW") || s.includes("MODERATE")) return "low";
  return "unable-to-assess";
}

function mapLabStatus(status?: string): FhirObservation["status"] {
  const s = status?.toUpperCase() || "";
  if (s.includes("FINAL") || s.includes("COMPLETE")) return "final";
  if (s.includes("PRELIM")) return "preliminary";
  if (s.includes("CORRECTED") || s.includes("AMENDED")) return "corrected";
  if (s.includes("CANCEL")) return "cancelled";
  return "final";
}

function mapMedStatus(status?: string): FhirMedicationRequest["status"] {
  const s = status?.toUpperCase() || "";
  if (s.includes("ACTIVE") || s === "") return "active";
  if (s.includes("HOLD")) return "on-hold";
  if (s.includes("COMPLETE") || s.includes("EXPIRED")) return "completed";
  if (s.includes("DISCONTIN") || s.includes("STOP")) return "stopped";
  if (s.includes("CANCEL")) return "cancelled";
  return "active";
}

function mapAbnormalFlag(flag: string): string {
  const f = flag?.toUpperCase() || "";
  if (f === "H" || f === "HH" || f.includes("HIGH")) return "H";
  if (f === "L" || f === "LL" || f.includes("LOW")) return "L";
  if (f === "A" || f.includes("ABNORMAL")) return "A";
  if (f === "N" || f.includes("NORMAL")) return "N";
  if (f.includes("CRITICAL")) return "AA";
  return f || "N";
}

function mapEncounterStatus(status: string): FhirEncounter["status"] {
  const s = status?.toUpperCase() || "";
  if (s.includes("FINISH") || s.includes("COMPLETE") || s.includes("CHECKED OUT")) return "finished";
  if (s.includes("CANCEL")) return "cancelled";
  if (s.includes("PROGRESS") || s.includes("CHECKED IN")) return "in-progress";
  if (s.includes("PLAN") || s.includes("SCHEDULE") || s.includes("FUTURE")) return "planned";
  if (s.includes("ARRIVE")) return "arrived";
  if (s.includes("TRIAGE")) return "triaged";
  return "unknown";
}

function mapEncounterClass(cls: string): string {
  const c = cls?.toUpperCase() || "";
  if (c === "AMB" || c.includes("AMBULAT") || c.includes("OUTPAT")) return "AMB";
  if (c === "IMP" || c.includes("INPAT")) return "IMP";
  if (c === "EMER" || c.includes("EMERG")) return "EMER";
  if (c === "HH" || c.includes("HOME")) return "HH";
  if (c === "VR" || c.includes("VIRTUAL") || c.includes("TELE")) return "VR";
  return "AMB";
}

function mapEncounterClassDisplay(cls: string): string {
  const code = mapEncounterClass(cls);
  switch (code) {
    case "AMB": return "ambulatory";
    case "IMP": return "inpatient encounter";
    case "EMER": return "emergency";
    case "HH": return "home health";
    case "VR": return "virtual";
    default: return "ambulatory";
  }
}
