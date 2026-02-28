/**
 * HL7v2 → Domain Event Mapper — Phase 260 (Wave 8 P4)
 *
 * Deterministic mapping from parsed HL7v2 messages to VistA-Evolved
 * domain events. Each mapper extracts structured data from HL7 segments
 * and produces typed domain events for downstream consumption.
 *
 * Pattern: Pure functions, no side effects, no PHI in event metadata.
 */

/* ── Domain Event Types ────────────────────────────────── */

export type DomainEventType =
  | "patient.admitted"
  | "patient.discharged"
  | "patient.updated"
  | "patient.transferred"
  | "result.received"
  | "result.corrected"
  | "appointment.booked"
  | "appointment.rescheduled"
  | "appointment.cancelled"
  | "appointment.noshow";

export interface DomainEvent {
  type: DomainEventType;
  /** Source message control ID for tracing */
  sourceMessageControlId: string;
  /** Source message type (e.g. ADT^A01) */
  sourceMessageType: string;
  /** Sending facility (tenant routing key) */
  sendingFacility: string;
  /** Timestamp from HL7 message */
  eventTimestamp: string;
  /** PHI-safe payload — identifiers only, no names/addresses */
  payload: Record<string, unknown>;
}

/* ── Segment Field Extraction Helpers ──────────────────── */

/**
 * Get the Nth field (1-based) from an HL7 segment line.
 * MSH is special: field separator is MSH-1, so MSH-3 is segments[2].
 */
function getField(segmentLine: string, fieldIndex: number, isMsh = false): string {
  const parts = segmentLine.split("|");
  if (isMsh) {
    // MSH-1 is "|" itself, so MSH-3 = parts[2], MSH-4 = parts[3], etc.
    return parts[fieldIndex - 1] ?? "";
  }
  return parts[fieldIndex] ?? "";
}

/**
 * Get the first component of a field (fields can be ^-delimited).
 */
function getComponent(field: string, componentIndex: number = 1): string {
  const parts = field.split("^");
  return parts[componentIndex - 1] ?? "";
}

/**
 * Parse HL7 message text into segment lines.
 */
