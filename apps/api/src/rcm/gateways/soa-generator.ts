/**
 * PhilHealth Electronic Statement of Account (SOA) Generator
 *
 * Phase 46: eClaims 3.0 mandates electronic SOA — no scanned PDFs.
 * This module generates structured SOA artifacts from canonical claim data.
 *
 * Key rules:
 *   - Scanned PDF SOAs are REJECTED (eClaims 3.0 mandate)
 *   - SOA must be digitally signed (HMAC-SHA256 or RSA via facility key)
 *   - Encryption-at-rest is expected for stored SOA artifacts
 *   - One SOA per claim submission, tied to accession number
 */

import { createHmac, randomUUID } from 'node:crypto';

/* ── Types ───────────────────────────────────────────────────── */

export interface SoaLineItem {
  description: string;
  cptCode?: string;
  quantity: number;
  unitCharge: number;
  discount: number;
  netAmount: number;
  phicCoverage: number;
  patientShare: number;
}

export interface SoaInput {
  claimId: string;
  accessionNumber: string;
  facilityCode: string;
  facilityName: string;
  patientLast: string;
  patientFirst: string;
  patientMiddle?: string;
  philhealthId: string;
  admissionDate: string;
  dischargeDate?: string;
  lineItems: SoaLineItem[];
  preparedBy: string;
  preparedDate: string;
}

export interface ElectronicSoa {
  soaId: string;
  version: '3.0';
  claimId: string;
  accessionNumber: string;
  facility: {
    code: string;
    name: string;
  };
  patient: {
    lastName: string;
    firstName: string;
    middleName?: string;
    philhealthId: string;
  };
  period: {
    admissionDate: string;
    dischargeDate?: string;
  };
  lineItems: SoaLineItem[];
  totals: {
    totalCharges: number;
    totalDiscount: number;
    totalNetAmount: number;
    totalPhicCoverage: number;
    totalPatientShare: number;
  };
  preparedBy: string;
  preparedDate: string;
  generatedAt: string;
  signature?: string;
  signatureMethod?: 'hmac-sha256' | 'rsa-sha256';
}

export interface SoaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/* ── Scanned PDF rejection ───────────────────────────────────── */

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

export function isScannedPdf(data: Buffer | string): boolean {
  if (typeof data === 'string') {
    // Check for base64 PDF header
    return data.startsWith('JVBERi') || data.startsWith('%PDF');
  }
  if (Buffer.isBuffer(data) && data.length >= 4) {
    return data.subarray(0, 4).equals(PDF_MAGIC);
  }
  return false;
}

/* ── Validation ──────────────────────────────────────────────── */

export function validateSoaInput(input: SoaInput): SoaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input.claimId) errors.push('claimId is required');
  if (!input.accessionNumber) errors.push('accessionNumber is required');
  if (!input.facilityCode) errors.push('facilityCode is required');
  if (!input.facilityName) errors.push('facilityName is required');
  if (!input.philhealthId) errors.push('philhealthId is required');
  if (!input.patientLast) errors.push('patientLast is required');
  if (!input.patientFirst) errors.push('patientFirst is required');
  if (!input.admissionDate) errors.push('admissionDate is required');
  if (!input.preparedBy) errors.push('preparedBy is required');
  if (!input.preparedDate) errors.push('preparedDate is required');

  if (!input.lineItems || input.lineItems.length === 0) {
    errors.push('At least one line item is required');
  } else {
    for (let i = 0; i < input.lineItems.length; i++) {
      const item = input.lineItems[i];
      if (!item.description) errors.push(`lineItems[${i}].description is required`);
      if (item.quantity <= 0) errors.push(`lineItems[${i}].quantity must be > 0`);
      if (item.netAmount < 0) errors.push(`lineItems[${i}].netAmount cannot be negative`);
    }
  }

  if (!input.dischargeDate) {
    warnings.push('dischargeDate not set — SOA will show open admission');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/* ── SOA Generation ──────────────────────────────────────────── */

export function generateElectronicSoa(input: SoaInput, signingKey?: string): ElectronicSoa {
  const validation = validateSoaInput(input);
  if (!validation.valid) {
    throw new Error(`SOA validation failed: ${validation.errors.join('; ')}`);
  }

  const totals = input.lineItems.reduce(
    (acc, item) => ({
      totalCharges: acc.totalCharges + item.unitCharge * item.quantity,
      totalDiscount: acc.totalDiscount + item.discount,
      totalNetAmount: acc.totalNetAmount + item.netAmount,
      totalPhicCoverage: acc.totalPhicCoverage + item.phicCoverage,
      totalPatientShare: acc.totalPatientShare + item.patientShare,
    }),
    { totalCharges: 0, totalDiscount: 0, totalNetAmount: 0, totalPhicCoverage: 0, totalPatientShare: 0 },
  );

  // Round to 2 decimal places
  for (const key of Object.keys(totals) as Array<keyof typeof totals>) {
    totals[key] = Math.round(totals[key] * 100) / 100;
  }

  const soa: ElectronicSoa = {
    soaId: `SOA-${randomUUID().slice(0, 8).toUpperCase()}`,
    version: '3.0',
    claimId: input.claimId,
    accessionNumber: input.accessionNumber,
    facility: { code: input.facilityCode, name: input.facilityName },
    patient: {
      lastName: input.patientLast,
      firstName: input.patientFirst,
      middleName: input.patientMiddle,
      philhealthId: input.philhealthId,
    },
    period: {
      admissionDate: input.admissionDate,
      dischargeDate: input.dischargeDate,
    },
    lineItems: input.lineItems,
    totals,
    preparedBy: input.preparedBy,
    preparedDate: input.preparedDate,
    generatedAt: new Date().toISOString(),
  };

  // Sign if key provided
  if (signingKey) {
    const payload = JSON.stringify({
      soaId: soa.soaId,
      claimId: soa.claimId,
      accessionNumber: soa.accessionNumber,
      facilityCode: soa.facility.code,
      totals: soa.totals,
    });
    soa.signature = createHmac('sha256', signingKey).update(payload).digest('hex');
    soa.signatureMethod = 'hmac-sha256';
  }

  return soa;
}

/**
 * Verify SOA signature using HMAC-SHA256
 */
export function verifySoaSignature(soa: ElectronicSoa, signingKey: string): boolean {
  if (!soa.signature || soa.signatureMethod !== 'hmac-sha256') return false;
  const payload = JSON.stringify({
    soaId: soa.soaId,
    claimId: soa.claimId,
    accessionNumber: soa.accessionNumber,
    facilityCode: soa.facility.code,
    totals: soa.totals,
  });
  const expected = createHmac('sha256', signingKey).update(payload).digest('hex');
  // Constant-time comparison
  if (expected.length !== soa.signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ soa.signature.charCodeAt(i);
  }
  return diff === 0;
}
