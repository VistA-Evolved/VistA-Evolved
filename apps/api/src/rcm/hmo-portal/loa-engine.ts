/**
 * HMO LOA Engine — Enterprise-Grade LOA Packet Generation
 *
 * Phase 97: Generates LOA request packets from clinical data.
 *
 * Features:
 *   - PDF text and structured JSON export
 *   - Specialty-aware templates by department
 *   - Attachment metadata tracking
 *   - SHA-256 content hash for integrity
 *
 * VistA-first: All clinical data is sourced from the Phase 94 LoaRequest,
 * which itself references VistA encounter/order data.
 */

import { createHash, randomBytes } from 'node:crypto';
import type { LoaRequest } from '../loa/loa-types.js';
import type {
  LoaPacket,
  LoaPacketExport,
  LoaPacketFormat,
  LoaPacketTemplate,
  DepartmentSpecialty,
} from './types.js';

/* ── ID Generation ──────────────────────────────────────────── */

function newLoaPacketId(): string {
  return `lpkt-${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`;
}

/* ── Specialty Templates ────────────────────────────────────── */

const SPECIALTY_TEMPLATES: Record<DepartmentSpecialty, LoaPacketTemplate> = {
  general_medicine: {
    specialty: 'general_medicine',
    requiredFields: ['diagnoses', 'procedures', 'encounterDate', 'attendingPhysician'],
    recommendedAttachments: ['clinical_note', 'lab_result'],
  },
  surgery: {
    specialty: 'surgery',
    requiredFields: [
      'diagnoses',
      'procedures',
      'encounterDate',
      'attendingPhysician',
      'estimatedDays',
    ],
    recommendedAttachments: ['clinical_note', 'imaging_report', 'lab_result', 'consent_form'],
    payerSpecificNotes: 'Most HMOs require pre-authorization for elective surgical procedures.',
  },
  obstetrics_gynecology: {
    specialty: 'obstetrics_gynecology',
    requiredFields: ['diagnoses', 'procedures', 'encounterDate', 'attendingPhysician'],
    recommendedAttachments: ['clinical_note', 'ultrasound_report', 'lab_result'],
    payerSpecificNotes:
      'Normal spontaneous delivery (NSD) usually covered under LOA. Caesarean may require additional approval.',
  },
  pediatrics: {
    specialty: 'pediatrics',
    requiredFields: ['diagnoses', 'procedures', 'encounterDate', 'attendingPhysician'],
    recommendedAttachments: ['clinical_note', 'lab_result', 'vaccination_record'],
  },
  orthopedics: {
    specialty: 'orthopedics',
    requiredFields: [
      'diagnoses',
      'procedures',
      'encounterDate',
      'attendingPhysician',
      'estimatedDays',
    ],
    recommendedAttachments: ['clinical_note', 'imaging_report', 'mri_report'],
    payerSpecificNotes: 'Orthopedic implants often require separate LOA line items.',
  },
  cardiology: {
    specialty: 'cardiology',
    requiredFields: ['diagnoses', 'procedures', 'encounterDate', 'attendingPhysician'],
    recommendedAttachments: ['clinical_note', 'ecg_report', 'echocardiogram', 'lab_result'],
    payerSpecificNotes: 'Cardiac catheterization and stenting require separate pre-auth.',
  },
  neurology: {
    specialty: 'neurology',
    requiredFields: ['diagnoses', 'procedures', 'encounterDate', 'attendingPhysician'],
    recommendedAttachments: ['clinical_note', 'ct_mri_report', 'eeg_report'],
  },
  oncology: {
    specialty: 'oncology',
    requiredFields: [
      'diagnoses',
      'procedures',
      'encounterDate',
      'attendingPhysician',
      'estimatedDays',
    ],
    recommendedAttachments: [
      'clinical_note',
      'biopsy_report',
      'imaging_report',
      'treatment_protocol',
    ],
    payerSpecificNotes: 'Chemotherapy sessions may require per-cycle LOA. Confirm with HMO.',
  },
  emergency: {
    specialty: 'emergency',
    requiredFields: ['diagnoses', 'encounterDate', 'attendingPhysician'],
    recommendedAttachments: ['er_record', 'triage_note'],
    payerSpecificNotes:
      "Emergency LOA may be waived for 24-48 hours. Confirm payer's emergency policy.",
  },
  rehabilitation: {
    specialty: 'rehabilitation',
    requiredFields: [
      'diagnoses',
      'procedures',
      'encounterDate',
      'attendingPhysician',
      'estimatedDays',
    ],
    recommendedAttachments: ['clinical_note', 'rehabilitation_plan', 'progress_note'],
  },
  psychiatry: {
    specialty: 'psychiatry',
    requiredFields: ['diagnoses', 'encounterDate', 'attendingPhysician'],
    recommendedAttachments: ['clinical_note', 'psychiatric_evaluation'],
    payerSpecificNotes: 'Many HMOs limit psychiatric coverage to specific session counts.',
  },
  ophthalmology: {
    specialty: 'ophthalmology',
    requiredFields: ['diagnoses', 'procedures', 'encounterDate', 'attendingPhysician'],
    recommendedAttachments: ['clinical_note', 'visual_acuity_report'],
  },
  ent: {
    specialty: 'ent',
    requiredFields: ['diagnoses', 'procedures', 'encounterDate', 'attendingPhysician'],
    recommendedAttachments: ['clinical_note', 'audiometry_report'],
  },
  dermatology: {
    specialty: 'dermatology',
    requiredFields: ['diagnoses', 'encounterDate', 'attendingPhysician'],
    recommendedAttachments: ['clinical_note', 'biopsy_report'],
  },
  dental: {
    specialty: 'dental',
    requiredFields: ['diagnoses', 'procedures', 'encounterDate', 'attendingPhysician'],
    recommendedAttachments: ['dental_record', 'panoramic_xray'],
    payerSpecificNotes: 'Dental coverage varies widely. Some HMOs cover only basic procedures.',
  },
  other: {
    specialty: 'other',
    requiredFields: ['diagnoses', 'encounterDate', 'attendingPhysician'],
    recommendedAttachments: ['clinical_note'],
  },
};

