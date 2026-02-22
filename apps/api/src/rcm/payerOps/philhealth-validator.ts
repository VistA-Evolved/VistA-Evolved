/**
 * PhilHealth eClaims 3.0 Posture — Validation Engine
 *
 * Phase 90: Validates PhilHealth claim drafts against eClaims 3.0 rules.
 *
 * Key rules:
 *   - eClaims 3.0 required starting April 1, 2026
 *   - Admissions >= April 2026 require electronic SOA (no scanned PDF)
 *   - PhilHealth PIN format validation
 *   - Required fields for each claim form (CF1-CF4)
 *   - Diagnosis code requirements (at least one primary ICD-10)
 *   - Professional fee validation for inpatient claims
 *
 * The eSOA cutoff date is configurable for testing via PHILHEALTH_ESOA_CUTOFF_DATE env var.
 */

import type {
  PhilHealthClaimDraft,
  PhilHealthValidationResult,
  PhilHealthValidationError,
} from './philhealth-types.js';

/* ── Configuration ───────────────────────────────────────────── */

/** Default: April 1, 2026 — admissions on or after this date require eSOA */
const DEFAULT_ESOA_CUTOFF = '2026-04-01';

function getEsoaCutoffDate(): string {
  return process.env.PHILHEALTH_ESOA_CUTOFF_DATE || DEFAULT_ESOA_CUTOFF;
}

/* ── PIN Validation ──────────────────────────────────────────── */

/** PhilHealth PIN is typically 12 digits (e.g., 01-234567890-1) */
const PIN_PATTERN = /^\d{2}-\d{9,10}-\d$/;
const PIN_LOOSE_PATTERN = /^\d{12,14}$/;

function isValidPin(pin: string): boolean {
  if (!pin) return false;
  const cleaned = pin.replace(/[\s-]/g, '');
  return PIN_PATTERN.test(pin) || PIN_LOOSE_PATTERN.test(cleaned);
}

/* ── Date helpers ────────────────────────────────────────────── */

function isDateOnOrAfter(dateStr: string, cutoff: string): boolean {
  if (!dateStr || !cutoff) return false;
  const d = new Date(dateStr);
  const c = new Date(cutoff);
  return d >= c;
}

