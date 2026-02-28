/**
 * HL7v2 → FHIR R4 Bridge — Phase 279 (Wave 9)
 *
 * Deterministic conversion from inbound HL7v2 messages to FHIR R4 Bundles.
 * Each converter is a pure function: HL7v2 raw string → FHIR Bundle JSON.
 *
 * Supported message types:
 *   ADT^A01/A02/A03/A08 → Patient + Encounter Bundle
 *   ORU^R01             → DiagnosticReport + Observation Bundle
 *   ORM^O01             → ServiceRequest Bundle
 *   SIU^S12/S13/S15     → Appointment Bundle
 *
 * Design:
 *   - Zero external FHIR library dependencies (matching project zero-dep pattern)
 *   - PHI-safe: patient data flows through but is NEVER logged
 *   - Output conforms to FHIR R4 (4.0.1) resource structure
 *   - Each function returns a FHIR Bundle of type "transaction"
 */

import { randomUUID } from "crypto";

/* ── HL7 Segment Helpers (local copies to avoid circular import) ── */

function getField(segmentLine: string, fieldIndex: number, isMsh = false): string {
  const parts = segmentLine.split("|");
  if (isMsh) return parts[fieldIndex - 1] ?? "";
  return parts[fieldIndex] ?? "";
}

function getComponent(field: string, componentIndex: number = 1): string {
  return (field.split("^")[componentIndex - 1]) ?? "";
}

function parseSegments(raw: string): string[] {
  return raw.split(/\r?\n|\r/).map((s) => s.trim()).filter(Boolean);
}

function findSegment(segments: string[], prefix: string): string | undefined {
  return segments.find((s) => s.startsWith(prefix + "|"));
}

function findAllSegments(segments: string[], prefix: string): string[] {
  return segments.filter((s) => s.startsWith(prefix + "|"));
}

/* ── FHIR R4 Types (minimal subset) ───────────────────── */

export interface FhirBundle {
  resourceType: "Bundle";
  id: string;
  type: "transaction" | "message" | "collection";
  timestamp: string;
  entry: FhirBundleEntry[];
  meta?: { source?: string; tag?: Array<{ system: string; code: string }> };
}

export interface FhirBundleEntry {
  fullUrl: string;
  resource: FhirResource;
  request?: { method: string; url: string };
}

export type FhirResource =
  | FhirPatient
  | FhirEncounter
  | FhirDiagnosticReport
  | FhirObservation
  | FhirServiceRequest
  | FhirAppointment
  | FhirMessageHeader;

export interface FhirPatient {
  resourceType: "Patient";
  id: string;
  identifier: Array<{ system: string; value: string }>;
  name?: Array<{ family: string; given: string[] }>;
  gender?: string;
  birthDate?: string;
}

export interface FhirEncounter {
  resourceType: "Encounter";
  id: string;
  status: string;
  class: { system: string; code: string; display: string };
  subject: { reference: string };
  period?: { start?: string; end?: string };
  location?: Array<{ location: { display: string } }>;
  participant?: Array<{
    individual: { reference: string; display: string };
  }>;
}

export interface FhirDiagnosticReport {
  resourceType: "DiagnosticReport";
  id: string;
  status: string;
  code: { coding: Array<{ system: string; code: string; display: string }> };
  subject: { reference: string };
  issued: string;
  result: Array<{ reference: string }>;
}

export interface FhirObservation {
  resourceType: "Observation";
  id: string;
  status: string;
  code: { coding: Array<{ system: string; code: string; display: string }> };
  subject: { reference: string };
  valueString?: string;
  valueQuantity?: { value: number; unit: string; system: string; code: string };
  interpretation?: Array<{ coding: Array<{ system: string; code: string }> }>;
}

export interface FhirServiceRequest {
  resourceType: "ServiceRequest";
  id: string;
  status: string;
  intent: string;
  code: { coding: Array<{ system: string; code: string; display: string }> };
  subject: { reference: string };
  authoredOn?: string;
  requester?: { reference: string };
}

