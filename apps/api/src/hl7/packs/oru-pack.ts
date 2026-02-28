/**
 * HL7v2 Message Packs — ORU (Results)
 *
 * Phase 241 (Wave 6 P4): Builders and validators for ORU messages.
 * ORU^R01 carries observation/result data (labs, vitals, radiology reports).
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
/*  ORU Event Types                                                    */
/* ------------------------------------------------------------------ */

const ORU_EVENTS = ["ORU^R01"];

/* ------------------------------------------------------------------ */
/*  Result Types                                                       */
/* ------------------------------------------------------------------ */

export interface ObservationResult {
  /** Set ID (1-based) */
  setId: number;
  /** Observation identifier (code^description^coding-system) */
  observationId: string;
  /** Observation value */
  value: string;
  /** Units (code^description) */
  units?: string;
  /** Reference range */
  referenceRange?: string;
  /** Abnormal flag (H=High, L=Low, A=Abnormal, N=Normal) */
  abnormalFlag?: string;
  /** Observation result status (F=Final, P=Preliminary, C=Corrected) */
  resultStatus: string;
  /** Observation date/time — YYYYMMDDHHMMSS */
  observationDateTime?: string;
}

export interface ResultOrderInfo {
  /** Placer order number */
  placerOrderNumber: string;
  /** Filler order number */
  fillerOrderNumber: string;
  /** Universal service identifier */
  universalServiceId: string;
  /** Result status (F=Final, P=Preliminary) */
  resultStatus: string;
}

/* ------------------------------------------------------------------ */
/*  Builder                                                            */
/* ------------------------------------------------------------------ */

/** Build an ORU^R01 (Observation Result) message. */
export function buildOruR01(
  patient: PatientDemographics,
  order: ResultOrderInfo,
  results: ObservationResult[],
  opts?: { sendingApp?: string; sendingFacility?: string },
): string {
  const now = formatHl7DateTime();
  const controlId = `ORU${Date.now()}`;
  const sep = HL7_FIELD_SEP;
  const cr = HL7_SEGMENT_SEP;

  const sendApp = opts?.sendingApp || "VISTA_EVOLVED";
  const sendFac = opts?.sendingFacility || "VE";

  const msh = `MSH${sep}^~\\&${sep}${sendApp}${sep}${sendFac}${sep}${sep}${sep}${now}${sep}${sep}ORU^R01^ORU_R01${sep}${controlId}${sep}P${sep}2.4`;

  const auth = patient.assigningAuthority || "MRN";
  const pid = `PID${sep}1${sep}${sep}${patient.patientId}^^^${auth}${sep}${sep}${patient.lastName}^${patient.firstName}${sep}${sep}${patient.dob || ""}${sep}${patient.sex || "U"}`;

  const orc = `ORC${sep}RE${sep}${order.placerOrderNumber}${sep}${order.fillerOrderNumber}`;

  const obr = `OBR${sep}1${sep}${order.placerOrderNumber}${sep}${order.fillerOrderNumber}${sep}${order.universalServiceId}${sep}${sep}${now}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${order.resultStatus}`;

  const obxSegments = results.map((r) => {
    return `OBX${sep}${r.setId}${sep}ST${sep}${r.observationId}${sep}${sep}${r.value}${sep}${r.units || ""}${sep}${r.referenceRange || ""}${sep}${r.abnormalFlag || ""}${sep}${sep}${sep}${r.resultStatus}${sep}${sep}${sep}${r.observationDateTime || now}`;
  });

  return [msh, pid, orc, obr, ...obxSegments].join(cr);
}

function formatHl7DateTime(): string {
  const d = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/* ------------------------------------------------------------------ */
/*  Validator                                                          */
/* ------------------------------------------------------------------ */

/** Validate an ORU message for structural correctness. */
export function validateOruMessage(message: Hl7Message): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Must be ORU message type
  if (!message.messageType.startsWith("ORU^")) {
    issues.push({
      severity: "error",
      segment: "MSH",
      field: "MSH-9",
      message: `Expected ORU message type, got ${message.messageType}`,
      ruleCode: "ORU-001",
    });
  }

  // Must have PID segment
  const pid = getSegments(message, "PID");
  if (pid.length === 0) {
    issues.push({
      severity: "error",
      segment: "PID",
      message: "Missing required PID segment",
      ruleCode: "ORU-002",
    });
  }

  // Must have OBR segment
  const obr = getSegments(message, "OBR");
  if (obr.length === 0) {
    issues.push({
      severity: "error",
      segment: "OBR",
      message: "Missing required OBR segment",
      ruleCode: "ORU-003",
    });
  } else {
    const obrSeg = obr[0]!;
    // OBR-4 required
    if (!obrSeg.fields[4]) {
      issues.push({
        severity: "error",
        segment: "OBR",
        field: "OBR-4",
        message: "Missing required OBR-4 (Universal Service Identifier)",
        ruleCode: "ORU-004",
      });
    }
  }

  // Must have at least one OBX segment
  const obx = getSegments(message, "OBX");
  if (obx.length === 0) {
    issues.push({
      severity: "warning",
      segment: "OBX",
      message: "No OBX segments found (expected at least one result)",
      ruleCode: "ORU-005",
    });
  } else {
    // Each OBX should have observation ID (OBX-3) and value (OBX-5)
    for (let i = 0; i < obx.length; i++) {
      const obxSeg = obx[i]!;
      if (!obxSeg.fields[3]) {
        issues.push({
          severity: "error",
          segment: "OBX",
          field: `OBX[${i + 1}]-3`,
          message: `Missing OBX-3 (Observation Identifier) in OBX segment ${i + 1}`,
          ruleCode: "ORU-006",
        });
      }
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

export const oruPack: MessagePack = {
  id: "oru",
  name: "ORU — Results",
  messageTypes: ORU_EVENTS,
  description: "Observation Result messages (R01) for labs, vitals, radiology reports",
  validate: validateOruMessage,
  getRouteTemplate: () => ({
    name: "ORU Inbound",
    description: "Route for inbound ORU result messages",
    enabled: true,
    priority: 15,
    filter: { messageTypes: ORU_EVENTS },
    transforms: [],
    destination: { type: "dead-letter" as const, id: "oru-dlq", name: "ORU Dead Letter", target: "" },
  }),
};
