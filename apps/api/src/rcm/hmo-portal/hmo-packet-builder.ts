/**
 * HMO Claim Packet Builder -- Phase 97
 *
 * Builds HmoClaimPacket from Phase 38 Claim domain objects.
 * Pattern: same as Phase 96 buildClaimPacket() but adapted for HMO
 * (no PhilHealth PIN, no case rates; uses memberId/hmoCoverage instead).
 *
 * VistA-first: All data originates from VistA via the Claim entity.
 * This builder is a read-only projection -- it does NOT mutate claims.
 */

import { createHash, randomBytes } from 'node:crypto';
import type { Claim } from '../domain/claim.js';
import type { HmoClaimPacket, DepartmentSpecialty } from './types.js';

/* -- ID Generation -------------------------------------------- */

function newPacketId(): string {
  return `hpkt-${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`;
}

/* -- Content Hash --------------------------------------------- */

function hashPacketContent(packet: Omit<HmoClaimPacket, 'contentHash'>): string {
  const serialized = JSON.stringify({
    sourceClaimId: packet.sourceClaimId,
    payerId: packet.payerId,
    patient: { dfn: packet.patient.dfn, memberId: packet.patient.memberId },
    admissionDate: packet.admissionDate,
    diagnoses: packet.diagnoses,
    procedures: packet.procedures,
    totalCharges: packet.totals.totalCharges,
  });
  return createHash('sha256').update(serialized).digest('hex');
}

/* -- Charge Line Transformer ---------------------------------- */

interface HmoChargeInput {
  category: string;
  description: string;
  code?: string;
  quantity: number;
  unitCharge: number;
  discount?: number;
  hmoCoveragePercent?: number; // 0-1 range, default 0.8
}

function buildChargeLine(input: HmoChargeInput) {
  const qty = input.quantity;
  const unit = input.unitCharge;
  const gross = qty * unit;
  const discount = input.discount ?? 0;
  const net = gross - discount;
  const coveragePct = input.hmoCoveragePercent ?? 0.8;
  const hmoCoverage = Math.round(net * coveragePct * 100) / 100;
  const patientShare = Math.round((net - hmoCoverage) * 100) / 100;

  return {
    category: input.category,
    description: input.description,
    code: input.code,
    quantity: qty,
    unitCharge: unit,
    discount,
    netAmount: net,
    hmoCoverage,
    patientShare,
  };
}

/* -- Build Options -------------------------------------------- */

export interface HmoPacketBuildOptions {
  claim: Claim;
  payerName: string;
  loaReferenceNumber?: string;
  memberId?: string;
  memberType?: 'principal' | 'dependent';
  employerName?: string;
  employerCode?: string;
  facilityCode?: string;
  accreditationNumber?: string;
  tinNumber?: string;
  specialty?: DepartmentSpecialty;
  charges?: HmoChargeInput[];
  professionalFees?: Array<{
    physicianName: string;
    physicianLicense: string;
    feeAmount: number;
    serviceDate: string;
    procedureCode?: string;
  }>;
  actor: string;
}

/* -- Main Builder --------------------------------------------- */

