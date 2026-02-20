/**
 * RCM Validation Engine
 *
 * Multi-layer claim validation:
 *   1. Syntax — required fields present, correct types
 *   2. Code sets — ICD-10, CPT/HCPCS, modifiers, POS codes
 *   3. Business rules — gender/age/diagnosis consistency, timely filing
 *   4. Payer-specific — payer enrollment, required modifiers, auth requirements
 *
 * Output: list of edits (issues) with severity, location, suggested fix,
 * and an overall readiness score (0-100).
 *
 * Phase 38 — RCM + Payer Connectivity
 */

import type { Claim } from '../domain/claim.js';
import { getPayer } from '../payer-registry/registry.js';

/* ─── Types ──────────────────────────────────────────────────────── */

export type ValidationSeverity = 'error' | 'warning' | 'info';
export type ValidationCategory =
  | 'syntax'
  | 'code_set'
  | 'business_rule'
  | 'payer_specific'
  | 'timely_filing'
  | 'authorization';

export interface ValidationEdit {
  id: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  field: string;
  message: string;
  suggestedFix?: string;
  blocksSubmission: boolean;
  ruleId: string;
}

export interface ValidationResult {
  claimId: string;
  valid: boolean;
  readinessScore: number;        // 0-100
  edits: ValidationEdit[];
  editCountBySeverity: { error: number; warning: number; info: number };
  validatedAt: string;
}

/* ─── Rule definitions ───────────────────────────────────────────── */

interface ValidationRule {
  id: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  blocksSubmission: boolean;
  description: string;
  check: (claim: Claim) => ValidationEdit | null;
}

let editCounter = 0;
function nextEditId(): string {
  return `ve-${++editCounter}`;
}

function makeEdit(
  rule: ValidationRule,
  field: string,
  message: string,
  suggestedFix?: string,
): ValidationEdit {
  return {
    id: nextEditId(),
    severity: rule.severity,
    category: rule.category,
    field,
    message,
    suggestedFix,
    blocksSubmission: rule.blocksSubmission,
    ruleId: rule.id,
  };
}

/* ─── Syntax rules ───────────────────────────────────────────────── */

const syntaxRules: ValidationRule[] = [
  {
    id: 'SYN-001',
    category: 'syntax',
    severity: 'error',
    blocksSubmission: true,
    description: 'Payer ID is required',
    check: (c) => !c.payerId
      ? makeEdit(syntaxRules[0], 'payerId', 'Payer ID is required', 'Select a payer from the registry')
      : null,
  },
  {
    id: 'SYN-002',
    category: 'syntax',
    severity: 'error',
    blocksSubmission: true,
    description: 'Patient DFN is required',
    check: (c) => !c.patientDfn
      ? makeEdit(syntaxRules[1], 'patientDfn', 'Patient DFN is required', 'Link claim to a patient')
      : null,
  },
  {
    id: 'SYN-003',
    category: 'syntax',
    severity: 'error',
    blocksSubmission: true,
    description: 'Total charge must be positive',
    check: (c) => c.totalCharge <= 0
      ? makeEdit(syntaxRules[2], 'totalCharge', 'Total charge must be greater than zero')
      : null,
  },
  {
    id: 'SYN-004',
    category: 'syntax',
    severity: 'error',
    blocksSubmission: true,
    description: 'At least one service line is required',
    check: (c) => (!c.lines || c.lines.length === 0)
      ? makeEdit(syntaxRules[3], 'lines', 'At least one service line is required')
      : null,
  },
  {
    id: 'SYN-005',
    category: 'syntax',
    severity: 'error',
    blocksSubmission: true,
    description: 'At least one diagnosis code is required',
    check: (c) => (!c.diagnoses || c.diagnoses.length === 0)
      ? makeEdit(syntaxRules[4], 'diagnoses', 'At least one diagnosis code is required')
      : null,
  },
  {
    id: 'SYN-006',
    category: 'syntax',
    severity: 'error',
    blocksSubmission: true,
    description: 'Service date is required',
    check: (c) => !c.dateOfService
      ? makeEdit(syntaxRules[5], 'dateOfService', 'Service date is required')
      : null,
  },
  {
    id: 'SYN-007',
    category: 'syntax',
    severity: 'error',
    blocksSubmission: true,
    description: 'Subscriber member ID is required',
    check: (c) => !c.subscriberId
      ? makeEdit(syntaxRules[6], 'subscriberId', 'Subscriber/member ID is required', 'Enter the insurance member ID')
      : null,
  },
  {
    id: 'SYN-008',
    category: 'syntax',
    severity: 'warning',
    blocksSubmission: false,
    description: 'Patient name should be present',
    check: (c) => (!c.patientFirstName || !c.patientLastName)
      ? makeEdit(syntaxRules[7], 'patientName', 'Patient first and last name recommended for claim accuracy')
      : null,
  },
];

