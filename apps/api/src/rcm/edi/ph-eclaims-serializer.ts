/**
 * PhilHealth eClaims Serializer — CF1-CF4 Bundle Generator
 *
 * Phase 40: Transforms EdiClaim837 domain objects into PhilHealth eClaims
 * JSON bundle format (CF1-CF4 forms).
 *
 * PhilHealth does NOT use X12 — they have their own eClaims API with
 * four claim forms:
 *   CF1 — Facility/institutional info
 *   CF2 — Outpatient claim (mapped from 837P) or Inpatient claim (837I)
 *   CF3 — Professional fee claim (attending physician, used with 837I)
 *   CF4 — Medicines/supplies detail (line items)
 *
 * This serializer generates the JSON structure expected by the PhilHealth
 * eClaims API. The actual API submission is handled by the PhilHealth
 * connector (philhealth-connector.ts).
 *
 * Reference: PhilHealth eClaims XML/JSON v3 schema
 */

import type { EdiClaim837 } from './types.js';

/* ── PhilHealth Bundle Types ────────────────────────────────── */

export interface PhilHealthCF1 {
  formType: 'CF1';
  facilityCode: string;
  facilityName: string;
  accreditationNumber?: string;
  patientPin: string;          // PhilHealth Identification Number
  patientLastName: string;
  patientFirstName: string;
  patientMiddleName?: string;
  patientDob: string;          // YYYY-MM-DD
  patientSex: 'M' | 'F';
  memberPin?: string;
  memberRelationship: string;  // 'S' = self, 'D' = dependent, 'P' = parent
  admissionDate?: string;
  dischargeDate?: string;
  patientType: 'O' | 'I';     // Outpatient or Inpatient
}

export interface PhilHealthCF2 {
  formType: 'CF2';
  claimType: 'outpatient' | 'inpatient';
  diagnosis: Array<{
    icdCode: string;
    description?: string;
    type: 'primary' | 'secondary';
  }>;
  procedures: Array<{
    code: string;
    description?: string;
    laterality?: 'L' | 'R' | 'B';
  }>;
  totalActualCharges: number;
  totalPhilHealthBenefit?: number;
  rvs?: Array<{
    code: string;
    description?: string;
    amount: number;
  }>;
  doctorAccreditationNumber?: string;
  doctorLastName?: string;
  doctorFirstName?: string;
  attendingPhysicianLicense?: string;
}

export interface PhilHealthCF3 {
  formType: 'CF3';
  professionalFees: Array<{
    physicianName: string;
    physicianLicense: string;
    accreditationNumber?: string;
    feeAmount: number;
    serviceDate: string;
    procedureCode?: string;
  }>;
  totalProfessionalFees: number;
}

export interface PhilHealthCF4 {
  formType: 'CF4';
  medicines: Array<{
    genericName: string;
    brandName?: string;
    preparation: string;
    dosage: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }>;
  suppliesAndEquipment: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }>;
  totalMedicines: number;
  totalSupplies: number;
  grandTotal: number;
}

export interface PhilHealthClaimBundle {
  version: '3.0';
  claimSeriesNumber: string;
  submissionDate: string;
  facilityCode: string;
  cf1: PhilHealthCF1;
  cf2: PhilHealthCF2;
  cf3?: PhilHealthCF3;   // Only for inpatient
  cf4?: PhilHealthCF4;   // Only when medicines/supplies present
  metadata: {
    generatedBy: string;
    generatedAt: string;
    sourceClaimId: string;
    isTest: boolean;
  };
}

/* ── Build PhilHealth Bundle from EdiClaim837 ───────────────── */

export function buildPhilHealthBundle(
  claim: EdiClaim837,
  opts: {
    facilityCode: string;
    facilityName?: string;
    patientPin: string;
    memberPin?: string;
    memberRelationship?: string;
    claimSeriesNumber?: string;
    admissionDate?: string;
    dischargeDate?: string;
    isTest?: boolean;
  },
): PhilHealthClaimBundle {
  const isInpatient = claim.transactionSet === '837I';
  const now = new Date().toISOString();

  // CF1 — Facility + Patient
  const cf1: PhilHealthCF1 = {
    formType: 'CF1',
    facilityCode: opts.facilityCode,
    facilityName: opts.facilityName ?? claim.billingProvider.name,
    patientPin: opts.patientPin,
    patientLastName: claim.subscriber.lastName,
    patientFirstName: claim.subscriber.firstName,
    patientDob: claim.subscriber.dob
      ? `${claim.subscriber.dob.slice(0, 4)}-${claim.subscriber.dob.slice(4, 6)}-${claim.subscriber.dob.slice(6, 8)}`
      : '',
    patientSex: (claim.subscriber.gender === 'F' ? 'F' : 'M'),
    memberPin: opts.memberPin ?? opts.patientPin,
    memberRelationship: opts.memberRelationship ?? 'S',
    admissionDate: opts.admissionDate,
    dischargeDate: opts.dischargeDate,
    patientType: isInpatient ? 'I' : 'O',
  };

  // CF2 — Claim details
  const cf2: PhilHealthCF2 = {
    formType: 'CF2',
    claimType: isInpatient ? 'inpatient' : 'outpatient',
    diagnosis: claim.diagnosisCodes.map((dx, i) => ({
      icdCode: dx.code,
      type: i === 0 ? 'primary' as const : 'secondary' as const,
    })),
    procedures: claim.serviceLines.map(sl => ({
      code: sl.procedureCode,
    })),
    totalActualCharges: claim.claimInfo.totalChargeAmount,
  };

  // CF3 — Professional fees (inpatient only, but include if we have data)
  let cf3: PhilHealthCF3 | undefined;
  if (isInpatient && claim.serviceLines.length > 0) {
    cf3 = {
      formType: 'CF3',
      professionalFees: claim.serviceLines.map(sl => ({
        physicianName: claim.billingProvider.name,
        physicianLicense: claim.billingProvider.npi, // Map NPI to PRC license in production
        feeAmount: sl.chargeAmount,
        serviceDate: sl.serviceDate
          ? `${sl.serviceDate.slice(0, 4)}-${sl.serviceDate.slice(4, 6)}-${sl.serviceDate.slice(6, 8)}`
          : now.slice(0, 10),
        procedureCode: sl.procedureCode,
      })),
      totalProfessionalFees: claim.serviceLines.reduce((sum, sl) => sum + sl.chargeAmount, 0),
    };
  }

  return {
    version: '3.0',
    claimSeriesNumber: opts.claimSeriesNumber ?? `PH-${Date.now()}`,
    submissionDate: now.slice(0, 10),
    facilityCode: opts.facilityCode,
    cf1,
    cf2,
    cf3,
    metadata: {
      generatedBy: 'vista-evolved-rcm',
      generatedAt: now,
      sourceClaimId: claim.claimInfo.claimId,
      isTest: opts.isTest ?? true,
    },
  };
}
