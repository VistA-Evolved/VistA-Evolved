/**
 * FHIR R4 Core Type Definitions — Phase 178.
 *
 * Minimal subset of FHIR R4 resource types needed for the US Core
 * Implementation Guide read-only gateway. Only structural types used
 * by our mappers are defined here — this is NOT a full FHIR library.
 *
 * References:
 *   - https://hl7.org/fhir/R4/
 *   - https://www.hl7.org/fhir/us/core/STU6.1/
 *
 * Zero external dependencies — all types are pure TypeScript interfaces.
 */

/* ================================================================== */
/* Primitives & Building blocks                                        */
/* ================================================================== */

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirReference {
  reference?: string;
  display?: string;
}

export interface FhirIdentifier {
  system?: string;
  value?: string;
  type?: FhirCodeableConcept;
}

export interface FhirHumanName {
  use?: "usual" | "official" | "temp" | "nickname" | "anonymous" | "old" | "maiden";
  family?: string;
  given?: string[];
  text?: string;
}

export interface FhirPeriod {
  start?: string;
  end?: string;
}

export interface FhirQuantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface FhirNarrative {
  status: "generated" | "extensions" | "additional" | "empty";
  div: string;
}

export interface FhirAnnotation {
  text: string;
  time?: string;
  authorString?: string;
}

export interface FhirMeta {
  lastUpdated?: string;
  profile?: string[];
  source?: string;
}

/* ================================================================== */
/* Base Resource                                                        */
/* ================================================================== */

export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: FhirMeta;
  text?: FhirNarrative;
}

/* ================================================================== */
/* Patient                                                              */
/* ================================================================== */

export interface FhirPatient extends FhirResource {
  resourceType: "Patient";
  identifier?: FhirIdentifier[];
  name?: FhirHumanName[];
  gender?: "male" | "female" | "other" | "unknown";
  birthDate?: string;
}

/* ================================================================== */
/* AllergyIntolerance                                                   */
/* ================================================================== */

export interface FhirAllergyIntolerance extends FhirResource {
  resourceType: "AllergyIntolerance";
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  type?: "allergy" | "intolerance";
  category?: Array<"food" | "medication" | "environment" | "biologic">;
  criticality?: "low" | "high" | "unable-to-assess";
  code?: FhirCodeableConcept;
  patient: FhirReference;
  recordedDate?: string;
  reaction?: Array<{
    substance?: FhirCodeableConcept;
    manifestation: FhirCodeableConcept[];
    severity?: "mild" | "moderate" | "severe";
  }>;
}

/* ================================================================== */
/* Condition                                                            */
/* ================================================================== */

export interface FhirCondition extends FhirResource {
  resourceType: "Condition";
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  code?: FhirCodeableConcept;
  subject: FhirReference;
  onsetDateTime?: string;
  recorder?: FhirReference;
}

/* ================================================================== */
/* Observation                                                          */
/* ================================================================== */

export interface FhirObservation extends FhirResource {
  resourceType: "Observation";
  status: "registered" | "preliminary" | "final" | "amended" | "corrected" | "cancelled" | "entered-in-error" | "unknown";
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject?: FhirReference;
  effectiveDateTime?: string;
  valueQuantity?: FhirQuantity;
  valueString?: string;
  interpretation?: FhirCodeableConcept[];
  referenceRange?: Array<{
    low?: FhirQuantity;
    high?: FhirQuantity;
    text?: string;
  }>;
}

/* ================================================================== */
/* MedicationRequest                                                    */
/* ================================================================== */

export interface FhirMedicationRequest extends FhirResource {
  resourceType: "MedicationRequest";
  status: "active" | "on-hold" | "cancelled" | "completed" | "entered-in-error" | "stopped" | "draft" | "unknown";
  intent: "proposal" | "plan" | "order" | "original-order" | "reflex-order" | "filler-order" | "instance-order" | "option";
  medicationCodeableConcept?: FhirCodeableConcept;
  subject: FhirReference;
  requester?: FhirReference;
  dosageInstruction?: Array<{
    text?: string;
    route?: FhirCodeableConcept;
    doseAndRate?: Array<{
      doseQuantity?: FhirQuantity;
    }>;
  }>;
}

