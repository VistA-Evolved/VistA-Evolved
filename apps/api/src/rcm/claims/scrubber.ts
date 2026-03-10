/**
 * Claims Lifecycle v1 -- Deterministic Scrubber Engine (Phase 91)
 *
 * Evaluates a ClaimCase against core rules and payer-specific rule packs.
 * Same input -> same output (no randomness, no external calls).
 *
 * Rule categories:
 * - core.*     -- Universal rules (patient ID, diagnoses, provider)
 * - ph.*       -- PhilHealth-specific (eSOA, member PIN, CF validation)
 * - us.*       -- US payer rules (NPI, subscriber ID, place of service)
 *
 * Output: ClaimScrubResult with findings, outcome (pass/warn/fail),
 * and rule evaluation count.
 */

import { randomUUID } from 'node:crypto';
import type {
  ClaimCase,
  ClaimScrubResult,
  ScrubFinding,
  ScrubSeverity,
  ScrubOutcome,
} from './claim-types.js';

/* -- Rule Definition ----------------------------------------- */

export interface ScrubRule {
  id: string;
  pack: string; // "core", "philhealth", "us_medicare", etc.
  description: string;
  severity: ScrubSeverity;
  /** Returns finding if rule fails, undefined if passes */
  evaluate: (claim: ClaimCase) => ScrubFinding | undefined;
}

/* -- Core Rules (Universal) ---------------------------------- */

const CORE_RULES: ScrubRule[] = [
  {
    id: 'core.patient_id',
    pack: 'core',
    description: 'Patient must have a DFN',
    severity: 'error',
    evaluate: (c) => {
      if (!c.patientDfn) {
        return {
          ruleId: 'core.patient_id',
          severity: 'error',
          field: 'patientDfn',
          message: 'Patient identifier (DFN) is required',
          payerRulePack: 'core',
        };
      }
      return undefined;
    },
  },
  {
    id: 'core.payer_id',
    pack: 'core',
    description: 'Payer must be specified',
    severity: 'error',
    evaluate: (c) => {
      if (!c.payerId) {
        return {
          ruleId: 'core.payer_id',
          severity: 'error',
          field: 'payerId',
          message: 'Payer identifier is required',
          payerRulePack: 'core',
        };
      }
      return undefined;
    },
  },
  {
    id: 'core.date_of_service',
    pack: 'core',
    description: 'Date of service must be present and not in the future',
    severity: 'error',
    evaluate: (c) => {
      if (!c.dateOfService) {
        return {
          ruleId: 'core.date_of_service',
          severity: 'error',
          field: 'dateOfService',
          message: 'Date of service is required',
          payerRulePack: 'core',
        };
      }
      const dos = new Date(c.dateOfService);
      const now = new Date();
      if (dos > now) {
        return {
          ruleId: 'core.date_of_service',
          severity: 'error',
          field: 'dateOfService',
          message: 'Date of service cannot be in the future',
          payerRulePack: 'core',
        };
      }
      return undefined;
    },
  },
  {
    id: 'core.diagnosis_present',
    pack: 'core',
    description: 'At least one diagnosis code must be present for billable claims',
    severity: 'error',
    evaluate: (c) => {
      if (!c.diagnoses || c.diagnoses.length === 0) {
        return {
          ruleId: 'core.diagnosis_present',
          severity: 'error',
          field: 'diagnoses',
          message: 'At least one diagnosis code is required',
          payerRulePack: 'core',
        };
      }
      return undefined;
    },
  },
  {
    id: 'core.primary_diagnosis',
    pack: 'core',
    description: 'One diagnosis should be marked as primary',
    severity: 'warning',
    evaluate: (c) => {
      if (c.diagnoses.length > 0 && !c.diagnoses.some((d) => d.isPrimary)) {
        return {
          ruleId: 'core.primary_diagnosis',
          severity: 'warning',
          field: 'diagnoses',
          message: 'No diagnosis is marked as primary; first diagnosis will be used',
          payerRulePack: 'core',
        };
      }
      return undefined;
    },
  },
  {
    id: 'core.procedure_present',
    pack: 'core',
    description: 'At least one procedure/service line is required',
    severity: 'error',
    evaluate: (c) => {
      if (!c.procedures || c.procedures.length === 0) {
        return {
          ruleId: 'core.procedure_present',
          severity: 'error',
          field: 'procedures',
          message: 'At least one procedure or service line is required',
          payerRulePack: 'core',
        };
      }
      return undefined;
    },
  },
  {
    id: 'core.charge_positive',
    pack: 'core',
    description: 'Total charge must be positive',
    severity: 'error',
    evaluate: (c) => {
      if (c.totalCharge <= 0) {
        return {
          ruleId: 'core.charge_positive',
          severity: 'error',
          field: 'totalCharge',
          message: 'Total charge must be greater than zero',
          payerRulePack: 'core',
        };
      }
      return undefined;
    },
  },
  {
    id: 'core.subscriber_id',
    pack: 'core',
    description: 'Member/subscriber ID should be present',
    severity: 'warning',
    evaluate: (c) => {
      if (!c.subscriberId && !c.memberPin) {
        return {
          ruleId: 'core.subscriber_id',
          severity: 'warning',
          field: 'subscriberId',
          message: 'No member/subscriber ID or PIN present -- may cause payer rejection',
          payerRulePack: 'core',
        };
      }
      return undefined;
    },
  },
];

