/**
 * Regulatory Classification Engine — Phase 439.
 *
 * Classifies API operations and data elements against applicable
 * regulatory frameworks. Unifies existing PHI redaction (phi-redaction.ts),
 * compliance matrix (compliance-matrix.ts), consent profiles (consent-engine.ts),
 * and country-pack regulatory profiles into a single classification pipeline.
 */

import type {
  ClassificationRequest,
  RegulatoryClassification,
  RegulatoryConstraint,
  RegulatoryFramework,
  DataClassTier,
  ConstraintSeverity,
} from './types.js';
import { getFramework, resolveFrameworksByCountry } from './framework-registry.js';

/* ------------------------------------------------------------------ */
/* Country resolution (tenant → country)                                */
/* ------------------------------------------------------------------ */

/** Default tenant → country mapping. Override per-tenant via config. */
const TENANT_COUNTRY_MAP = new Map<string, string>([['default', 'US']]);

export function setTenantCountry(tenantId: string, countryCode: string): void {
  TENANT_COUNTRY_MAP.set(tenantId, countryCode.toUpperCase());
}

export function getTenantCountry(tenantId: string): string {
  return TENANT_COUNTRY_MAP.get(tenantId) || 'US';
}

/* ------------------------------------------------------------------ */
/* PHI detection (reuses patterns from phi-redaction.ts)                 */
/* ------------------------------------------------------------------ */

const PHI_FIELD_PATTERNS = new Set([
  'name',
  'patientname',
  'patient_name',
  'fullname',
  'ssn',
  'social',
  'socialsecurity',
  'dob',
  'dateofbirth',
  'date_of_birth',
  'birthdate',
  'address',
  'streetaddress',
  'street_address',
  'phone',
  'telephone',
  'fax',
  'cell',
  'email',
  'emailaddress',
  'mrn',
  'medicalrecordnumber',
  'patientid',
  'dfn',
  'patientdfn',
  'patient_dfn',
  'accountnumber',
  'insuranceid',
  'policyid',
  'ipaddress',
  'ip_address',
  'biometric',
  'fingerprint',
  'faceimage',
  'photo',
  'photograph',
]);

function detectPhiFields(elements: string[]): string[] {
  return elements.filter((e) => PHI_FIELD_PATTERNS.has(e.toLowerCase().replace(/[-_\s]/g, '')));
}

/* ------------------------------------------------------------------ */
/* Data tier inference                                                  */
/* ------------------------------------------------------------------ */

function inferDataTier(phiCount: number, operationRisk: string): DataClassTier {
  if (phiCount > 0) return 'C1_PHI';
  if (operationRisk === 'admin' || operationRisk === 'export') return 'C2_DEIDENTIFIED';
  if (operationRisk === 'read') return 'C4_OPERATIONAL';
  return 'C3_AGGREGATED';
}

/* ------------------------------------------------------------------ */
/* Risk level calculation                                               */
/* ------------------------------------------------------------------ */

function calculateRisk(
  phiCount: number,
  operationRisk: string,
  unsatisfiedConstraints: number
): 'low' | 'medium' | 'high' | 'critical' {
  if (unsatisfiedConstraints > 3 || (phiCount > 5 && operationRisk === 'export')) return 'critical';
  if (unsatisfiedConstraints > 1 || (phiCount > 0 && operationRisk === 'write')) return 'high';
  if (phiCount > 0 || operationRisk === 'admin') return 'medium';
  return 'low';
}

/* ------------------------------------------------------------------ */
/* Constraint generation                                                */
/* ------------------------------------------------------------------ */