export function getSpecialtyTemplate(specialty: DepartmentSpecialty): LoaPacketTemplate {
  return SPECIALTY_TEMPLATES[specialty] ?? SPECIALTY_TEMPLATES.other;
}

export function listSpecialtyTemplates(): LoaPacketTemplate[] {
  return Object.values(SPECIALTY_TEMPLATES);
}

/* ── Content Hash ───────────────────────────────────────────── */

function hashLoaPacketContent(packet: Omit<LoaPacket, 'contentHash'>): string {
  const serialized = JSON.stringify({
    patientDfn: packet.patientDfn,
    payerId: packet.payerId,
    encounterDate: packet.encounterDate,
    specialty: packet.specialty,
    diagnoses: packet.diagnoses,
    procedures: packet.procedures,
    requestedServices: packet.requestedServices,
  });
  return createHash('sha256').update(serialized).digest('hex');
}

/* ── LOA Packet Builder ─────────────────────────────────────── */

export interface LoaPacketBuildOptions {
  loaRequest: LoaRequest;
  specialty: DepartmentSpecialty;
  admissionType: 'outpatient' | 'inpatient' | 'daycare' | 'emergency';
  requestedServices: string[];
  estimatedDays?: number;
  estimatedCharges?: number;
  attendingPhysicianLicense?: string;
  facilityCode?: string;
  actor: string;
}

export function buildLoaPacket(opts: LoaPacketBuildOptions): {
  ok: boolean;
  packet?: LoaPacket;
  errors?: string[];
} {
  const { loaRequest: loa } = opts;
  const errors: string[] = [];

  if (!loa.patientDfn) errors.push('Patient DFN is required.');
  if (!loa.payerId) errors.push('Payer ID is required.');
  if (!loa.encounterDate) errors.push('Encounter date is required.');
  if (loa.diagnosisCodes.length === 0) errors.push('At least one diagnosis is required.');
  if (opts.requestedServices.length === 0)
    errors.push('At least one requested service is required.');

  if (errors.length > 0) return { ok: false, errors };

  const now = new Date().toISOString();

  const partial: Omit<LoaPacket, 'contentHash'> = {
    packetId: newLoaPacketId(),
    loaRequestId: loa.id,
    payerId: loa.payerId,
    payerName: loa.payerName ?? loa.payerId,
    patientName: loa.patientName ?? 'Patient',
    patientDfn: loa.patientDfn,
    memberId: loa.memberId,
    encounterDate: loa.encounterDate,
    encounterIen: loa.encounterIen,
    specialty: opts.specialty,
    admissionType: opts.admissionType,
    diagnoses: loa.diagnosisCodes.map((d, i) => ({
      code: d.code,
      codeSystem: d.codeSystem,
      description: d.description,
      isPrimary: i === 0,
    })),
    procedures: loa.procedureCodes.map((p) => ({
      code: p.code,
      codeSystem: p.codeSystem,
      description: p.description,
    })),
    requestedServices: opts.requestedServices,
    estimatedDays: opts.estimatedDays,
    estimatedCharges: opts.estimatedCharges,
    attendingPhysician: loa.providerName ?? 'Attending Physician',
    attendingPhysicianLicense: opts.attendingPhysicianLicense,
    facilityName: loa.facilityName ?? 'Facility',
    facilityCode: opts.facilityCode,
    attachmentRefs: loa.attachments.map((a) => ({
      id: a.id,
      filename: a.filename,
      category: a.category,
    })),
    generatedAt: now,
    generatedBy: opts.actor,
  };

  const contentHash = hashLoaPacketContent(partial);
  const packet: LoaPacket = { ...partial, contentHash };

  return { ok: true, packet };
}

/* ── LOA Packet Export: JSON ────────────────────────────────── */