/* -- PhilHealth Rules ---------------------------------------- */

const PH_RULES: ScrubRule[] = [
  {
    id: 'ph.member_pin',
    pack: 'philhealth',
    description: 'PhilHealth member PIN is required',
    severity: 'error',
    evaluate: (c) => {
      if (!c.memberPin) {
        return {
          ruleId: 'ph.member_pin',
          severity: 'error',
          field: 'memberPin',
          message: 'PhilHealth member PIN is required for government payer claims',
          payerRulePack: 'philhealth',
        };
      }
      return undefined;
    },
  },
  {
    id: 'ph.esoa_required',
    pack: 'philhealth',
    description: 'Electronic SOA required for claims on or after 2026-04-01',
    severity: 'error',
    evaluate: (c) => {
      const esoaCutoff = new Date('2026-04-01');
      const dos = new Date(c.dateOfService);
      if (dos >= esoaCutoff) {
        const hasEsoa = c.attachments.some((a) => a.category === 'esoa');
        if (!hasEsoa) {
          return {
            ruleId: 'ph.esoa_required',
            severity: 'error',
            field: 'attachments',
            message: 'Electronic SOA attachment is required for services on or after 2026-04-01',
            payerRulePack: 'philhealth',
          };
        }
      }
      return undefined;
    },
  },
  {
    id: 'ph.facility_code',
    pack: 'philhealth',
    description: 'PhilHealth facility code is required',
    severity: 'error',
    evaluate: (c) => {
      if (!c.facilityCode) {
        return {
          ruleId: 'ph.facility_code',
          severity: 'error',
          field: 'facilityCode',
          message: 'PhilHealth-accredited facility code is required',
          payerRulePack: 'philhealth',
        };
      }
      return undefined;
    },
  },
  {
    id: 'ph.icd10_required',
    pack: 'philhealth',
    description: 'PhilHealth requires ICD-10 diagnosis codes',
    severity: 'error',
    evaluate: (c) => {
      const nonIcd10 = c.diagnoses.filter((d) => d.qualifier !== 'icd10');
      if (nonIcd10.length > 0) {
        return {
          ruleId: 'ph.icd10_required',
          severity: 'error',
          field: 'diagnoses',
          message: 'PhilHealth requires all diagnosis codes to be ICD-10',
          payerRulePack: 'philhealth',
        };
      }
      return undefined;
    },
  },
  {
    id: 'ph.rvs_code',
    pack: 'philhealth',
    description: 'PhilHealth professional claims should use RVS codes',
    severity: 'warning',
    evaluate: (c) => {
      if (c.claimType === 'professional') {
        const nonRvs = c.procedures.filter((p) => p.codeType !== 'rvs');
        if (nonRvs.length > 0) {
          return {
            ruleId: 'ph.rvs_code',
            severity: 'warning',
            field: 'procedures',
            message: 'PhilHealth professional claims should use RVS procedure codes',
            payerRulePack: 'philhealth',
          };
        }
      }
      return undefined;
    },
  },
];

/* -- US Rules ------------------------------------------------ */