function parseSegments(raw: string): string[] {
  return raw
    .split(/\r?\n|\r/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Find first segment with given prefix.
 */
function findSegment(segments: string[], prefix: string): string | undefined {
  return segments.find((s) => s.startsWith(prefix + "|"));
}

/**
 * Find all segments with given prefix.
 */
function findAllSegments(segments: string[], prefix: string): string[] {
  return segments.filter((s) => s.startsWith(prefix + "|"));
}

/* ── ADT Mapper ────────────────────────────────────────── */

const ADT_EVENT_MAP: Record<string, DomainEventType> = {
  A01: "patient.admitted",
  A02: "patient.transferred",
  A03: "patient.discharged",
  A08: "patient.updated",
};

export function mapAdtMessage(raw: string): DomainEvent | null {
  const segments = parseSegments(raw);
  const msh = findSegment(segments, "MSH");
  const evn = findSegment(segments, "EVN");
  const pid = findSegment(segments, "PID");
  const pv1 = findSegment(segments, "PV1");

  if (!msh) return null;

  const messageType = getField(msh, 9, true); // ADT^A01^ADT_A01
  const triggerEvent = getComponent(messageType, 2); // A01
  const controlId = getField(msh, 10, true);
  const sendingFacility = getField(msh, 4, true);
  const timestamp = evn ? getField(evn, 2) : getField(msh, 7, true);

  const domainType = ADT_EVENT_MAP[triggerEvent];
  if (!domainType) return null;

  // Extract PHI-safe identifiers only
  const patientMrn = pid ? getComponent(getField(pid, 3), 1) : "";
  const assigningAuthority = pid ? getComponent(getField(pid, 3), 4) : "";
  const patientClass = pv1 ? getField(pv1, 2) : "";
  const assignedLocation = pv1 ? getField(pv1, 3) : "";
  const attendingId = pv1 ? getComponent(getField(pv1, 7), 1) : "";

  return {
    type: domainType,
    sourceMessageControlId: controlId,
    sourceMessageType: `ADT^${triggerEvent}`,
    sendingFacility,
    eventTimestamp: timestamp,
    payload: {
      patientMrn,
      assigningAuthority,
      triggerEvent,
      patientClass,
      assignedLocation: getComponent(assignedLocation, 1), // ward only
      attendingProviderId: attendingId,
    },
  };
}

/* ── ORU Mapper ────────────────────────────────────────── */

export function mapOruMessage(raw: string): DomainEvent | null {
  const segments = parseSegments(raw);
  const msh = findSegment(segments, "MSH");
  const pid = findSegment(segments, "PID");
  const orc = findSegment(segments, "ORC");
  const obr = findSegment(segments, "OBR");
  const obxSegments = findAllSegments(segments, "OBX");

  if (!msh) return null;

  const controlId = getField(msh, 10, true);
  const sendingFacility = getField(msh, 4, true);
  const timestamp = getField(msh, 7, true);

  const patientMrn = pid ? getComponent(getField(pid, 3), 1) : "";
  const orderNumber = orc ? getField(orc, 2) : "";
  const testCode = obr ? getComponent(getField(obr, 4), 1) : "";
  const testName = obr ? getComponent(getField(obr, 4), 2) : "";
  const resultStatus = obr ? getField(obr, 25) : "";

  // Extract observation summaries (code + value only, no PHI)
  const observations = obxSegments.map((obx) => ({
    code: getComponent(getField(obx, 3), 1),
    value: getField(obx, 5),
    units: getField(obx, 6),
    flag: getField(obx, 8), // abnormal flag
    status: getField(obx, 11),
  }));

  const isCorrection =
    resultStatus === "C" || (orc && getField(orc, 1) === "SC");

  return {
    type: isCorrection ? "result.corrected" : "result.received",
    sourceMessageControlId: controlId,
    sourceMessageType: "ORU^R01",
    sendingFacility,
    eventTimestamp: timestamp,
    payload: {
      patientMrn,
      orderNumber: getComponent(orderNumber, 1),
      testCode,
      testName,
      resultStatus,
      observationCount: observations.length,
      hasAbnormal: observations.some((o) => o.flag && o.flag !== "N"),
      observations,
    },
  };
}

/* ── SIU Mapper ────────────────────────────────────────── */

const SIU_EVENT_MAP: Record<string, DomainEventType> = {
  S12: "appointment.booked",
  S13: "appointment.rescheduled",
  S14: "appointment.cancelled", // Modification (often used as cancel)
  S15: "appointment.cancelled",
  S26: "appointment.noshow",
};

export function mapSiuMessage(raw: string): DomainEvent | null {
  const segments = parseSegments(raw);
  const msh = findSegment(segments, "MSH");
  const sch = findSegment(segments, "SCH");
  const pid = findSegment(segments, "PID");
  const ais = findSegment(segments, "AIS");

  if (!msh) return null;

  const messageType = getField(msh, 9, true);
  const triggerEvent = getComponent(messageType, 2);
  const controlId = getField(msh, 10, true);
  const sendingFacility = getField(msh, 4, true);
  const timestamp = getField(msh, 7, true);

  const domainType = SIU_EVENT_MAP[triggerEvent];
  if (!domainType) return null;

  const patientMrn = pid ? getComponent(getField(pid, 3), 1) : "";
  const appointmentId = sch ? getComponent(getField(sch, 1), 1) : "";
  const appointmentType = sch ? getComponent(getField(sch, 7), 1) : "";
  const duration = sch ? getField(sch, 9) : "";
  const scheduledProviderId = sch ? getComponent(getField(sch, 12), 1) : "";
  const resource = ais ? getComponent(getField(ais, 3), 1) : "";
  const startTime = ais ? getField(ais, 4) : "";

  return {
    type: domainType,
    sourceMessageControlId: controlId,
    sourceMessageType: `SIU^${triggerEvent}`,
    sendingFacility,
    eventTimestamp: timestamp,
    payload: {
      patientMrn,
      appointmentId,
      triggerEvent,
      appointmentType,
      durationMinutes: parseInt(duration, 10) || null,
      scheduledProviderId,
      resource,
      scheduledStartTime: startTime,
    },
  };
}

/* ── Universal Mapper ──────────────────────────────────── */

/**
 * Map any supported HL7v2 message to a domain event.
 * Returns null for unsupported message types.
 */
export function mapHl7ToDomainEvent(raw: string): DomainEvent | null {
  const firstLine = raw.split(/\r?\n|\r/)[0] ?? "";
  if (!firstLine.startsWith("MSH")) return null;

  const messageType = getField(firstLine, 9, true);
  const msgCode = getComponent(messageType, 1);

  switch (msgCode) {
    case "ADT":
      return mapAdtMessage(raw);
    case "ORU":
      return mapOruMessage(raw);
    case "SIU":
      return mapSiuMessage(raw);
    default:
      return null;
  }
}

/**
 * List supported message type → domain event mappings.
 */
export function listSupportedMappings(): Array<{
  hl7Type: string;
  domainEvent: DomainEventType;
}> {
  return [
    { hl7Type: "ADT^A01", domainEvent: "patient.admitted" },
    { hl7Type: "ADT^A02", domainEvent: "patient.transferred" },
    { hl7Type: "ADT^A03", domainEvent: "patient.discharged" },
    { hl7Type: "ADT^A08", domainEvent: "patient.updated" },
    { hl7Type: "ORU^R01", domainEvent: "result.received" },
    { hl7Type: "ORU^R01 (correction)", domainEvent: "result.corrected" },
    { hl7Type: "SIU^S12", domainEvent: "appointment.booked" },
    { hl7Type: "SIU^S13", domainEvent: "appointment.rescheduled" },
    { hl7Type: "SIU^S14", domainEvent: "appointment.cancelled" },
    { hl7Type: "SIU^S15", domainEvent: "appointment.cancelled" },
    { hl7Type: "SIU^S26", domainEvent: "appointment.noshow" },
  ];
}
