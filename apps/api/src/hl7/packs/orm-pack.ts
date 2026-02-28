/**
 * HL7v2 Message Packs — ORM (Orders)
 *
 * Phase 241 (Wave 6 P4): Builders and validators for ORM messages.
 * ORM^O01 is the primary order message used in VistA integration for
 * pharmacy, lab, radiology, and dietary orders.
 */

import type { Hl7Message } from "../types.js";
import { HL7_FIELD_SEP, HL7_SEGMENT_SEP } from "../types.js";
import { getSegments } from "../parser.js";
import type { Hl7Route } from "../routing/types.js";
import type {
  MessagePack,
  PatientDemographics,
  ValidationResult,
  ValidationIssue,
} from "./types.js";

/* ------------------------------------------------------------------ */
/*  ORM Event Types                                                    */
/* ------------------------------------------------------------------ */

const ORM_EVENTS = ["ORM^O01"];

/* ------------------------------------------------------------------ */
/*  Order Info Types                                                   */
/* ------------------------------------------------------------------ */

export interface OrderInfo {
  /** Placer order number */
  placerOrderNumber: string;
  /** Filler order number (assigned by filling system) */
  fillerOrderNumber?: string;
  /** Order control code (NW=New, CA=Cancel, XO=Change, etc.) */
  orderControl: string;
  /** Universal service identifier (code^description) */
  universalServiceId: string;
  /** Order date/time — YYYYMMDDHHMMSS */
  orderDateTime?: string;
  /** Ordering provider ID */
  orderingProviderId?: string;
  /** Ordering provider name */
  orderingProviderName?: string;
  /** Priority (S=Stat, R=Routine, A=ASAP) */
  priority?: string;
}

/* ------------------------------------------------------------------ */
/*  Builder                                                            */
/* ------------------------------------------------------------------ */

/** Build an ORM^O01 (General Order) message. */
export function buildOrmO01(
  patient: PatientDemographics,
  order: OrderInfo,
  opts?: { sendingApp?: string; sendingFacility?: string },
): string {
  const now = formatHl7DateTime();
  const controlId = `ORM${Date.now()}`;
  const sep = HL7_FIELD_SEP;
  const cr = HL7_SEGMENT_SEP;

  const sendApp = opts?.sendingApp || "VISTA_EVOLVED";
  const sendFac = opts?.sendingFacility || "VE";

  const msh = `MSH${sep}^~\\&${sep}${sendApp}${sep}${sendFac}${sep}${sep}${sep}${now}${sep}${sep}ORM^O01^ORM_O01${sep}${controlId}${sep}P${sep}2.4`;

  const auth = patient.assigningAuthority || "MRN";
  const pid = `PID${sep}1${sep}${sep}${patient.patientId}^^^${auth}${sep}${sep}${patient.lastName}^${patient.firstName}${sep}${sep}${patient.dob || ""}${sep}${patient.sex || "U"}`;

  const orderDt = order.orderDateTime || now;
  const provider = order.orderingProviderId
    ? `${order.orderingProviderId}^${order.orderingProviderName || ""}`
    : "";
  const orc = `ORC${sep}${order.orderControl}${sep}${order.placerOrderNumber}${sep}${order.fillerOrderNumber || ""}${sep}${sep}${sep}${sep}${sep}${sep}${orderDt}${sep}${sep}${sep}${provider}`;

  const obr = `OBR${sep}1${sep}${order.placerOrderNumber}${sep}${order.fillerOrderNumber || ""}${sep}${order.universalServiceId}${sep}${sep}${orderDt}`;

  return [msh, pid, orc, obr].join(cr);
}

function formatHl7DateTime(): string {
  const d = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/* ------------------------------------------------------------------ */
/*  Validator                                                          */
/* ------------------------------------------------------------------ */

/** Validate an ORM message for structural correctness. */
export function validateOrmMessage(message: Hl7Message): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Must be ORM message type
  if (!message.messageType.startsWith("ORM^")) {
    issues.push({
      severity: "error",
      segment: "MSH",
      field: "MSH-9",
      message: `Expected ORM message type, got ${message.messageType}`,
      ruleCode: "ORM-001",
    });
  }

  // Must have PID segment
  const pid = getSegments(message, "PID");
  if (pid.length === 0) {
    issues.push({
      severity: "error",
      segment: "PID",
      message: "Missing required PID segment",
      ruleCode: "ORM-002",
    });
  }

  // Must have ORC segment (Order Common)
  const orc = getSegments(message, "ORC");
  if (orc.length === 0) {
    issues.push({
      severity: "error",
      segment: "ORC",
      message: "Missing required ORC segment (Order Common)",
      ruleCode: "ORM-003",
    });
  } else {
    const orcSeg = orc[0]!;
    // ORC-1 (Order Control) required
    if (!orcSeg.fields[1]) {
      issues.push({
        severity: "error",
        segment: "ORC",
        field: "ORC-1",
        message: "Missing required ORC-1 (Order Control)",
        ruleCode: "ORM-004",
      });
    }
    // ORC-2 (Placer Order Number) required for NW
    if (!orcSeg.fields[2] && orcSeg.fields[1] === "NW") {
      issues.push({
        severity: "error",
        segment: "ORC",
        field: "ORC-2",
        message: "Missing required ORC-2 (Placer Order Number) for new orders",
        ruleCode: "ORM-005",
      });
    }
  }

  // Must have OBR segment (Observation Request)
  const obr = getSegments(message, "OBR");
  if (obr.length === 0) {
    issues.push({
      severity: "error",
      segment: "OBR",
      message: "Missing required OBR segment (Observation Request)",
      ruleCode: "ORM-006",
    });
  } else {
    const obrSeg = obr[0]!;
    // OBR-4 (Universal Service Identifier) required
    if (!obrSeg.fields[4]) {
      issues.push({
        severity: "error",
        segment: "OBR",
        field: "OBR-4",
        message: "Missing required OBR-4 (Universal Service Identifier)",
        ruleCode: "ORM-007",
      });
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    valid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
  };
}

/* ------------------------------------------------------------------ */
/*  Pack Definition                                                    */
/* ------------------------------------------------------------------ */

export const ormPack: MessagePack = {
  id: "orm",
  name: "ORM — Orders",
  messageTypes: ORM_EVENTS,
  description: "General Order messages (O01) for pharmacy, lab, radiology, dietary",
  validate: validateOrmMessage,
  getRouteTemplate: () => ({
    name: "ORM Inbound",
    description: "Route for inbound ORM order messages",
    enabled: true,
    priority: 20,
    filter: { messageTypes: ORM_EVENTS },
    transforms: [],
    destination: { type: "dead-letter" as const, id: "orm-dlq", name: "ORM Dead Letter", target: "" },
  }),
};