/* ─── Code set rules ─────────────────────────────────────────────── */

const ICD10_PATTERN = /^[A-TV-Z][0-9][0-9A-Z](\.[0-9A-Z]{1,4})?$/;
const CPT_PATTERN = /^[0-9]{5}$/;
const HCPCS_PATTERN = /^[A-V][0-9]{4}$/;

const codeSetRules: ValidationRule[] = [
  {
    id: 'CS-001',
    category: 'code_set',
    severity: 'error',
    blocksSubmission: true,
    description: 'ICD-10 diagnosis code format validation',
    check: (c) => {
      const invalid = (c.diagnoses ?? []).filter(
        (dx: { code: string }) => !ICD10_PATTERN.test(dx.code),
      );
      return invalid.length > 0
        ? makeEdit(codeSetRules[0], 'diagnoses',
            `Invalid ICD-10 code(s): ${invalid.map((dx: { code: string }) => dx.code).join(', ')}`,
            'Use format A00-T98, V00-Y99 with optional decimal')
        : null;
    },
  },
  {
    id: 'CS-002',
    category: 'code_set',
    severity: 'error',
    blocksSubmission: true,
    description: 'CPT/HCPCS procedure code format validation',
    check: (c) => {
      const invalid = (c.lines ?? []).filter(
        (sl) => !CPT_PATTERN.test(sl.procedure.code) && !HCPCS_PATTERN.test(sl.procedure.code),
      );
      return invalid.length > 0
        ? makeEdit(codeSetRules[1], 'lines.procedure.code',
            `Invalid procedure code(s): ${invalid.map((sl) => sl.procedure.code).join(', ')}`,
            'Use 5-digit CPT or alpha+4digit HCPCS format')
        : null;
    },
  },
  {
    id: 'CS-003',
    category: 'code_set',
    severity: 'warning',
    blocksSubmission: false,
    description: 'Modifier format validation',
    check: (c) => {
      const invalidMods: string[] = [];
      for (const sl of c.lines ?? []) {
        for (const mod of sl.procedure.modifiers ?? []) {
          if (!/^[A-Z0-9]{2}$/.test(mod)) invalidMods.push(mod);
        }
      }
      return invalidMods.length > 0
        ? makeEdit(codeSetRules[2], 'serviceLines.modifiers',
            `Invalid modifier(s): ${invalidMods.join(', ')}`,
            'Modifiers must be 2 alphanumeric characters')
        : null;
    },
  },
];

/* ─── Business rules ─────────────────────────────────────────────── */

