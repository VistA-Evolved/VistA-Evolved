/**
 * Regulatory Framework Registry — Phase 439.
 *
 * Extensible registry of regulatory framework definitions.
 * Pre-populated with HIPAA, DPA_PH, DPA_GH, and stub entries
 * for NIST_800_53 and OWASP_ASVS.
 */

import type { FrameworkDefinition, RegulatoryFramework } from "./types.js";

/* ------------------------------------------------------------------ */
/* Registry store                                                       */
/* ------------------------------------------------------------------ */

const frameworks = new Map<RegulatoryFramework, FrameworkDefinition>();

/* ------------------------------------------------------------------ */
/* HIPAA (US)                                                           */
/* ------------------------------------------------------------------ */

const HIPAA_PHI_ELEMENTS = [
  "name", "address", "dates", "phone", "fax", "email", "ssn", "mrn",
  "healthPlanBeneficiary", "accountNumber", "certificateLicense",
  "vehicleIdentifier", "deviceIdentifier", "webUrl", "ipAddress",
  "biometricId", "photoFaceImage", "otherUniqueNumber",
];

frameworks.set("HIPAA", {
  id: "HIPAA",
  name: "Health Insurance Portability and Accountability Act",
  countryCodes: ["US"],
  phiElements: HIPAA_PHI_ELEMENTS,
  defaultRetention: { minYears: 6, framework: "HIPAA", erasureBlocked: true },
  defaultExportRestriction: {
    crossBorderRestricted: false,
    consentRequiredForExport: false,
    allowedDestinations: [],
    framework: "HIPAA",
  },
  consentModel: "category",
  breachNotificationHours: 1440, // 60 days
  breakGlassAllowed: true,
});

/* ------------------------------------------------------------------ */
/* DPA_PH (Philippines)                                                 */
/* ------------------------------------------------------------------ */

frameworks.set("DPA_PH", {
  id: "DPA_PH",
  name: "Data Privacy Act of 2012 (Republic Act 10173)",
  countryCodes: ["PH"],
  phiElements: ["name", "address", "phone", "email", "ssn", "mrn", "dob", "healthRecords"],
  defaultRetention: { minYears: 5, maxYears: 10, framework: "DPA_PH", erasureBlocked: false },
  defaultExportRestriction: {
    crossBorderRestricted: true,
    consentRequiredForExport: true,
    allowedDestinations: [],
    framework: "DPA_PH",
  },
  consentModel: "all-or-nothing",
  breachNotificationHours: 72,
  breakGlassAllowed: true,
});

/* ------------------------------------------------------------------ */
/* DPA_GH (Ghana)                                                       */
/* ------------------------------------------------------------------ */

frameworks.set("DPA_GH", {
  id: "DPA_GH",
  name: "Data Protection Act 2012 (Act 843)",
  countryCodes: ["GH"],
  phiElements: ["name", "address", "phone", "email", "mrn", "dob", "healthRecords"],
  defaultRetention: { minYears: 5, framework: "DPA_GH", erasureBlocked: false },
  defaultExportRestriction: {
    crossBorderRestricted: true,
    consentRequiredForExport: true,
    allowedDestinations: [],
    framework: "DPA_GH",
  },
  consentModel: "all-or-nothing",
  breachNotificationHours: 72,
  breakGlassAllowed: true,
});

/* ------------------------------------------------------------------ */
/* NIST 800-53 (US Federal — supplementary)                             */
/* ------------------------------------------------------------------ */

frameworks.set("NIST_800_53", {
  id: "NIST_800_53",
  name: "NIST SP 800-53 Rev 5",
  countryCodes: ["US"],
  phiElements: HIPAA_PHI_ELEMENTS, // Inherits from HIPAA
  defaultRetention: { minYears: 6, framework: "NIST_800_53", erasureBlocked: true },
  defaultExportRestriction: {
    crossBorderRestricted: false,
    consentRequiredForExport: false,
    allowedDestinations: [],
    framework: "NIST_800_53",
  },
  consentModel: "category",
  breachNotificationHours: 24, // US-CERT 24h for federal
  breakGlassAllowed: true,
});

/* ------------------------------------------------------------------ */
/* OWASP ASVS (supplementary security standard)                         */
/* ------------------------------------------------------------------ */

frameworks.set("OWASP_ASVS", {
  id: "OWASP_ASVS",
  name: "OWASP Application Security Verification Standard v4.0",
  countryCodes: [], // Applicable everywhere as supplementary standard
  phiElements: [],
  defaultRetention: { minYears: 1, framework: "OWASP_ASVS", erasureBlocked: false },
  defaultExportRestriction: {
    crossBorderRestricted: false,
    consentRequiredForExport: false,
    allowedDestinations: [],
    framework: "OWASP_ASVS",
  },
  consentModel: "opt-out",
  breachNotificationHours: -1,
  breakGlassAllowed: true,
});

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

export function getFramework(id: RegulatoryFramework): FrameworkDefinition | undefined {
  return frameworks.get(id);
}

export function getAllFrameworks(): FrameworkDefinition[] {
  return [...frameworks.values()];
}

/**
 * Resolve applicable frameworks for a country code.
 * US → [HIPAA], PH → [DPA_PH], GH → [DPA_GH].
 * NIST/OWASP are supplementary and not auto-resolved.
 */
export function resolveFrameworksByCountry(countryCode: string): RegulatoryFramework[] {
  const results: RegulatoryFramework[] = [];
  for (const fw of frameworks.values()) {
    if (fw.countryCodes.includes(countryCode.toUpperCase())) {
      results.push(fw.id);
    }
  }
  return results;
}

/**
 * Register a custom framework at runtime.
 * Used for extending with additional country regulations.
 */
export function registerFramework(def: FrameworkDefinition): void {
  frameworks.set(def.id as RegulatoryFramework, def);
}