function generateLoaJson(packet: LoaPacket): LoaPacketExport {
  const content = JSON.stringify(packet, null, 2);
  const now = new Date().toISOString();
  return {
    format: 'json',
    filename: `loa_${packet.payerId}_${packet.packetId}_${now.slice(0, 10)}.json`,
    content,
    contentType: 'application/json',
    sizeBytes: Buffer.byteLength(content, 'utf-8'),
    generatedAt: now,
  };
}

/* ── LOA Packet Export: PDF Text ────────────────────────────── */

function pad(s: string, len: number): string {
  return s.padEnd(len);
}

function line(label: string, value: string | undefined | number): string {
  const v = value === undefined || value === null ? 'N/A' : String(value);
  return `  ${pad(label + ':', 32)} ${v}`;
}

function separator(): string {
  return '-'.repeat(72);
}

function generateLoaPdfText(packet: LoaPacket): LoaPacketExport {
  const now = new Date().toISOString();
  const lines: string[] = [];

  lines.push(separator());
  lines.push('  LETTER OF AUTHORIZATION (LOA) REQUEST');
  lines.push('  FOR MANUAL PORTAL SUBMISSION');
  lines.push(separator());
  lines.push('');
  lines.push(line('Packet ID', packet.packetId));
  lines.push(line('Generated', now.slice(0, 19).replace('T', ' ')));
  lines.push(line('Content Hash', packet.contentHash.slice(0, 16) + '...'));
  lines.push('');

  // Payer
  lines.push(separator());
  lines.push('  PAYER INFORMATION');
  lines.push(separator());
  lines.push(line('Payer', packet.payerName));
  lines.push(line('Payer ID', packet.payerId));
  lines.push(line('Member ID', packet.memberId));
  lines.push('');

  // Patient
  lines.push(separator());
  lines.push('  PATIENT INFORMATION');
  lines.push(separator());
  lines.push(line('Patient Name', packet.patientName));
  lines.push(line('Encounter Date', packet.encounterDate));
  lines.push(line('Specialty', packet.specialty.replace(/_/g, ' ')));
  lines.push(line('Admission Type', packet.admissionType));
  lines.push(line('Estimated Days', packet.estimatedDays));
  lines.push(
    line(
      'Estimated Charges',
      packet.estimatedCharges ? `PHP ${packet.estimatedCharges.toFixed(2)}` : undefined
    )
  );
  lines.push('');

  // Provider / Facility
  lines.push(separator());
  lines.push('  PROVIDER / FACILITY');
  lines.push(separator());
  lines.push(line('Attending Physician', packet.attendingPhysician));
  lines.push(line('License No.', packet.attendingPhysicianLicense));
  lines.push(line('Facility', packet.facilityName));
  lines.push(line('Facility Code', packet.facilityCode));
  lines.push('');

  // Diagnoses
  lines.push(separator());
  lines.push('  DIAGNOSES');
  lines.push(separator());
  for (const dx of packet.diagnoses) {
    const primary = dx.isPrimary ? ' [PRIMARY]' : '';
    lines.push(`  ${dx.code} (${dx.codeSystem})  ${dx.description ?? ''}${primary}`);
  }
  lines.push('');

  // Procedures
  if (packet.procedures.length > 0) {
    lines.push(separator());
    lines.push('  PROCEDURES / SERVICES');
    lines.push(separator());
    for (const proc of packet.procedures) {
      lines.push(`  ${proc.code} (${proc.codeSystem})  ${proc.description ?? ''}`);
    }
    lines.push('');
  }

  // Requested services
  lines.push(separator());
  lines.push('  REQUESTED SERVICES');
  lines.push(separator());
  for (const svc of packet.requestedServices) {
    lines.push(`  - ${svc}`);
  }
  lines.push('');

  // Attachments
  if (packet.attachmentRefs.length > 0) {
    lines.push(separator());
    lines.push('  ATTACHMENTS');
    lines.push(separator());
    for (const att of packet.attachmentRefs) {
      lines.push(`  [${att.category}] ${att.filename}`);
    }
    lines.push('');
  }

  // Footer
  lines.push(separator());
  lines.push('  ** THIS IS A SYSTEM-GENERATED LOA REQUEST FOR MANUAL PORTAL SUBMISSION **');
  lines.push('  ** Verify all data against VistA source records before uploading.        **');
  lines.push(separator());

  const content = lines.join('\n');
  return {
    format: 'pdf_text',
    filename: `loa_${packet.payerId}_${packet.packetId}_${now.slice(0, 10)}_summary.txt`,
    content,
    contentType: 'text/plain',
    sizeBytes: Buffer.byteLength(content, 'utf-8'),
    generatedAt: now,
  };
}

/* ── Generate LOA Exports ───────────────────────────────────── */

export function generateLoaExports(
  packet: LoaPacket,
  formats?: LoaPacketFormat[]
): LoaPacketExport[] {
  const fmts = formats ?? ['json', 'pdf_text'];
  const exports: LoaPacketExport[] = [];

  for (const fmt of fmts) {
    switch (fmt) {
      case 'json':
        exports.push(generateLoaJson(packet));
        break;
      case 'pdf_text':
        exports.push(generateLoaPdfText(packet));
        break;
    }
  }

  return exports;
}