const businessRules: ValidationRule[] = [
  {
    id: 'BUS-001',
    category: 'business_rule',
    severity: 'warning',
    blocksSubmission: false,
    description: 'Service line charges should sum to total charge',
    check: (c) => {
      if (!c.lines || c.lines.length === 0) return null;
      const lineTotal = c.lines.reduce((sum: number, sl) => sum + sl.procedure.charge, 0);
      const diff = Math.abs(lineTotal - c.totalCharge);
      return diff > 0.01
        ? makeEdit(businessRules[0], 'totalCharge',
            `Service line total ($${lineTotal.toFixed(2)}) differs from claim total ($${c.totalCharge.toFixed(2)})`,
            'Adjust service line charges or total charge')
        : null;
    },
  },
  {
    id: 'BUS-002',
    category: 'business_rule',
    severity: 'warning',
    blocksSubmission: false,
    description: 'Service date should not be in the future',
    check: (c) => {
      if (!c.dateOfService) return null;
      const svcDate = new Date(c.dateOfService);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return svcDate > today
        ? makeEdit(businessRules[1], 'serviceDate',
            'Service date is in the future',
            'Verify the service date is correct')
        : null;
    },
  },
  {
    id: 'BUS-003',
    category: 'business_rule',
    severity: 'error',
    blocksSubmission: true,
    description: 'Billing provider NPI is required for EDI submission',
    check: (c) => !c.billingProviderNpi
      ? makeEdit(businessRules[2], 'billingProviderNpi',
          'Billing provider NPI is required for electronic claims',
          'Enter the 10-digit NPI')
      : null,
  },
  {
    id: 'BUS-004',
    category: 'business_rule',
    severity: 'warning',
    blocksSubmission: false,
    description: 'Duplicate procedure codes on same date',
    check: (c) => {
      if (!c.lines || c.lines.length < 2) return null;
      const seen = new Set<string>();
      const dups: string[] = [];
      for (const sl of c.lines) {
        const key = `${sl.procedure.code}-${sl.procedure.dateOfService}`;
        if (seen.has(key)) dups.push(sl.procedure.code);
        seen.add(key);
      }
      return dups.length > 0
        ? makeEdit(businessRules[3], 'serviceLines',
            `Duplicate procedure code(s) on same date: ${dups.join(', ')}`,
            'Add appropriate modifier (e.g., 59, XE) or remove duplicate')
        : null;
    },
  },
];

/* ─── Timely filing rules ────────────────────────────────────────── */

