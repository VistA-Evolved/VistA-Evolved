/**
 * Country-Specific Validation — Phase 443.
 *
 * Per-country validation rules for clinical/billing/demographic data.
 * Each country has a validator that checks data against local regulatory
 * requirements (code systems, field formats, required fields, etc.).
 *
 * Validators are registered per country and composed at runtime:
 * 1. Common validators (always run)
 * 2. Country-specific validators (resolved from tenant→country mapping)
 * 3. Framework-specific validators (resolved from country→framework)
 */

import type { RegulatoryFramework } from "./types.js";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type ValidationDomain =
  | "demographics"
  | "diagnosis"
  | "procedure"
  | "medication"
  | "billing"
  | "consent"
  | "identifier"
  | "encounter";

export type ValidationSeverity = "error" | "warning" | "info";

export interface CountryValidationResult {
  domain: ValidationDomain;
  field: string;
  severity: ValidationSeverity;
  code: string;
  message: string;
  framework?: RegulatoryFramework;
  country: string;
}

export interface CountryValidator {
  /** ISO 3166-1 alpha-2 */
  countryCode: string;
  /** Human-readable name */
  name: string;
  /** Which domains this validator covers */
  domains: ValidationDomain[];
  /** Validate a data record and return findings */
  validate(domain: ValidationDomain, record: Record<string, any>): CountryValidationResult[];
}

export interface ValidationSummary {
  country: string;
  domain: ValidationDomain;
  total: number;
  errors: number;
  warnings: number;
  infos: number;
  results: CountryValidationResult[];
}

/* ------------------------------------------------------------------ */
/* Registry                                                             */
/* ------------------------------------------------------------------ */

const validators = new Map<string, CountryValidator>();

/* ------------------------------------------------------------------ */
/* US Validator                                                         */
/* ------------------------------------------------------------------ */

const usValidator: CountryValidator = {
  countryCode: "US",
  name: "United States (HIPAA)",
  domains: ["demographics", "diagnosis", "procedure", "medication", "billing", "identifier"],
  validate(domain, record) {
    const results: CountryValidationResult[] = [];
    const cc = "US";

    if (domain === "diagnosis") {
      // ICD-10-CM required
      const code = record.code || record.icdCode || "";
      if (code && !/^[A-Z]\d{2}(\.\d{1,4})?$/.test(code)) {
        results.push({ domain, field: "code", severity: "error", code: "US-DX-001", message: "Diagnosis code must be ICD-10-CM format (e.g. J06.9)", country: cc, framework: "HIPAA" });
      }
    }

    if (domain === "procedure") {
      const cpt = record.cptCode || record.code || "";
      if (cpt && !/^\d{5}$/.test(cpt)) {
        results.push({ domain, field: "cptCode", severity: "error", code: "US-PX-001", message: "Procedure code must be 5-digit CPT format", country: cc, framework: "HIPAA" });
      }
    }

    if (domain === "medication") {
      const ndc = record.ndcCode || record.ndc || "";
      if (ndc && !/^\d{4,5}-\d{3,4}-\d{1,2}$/.test(ndc) && !/^\d{10,11}$/.test(ndc)) {
        results.push({ domain, field: "ndcCode", severity: "warning", code: "US-RX-001", message: "Medication code should be NDC format (NNNNN-NNNN-NN or 11-digit)", country: cc });
      }
    }

    if (domain === "billing") {
      // NPI required for billing
      const npi = record.npi || record.providerNpi || "";
      if (!npi) {
        results.push({ domain, field: "npi", severity: "error", code: "US-BL-001", message: "NPI is required for US billing claims", country: cc, framework: "HIPAA" });
      } else if (!/^\d{10}$/.test(npi)) {
        results.push({ domain, field: "npi", severity: "error", code: "US-BL-002", message: "NPI must be 10 digits", country: cc, framework: "HIPAA" });
      }
      // Tax ID
      const taxId = record.taxId || record.ein || "";
      if (taxId && !/^\d{2}-?\d{7}$/.test(taxId)) {
        results.push({ domain, field: "taxId", severity: "warning", code: "US-BL-003", message: "Tax ID should be EIN format (NN-NNNNNNN)", country: cc });
      }
    }

    if (domain === "identifier") {
      const ssn = record.ssn || "";
      if (ssn && !/^\d{3}-?\d{2}-?\d{4}$/.test(ssn)) {
        results.push({ domain, field: "ssn", severity: "error", code: "US-ID-001", message: "SSN must be 9 digits (NNN-NN-NNNN)", country: cc, framework: "HIPAA" });
      }
    }

    if (domain === "demographics") {
      if (!record.dateOfBirth && !record.dob) {
        results.push({ domain, field: "dateOfBirth", severity: "warning", code: "US-DM-001", message: "Date of birth recommended for patient identification", country: cc });
      }
    }

    return results;
  },
};

/* ------------------------------------------------------------------ */
/* PH Validator                                                         */
/* ------------------------------------------------------------------ */