function isValidDate(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

/* ── Main Validator ──────────────────────────────────────────── */

export function validatePhilHealthClaimDraft(draft: PhilHealthClaimDraft): PhilHealthValidationResult {
  const errors: PhilHealthValidationError[] = [];
  const warnings: PhilHealthValidationError[] = [];

  const esoaCutoff = getEsoaCutoffDate();
  const admissionRequiresEsoa = isDateOnOrAfter(draft.admissionDate, esoaCutoff);

  // ── CF1 Required Fields (Facility + Patient Demographics) ──

  if (!draft.facilityId) {
    errors.push({ field: 'facilityId', code: 'REQUIRED', message: 'Facility ID is required', severity: 'error' });
  }
  if (!draft.patientLastName) {
    errors.push({ field: 'patientLastName', code: 'REQUIRED', message: 'Patient last name is required', severity: 'error' });
  }
  if (!draft.patientFirstName) {
    errors.push({ field: 'patientFirstName', code: 'REQUIRED', message: 'Patient first name is required', severity: 'error' });
  }
  if (!draft.philhealthPin) {
    errors.push({ field: 'philhealthPin', code: 'REQUIRED', message: 'PhilHealth PIN is required', severity: 'error' });
  } else if (!isValidPin(draft.philhealthPin)) {
    errors.push({
      field: 'philhealthPin',
      code: 'INVALID_FORMAT',
      message: 'PhilHealth PIN format invalid. Expected: XX-XXXXXXXXX-X (12+ digits)',
      severity: 'error',
    });
  }
  if (!draft.admissionDate) {
    errors.push({ field: 'admissionDate', code: 'REQUIRED', message: 'Admission date is required', severity: 'error' });
  } else if (!isValidDate(draft.admissionDate)) {
    errors.push({ field: 'admissionDate', code: 'INVALID_DATE', message: 'Admission date is invalid', severity: 'error' });
  }
  if (!draft.patientType) {
    errors.push({ field: 'patientType', code: 'REQUIRED', message: 'Patient type (O/I) is required', severity: 'error' });
  }
  if (!draft.memberRelationship) {
    errors.push({ field: 'memberRelationship', code: 'REQUIRED', message: 'Member relationship (S/D/P) is required', severity: 'error' });
  }
  if (!draft.patientDob) {
    warnings.push({ field: 'patientDob', code: 'RECOMMENDED', message: 'Patient date of birth is recommended', severity: 'warning' });
  }
  if (!draft.patientSex) {
    warnings.push({ field: 'patientSex', code: 'RECOMMENDED', message: 'Patient sex (M/F) is recommended', severity: 'warning' });
  }

  // ── CF2 Required Fields (Diagnosis + Procedures) ──

  if (draft.diagnoses.length === 0) {
    errors.push({ field: 'diagnoses', code: 'REQUIRED', message: 'At least one diagnosis code is required', severity: 'error' });
  } else {
    const hasPrimary = draft.diagnoses.some(d => d.type === 'primary');
    if (!hasPrimary) {
      errors.push({ field: 'diagnoses', code: 'NO_PRIMARY', message: 'At least one PRIMARY diagnosis code is required', severity: 'error' });
    }
    for (let i = 0; i < draft.diagnoses.length; i++) {
      const dx = draft.diagnoses[i];
      if (!dx.icdCode) {
        errors.push({ field: `diagnoses[${i}].icdCode`, code: 'REQUIRED', message: `Diagnosis ${i + 1}: ICD code is required`, severity: 'error' });
      }
    }
  }

  // ── Charges ──

  if (draft.charges.length === 0) {
    warnings.push({ field: 'charges', code: 'RECOMMENDED', message: 'No charge line items. At least one is recommended for SOA.', severity: 'warning' });
  } else {
    for (let i = 0; i < draft.charges.length; i++) {
      const ch = draft.charges[i];
      if (!ch.description) {
        errors.push({ field: `charges[${i}].description`, code: 'REQUIRED', message: `Charge ${i + 1}: description is required`, severity: 'error' });
      }
      if (ch.quantity <= 0) {
        errors.push({ field: `charges[${i}].quantity`, code: 'INVALID', message: `Charge ${i + 1}: quantity must be > 0`, severity: 'error' });
      }
      if (ch.netAmount < 0) {
        errors.push({ field: `charges[${i}].netAmount`, code: 'INVALID', message: `Charge ${i + 1}: net amount cannot be negative`, severity: 'error' });
      }
    }
  }

  // ── CF2b: Procedures ──

  if (draft.procedures.length > 0) {
    for (let i = 0; i < draft.procedures.length; i++) {
      const proc = draft.procedures[i];
      if (!proc.code) {
        errors.push({ field: `procedures[${i}].code`, code: 'REQUIRED', message: `Procedure ${i + 1}: RVS/CPT code is required`, severity: 'error' });
      }
    }
  } else if (draft.caseRateCode) {
    warnings.push({
      field: 'procedures',
      code: 'RECOMMENDED_CASE_RATE',
      message: 'Case-rate claims should include at least one procedure code',
      severity: 'warning',
    });
  }

  // ── CF3: Professional Fees (required for inpatient) ──

  if (draft.patientType === 'I' && draft.professionalFees.length === 0) {
    warnings.push({
      field: 'professionalFees',
      code: 'RECOMMENDED_INPATIENT',
      message: 'Inpatient claims should include professional fee lines (CF3)',
      severity: 'warning',
    });
  }
  for (let i = 0; i < draft.professionalFees.length; i++) {
    const pf = draft.professionalFees[i];
    if (!pf.physicianName) {
      errors.push({ field: `professionalFees[${i}].physicianName`, code: 'REQUIRED', message: `PF ${i + 1}: physician name is required`, severity: 'error' });
    }
    if (!pf.physicianLicense) {
      errors.push({ field: `professionalFees[${i}].physicianLicense`, code: 'REQUIRED', message: `PF ${i + 1}: PRC license number is required`, severity: 'error' });
    }
    if (pf.feeAmount <= 0) {
      errors.push({ field: `professionalFees[${i}].feeAmount`, code: 'INVALID', message: `PF ${i + 1}: fee amount must be > 0`, severity: 'error' });
    }
  }

  // ── Discharge date ──

  if (draft.patientType === 'I' && !draft.dischargeDate) {
    warnings.push({
      field: 'dischargeDate',
      code: 'RECOMMENDED_INPATIENT',
      message: 'Inpatient claims should include discharge date before submission',
      severity: 'warning',
    });
  }
  if (draft.dischargeDate && draft.admissionDate) {
    if (new Date(draft.dischargeDate) < new Date(draft.admissionDate)) {
      errors.push({
        field: 'dischargeDate',
        code: 'INVALID_RANGE',
        message: 'Discharge date cannot be before admission date',
        severity: 'error',
      });
    }
  }

  // ── eClaims 3.0 eSOA Compliance ──

  const electronicSoaPresent = !!draft.soaElectronic;
  let scannedPdfDetected = false;

  // Check attachments for scanned PDF (simple heuristic)
  for (const ref of draft.attachmentRefs) {
    if (ref.toLowerCase().endsWith('.pdf') || ref.toLowerCase().includes('scanned')) {
      scannedPdfDetected = true;
      if (admissionRequiresEsoa) {
        errors.push({
          field: 'attachmentRefs',
          code: 'SCANNED_PDF_REJECTED',
          message: `eClaims 3.0: Scanned PDF SOA is REJECTED for admissions on/after ${esoaCutoff}. Use electronic SOA.`,
          severity: 'error',
        });
      } else {
        warnings.push({
          field: 'attachmentRefs',
          code: 'SCANNED_PDF_DEPRECATED',
          message: `Scanned PDF SOA detected. Will be rejected for admissions on/after ${esoaCutoff}.`,
          severity: 'warning',
        });
      }
    }
  }

  if (admissionRequiresEsoa && !electronicSoaPresent) {
    warnings.push({
      field: 'soaElectronic',
      code: 'ESOA_PENDING',
      message: `eClaims 3.0: Electronic SOA required for admissions on/after ${esoaCutoff}. SOA will be generated on export.`,
      severity: 'warning',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    eclaims3Compliance: {
      electronicSoaRequired: admissionRequiresEsoa,
      electronicSoaPresent,
      scannedPdfDetected,
      admissionDateRequiresEsoa: admissionRequiresEsoa,
    },
  };
}
