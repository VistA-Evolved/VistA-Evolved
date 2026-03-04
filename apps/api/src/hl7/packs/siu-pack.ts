/**
 * HL7v2 Message Packs — SIU (Scheduling)
 *
 * Phase 241 (Wave 6 P4): Builders and validators for SIU messages.
 * SIU^S12 (New Appointment), S13 (Rescheduled), S14 (Modified), S15 (Cancelled).
 */

import type { Hl7Message } from '../types.js';
import { HL7_FIELD_SEP, HL7_SEGMENT_SEP } from '../types.js';
import { getSegments } from '../parser.js';
import type {
  MessagePack,
  PatientDemographics,
  ValidationResult,
  ValidationIssue,
} from './types.js';

/* ------------------------------------------------------------------ */
/*  SIU Event Types                                                    */
/* ------------------------------------------------------------------ */

const SIU_EVENTS = ['SIU^S12', 'SIU^S13', 'SIU^S14', 'SIU^S15'];

/* ------------------------------------------------------------------ */
/*  Scheduling Types                                                   */
/* ------------------------------------------------------------------ */

export interface ScheduleInfo {
  /** Placer appointment ID */
  placerAppointmentId: string;
  /** Filler appointment ID */
  fillerAppointmentId?: string;
  /** Appointment reason (code^description) */
  appointmentReason?: string;
  /** Appointment type (code^description) */
  appointmentType?: string;
  /** Start date/time — YYYYMMDDHHMMSS */
  startDateTime: string;
  /** Duration in minutes */
  durationMinutes?: number;
  /** Location (resource) */
  location?: string;
  /** Provider ID */
  providerId?: string;
  /** Provider name */
  providerName?: string;
}

/* ------------------------------------------------------------------ */
/*  Builder                                                            */
/* ------------------------------------------------------------------ */

/** Build a SIU^S12 (New Appointment Notification) message. */
export function buildSiuS12(
  patient: PatientDemographics,
  schedule: ScheduleInfo,
  opts?: { sendingApp?: string; sendingFacility?: string }
): string {
  return buildSiuMessage('SIU^S12^SIU_S12', patient, schedule, opts);
}

/** Build a SIU^S13 (Rescheduled) message. */
export function buildSiuS13(
  patient: PatientDemographics,
  schedule: ScheduleInfo,
  opts?: { sendingApp?: string; sendingFacility?: string }
): string {
  return buildSiuMessage('SIU^S13^SIU_S13', patient, schedule, opts);
}

/** Build a SIU^S14 (Modified) message. */
export function buildSiuS14(
  patient: PatientDemographics,
  schedule: ScheduleInfo,
  opts?: { sendingApp?: string; sendingFacility?: string }
): string {
  return buildSiuMessage('SIU^S14^SIU_S14', patient, schedule, opts);
}

/** Build a SIU^S15 (Cancelled) message. */
export function buildSiuS15(
  patient: PatientDemographics,
  schedule: ScheduleInfo,
  opts?: { sendingApp?: string; sendingFacility?: string }
): string {
  return buildSiuMessage('SIU^S15^SIU_S15', patient, schedule, opts);
}

function buildSiuMessage(
  messageType: string,
  patient: PatientDemographics,
  schedule: ScheduleInfo,
  opts?: { sendingApp?: string; sendingFacility?: string }
): string {
  const now = formatHl7DateTime();
  const controlId = `SIU${Date.now()}`;
  const sep = HL7_FIELD_SEP;
  const cr = HL7_SEGMENT_SEP;

  const sendApp = opts?.sendingApp || 'VISTA_EVOLVED';
  const sendFac = opts?.sendingFacility || 'VE';

  const msh = `MSH${sep}^~\\&${sep}${sendApp}${sep}${sendFac}${sep}${sep}${sep}${now}${sep}${sep}${messageType}${sep}${controlId}${sep}P${sep}2.4`;

  const sch = buildSch(schedule, sep);

  const auth = patient.assigningAuthority || 'MRN';
  const pid = `PID${sep}1${sep}${sep}${patient.patientId}^^^${auth}${sep}${sep}${patient.lastName}^${patient.firstName}${sep}${sep}${patient.dob || ''}${sep}${patient.sex || 'U'}`;

  const rgs = `RGS${sep}1`;

  const provider = schedule.providerId
    ? `AIP${sep}1${sep}${sep}${schedule.providerId}^${schedule.providerName || ''}`
    : '';
  const location = schedule.location ? `AIL${sep}1${sep}${sep}${schedule.location}` : '';

  const segments = [msh, sch, pid, rgs];
  if (location) segments.push(location);
  if (provider) segments.push(provider);

  return segments.join(cr);
}

function buildSch(s: ScheduleInfo, sep: string): string {
  const duration = s.durationMinutes ? `${s.durationMinutes}^min` : '';
  return `SCH${sep}${s.placerAppointmentId}${sep}${s.fillerAppointmentId || ''}${sep}${sep}${sep}${sep}${sep}${s.appointmentReason || ''}${sep}${s.appointmentType || ''}${sep}${sep}${duration}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${sep}${s.startDateTime}`;
}

function formatHl7DateTime(): string {
  const d = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/* ------------------------------------------------------------------ */
/*  Validator                                                          */
/* ------------------------------------------------------------------ */

/** Validate a SIU message for structural correctness. */
export function validateSiuMessage(message: Hl7Message): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Must be SIU message type
  if (!message.messageType.startsWith('SIU^')) {
    issues.push({
      severity: 'error',
      segment: 'MSH',
      field: 'MSH-9',
      message: `Expected SIU message type, got ${message.messageType}`,
      ruleCode: 'SIU-001',
    });
  }

  // Must have SCH segment
  const sch = getSegments(message, 'SCH');
  if (sch.length === 0) {
    issues.push({
      severity: 'error',
      segment: 'SCH',
      message: 'Missing required SCH segment (Scheduling Info)',
      ruleCode: 'SIU-002',
    });
  } else {
    const schSeg = sch[0]!;
    // SCH-1 (Placer Appointment ID) required
    if (!schSeg.fields[1]) {
      issues.push({
        severity: 'error',
        segment: 'SCH',
        field: 'SCH-1',
        message: 'Missing required SCH-1 (Placer Appointment ID)',
        ruleCode: 'SIU-003',
      });
    }
  }

  // Must have PID segment
  const pid = getSegments(message, 'PID');
  if (pid.length === 0) {
    issues.push({
      severity: 'error',
      segment: 'PID',
      message: 'Missing required PID segment',
      ruleCode: 'SIU-004',
    });
  }

  // Should have RGS segment
  const rgs = getSegments(message, 'RGS');
  if (rgs.length === 0) {
    issues.push({
      severity: 'warning',
      segment: 'RGS',
      message: 'Missing RGS segment (Resource Group, recommended)',
      ruleCode: 'SIU-005',
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

export const siuPack: MessagePack = {
  id: 'siu',
  name: 'SIU — Scheduling',
  messageTypes: SIU_EVENTS,
  description:
    'Scheduling messages: new appointment (S12), reschedule (S13), modify (S14), cancel (S15)',
  validate: validateSiuMessage,
  getRouteTemplate: () => ({
    name: 'SIU Inbound',
    description: 'Route for inbound SIU scheduling messages',
    enabled: true,
    priority: 25,
    filter: { messageTypes: SIU_EVENTS },
    transforms: [],
    destination: {
      type: 'dead-letter' as const,
      id: 'siu-dlq',
      name: 'SIU Dead Letter',
      target: '',
    },
  }),
};
