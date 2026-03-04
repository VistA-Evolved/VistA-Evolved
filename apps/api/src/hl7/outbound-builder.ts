/**
 * HL7v2 Outbound Message Builder — Phase 279 (Wave 9)
 *
 * Builds HL7v2 messages for outbound transmission to external systems.
 * Uses domain event data as input, produces wire-format HL7v2 messages.
 *
 * Supported outbound message types:
 *   ADT^A01 (Admit), ADT^A02 (Transfer), ADT^A03 (Discharge), ADT^A08 (Update)
 *   ORU^R01 (Unsolicited Results)
 *   ORM^O01 (Order)
 *   SIU^S12 (Schedule), SIU^S15 (Cancel)
 *
 * Design:
 *   - Pure functions, no side effects
 *   - Tenant-specific sending facility/application codes
 *   - Generates compliant HL7v2.4 message strings
 *   - PHI passthrough: caller provides data, builder formats only
 */

import { randomUUID } from 'crypto';

/* ── Types ─────────────────────────────────────────────── */

export interface OutboundConfig {
  sendingApplication: string;
  sendingFacility: string;
  receivingApplication: string;
  receivingFacility: string;
  /** HL7 version (default "2.4") */
  version?: string;
  /** Processing ID: P=Production, D=Debug, T=Training (default "P") */
  processingId?: string;
}

export interface AdtOutboundData {
  triggerEvent: 'A01' | 'A02' | 'A03' | 'A08';
  patientMrn: string;
  patientFamilyName: string;
  patientGivenName: string;
  dateOfBirth?: string; // YYYYMMDD
  gender?: string; // M/F/O/U
  patientClass?: string; // I/O/E/P
  assignedLocation?: string;
  attendingProviderId?: string;
  attendingProviderName?: string;
  admitDateTime?: string; // YYYYMMDDHHMMSS
  dischargeDateTime?: string; // YYYYMMDDHHMMSS
}

export interface OruOutboundData {
  patientMrn: string;
  placerOrderNumber: string;
  testCode: string;
  testName: string;
  resultStatus: string; // F/P/C/I
  observations: Array<{
    code: string;
    name: string;
    value: string;
    units?: string;
    abnormalFlag?: string;
    status?: string;
  }>;
  orderingProviderId?: string;
}

export interface OrmOutboundData {
  orderControl: string; // NW/CA/SC/OC/HD
  patientMrn: string;
  placerOrderNumber: string;
  testCode: string;
  testName: string;
  orderDateTime?: string; // YYYYMMDDHHMMSS
  orderingProviderId?: string;
  orderingProviderName?: string;
  priority?: string; // S/R/T (stat/routine/timed)
}

export interface SiuOutboundData {
  triggerEvent: 'S12' | 'S13' | 'S14' | 'S15' | 'S26';
  patientMrn: string;
  appointmentId: string;
  appointmentType?: string;
  durationMinutes?: number;
  scheduledProviderId?: string;
  scheduledProviderName?: string;
  startDateTime?: string; // YYYYMMDDHHMMSS
  resource?: string;
}

export interface OutboundResult {
  ok: boolean;
  message: string;
  messageControlId: string;
  messageType: string;
  errors: string[];
}

/* ── Helpers ───────────────────────────────────────────── */

const SEG_SEP = '\r';

function hl7Now(): string {
  const d = new Date();
  return (
    d.getFullYear().toString() +
    (d.getMonth() + 1).toString().padStart(2, '0') +
    d.getDate().toString().padStart(2, '0') +
    d.getHours().toString().padStart(2, '0') +
    d.getMinutes().toString().padStart(2, '0') +
    d.getSeconds().toString().padStart(2, '0')
  );
}

function newControlId(): string {
  return randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase();
}

function buildMsh(
  config: OutboundConfig,
  messageType: string,
  triggerEvent: string,
  controlId: string
): string {
  const version = config.version || '2.4';
  const processingId = config.processingId || 'P';
  // MSH|^~\&|SendApp|SendFac|RecvApp|RecvFac|DateTime||MsgType^Trigger|ControlId|ProcId|Version
  return [
    'MSH',
    '^~\\&',
    config.sendingApplication,
    config.sendingFacility,
    config.receivingApplication,
    config.receivingFacility,
    hl7Now(),
    '', // security
    `${messageType}^${triggerEvent}`,
    controlId,
    processingId,
    version,
  ].join('|');
}