export function buildHmoClaimPacket(opts: HmoPacketBuildOptions): {
  ok: boolean;
  packet?: HmoClaimPacket;
  errors?: string[];
} {
  const { claim } = opts;
  const errors: string[] = [];

  if (!claim.patientDfn) errors.push('Patient DFN is required.');
  if (!claim.payerId) errors.push('Payer ID is required.');
  if (claim.diagnoses.length === 0) errors.push('At least one diagnosis is required.');
  if (!claim.dateOfService) errors.push('Date of service is required.');

  if (errors.length > 0) return { ok: false, errors };

  const now = new Date().toISOString();

  // Build charges from opts or from claim lines
  const chargeLines = opts.charges
    ? opts.charges.map(buildChargeLine)
    : claim.lines.map((line) =>
        buildChargeLine({
          category: line.procedure.codeSystem,
          description: line.procedure.description ?? line.procedure.code,
          code: line.procedure.code,
          quantity: line.procedure.units,
          unitCharge: line.procedure.charge / 100, // cents -> pesos
        })
      );

  const profFees = opts.professionalFees ?? [];

  const totalCharges = chargeLines.reduce((s, c) => s + c.quantity * c.unitCharge, 0);
  const totalDiscount = chargeLines.reduce((s, c) => s + c.discount, 0);
  const totalNetAmount = chargeLines.reduce((s, c) => s + c.netAmount, 0);
  const totalHmoCoverage = chargeLines.reduce((s, c) => s + c.hmoCoverage, 0);
  const totalPatientShare = chargeLines.reduce((s, c) => s + c.patientShare, 0);
  const totalProfessionalFees = profFees.reduce((s, f) => s + f.feeAmount, 0);

  const partial: Omit<HmoClaimPacket, 'contentHash'> = {
    packetId: newPacketId(),
    sourceClaimId: claim.id,
    payerId: claim.payerId,
    payerName: opts.payerName,
    loaReferenceNumber: opts.loaReferenceNumber,
    patient: {
      dfn: claim.patientDfn,
      lastName: claim.patientLastName ?? claim.patientName?.split(',')[0] ?? 'UNKNOWN',
      firstName: claim.patientFirstName ?? claim.patientName?.split(',')[1]?.trim() ?? 'UNKNOWN',
      dob: claim.patientDob,
      sex:
        claim.patientGender === 'M' || claim.patientGender === 'F'
          ? claim.patientGender
          : undefined,
      memberId: opts.memberId ?? claim.subscriberId,
      memberType: opts.memberType,
      employerName: opts.employerName,
      employerCode: opts.employerCode,
    },
    facility: {
      name: claim.facilityName ?? 'Facility',
      code: opts.facilityCode,
      accreditationNumber: opts.accreditationNumber,
      tinNumber: opts.tinNumber ?? claim.facilityTaxId,
    },
    patientType: claim.claimType === 'institutional' ? 'I' : 'O',
    admissionDate: claim.dateOfService,
    specialty: opts.specialty ?? 'general_medicine',
    diagnoses: claim.diagnoses.map((dx) => ({
      code: dx.code,
      description: dx.description,
      type: dx.qualifier === 'principal' ? ('primary' as const) : ('secondary' as const),
    })),
    procedures: claim.lines.map((line) => ({
      code: line.procedure.code,
      description: line.procedure.description,
    })),
    charges: chargeLines,
    professionalFees: profFees,
    totals: {
      totalCharges: Math.round(totalCharges * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalNetAmount: Math.round(totalNetAmount * 100) / 100,
      totalHmoCoverage: Math.round(totalHmoCoverage * 100) / 100,
      totalPatientShare: Math.round(totalPatientShare * 100) / 100,
      totalProfessionalFees: Math.round(totalProfessionalFees * 100) / 100,
    },
    assembledAt: now,
    assembledBy: opts.actor,
  };

  const contentHash = hashPacketContent(partial);
  const packet: HmoClaimPacket = { ...partial, contentHash };

  return { ok: true, packet };
}

/* -- Packet Export: JSON -------------------------------------- */

export function exportHmoPacketJson(packet: HmoClaimPacket): {
  filename: string;
  content: string;
  contentType: string;
  sizeBytes: number;
} {
  const content = JSON.stringify(packet, null, 2);
  return {
    filename: `hmo_claim_${packet.payerId}_${packet.packetId}.json`,
    content,
    contentType: 'application/json',
    sizeBytes: Buffer.byteLength(content, 'utf-8'),
  };
}

/* -- Packet Export: Text Summary ------------------------------ */

function pad(s: string, n: number): string {
  return s.padEnd(n);
}
function line(label: string, value: string | number | undefined): string {
  return `  ${pad(label + ':', 32)} ${value ?? 'N/A'}`;
}
function sep(): string {
  return '-'.repeat(72);
}

export function exportHmoPacketText(packet: HmoClaimPacket): {
  filename: string;
  content: string;
  contentType: string;
  sizeBytes: number;
} {
  const lines: string[] = [];

  lines.push(sep());
  lines.push('  HMO CLAIM PACKET -- FOR MANUAL PORTAL SUBMISSION');
  lines.push(sep());
  lines.push('');
  lines.push(line('Packet ID', packet.packetId));
  lines.push(line('Source Claim', packet.sourceClaimId));
  lines.push(line('Content Hash', packet.contentHash.slice(0, 16) + '...'));
  lines.push('');

  lines.push(sep());
  lines.push('  PAYER');
  lines.push(sep());
  lines.push(line('Payer', `${packet.payerName} (${packet.payerId})`));
  lines.push(line('LOA Reference', packet.loaReferenceNumber));
  lines.push('');

  lines.push(sep());
  lines.push('  PATIENT');
  lines.push(sep());
  lines.push(line('Name', `${packet.patient.lastName}, ${packet.patient.firstName}`));
  lines.push(line('Member ID', packet.patient.memberId));
  lines.push(line('Member Type', packet.patient.memberType));
  lines.push(line('Employer', packet.patient.employerName));
  lines.push('');

  lines.push(sep());
  lines.push('  ENCOUNTER');
  lines.push(sep());
  lines.push(line('Admission Date', packet.admissionDate));
  lines.push(line('Discharge Date', packet.dischargeDate));
  lines.push(line('Patient Type', packet.patientType === 'I' ? 'Inpatient' : 'Outpatient'));
  lines.push(line('Specialty', packet.specialty.replace(/_/g, ' ')));
  lines.push('');

  lines.push(sep());
  lines.push('  DIAGNOSES');
  lines.push(sep());
  for (const dx of packet.diagnoses) {
    lines.push(`  [${dx.type.toUpperCase()}] ${dx.code}  ${dx.description ?? ''}`);
  }
  lines.push('');

  if (packet.procedures.length > 0) {
    lines.push(sep());
    lines.push('  PROCEDURES');
    lines.push(sep());
    for (const proc of packet.procedures) {
      lines.push(`  ${proc.code}  ${proc.description ?? ''}`);
    }
    lines.push('');
  }

  lines.push(sep());
  lines.push('  CHARGES');
  lines.push(sep());
  for (const ch of packet.charges) {
    lines.push(
      `  ${pad(ch.description, 30)} ${ch.quantity}x ${ch.unitCharge.toFixed(2)} = ${ch.netAmount.toFixed(2)}  (HMO: ${ch.hmoCoverage.toFixed(2)})`
    );
  }
  lines.push('');
  lines.push(line('Total Charges', `PHP ${packet.totals.totalCharges.toFixed(2)}`));
  lines.push(line('Total Discount', `PHP ${packet.totals.totalDiscount.toFixed(2)}`));
  lines.push(line('Total Net', `PHP ${packet.totals.totalNetAmount.toFixed(2)}`));
  lines.push(line('HMO Coverage', `PHP ${packet.totals.totalHmoCoverage.toFixed(2)}`));
  lines.push(line('Patient Share', `PHP ${packet.totals.totalPatientShare.toFixed(2)}`));
  lines.push(line('Professional Fees', `PHP ${packet.totals.totalProfessionalFees.toFixed(2)}`));
  lines.push('');

  lines.push(sep());
  lines.push('  ** VERIFY ALL DATA AGAINST VISTA BEFORE PORTAL UPLOAD **');
  lines.push(sep());

  const content = lines.join('\n');
  return {
    filename: `hmo_claim_${packet.payerId}_${packet.packetId}_summary.txt`,
    content,
    contentType: 'text/plain',
    sizeBytes: Buffer.byteLength(content, 'utf-8'),
  };
}