const timelyFilingRules: ValidationRule[] = [
  {
    id: 'TF-001',
    category: 'timely_filing',
    severity: 'warning',
    blocksSubmission: false,
    description: 'Timely filing check (default 365 days)',
    check: (c) => {
      if (!c.dateOfService) return null;
      const svcDate = new Date(c.dateOfService);
      const daysSinceService = Math.floor(
        (Date.now() - svcDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      // Most payers: 90-365 days. Medicare: 365 days.
      if (daysSinceService > 365) {
        return makeEdit(timelyFilingRules[0], 'serviceDate',
          `Service date is ${daysSinceService} days ago — may exceed timely filing limits`,
          'Check payer-specific timely filing requirements');
      }
      if (daysSinceService > 300) {
        return makeEdit(timelyFilingRules[0], 'serviceDate',
          `Service date is ${daysSinceService} days ago — approaching filing deadline`,
          'Submit promptly to avoid timely filing denial');
      }
      return null;
    },
  },
];

/* ─── Payer-specific rules ───────────────────────────────────────── */

const payerSpecificRules: ValidationRule[] = [
  {
    id: 'PAY-001',
    category: 'payer_specific',
    severity: 'error',
    blocksSubmission: true,
    description: 'Payer must exist in registry',
    check: (c) => {
      if (!c.payerId) return null; // caught by SYN-001
      const payer = getPayer(c.payerId);
      return !payer
        ? makeEdit(payerSpecificRules[0], 'payerId',
            `Payer '${c.payerId}' not found in registry`,
            'Add the payer to the registry or verify the ID')
        : null;
    },
  },
  {
    id: 'PAY-002',
    category: 'payer_specific',
    severity: 'warning',
    blocksSubmission: false,
    description: 'Payer must be active',
    check: (c) => {
      if (!c.payerId) return null;
      const payer = getPayer(c.payerId);
      if (!payer) return null; // caught by PAY-001
      return payer.status !== 'active'
        ? makeEdit(payerSpecificRules[1], 'payerId',
            `Payer '${payer.name}' has status '${payer.status}'`,
            'Verify payer readiness before submission')
        : null;
    },
  },
  {
    id: 'PAY-003',
    category: 'payer_specific',
    severity: 'info',
    blocksSubmission: false,
    description: 'Payer enrollment check',
    check: (c) => {
      if (!c.payerId) return null;
      const payer = getPayer(c.payerId);
      if (!payer) return null;
      return payer.enrollmentRequired
        ? makeEdit(payerSpecificRules[2], 'payerId',
            `Payer '${payer.name}' requires enrollment — verify provider is enrolled`,
            payer.enrollmentNotes ?? 'Complete payer enrollment')
        : null;
    },
  },
];

/* ─── Authorization rules (Phase 40) ─────────────────────────────── */

const authorizationRules: ValidationRule[] = [
  {
    id: 'AUTH-001',
    category: 'authorization',
    severity: 'warning',
    blocksSubmission: false,
    description: 'Prior authorization may be required for high-cost procedures',
    check: (c) => {
      // Revenue codes and CPT ranges that typically require prior auth
      const highCostCpts = ['27447', '27130', '63030', '22551', '22612', '33533'];
      const needsAuth = (c.lines ?? []).some(
        sl => highCostCpts.includes(sl.procedure.code) ||
              (parseInt(sl.procedure.code, 10) >= 20000 && parseInt(sl.procedure.code, 10) <= 29999),
      );
      return needsAuth
        ? makeEdit(authorizationRules[0], 'lines',
            'One or more procedures may require prior authorization',
            'Verify payer authorization requirements before submission')
        : null;
    },
  },
  {
    id: 'AUTH-002',
    category: 'authorization',
    severity: 'info',
    blocksSubmission: false,
    description: 'Demo claims are blocked from real submission',
    check: (c) => {
      return (c as any).isDemo
        ? makeEdit(authorizationRules[1], 'isDemo',
            'This is a demo claim -- real submission is blocked',
            'Create a non-demo claim for live submission')
        : null;
    },
  },
  {
    id: 'AUTH-003',
    category: 'authorization',
    severity: 'info',
    blocksSubmission: false,
    description: 'Submission safety mode check',
    check: (c) => {
      return (c as any).submissionSafetyMode === 'export_only'
        ? makeEdit(authorizationRules[2], 'submissionSafetyMode',
            'CLAIM_SUBMISSION_ENABLED is false -- claims will be exported, not submitted',
            'Set CLAIM_SUBMISSION_ENABLED=true in .env.local to enable live submission')
        : null;
    },
  },
];

/* ─── Country/market-specific rules (Phase 40 Superseding) ───────── */

const countrySpecificRules: ValidationRule[] = [
  {
    id: 'CTY-001',
    category: 'payer_specific',
    severity: 'warning',
    blocksSubmission: false,
    description: 'PhilHealth claims require PhilHealth PIN in subscriberId',
    check: (c) => {
      if (!c.payerId) return null;
      const payer = getPayer(c.payerId);
      if (!payer || payer.country !== 'PH') return null;
      if (payer.payerId === 'PH-PHILHEALTH' && !c.subscriberId) {
        return makeEdit(countrySpecificRules[0], 'subscriberId',
          'PhilHealth claims require the member PhilHealth PIN as subscriberId',
          'Enter the 12-digit PhilHealth Identification Number');
      }
      return null;
    },
  },
  {
    id: 'CTY-002',
    category: 'payer_specific',
    severity: 'warning',
    blocksSubmission: false,
    description: 'Australian Medicare claims require Medicare card number',
    check: (c) => {
      if (!c.payerId) return null;
      const payer = getPayer(c.payerId);
      if (!payer || payer.country !== 'AU') return null;
      if (payer.payerId === 'AU-MEDICARE' && !c.subscriberId) {
        return makeEdit(countrySpecificRules[1], 'subscriberId',
          'Medicare Australia claims require the Medicare card number + IRN',
          'Enter Medicare card number (10 digits) followed by IRN (1 digit)');
      }
      return null;
    },
  },
  {
    id: 'CTY-003',
    category: 'payer_specific',
    severity: 'warning',
    blocksSubmission: false,
    description: 'NZ ACC claims require ACC45/ACC2152 injury details',
    check: (c) => {
      if (!c.payerId) return null;
      const payer = getPayer(c.payerId);
      if (!payer || payer.country !== 'NZ') return null;
      if (payer.payerId === 'NZ-ACC') {
        return makeEdit(countrySpecificRules[2], 'payerSpecific',
          'ACC NZ claims require injury mechanism and date of injury in claim metadata',
          'Include ACC45 or ACC2152 form data in claim notes');
      }
      return null;
    },
  },
  {
    id: 'CTY-004',
    category: 'payer_specific',
    severity: 'info',
    blocksSubmission: false,
    description: 'Connector readiness check for payer integration mode',
    check: (c) => {
      if (!c.payerId) return null;
      const payer = getPayer(c.payerId);
      if (!payer) return null;
      const mode = payer.integrationMode;
      if (mode === 'not_classified') {
        return makeEdit(countrySpecificRules[3], 'payerId',
          `Payer '${payer.name}' integration mode is unclassified -- no connector will match`,
          'Set payer integrationMode to clearinghouse_edi, direct_api, or government_portal');
      }
      return null;
    },
  },
  {
    id: 'CTY-005',
    category: 'payer_specific',
    severity: 'warning',
    blocksSubmission: false,
    description: 'NPI validation (US payers only)',
    check: (c) => {
      if (!c.payerId) return null;
      const payer = getPayer(c.payerId);
      if (!payer || payer.country !== 'US') return null;
      if (c.billingProviderNpi && !/^\d{10}$/.test(c.billingProviderNpi)) {
        return makeEdit(countrySpecificRules[4], 'billingProviderNpi',
          'NPI must be exactly 10 digits for US payer claims',
          'Enter a valid 10-digit National Provider Identifier');
      }
      return null;
    },
  },
];

/* ─── Master rule list ───────────────────────────────────────────── */

const ALL_RULES: ValidationRule[] = [
  ...syntaxRules,
  ...codeSetRules,
  ...businessRules,
  ...timelyFilingRules,
  ...payerSpecificRules,
  ...authorizationRules,
  ...countrySpecificRules,
];

/* ─── Main validation function ───────────────────────────────────── */

export function validateClaim(claim: Claim): ValidationResult {
  editCounter = 0;
  const edits: ValidationEdit[] = [];

  for (const rule of ALL_RULES) {
    try {
      const edit = rule.check(claim);
      if (edit) edits.push(edit);
    } catch {
      // Rule evaluation failure — log but don't block
      edits.push({
        id: nextEditId(),
        severity: 'warning',
        category: rule.category,
        field: 'internal',
        message: `Rule ${rule.id} evaluation failed`,
        blocksSubmission: false,
        ruleId: rule.id,
      });
    }
  }

  const editCountBySeverity = {
    error: edits.filter(e => e.severity === 'error').length,
    warning: edits.filter(e => e.severity === 'warning').length,
    info: edits.filter(e => e.severity === 'info').length,
  };

  const blockers = edits.filter(e => e.blocksSubmission);
  const valid = blockers.length === 0;

  // Readiness score: start at 100, deduct per edit severity
  let score = 100;
  score -= editCountBySeverity.error * 20;
  score -= editCountBySeverity.warning * 5;
  score -= editCountBySeverity.info * 1;
  score = Math.max(0, Math.min(100, score));

  return {
    claimId: claim.id,
    valid,
    readinessScore: score,
    edits,
    editCountBySeverity,
    validatedAt: new Date().toISOString(),
  };
}

/* ─── Describe rules (for API introspection) ─────────────────────── */

export function describeValidationRules(): Array<{
  id: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  blocksSubmission: boolean;
  description: string;
}> {
  return ALL_RULES.map(r => ({
    id: r.id,
    category: r.category,
    severity: r.severity,
    blocksSubmission: r.blocksSubmission,
    description: r.description,
  }));
}
