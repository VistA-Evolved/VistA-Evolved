/**
 * HL7v2 Message Packs -- ADT (Admit/Discharge/Transfer)
 *
 * Phase 241 (Wave 6 P4): Builders and validators for ADT messages.
 * Covers: A01 (Admit), A02 (Transfer), A03 (Discharge), A04 (Register),
 * A05 (Pre-admit), A06 (Change Outpatient to Inpatient), A07 (reverse),
 * A08 (Update Patient Info).
 */

import type { Hl7Message } from '../types.js';
import { HL7_FIELD_SEP, HL7_SEGMENT_SEP } from '../types.js';
import { getSegments } from '../parser.js';
import type {
  MessagePack,
  PatientDemographics,
  VisitInfo,
  ValidationResult,
  ValidationIssue,
} from './types.js';

/* ------------------------------------------------------------------ */
/*  ADT Event Types                                                    */
/* ------------------------------------------------------------------ */

const ADT_EVENTS = [
  'ADT^A01',
  'ADT^A02',
  'ADT^A03',
  'ADT^A04',
  'ADT^A05',
  'ADT^A06',
  'ADT^A07',
  'ADT^A08',
];

/* ------------------------------------------------------------------ */
/*  Builders                                                           */
/* ------------------------------------------------------------------ */

/** Build an ADT^A01 (Admit) message. */
export function buildAdtA01(
  patient: PatientDemographics,
  visit: VisitInfo,
  opts?: {
    sendingApp?: string;
    sendingFacility?: string;
    receivingApp?: string;
    receivingFacility?: string;
  }
): string {
  return buildAdtMessage('ADT^A01^ADT_A01', patient, visit, opts);
}

/** Build an ADT^A02 (Transfer) message. */
export function buildAdtA02(
  patient: PatientDemographics,
  visit: VisitInfo,
  opts?: {
    sendingApp?: string;
    sendingFacility?: string;
    receivingApp?: string;
    receivingFacility?: string;
  }
): string {
  return buildAdtMessage('ADT^A02^ADT_A02', patient, visit, opts);
}

/** Build an ADT^A03 (Discharge) message. */
export function buildAdtA03(
  patient: PatientDemographics,
  visit: VisitInfo,
  opts?: {
    sendingApp?: string;
    sendingFacility?: string;
    receivingApp?: string;
    receivingFacility?: string;
  }
): string {
  return buildAdtMessage('ADT^A03^ADT_A03', patient, visit, opts);
}

/** Build an ADT^A08 (Update Patient Info) message. */
export function buildAdtA08(
  patient: PatientDemographics,
  visit: VisitInfo,
  opts?: {
    sendingApp?: string;
    sendingFacility?: string;
    receivingApp?: string;
    receivingFacility?: string;
  }
): string {
  return buildAdtMessage('ADT^A08^ADT_A08', patient, visit, opts);
}

function buildAdtMessage(
  messageType: string,
  patient: PatientDemographics,
  visit: VisitInfo,
  opts?: {
    sendingApp?: string;
    sendingFacility?: string;
    receivingApp?: string;
    receivingFacility?: string;
  }
): string {
  const now = formatHl7DateTime();
  const controlId = `ADT${Date.now()}`;
  const sep = HL7_FIELD_SEP;
  const cr = HL7_SEGMENT_SEP;

  const sendApp = opts?.sendingApp || 'VISTA_EVOLVED';
  const sendFac = opts?.sendingFacility || 'VE';
  const recvApp = opts?.receivingApp || '';
  const recvFac = opts?.receivingFacility || '';

  const msh = `MSH${sep}^~\\&${sep}${sendApp}${sep}${sendFac}${sep}${recvApp}${sep}${recvFac}${sep}${now}${sep}${sep}${messageType}${sep}${controlId}${sep}P${sep}2.4`;
  const evn = `EVN${sep}${messageType.split('^')[1] || 'A01'}${sep}${now}`;
  const pid = buildPid(patient, sep);
  const pv1 = buildPv1(visit, sep);

  return [msh, evn, pid, pv1].join(cr);
}