function buildEvn(triggerEvent: string, dateTime?: string): string {
  return ['EVN', triggerEvent, dateTime || hl7Now()].join('|');
}

function buildPid(data: {
  mrn: string;
  family: string;
  given: string;
  dob?: string;
  gender?: string;
}): string {
  const fields = new Array(31).fill('');
  fields[0] = 'PID';
  fields[1] = '1'; // Set ID
  fields[3] = `${data.mrn}^^^MRN`; // Patient identifier list
  fields[5] = `${data.family}^${data.given}`; // Patient name
  if (data.dob) fields[7] = data.dob;
  if (data.gender) fields[8] = data.gender;
  return fields.join('|');
}

function buildPv1(data: {
  patientClass?: string;
  location?: string;
  attendingId?: string;
  attendingName?: string;
  admitDate?: string;
  dischargeDate?: string;
}): string {
  const fields = new Array(52).fill('');
  fields[0] = 'PV1';
  fields[1] = '1'; // Set ID
  fields[2] = data.patientClass || 'I';
  if (data.location) fields[3] = data.location;
  if (data.attendingId) {
    fields[7] = data.attendingName ? `${data.attendingId}^${data.attendingName}` : data.attendingId;
  }
  if (data.admitDate) fields[44] = data.admitDate;
  if (data.dischargeDate) fields[45] = data.dischargeDate;
  return fields.join('|');
}

/* ── ADT Builder ───────────────────────────────────────── */

export function buildAdtMessage(config: OutboundConfig, data: AdtOutboundData): OutboundResult {
  const errors: string[] = [];
  if (!data.patientMrn) errors.push('patientMrn is required');
  if (!data.patientFamilyName) errors.push('patientFamilyName is required');

  if (errors.length > 0) {
    return {
      ok: false,
      message: '',
      messageControlId: '',
      messageType: `ADT^${data.triggerEvent}`,
      errors,
    };
  }

  const controlId = newControlId();
  const segments = [
    buildMsh(config, 'ADT', data.triggerEvent, controlId),
    buildEvn(data.triggerEvent, data.admitDateTime),
    buildPid({
      mrn: data.patientMrn,
      family: data.patientFamilyName,
      given: data.patientGivenName,
      dob: data.dateOfBirth,
      gender: data.gender,
    }),
    buildPv1({
      patientClass: data.patientClass,
      location: data.assignedLocation,
      attendingId: data.attendingProviderId,
      attendingName: data.attendingProviderName,
      admitDate: data.admitDateTime,
      dischargeDate: data.dischargeDateTime,
    }),
  ];

  return {
    ok: true,
    message: segments.join(SEG_SEP) + SEG_SEP,
    messageControlId: controlId,
    messageType: `ADT^${data.triggerEvent}`,
    errors: [],
  };
}

/* ── ORU Builder ───────────────────────────────────────── */

export function buildOruMessage(config: OutboundConfig, data: OruOutboundData): OutboundResult {
  const errors: string[] = [];
  if (!data.patientMrn) errors.push('patientMrn is required');
  if (!data.testCode) errors.push('testCode is required');

  if (errors.length > 0) {
    return { ok: false, message: '', messageControlId: '', messageType: 'ORU^R01', errors };
  }

  const controlId = newControlId();
  const segments: string[] = [
    buildMsh(config, 'ORU', 'R01', controlId),
    buildPid({ mrn: data.patientMrn, family: '', given: '' }),
  ];

  // ORC — Common Order
  const orcFields = new Array(20).fill('');
  orcFields[0] = 'ORC';
  orcFields[1] = 'RE'; // Result/Observation
  orcFields[2] = data.placerOrderNumber;
  if (data.orderingProviderId) orcFields[12] = data.orderingProviderId;
  segments.push(orcFields.join('|'));

  // OBR — Observation Request
  const obrFields = new Array(30).fill('');
  obrFields[0] = 'OBR';
  obrFields[1] = '1'; // Set ID
  obrFields[2] = data.placerOrderNumber;
  obrFields[4] = `${data.testCode}^${data.testName}`;
  obrFields[25] = data.resultStatus;
  segments.push(obrFields.join('|'));

  // OBX — Observation/Result segments
  data.observations.forEach((obs, idx) => {
    const obxFields = new Array(15).fill('');
    obxFields[0] = 'OBX';
    obxFields[1] = String(idx + 1); // Set ID
    obxFields[2] = 'NM'; // Value type (default numeric)
    obxFields[3] = `${obs.code}^${obs.name}`;
    obxFields[5] = obs.value;
    if (obs.units) obxFields[6] = obs.units;
    if (obs.abnormalFlag) obxFields[8] = obs.abnormalFlag;
    obxFields[11] = obs.status || 'F';
    segments.push(obxFields.join('|'));
  });

  return {
    ok: true,
    message: segments.join(SEG_SEP) + SEG_SEP,
    messageControlId: controlId,
    messageType: 'ORU^R01',
    errors: [],
  };
}

