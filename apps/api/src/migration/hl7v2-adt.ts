/**
 * apps/api/src/migration/hl7v2-adt.ts
 *
 * Phase 458 (W30-P3). HL7 v2.x ADT message parser.
 * Parses pipe-delimited HL7v2 messages containing MSH, PID, PV1 segments.
 * Supports ADT trigger events: A01 (admit), A02 (transfer), A03 (discharge), A08 (update).
 */

import { randomBytes } from "crypto";

// ── Types ──────────────────────────────────────────────────────────

export type AdtTrigger = "A01" | "A02" | "A03" | "A08" | "unknown";

export interface Hl7Segment {
  name: string;
  fields: string[];
}

export interface AdtEvent {
  id: string;
  trigger: AdtTrigger;
  messageControlId: string;
  sendingFacility: string;
  receivingFacility: string;
  messageTimestamp: string;
  patientId: string;
  patientName: string;
  dateOfBirth: string;
  gender: string;
  patientClass: string;
  assignedLocation: string;
  admitDateTime: string;
  processedAt: string;
  processedBy: string;
  raw?: string;
}

export interface AdtProcessResult {
  ok: boolean;
  eventId?: string;
  trigger?: AdtTrigger;
  patientId?: string;
  error?: string;
}

// ── In-memory event store ──────────────────────────────────────────

const adtEvents = new Map<string, AdtEvent>();

export function getAdtEvent(id: string): AdtEvent | undefined {
  return adtEvents.get(id);
}

export function listAdtEvents(): AdtEvent[] {
  return Array.from(adtEvents.values()).sort(
    (a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
  );
}

// ── HL7v2 parser ───────────────────────────────────────────────────

function parseSegments(message: string): Hl7Segment[] {
  // HL7v2 uses \r as segment separator (also accept \n and \r\n)
  const lines = message.split(/[\r\n]+/).filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const fields = line.split("|");
    return { name: fields[0], fields };
  });
}

function getField(segment: Hl7Segment | undefined, index: number): string {
  if (!segment) return "";
  // MSH is special: field 1 is the separator itself
  if (segment.name === "MSH") {
    // MSH-1 = |, MSH-2 = encoding chars, MSH-3 starts at fields[2]
    return (segment.fields[index] || "").trim();
  }
  return (segment.fields[index] || "").trim();
}

function getComponent(field: string, index: number): string {
  const parts = field.split("^");
  return (parts[index] || "").trim();
}

function parseTrigger(msh9: string): AdtTrigger {
  // MSH-9 format: ADT^A01 or ADT^A01^ADT_A01
  const triggerCode = getComponent(msh9, 1);
  if (["A01", "A02", "A03", "A08"].includes(triggerCode)) {
    return triggerCode as AdtTrigger;
  }
  return "unknown";
}

// ── Process ADT message ────────────────────────────────────────────

export function processAdtMessage(
  messageText: string,
  userId: string
): AdtProcessResult {
  const segments = parseSegments(messageText);

  const msh = segments.find((s) => s.name === "MSH");
  if (!msh) {
    return { ok: false, error: "Missing MSH segment" };
  }

  const pid = segments.find((s) => s.name === "PID");
  const pv1 = segments.find((s) => s.name === "PV1");

  // MSH fields (1-indexed in HL7 spec, but MSH is offset)
  const sendingFacility = getField(msh, 3);
  const receivingFacility = getField(msh, 5);
  const messageTimestamp = getField(msh, 6);
  const messageType = getField(msh, 8);  // MSH-9
  const messageControlId = getField(msh, 9);

  const trigger = parseTrigger(messageType);

  // PID fields
  const patientId = pid ? getComponent(getField(pid, 3), 0) : "";
  const pidName = pid ? getField(pid, 5) : "";
  const patientName = pidName
    ? `${getComponent(pidName, 0)}, ${getComponent(pidName, 1)}`
    : "UNKNOWN";
  const dateOfBirth = pid ? getField(pid, 7) : "";
  const gender = pid ? getField(pid, 8) : "";

  // PV1 fields
  const patientClass = pv1 ? getField(pv1, 2) : "";
  const assignedLocation = pv1 ? getField(pv1, 3) : "";
  const admitDateTime = pv1 ? getField(pv1, 44) : "";

  const eventId = `adt-${randomBytes(8).toString("hex")}`;
  const event: AdtEvent = {
    id: eventId,
    trigger,
    messageControlId,
    sendingFacility,
    receivingFacility,
    messageTimestamp,
    patientId,
    patientName,
    dateOfBirth,
    gender,
    patientClass,
    assignedLocation,
    admitDateTime,
    processedAt: new Date().toISOString(),
    processedBy: userId,
  };

  adtEvents.set(eventId, event);

  return {
    ok: true,
    eventId,
    trigger,
    patientId,
  };
}