/* ------------------------------------------------------------------ */
/*  Segment Builders                                                   */
/* ------------------------------------------------------------------ */

function buildPid(p: PatientDemographics, sep: string): string {
  const auth = p.assigningAuthority || 'MRN';
  return `PID${sep}1${sep}${sep}${p.patientId}^^^${auth}${sep}${sep}${p.lastName}^${p.firstName}${sep}${sep}${p.dob || ''}${sep}${p.sex || 'U'}`;
}

function buildPv1(v: VisitInfo, sep: string): string {
  const attendingParts = v.attendingDoctorId
    ? `${v.attendingDoctorId}^${v.attendingDoctorName || ''}`
    : '';
  return `PV1${sep}1${sep}${v.patientClass}${sep}${v.assignedLocation || ''}${sep}${sep}${sep}${sep}${attendingParts}`;
}

function formatHl7DateTime(): string {
  const d = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/* ------------------------------------------------------------------ */
/*  Validator                                                          */
/* ------------------------------------------------------------------ */

/** Validate an ADT message for structural correctness. */
export function validateAdtMessage(message: Hl7Message): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Must be ADT message type
  if (!message.messageType.startsWith('ADT^')) {
    issues.push({
      severity: 'error',
      segment: 'MSH',
      field: 'MSH-9',
      message: `Expected ADT message type, got ${message.messageType}`,
      ruleCode: 'ADT-001',
    });
  }

  // Must have EVN segment
  const evn = getSegments(message, 'EVN');
  if (evn.length === 0) {
    issues.push({
      severity: 'warning',
      segment: 'EVN',
      message: 'Missing EVN segment (recommended for ADT)',
      ruleCode: 'ADT-002',
    });
  }

  // Must have PID segment
  const pid = getSegments(message, 'PID');
  if (pid.length === 0) {
    issues.push({
      severity: 'error',
      segment: 'PID',
      message: 'Missing required PID segment',
      ruleCode: 'ADT-003',
    });
  } else {
    // PID-3 (Patient Identifier) required
    const pidSeg = pid[0]!;
    if (!pidSeg.fields[3]) {
      issues.push({
        severity: 'error',
        segment: 'PID',
        field: 'PID-3',
        message: 'Missing required PID-3 (Patient Identifier)',
        ruleCode: 'ADT-004',
      });
    }
    // PID-5 (Patient Name) required
    if (!pidSeg.fields[5]) {
      issues.push({
        severity: 'error',
        segment: 'PID',
        field: 'PID-5',
        message: 'Missing required PID-5 (Patient Name)',
        ruleCode: 'ADT-005',
      });
    }
  }

  // Must have PV1 segment (Patient Visit)
  const pv1 = getSegments(message, 'PV1');
  if (pv1.length === 0) {
    issues.push({
      severity: 'warning',
      segment: 'PV1',
      message: 'Missing PV1 segment (recommended for ADT)',
      ruleCode: 'ADT-006',
    });
  }

  // Version check
  if (message.version && !message.version.startsWith('2.')) {
    issues.push({
      severity: 'warning',
      field: 'MSH-12',
      message: `Unexpected HL7 version: ${message.version}`,
      ruleCode: 'ADT-007',
    });
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

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

export const adtPack: MessagePack = {
  id: 'adt',
  name: 'ADT -- Patient Movement',
  messageTypes: ADT_EVENTS,
  description: 'Admit, Discharge, Transfer, and Registration messages (A01-A08)',
  validate: validateAdtMessage,
  getRouteTemplate: () => ({
    name: 'ADT Inbound',
    description: 'Route for inbound ADT messages',
    enabled: true,
    priority: 10,
    filter: { messageTypes: ADT_EVENTS },
    transforms: [],
    destination: {
      type: 'dead-letter' as const,
      id: 'adt-dlq',
      name: 'ADT Dead Letter',
      target: '',
    },
  }),
};