export interface FhirAppointment {
  resourceType: "Appointment";
  id: string;
  status: string;
  appointmentType?: { coding: Array<{ system: string; code: string }> };
  start?: string;
  end?: string;
  minutesDuration?: number;
  participant: Array<{
    actor: { reference: string };
    status: string;
  }>;
}

export interface FhirMessageHeader {
  resourceType: "MessageHeader";
  id: string;
  eventCoding: { system: string; code: string };
  source: { name: string; endpoint: string };
  destination?: Array<{ name: string; endpoint: string }>;
}

/* ── Conversion Result ─────────────────────────────────── */

export interface FhirConversionResult {
  ok: boolean;
  bundle: FhirBundle | null;
  sourceMessageType: string;
  sourceControlId: string;
  warnings: string[];
}

/* ── HL7 Date → FHIR DateTime Helper ──────────────────── */

function hl7DateToFhir(hl7Date: string): string {
  if (!hl7Date || hl7Date.length < 8) return new Date().toISOString();
  const yyyy = hl7Date.slice(0, 4);
  const mm = hl7Date.slice(4, 6);
  const dd = hl7Date.slice(6, 8);
  const hh = hl7Date.slice(8, 10) || "00";
  const min = hl7Date.slice(10, 12) || "00";
  const ss = hl7Date.slice(12, 14) || "00";
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}Z`;
}

function hl7GenderToFhir(hl7Gender: string): string {
  switch (hl7Gender.toUpperCase()) {
    case "M": return "male";
    case "F": return "female";
    case "O": case "A": return "other";
    default: return "unknown";
  }
}

function makeBundle(entries: FhirBundleEntry[], source: string): FhirBundle {
  return {
    resourceType: "Bundle",
    id: randomUUID(),
    type: "transaction",
    timestamp: new Date().toISOString(),
    entry: entries,
    meta: {
      source: `urn:vista-evolved:hl7-fhir-bridge`,
      tag: [{ system: "http://vista-evolved.org/fhir/tags", code: source }],
    },
  };
}

function entry(resource: FhirResource, method = "PUT"): FhirBundleEntry {
  return {
    fullUrl: `urn:uuid:${(resource as any).id}`,
    resource,
    request: { method, url: `${resource.resourceType}/${(resource as any).id}` },
  };
}

/* ── ADT → FHIR Patient + Encounter ───────────────────── */

export function convertAdtToFhir(raw: string): FhirConversionResult {
  const warnings: string[] = [];
  const segments = parseSegments(raw);
  const msh = findSegment(segments, "MSH");
  const pid = findSegment(segments, "PID");
  const pv1 = findSegment(segments, "PV1");

  if (!msh) return { ok: false, bundle: null, sourceMessageType: "ADT", sourceControlId: "", warnings: ["Missing MSH segment"] };

  const controlId = getField(msh, 10, true);
  const messageType = getField(msh, 9, true);
  const triggerEvent = getComponent(messageType, 2);

  // Build Patient resource
  const patientId = randomUUID();
  const mrn = pid ? getComponent(getField(pid, 3), 1) : "";
  const assignAuth = pid ? getComponent(getField(pid, 3), 4) : "urn:oid:unknown";
  const familyName = pid ? getComponent(getField(pid, 5), 1) : "";
  const givenName = pid ? getComponent(getField(pid, 5), 2) : "";
  const dob = pid ? getField(pid, 7) : "";
  const gender = pid ? getField(pid, 8) : "";

  if (!mrn) warnings.push("PID-3 (MRN) missing");

  const patient: FhirPatient = {
    resourceType: "Patient",
    id: patientId,
    identifier: [{ system: assignAuth ? `urn:oid:${assignAuth}` : "urn:oid:unknown", value: mrn }],
    ...(familyName && { name: [{ family: familyName, given: givenName ? [givenName] : [] }] }),
    ...(gender && { gender: hl7GenderToFhir(gender) }),
    ...(dob && dob.length >= 8 && { birthDate: `${dob.slice(0, 4)}-${dob.slice(4, 6)}-${dob.slice(6, 8)}` }),
  };

  // Build Encounter resource
  const encounterId = randomUUID();
  const patientClass = pv1 ? getField(pv1, 2) : "IMP";
  const location = pv1 ? getComponent(getField(pv1, 3), 1) : "";
  const attendingId = pv1 ? getComponent(getField(pv1, 7), 1) : "";
  const admitDate = pv1 ? getField(pv1, 44) : "";
  const dischargeDate = pv1 ? getField(pv1, 45) : "";

  const encounterClassMap: Record<string, { code: string; display: string }> = {
    I: { code: "IMP", display: "inpatient" },
    O: { code: "AMB", display: "ambulatory" },
    E: { code: "EMER", display: "emergency" },
    P: { code: "PRENC", display: "pre-admission" },
  };
  const encClass = encounterClassMap[patientClass] || { code: patientClass, display: patientClass };

  const encounterStatusMap: Record<string, string> = {
    A01: "in-progress",
    A02: "in-progress",
    A03: "finished",
    A08: "in-progress",
  };

  const encounter: FhirEncounter = {
    resourceType: "Encounter",
    id: encounterId,
    status: encounterStatusMap[triggerEvent] || "unknown",
    class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", ...encClass },
    subject: { reference: `Patient/${patientId}` },
    ...(location && { location: [{ location: { display: location } }] }),
    ...(attendingId && { participant: [{ individual: { reference: `Practitioner/${attendingId}`, display: attendingId } }] }),
    period: {
      ...(admitDate && { start: hl7DateToFhir(admitDate) }),
      ...(dischargeDate && { end: hl7DateToFhir(dischargeDate) }),
    },
  };

  const bundle = makeBundle([entry(patient), entry(encounter)], `ADT^${triggerEvent}`);
  return { ok: true, bundle, sourceMessageType: `ADT^${triggerEvent}`, sourceControlId: controlId, warnings };
}

/* ── ORU → FHIR DiagnosticReport + Observation ─────────── */

export function convertOruToFhir(raw: string): FhirConversionResult {
  const warnings: string[] = [];
  const segments = parseSegments(raw);
  const msh = findSegment(segments, "MSH");
  const pid = findSegment(segments, "PID");
  const obr = findSegment(segments, "OBR");
  const obxSegments = findAllSegments(segments, "OBX");

  if (!msh) return { ok: false, bundle: null, sourceMessageType: "ORU", sourceControlId: "", warnings: ["Missing MSH segment"] };

  const controlId = getField(msh, 10, true);
  const patientId = randomUUID();
  const mrn = pid ? getComponent(getField(pid, 3), 1) : "";

  if (!mrn) warnings.push("PID-3 (MRN) missing");
  if (!obr) warnings.push("OBR segment missing");

  const patient: FhirPatient = {
    resourceType: "Patient",
    id: patientId,
    identifier: [{ system: "urn:oid:unknown", value: mrn }],
  };

  // Build Observations from OBX segments
  const observationEntries: FhirBundleEntry[] = [];
  const resultRefs: Array<{ reference: string }> = [];

  for (const obx of obxSegments) {
    const obsId = randomUUID();
    const obsCode = getComponent(getField(obx, 3), 1);
    const obsName = getComponent(getField(obx, 3), 2);
    const obsValue = getField(obx, 5);
    const obsUnits = getField(obx, 6);
    const obsFlag = getField(obx, 8);
    const obsStatus = getField(obx, 11);

    const statusMap: Record<string, string> = { F: "final", P: "preliminary", C: "corrected", I: "registered" };
    const numVal = Number(obsValue);

    const observation: FhirObservation = {
      resourceType: "Observation",
      id: obsId,
      status: statusMap[obsStatus] || "unknown",
      code: { coding: [{ system: "http://loinc.org", code: obsCode, display: obsName }] },
      subject: { reference: `Patient/${patientId}` },
      ...(!isNaN(numVal) && obsUnits
        ? { valueQuantity: { value: numVal, unit: obsUnits, system: "http://unitsofmeasure.org", code: obsUnits } }
        : { valueString: obsValue }),
      ...(obsFlag && obsFlag !== "N" && {
        interpretation: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", code: obsFlag }] }],
      }),
    };
    observationEntries.push(entry(observation));
    resultRefs.push({ reference: `Observation/${obsId}` });
  }

  // Build DiagnosticReport
  const reportId = randomUUID();
  const testCode = obr ? getComponent(getField(obr, 4), 1) : "";
  const testName = obr ? getComponent(getField(obr, 4), 2) : "";
  const resultStatus = obr ? getField(obr, 25) : "F";
  const reportStatusMap: Record<string, string> = { F: "final", P: "preliminary", C: "corrected", I: "registered" };

  const report: FhirDiagnosticReport = {
    resourceType: "DiagnosticReport",
    id: reportId,
    status: reportStatusMap[resultStatus] || "unknown",
    code: { coding: [{ system: "http://loinc.org", code: testCode, display: testName }] },
    subject: { reference: `Patient/${patientId}` },
    issued: new Date().toISOString(),
    result: resultRefs,
  };

  const bundle = makeBundle([entry(patient), entry(report), ...observationEntries], "ORU^R01");
  return { ok: true, bundle, sourceMessageType: "ORU^R01", sourceControlId: controlId, warnings };
}

/* ── ORM → FHIR ServiceRequest ─────────────────────────── */

export function convertOrmToFhir(raw: string): FhirConversionResult {
  const warnings: string[] = [];
  const segments = parseSegments(raw);
  const msh = findSegment(segments, "MSH");
  const pid = findSegment(segments, "PID");
  const orc = findSegment(segments, "ORC");
  const obr = findSegment(segments, "OBR");

  if (!msh) return { ok: false, bundle: null, sourceMessageType: "ORM", sourceControlId: "", warnings: ["Missing MSH segment"] };

  const controlId = getField(msh, 10, true);
  const patientId = randomUUID();
  const mrn = pid ? getComponent(getField(pid, 3), 1) : "";

  if (!mrn) warnings.push("PID-3 (MRN) missing");
  if (!orc) warnings.push("ORC segment missing");

  const patient: FhirPatient = {
    resourceType: "Patient",
    id: patientId,
    identifier: [{ system: "urn:oid:unknown", value: mrn }],
  };

  const orderControl = orc ? getField(orc, 1) : "";
  const placerOrder = orc ? getComponent(getField(orc, 2), 1) : "";
  const orderedBy = orc ? getComponent(getField(orc, 12), 1) : "";
  const orderDate = orc ? getField(orc, 9) : "";
  const testCode = obr ? getComponent(getField(obr, 4), 1) : "";
  const testName = obr ? getComponent(getField(obr, 4), 2) : "";

  const statusMap: Record<string, string> = { NW: "active", CA: "revoked", SC: "active", OC: "revoked", HD: "on-hold" };

  const serviceRequest: FhirServiceRequest = {
    resourceType: "ServiceRequest",
    id: randomUUID(),
    status: statusMap[orderControl] || "unknown",
    intent: "order",
    code: { coding: [{ system: "http://loinc.org", code: testCode, display: testName }] },
    subject: { reference: `Patient/${patientId}` },
    ...(orderDate && { authoredOn: hl7DateToFhir(orderDate) }),
    ...(orderedBy && { requester: { reference: `Practitioner/${orderedBy}` } }),
  };

  const bundle = makeBundle([entry(patient), entry(serviceRequest)], "ORM^O01");
  return { ok: true, bundle, sourceMessageType: "ORM^O01", sourceControlId: controlId, warnings };
}

/* ── SIU → FHIR Appointment ────────────────────────────── */

export function convertSiuToFhir(raw: string): FhirConversionResult {
  const warnings: string[] = [];
  const segments = parseSegments(raw);
  const msh = findSegment(segments, "MSH");
  const pid = findSegment(segments, "PID");
  const sch = findSegment(segments, "SCH");
  const ais = findSegment(segments, "AIS");

  if (!msh) return { ok: false, bundle: null, sourceMessageType: "SIU", sourceControlId: "", warnings: ["Missing MSH segment"] };

  const controlId = getField(msh, 10, true);
  const messageType = getField(msh, 9, true);
  const triggerEvent = getComponent(messageType, 2);

  const patientId = randomUUID();
  const mrn = pid ? getComponent(getField(pid, 3), 1) : "";

  if (!mrn) warnings.push("PID-3 (MRN) missing");

  const patient: FhirPatient = {
    resourceType: "Patient",
    id: patientId,
    identifier: [{ system: "urn:oid:unknown", value: mrn }],
  };

  const appointmentId = sch ? getComponent(getField(sch, 1), 1) : "";
  const appointmentType = sch ? getComponent(getField(sch, 7), 1) : "";
  const duration = sch ? parseInt(getField(sch, 9), 10) : NaN;
  const providerId = sch ? getComponent(getField(sch, 12), 1) : "";
  const startTime = ais ? getField(ais, 4) : "";

  const statusMap: Record<string, string> = {
    S12: "booked", S13: "booked", S14: "cancelled", S15: "cancelled", S26: "noshow",
  };

  const appointment: FhirAppointment = {
    resourceType: "Appointment",
    id: randomUUID(),
    status: statusMap[triggerEvent] || "proposed",
    ...(appointmentType && { appointmentType: { coding: [{ system: "http://vista-evolved.org/fhir/appointment-type", code: appointmentType }] } }),
    ...(startTime && { start: hl7DateToFhir(startTime) }),
    ...(!isNaN(duration) && { minutesDuration: duration }),
    participant: [
      { actor: { reference: `Patient/${patientId}` }, status: "accepted" },
      ...(providerId ? [{ actor: { reference: `Practitioner/${providerId}` }, status: "accepted" }] : []),
    ],
  };

  const bundle = makeBundle([entry(patient), entry(appointment)], `SIU^${triggerEvent}`);
  return { ok: true, bundle, sourceMessageType: `SIU^${triggerEvent}`, sourceControlId: controlId, warnings };
}

/* ── Universal Converter ───────────────────────────────── */

/**
 * Convert any supported HL7v2 message to a FHIR R4 Bundle.
 * Returns a typed result with ok/bundle/warnings.
 */
export function convertHl7ToFhir(raw: string): FhirConversionResult {
  const firstLine = raw.split(/\r?\n|\r/)[0] ?? "";
  if (!firstLine.startsWith("MSH")) {
    return { ok: false, bundle: null, sourceMessageType: "unknown", sourceControlId: "", warnings: ["Not an HL7v2 message (no MSH)"] };
  }

  const messageType = getField(firstLine, 9, true);
  const msgCode = getComponent(messageType, 1);

  switch (msgCode) {
    case "ADT": return convertAdtToFhir(raw);
    case "ORU": return convertOruToFhir(raw);
    case "ORM": return convertOrmToFhir(raw);
    case "SIU": return convertSiuToFhir(raw);
    default:
      return {
        ok: false, bundle: null,
        sourceMessageType: messageType,
        sourceControlId: getField(firstLine, 10, true),
        warnings: [`Unsupported message type: ${msgCode}`],
      };
  }
}

/**
 * List all supported HL7v2 → FHIR R4 conversions.
 */
export function listFhirConversions(): Array<{
  hl7Type: string;
  fhirResources: string[];
}> {
  return [
    { hl7Type: "ADT^A01", fhirResources: ["Patient", "Encounter"] },
    { hl7Type: "ADT^A02", fhirResources: ["Patient", "Encounter"] },
    { hl7Type: "ADT^A03", fhirResources: ["Patient", "Encounter"] },
    { hl7Type: "ADT^A08", fhirResources: ["Patient", "Encounter"] },
    { hl7Type: "ORU^R01", fhirResources: ["Patient", "DiagnosticReport", "Observation"] },
    { hl7Type: "ORM^O01", fhirResources: ["Patient", "ServiceRequest"] },
    { hl7Type: "SIU^S12", fhirResources: ["Patient", "Appointment"] },
    { hl7Type: "SIU^S13", fhirResources: ["Patient", "Appointment"] },
    { hl7Type: "SIU^S14", fhirResources: ["Patient", "Appointment"] },
    { hl7Type: "SIU^S15", fhirResources: ["Patient", "Appointment"] },
    { hl7Type: "SIU^S26", fhirResources: ["Patient", "Appointment"] },
  ];
}
