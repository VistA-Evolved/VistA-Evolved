/**
 * PhilHealth eClaims 3.0 — Claim Packet Builder
 *
 * Phase 96: Assembles a normalized ClaimPacket from a PhilHealthClaimDraft.
 *
 * VistA-first: All clinical/billing data is sourced from the Phase 90
 * PhilHealthClaimDraft, which itself is grounded in VistA encounter data.
 * This builder does NOT recreate billing logic — it packages what VistA provides.
 *
 * The ClaimPacket is the single canonical internal object from which all
 * export formats (JSON, PDF text, XML) are generated.
 */

import { createHash, randomBytes } from 'node:crypto';
import type { PhilHealthClaimDraft } from '../payerOps/philhealth-types.js';
import type { ClaimPacket } from './types.js';

/* ── Packet ID Generation ───────────────────────────────────── */

function newPacketId(): string {
  return `pkt-${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`;
}

/* ── Content Hashing ────────────────────────────────────────── */

function hashPacketContent(packet: Omit<ClaimPacket, 'contentHash'>): string {
  const serialized = JSON.stringify({
    patient: packet.patient,
    facility: packet.facility,
    patientType: packet.patientType,
    admissionDate: packet.admissionDate,
    dischargeDate: packet.dischargeDate,
    diagnoses: packet.diagnoses,
    procedures: packet.procedures,
    charges: packet.charges,
    professionalFees: packet.professionalFees,
    totals: packet.totals,
  });
  return createHash('sha256').update(serialized).digest('hex');
}

/* ── Builder ────────────────────────────────────────────────── */

export interface PacketBuilderOptions {
  facilityCode: string;
  facilityName: string;
  accreditationNumber?: string;
  tinNumber?: string;
  actor: string;
}

/**
 * Build a ClaimPacket from a PhilHealthClaimDraft.
 *
 * The draft must have at least:
 *   - Patient demographics (name, PIN)
 *   - At least one diagnosis
 *   - Admission date
 *
 * Returns { ok, packet?, errors? }.
 */
export function buildClaimPacket(
  draft: PhilHealthClaimDraft,
  opts: PacketBuilderOptions
): { ok: boolean; packet?: ClaimPacket; errors?: string[] } {
  const errors: string[] = [];

  // Validate minimum required fields
  if (!draft.patientLastName || !draft.patientFirstName) {
    errors.push('Patient name is required.');
  }
  if (!draft.philhealthPin) {
    errors.push('PhilHealth PIN is required.');
  }
  if (!opts.facilityCode) {
    errors.push('Facility code is required.');
  }
  if (!draft.admissionDate) {
    errors.push('Admission/encounter date is required.');
  }
  if (draft.diagnoses.length === 0) {
    errors.push('At least one diagnosis is required.');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Compute totals from charge lines
  const totalCharges = draft.charges.reduce((s, c) => s + c.unitCharge * c.quantity, 0);
  const totalDiscount = draft.charges.reduce((s, c) => s + c.discount, 0);
  const totalNetAmount = draft.charges.reduce((s, c) => s + c.netAmount, 0);
  const totalPhicCoverage = draft.charges.reduce((s, c) => s + c.phicCoverage, 0);
  const totalPatientShare = draft.charges.reduce((s, c) => s + c.patientShare, 0);
  const totalProfessionalFees = draft.professionalFees.reduce((s, f) => s + f.feeAmount, 0);

  const now = new Date().toISOString();

  const partialPacket: Omit<ClaimPacket, 'contentHash'> = {
    packetId: newPacketId(),
    eclaimsVersion: '3.0',
    sourceClaimDraftId: draft.id,
    encounterIen: draft.encounterIen,
    patient: {
      dfn: draft.patientDfn,
      lastName: draft.patientLastName,
      firstName: draft.patientFirstName,
      middleName: draft.patientMiddleName,
      dob: draft.patientDob,
      sex: draft.patientSex,
      philhealthPin: draft.philhealthPin,
      memberPin: draft.memberPin,
      memberRelationship: draft.memberRelationship,
    },
    facility: {
      facilityCode: opts.facilityCode,
      facilityName: opts.facilityName,
      accreditationNumber: opts.accreditationNumber,
      tinNumber: opts.tinNumber,
    },
    patientType: draft.patientType,
    admissionDate: draft.admissionDate,
    dischargeDate: draft.dischargeDate,
    caseRateCode: draft.caseRateCode,
    caseRateDescription: draft.caseRateDescription,
    diagnoses: draft.diagnoses.map((d) => ({
      icdCode: d.icdCode,
      description: d.description,
      type: d.type,
    })),
    procedures: draft.procedures.map((p) => ({
      code: p.code,
      description: p.description,
      laterality: p.laterality,
    })),
    charges: draft.charges.map((c) => ({
      category: c.category,
      description: c.description,
      code: c.code,
      quantity: c.quantity,
      unitCharge: c.unitCharge,
      discount: c.discount,
      netAmount: c.netAmount,
      phicCoverage: c.phicCoverage,
      patientShare: c.patientShare,
    })),
    professionalFees: draft.professionalFees.map((f) => ({
      physicianName: f.physicianName,
      physicianLicense: f.physicianLicense,
      accreditationNumber: f.accreditationNumber,
      feeAmount: f.feeAmount,
      serviceDate: f.serviceDate,
      procedureCode: f.procedureCode,
    })),
    totals: {
      totalCharges,
      totalDiscount,
      totalNetAmount,
      totalPhicCoverage,
      totalPatientShare,
      totalProfessionalFees,
    },
    assembledAt: now,
    assembledBy: opts.actor,
  };

  const contentHash = hashPacketContent(partialPacket);

  const packet: ClaimPacket = {
    ...partialPacket,
    contentHash,
  };

  return { ok: true, packet };
}

/**
 * Validate that a ClaimPacket's content hash matches its current data.
 * Used to detect tampering or drift.
 */
export function verifyPacketIntegrity(packet: ClaimPacket): boolean {
  const { contentHash, ...rest } = packet;
  const computed = hashPacketContent(rest as Omit<ClaimPacket, 'contentHash'>);
  return computed === contentHash;
}