const phValidator: CountryValidator = {
  countryCode: "PH",
  name: "Philippines (DPA 2012)",
  domains: ["demographics", "diagnosis", "billing", "identifier", "consent"],
  validate(domain, record) {
    const results: CountryValidationResult[] = [];
    const cc = "PH";

    if (domain === "diagnosis") {
      const code = record.code || record.icdCode || "";
      if (code && !/^[A-Z]\d{2}(\.\d{1,4})?$/.test(code)) {
        results.push({ domain, field: "code", severity: "error", code: "PH-DX-001", message: "Diagnosis code must be ICD-10-WHO format", country: cc, framework: "DPA_PH" });
      }
    }

    if (domain === "billing") {
      // PhilHealth PIN required
      const pin = record.philhealthPin || record.memberPin || "";
      if (!pin) {
        results.push({ domain, field: "philhealthPin", severity: "error", code: "PH-BL-001", message: "PhilHealth PIN is required for PH billing claims", country: cc, framework: "DPA_PH" });
      } else if (!/^\d{2}-\d{9}-\d$/.test(pin)) {
        results.push({ domain, field: "philhealthPin", severity: "warning", code: "PH-BL-002", message: "PhilHealth PIN format: NN-NNNNNNNNN-N", country: cc, framework: "DPA_PH" });
      }
      // Facility code
      if (!record.facilityCode && !record.phicFacilityCode) {
        results.push({ domain, field: "facilityCode", severity: "error", code: "PH-BL-003", message: "PHIC facility code required for claims", country: cc, framework: "DPA_PH" });
      }
    }

    if (domain === "consent") {
      // DPA requires explicit consent
      if (!record.consentGiven && record.consentGiven !== true) {
        results.push({ domain, field: "consentGiven", severity: "error", code: "PH-CN-001", message: "Explicit data processing consent required under DPA 2012", country: cc, framework: "DPA_PH" });
      }
    }

    if (domain === "identifier") {
      // Philippine identification
      const philId = record.philId || record.nationalId || "";
      if (philId && !/^\d{4}-\d{4}-\d{4}$/.test(philId)) {
        results.push({ domain, field: "philId", severity: "info", code: "PH-ID-001", message: "Philippine national ID format: NNNN-NNNN-NNNN", country: cc });
      }
    }

    if (domain === "demographics") {
      if (!record.dateOfBirth && !record.dob) {
        results.push({ domain, field: "dateOfBirth", severity: "error", code: "PH-DM-001", message: "Date of birth required for PhilHealth claims", country: cc, framework: "DPA_PH" });
      }
    }

    return results;
  },
};

/* ------------------------------------------------------------------ */
/* GH Validator                                                         */
/* ------------------------------------------------------------------ */

const ghValidator: CountryValidator = {
  countryCode: "GH",
  name: "Ghana (DPA 2012)",
  domains: ["demographics", "diagnosis", "billing", "identifier"],
  validate(domain, record) {
    const results: CountryValidationResult[] = [];
    const cc = "GH";

    if (domain === "diagnosis") {
      const code = record.code || record.icdCode || "";
      if (code && !/^[A-Z]\d{2}(\.\d{1,4})?$/.test(code)) {
        results.push({ domain, field: "code", severity: "error", code: "GH-DX-001", message: "Diagnosis code must be ICD-10-WHO format", country: cc, framework: "DPA_GH" });
      }
    }

    if (domain === "billing") {
      // NHIA membership required
      const nhiaId = record.nhiaId || record.nhisNumber || "";
      if (!nhiaId) {
        results.push({ domain, field: "nhiaId", severity: "error", code: "GH-BL-001", message: "NHIA membership number required for GH billing", country: cc, framework: "DPA_GH" });
      }
      // G-DRG code for inpatient
      if (record.claimType === "inpatient" && !record.gDrgCode) {
        results.push({ domain, field: "gDrgCode", severity: "warning", code: "GH-BL-002", message: "G-DRG code recommended for inpatient claims", country: cc });
      }
    }

    if (domain === "identifier") {
      const ghCardNumber = record.ghanaCardNumber || record.nationalId || "";
      if (ghCardNumber && !/^GHA-\d{9}-\d$/.test(ghCardNumber)) {
        results.push({ domain, field: "ghanaCardNumber", severity: "info", code: "GH-ID-001", message: "Ghana Card format: GHA-NNNNNNNNN-N", country: cc });
      }
    }

    return results;
  },
};

/* ------------------------------------------------------------------ */
/* Registration + Public API                                            */
/* ------------------------------------------------------------------ */

// Pre-register built-in validators
validators.set("US", usValidator);
validators.set("PH", phValidator);
validators.set("GH", ghValidator);

/**
 * Register a custom country validator.
 */
export function registerCountryValidator(validator: CountryValidator): void {
  validators.set(validator.countryCode.toUpperCase(), validator);
}

/**
 * Get a validator for a specific country.
 */
export function getCountryValidator(countryCode: string): CountryValidator | undefined {
  return validators.get(countryCode.toUpperCase());
}

/**
 * List all registered country validators.
 */
export function listCountryValidators(): CountryValidator[] {
  return [...validators.values()];
}

/**
 * Validate a data record against the rules for a specific country and domain.
 * If the country has no validator, returns an empty result.
 */
export function validateForCountry(
  countryCode: string,
  domain: ValidationDomain,
  record: Record<string, any>,
): ValidationSummary {
  const cc = countryCode.toUpperCase();
  const validator = validators.get(cc);

  if (!validator || !validator.domains.includes(domain)) {
    return { country: cc, domain, total: 0, errors: 0, warnings: 0, infos: 0, results: [] };
  }

  const results = validator.validate(domain, record);
  return {
    country: cc,
    domain,
    total: results.length,
    errors: results.filter((r) => r.severity === "error").length,
    warnings: results.filter((r) => r.severity === "warning").length,
    infos: results.filter((r) => r.severity === "info").length,
    results,
  };
}

/**
 * Validate a data record against ALL applicable validators for a country
 * across all domains they support.
 */
export function validateAllDomains(
  countryCode: string,
  records: { domain: ValidationDomain; data: Record<string, any> }[],
): ValidationSummary[] {
  return records.map((r) => validateForCountry(countryCode, r.domain, r.data));
}