/* ── ORM Builder ───────────────────────────────────────── */

export function buildOrmMessage(config: OutboundConfig, data: OrmOutboundData): OutboundResult {
  const errors: string[] = [];
  if (!data.patientMrn) errors.push('patientMrn is required');
  if (!data.testCode) errors.push('testCode is required');

  if (errors.length > 0) {
    return { ok: false, message: '', messageControlId: '', messageType: 'ORM^O01', errors };
  }

  const controlId = newControlId();
  const segments: string[] = [
    buildMsh(config, 'ORM', 'O01', controlId),
    buildPid({ mrn: data.patientMrn, family: '', given: '' }),
  ];

  // ORC
  const orcFields = new Array(20).fill('');
  orcFields[0] = 'ORC';
  orcFields[1] = data.orderControl;
  orcFields[2] = data.placerOrderNumber;
  if (data.orderDateTime) orcFields[9] = data.orderDateTime;
  if (data.orderingProviderId) {
    orcFields[12] = data.orderingProviderName
      ? `${data.orderingProviderId}^${data.orderingProviderName}`
      : data.orderingProviderId;
  }
  segments.push(orcFields.join('|'));

  // OBR
  const obrFields = new Array(30).fill('');
  obrFields[0] = 'OBR';
  obrFields[1] = '1';
  obrFields[2] = data.placerOrderNumber;
  obrFields[4] = `${data.testCode}^${data.testName}`;
  if (data.priority) obrFields[27] = data.priority;
  segments.push(obrFields.join('|'));

  return {
    ok: true,
    message: segments.join(SEG_SEP) + SEG_SEP,
    messageControlId: controlId,
    messageType: 'ORM^O01',
    errors: [],
  };
}

/* ── SIU Builder ───────────────────────────────────────── */

export function buildSiuMessage(config: OutboundConfig, data: SiuOutboundData): OutboundResult {
  const errors: string[] = [];
  if (!data.patientMrn) errors.push('patientMrn is required');
  if (!data.appointmentId) errors.push('appointmentId is required');

  if (errors.length > 0) {
    return {
      ok: false,
      message: '',
      messageControlId: '',
      messageType: `SIU^${data.triggerEvent}`,
      errors,
    };
  }

  const controlId = newControlId();
  const segments: string[] = [
    buildMsh(config, 'SIU', data.triggerEvent, controlId),
    buildPid({ mrn: data.patientMrn, family: '', given: '' }),
  ];

  // SCH — Schedule Activity
  const schFields = new Array(20).fill('');
  schFields[0] = 'SCH';
  schFields[1] = data.appointmentId;
  if (data.appointmentType) schFields[7] = data.appointmentType;
  if (data.durationMinutes) schFields[9] = String(data.durationMinutes);
  if (data.scheduledProviderId) {
    schFields[12] = data.scheduledProviderName
      ? `${data.scheduledProviderId}^${data.scheduledProviderName}`
      : data.scheduledProviderId;
  }
  segments.push(schFields.join('|'));

  // AIS — Appointment Information - Service
  if (data.resource || data.startDateTime) {
    const aisFields = new Array(10).fill('');
    aisFields[0] = 'AIS';
    aisFields[1] = '1';
    if (data.resource) aisFields[3] = data.resource;
    if (data.startDateTime) aisFields[4] = data.startDateTime;
    segments.push(aisFields.join('|'));
  }

  return {
    ok: true,
    message: segments.join(SEG_SEP) + SEG_SEP,
    messageControlId: controlId,
    messageType: `SIU^${data.triggerEvent}`,
    errors: [],
  };
}

/* ── Builder Registry ──────────────────────────────────── */

/**
 * List all supported outbound message types.
 */
export function listOutboundMessageTypes(): string[] {
  return [
    'ADT^A01',
    'ADT^A02',
    'ADT^A03',
    'ADT^A08',
    'ORU^R01',
    'ORM^O01',
    'SIU^S12',
    'SIU^S13',
    'SIU^S14',
    'SIU^S15',
    'SIU^S26',
  ];
}