/* ================================================================== */
/* DocumentReference                                                    */
/* ================================================================== */

export interface FhirDocumentReference extends FhirResource {
  resourceType: "DocumentReference";
  status: "current" | "superseded" | "entered-in-error";
  type?: FhirCodeableConcept;
  subject?: FhirReference;
  date?: string;
  author?: FhirReference[];
  content: Array<{
    attachment: {
      contentType?: string;
      data?: string;
      title?: string;
    };
  }>;
}

/* ================================================================== */
/* Encounter (Phase 179)                                                */
/* ================================================================== */

export interface FhirEncounter extends FhirResource {
  resourceType: "Encounter";
  status: "planned" | "arrived" | "triaged" | "in-progress" | "onleave" | "finished" | "cancelled" | "entered-in-error" | "unknown";
  class: FhirCoding;
  type?: FhirCodeableConcept[];
  subject?: FhirReference;
  participant?: Array<{
    type?: FhirCodeableConcept[];
    individual?: FhirReference;
    period?: FhirPeriod;
  }>;
  period?: FhirPeriod;
  reasonCode?: FhirCodeableConcept[];
  serviceProvider?: FhirReference;
  location?: Array<{
    location: FhirReference;
    status?: "planned" | "active" | "reserved" | "completed";
  }>;
  length?: {
    value: number;
    unit: string;
    system: string;
    code: string;
  };
}

/* ================================================================== */
/* Bundle                                                               */
/* ================================================================== */

export interface FhirBundleEntry {
  fullUrl?: string;
  resource?: FhirResource;
  search?: {
    mode?: "match" | "include" | "outcome";
  };
}

export interface FhirBundle extends FhirResource {
  resourceType: "Bundle";
  type: "searchset" | "batch" | "transaction" | "batch-response" | "transaction-response" | "history" | "document" | "message" | "collection";
  total?: number;
  link?: Array<{
    relation: string;
    url: string;
  }>;
  entry?: FhirBundleEntry[];
}

/* ================================================================== */
/* CapabilityStatement                                                  */
/* ================================================================== */

export interface FhirCapabilityStatement extends FhirResource {
  resourceType: "CapabilityStatement";
  status: "draft" | "active" | "retired" | "unknown";
  date: string;
  kind: "instance" | "capability" | "requirements";
  fhirVersion: string;
  format: string[];
  rest?: Array<{
    mode: "server" | "client";
    security?: {
      cors?: boolean;
      service?: FhirCodeableConcept[];
      description?: string;
      extension?: Array<{
        url: string;
        extension?: Array<{
          url: string;
          valueUri?: string;
        }>;
      }>;
    };
    resource?: Array<{
      type: string;
      profile?: string;
      interaction?: Array<{
        code: "read" | "vread" | "update" | "patch" | "delete" | "history-instance" | "history-type" | "create" | "search-type";
      }>;
      searchParam?: Array<{
        name: string;
        type: "number" | "date" | "string" | "token" | "reference" | "composite" | "quantity" | "uri" | "special";
        documentation?: string;
      }>;
    }>;
  }>;
  name?: string;
  title?: string;
  software?: {
    name: string;
    version?: string;
  };
  implementation?: {
    description: string;
    url?: string;
  };
}

/* ================================================================== */
/* OperationOutcome                                                     */
/* ================================================================== */

export interface FhirOperationOutcome extends FhirResource {
  resourceType: "OperationOutcome";
  issue: Array<{
    severity: "fatal" | "error" | "warning" | "information";
    code: string;
    diagnostics?: string;
    details?: FhirCodeableConcept;
  }>;
}