function generateConstraints(
  fw: RegulatoryFramework,
  phiCount: number,
  operationRisk: string
): RegulatoryConstraint[] {
  const constraints: RegulatoryConstraint[] = [];
  const fwDef = getFramework(fw);
  if (!fwDef) return constraints;

  // PHI access control
  if (phiCount > 0) {
    constraints.push({
      framework: fw,
      clause: fw === 'HIPAA' ? '§164.312(a)(1)' : `${fw}.access-control`,
      title: 'Access Control for PHI',
      severity: 'mandatory' as ConstraintSeverity,
      requirement: 'PHI access must be role-based with audit logging',
      satisfied: true, // We have RBAC + audit trails
      evidenceRef: 'apps/api/src/auth/policy-engine.ts',
    });
  }

  // Audit trail requirement
  if (operationRisk === 'write' || operationRisk === 'delete') {
    constraints.push({
      framework: fw,
      clause: fw === 'HIPAA' ? '§164.312(b)' : `${fw}.audit`,
      title: 'Audit Controls',
      severity: 'mandatory' as ConstraintSeverity,
      requirement: 'Write operations must be recorded in immutable audit trail',
      satisfied: true, // Phase 436 wired adapter write audit
      evidenceRef: 'apps/api/src/adapters/adapter-audit.ts',
    });
  }

  // Encryption at rest (always required for PHI)
  if (phiCount > 0) {
    constraints.push({
      framework: fw,
      clause: fw === 'HIPAA' ? '§164.312(a)(2)(iv)' : `${fw}.encryption`,
      title: 'Encryption at Rest',
      severity: 'mandatory' as ConstraintSeverity,
      requirement: 'PHI must be encrypted at rest',
      satisfied: true, // VistA globals + PG encryption
      evidenceRef: 'services/vista/docker-compose.yml',
    });
  }

  // Consent requirement
  if (fwDef.consentModel === 'all-or-nothing') {
    constraints.push({
      framework: fw,
      clause: `${fw}.consent`,
      title: 'Explicit Consent Required',
      severity: 'mandatory' as ConstraintSeverity,
      requirement: 'All data processing requires explicit patient consent',
      satisfied: true, // consent-engine.ts handles this
      evidenceRef: 'apps/api/src/services/consent-engine.ts',
    });
  }

  // Cross-border restriction
  if (fwDef.defaultExportRestriction.crossBorderRestricted) {
    constraints.push({
      framework: fw,
      clause: `${fw}.cross-border`,
      title: 'Cross-Border Data Transfer Restriction',
      severity: 'mandatory' as ConstraintSeverity,
      requirement: 'Patient consent required for cross-border data transfer',
      satisfied: true, // country-pack regulatoryProfile
      evidenceRef: `country-packs/${fwDef.countryCodes[0]}/values.json`,
    });
  }

  // Breach notification
  if (fwDef.breachNotificationHours > 0) {
    constraints.push({
      framework: fw,
      clause: `${fw}.breach-notify`,
      title: 'Breach Notification',
      severity: 'mandatory' as ConstraintSeverity,
      requirement: `Breach must be reported within ${fwDef.breachNotificationHours}h`,
      satisfied: false, // Not yet implemented
    });
  }

  return constraints;
}

/* ------------------------------------------------------------------ */
/* Main Classification Function                                         */
/* ------------------------------------------------------------------ */

/**
 * Classify an API operation against applicable regulatory frameworks.
 *
 * Resolves the tenant's country → applicable frameworks → generates
 * constraints → detects PHI fields → calculates risk level.
 */
export function classify(req: ClassificationRequest): RegulatoryClassification {
  const country = req.countryCode || getTenantCountry(req.tenantId || 'default');
  const applicableFrameworks = resolveFrameworksByCountry(country);

  // Always include OWASP as supplementary
  if (!applicableFrameworks.includes('OWASP_ASVS')) {
    applicableFrameworks.push('OWASP_ASVS');
  }

  const phiFields = detectPhiFields(req.dataElements || []);
  const dataTier = req.dataTier || inferDataTier(phiFields.length, req.operationRisk);

  // Collect constraints from all frameworks
  const allConstraints: RegulatoryConstraint[] = [];
  for (const fw of applicableFrameworks) {
    allConstraints.push(...generateConstraints(fw, phiFields.length, req.operationRisk));
  }

  const unsatisfied = allConstraints.filter((c) => !c.satisfied).length;

  // Determine consent requirements
  const consentRequired: string[] = [];
  for (const fw of applicableFrameworks) {
    const fwDef = getFramework(fw);
    if (!fwDef) continue;
    if (fwDef.consentModel === 'all-or-nothing' && phiFields.length > 0) {
      consentRequired.push('all_data_processing');
    }
    if (fwDef.consentModel === 'category') {
      if (req.operationRisk === 'write') consentRequired.push('treatment');
      if (req.operationRisk === 'export') consentRequired.push('data_sharing');
    }
  }

  // Determine retention from primary framework
  const primaryFw = getFramework(applicableFrameworks[0]);
  const retention = primaryFw?.defaultRetention || {
    minYears: 6,
    framework: applicableFrameworks[0] || 'HIPAA',
    erasureBlocked: true,
  };

  const exportRestriction = primaryFw?.defaultExportRestriction || {
    crossBorderRestricted: false,
    consentRequiredForExport: false,
    allowedDestinations: [],
    framework: applicableFrameworks[0] || 'HIPAA',
  };

  return {
    frameworks: applicableFrameworks,
    dataTier,
    phiFieldsDetected: phiFields,
    constraints: allConstraints,
    consentRequired: [...new Set(consentRequired)],
    retention,
    exportRestrictions: exportRestriction,
    riskLevel: calculateRisk(phiFields.length, req.operationRisk, unsatisfied),
    classifiedAt: new Date().toISOString(),
  };
}