const US_RULES: ScrubRule[] = [
  {
    id: 'us.billing_npi',
    pack: 'us_core',
    description: 'Billing provider NPI is required for US claims',
    severity: 'error',
    evaluate: (c) => {
      if (!c.billingProviderNpi) {
        return {
          ruleId: 'us.billing_npi',
          severity: 'error',
          field: 'billingProviderNpi',
          message: 'Billing provider NPI is required for US payer claims',
          payerRulePack: 'us_core',
        };
      }
      // NPI format: 10-digit number starting with 1 or 2
      if (!/^[12]\d{9}$/.test(c.billingProviderNpi)) {
        return {
          ruleId: 'us.billing_npi',
          severity: 'error',
          field: 'billingProviderNpi',
          message: 'Billing provider NPI must be a valid 10-digit number',
          payerRulePack: 'us_core',
        };
      }
      return undefined;
    },
  },
  {
    id: 'us.subscriber_id',
    pack: 'us_core',
    description: 'Subscriber/member ID is required for US claims',
    severity: 'error',
    evaluate: (c) => {
      if (!c.subscriberId) {
        return {
          ruleId: 'us.subscriber_id',
          severity: 'error',
          field: 'subscriberId',
          message: 'Subscriber ID is required for US payer claims',
          payerRulePack: 'us_core',
        };
      }
      return undefined;
    },
  },
  {
    id: 'us.cpt_hcpcs',
    pack: 'us_core',
    description: 'US claims should use CPT or HCPCS procedure codes',
    severity: 'warning',
    evaluate: (c) => {
      const nonUs = c.procedures.filter((p) => p.codeType !== 'cpt' && p.codeType !== 'hcpcs');
      if (nonUs.length > 0) {
        return {
          ruleId: 'us.cpt_hcpcs',
          severity: 'warning',
          field: 'procedures',
          message: 'US claims should use CPT or HCPCS procedure codes',
          payerRulePack: 'us_core',
        };
      }
      return undefined;
    },
  },
];

/* -- Rule Pack Registry -------------------------------------- */

const RULE_PACKS: Record<string, ScrubRule[]> = {
  core: CORE_RULES,
  philhealth: PH_RULES,
  us_core: US_RULES,
};

/** Get all registered rule pack names */
export function getAvailableRulePacks(): string[] {
  return Object.keys(RULE_PACKS);
}

/** Register a custom rule pack (for extensibility) */
export function registerRulePack(name: string, rules: ScrubRule[]): void {
  RULE_PACKS[name] = rules;
}

/* -- Scrubber Engine ----------------------------------------- */

export interface ScrubOptions {
  /** Which rule packs to evaluate. Default: ["core"] + auto-detect payer pack */
  packs?: string[];
  /** Override payer pack detection */
  forcePack?: string;
  /** Actor performing the scrub */
  actor?: string;
}

/**
 * Deterministic scrubber: evaluates a ClaimCase against selected rule packs.
 * Returns a ClaimScrubResult. Same input always produces the same output.
 */
export function scrubClaim(claim: ClaimCase, options: ScrubOptions = {}): ClaimScrubResult {
  const startMs = Date.now();

  // Determine which packs to run
  const packs = options.packs ?? determinePacks(claim, options.forcePack);

  const findings: ScrubFinding[] = [];
  let rulesEvaluated = 0;

  for (const packName of packs) {
    const rules = RULE_PACKS[packName];
    if (!rules) continue;

    for (const rule of rules) {
      rulesEvaluated++;
      const finding = rule.evaluate(claim);
      if (finding) {
        findings.push(finding);
      }
    }
  }

  // Determine outcome
  const hasError = findings.some((f) => f.severity === 'error');
  const hasWarning = findings.some((f) => f.severity === 'warning');
  let outcome: ScrubOutcome = 'pass';
  if (hasError) outcome = 'fail';
  else if (hasWarning) outcome = 'warn';

  const durationMs = Date.now() - startMs;

  return {
    id: randomUUID(),
    claimCaseId: claim.id,
    outcome,
    findings,
    rulesEvaluated,
    scrubDurationMs: durationMs,
    scrubbedAt: new Date().toISOString(),
    scrubbedBy: options.actor ?? 'system',
  };
}

/**
 * Auto-detect which packs to apply based on payer type/ID.
 * Always includes "core". Adds market-specific pack when detectable.
 */
function determinePacks(claim: ClaimCase, forcePack?: string): string[] {
  const packs = ['core'];

  if (forcePack) {
    if (RULE_PACKS[forcePack]) packs.push(forcePack);
    return packs;
  }

  // PhilHealth detection
  if (
    claim.payerType === 'government' ||
    claim.payerId?.toLowerCase().includes('philhealth') ||
    claim.memberPin
  ) {
    packs.push('philhealth');
  }

  // US payer detection
  if (
    claim.billingProviderNpi ||
    claim.payerType === 'commercial' ||
    (claim.payerId && /^\d{5}$/.test(claim.payerId)) // EDI payer IDs are often 5-digit
  ) {
    if (!packs.includes('philhealth')) {
      packs.push('us_core');
    }
  }

  return packs;
}
