/**
 * Regulatory Classification Engine — Types (Phase 439)
 *
 * Core domain types for the regulatory classification engine.
 * Extends existing RegulatoryFramework from compliance-matrix.ts
 * and PhiClassification from phi-redaction.ts.
 */

/* ------------------------------------------------------------------ */
/* Regulatory Frameworks                                                */
/* ------------------------------------------------------------------ */

/** Extends compliance-matrix.ts `RegulatoryFramework` with additional standards. */
export type RegulatoryFramework = 'HIPAA' | 'DPA_PH' | 'DPA_GH' | 'NIST_800_53' | 'OWASP_ASVS';

/** Data classification tiers aligned with Phase 25 C1-C4 model. */
export type DataClassTier = 'C1_PHI' | 'C2_DEIDENTIFIED' | 'C3_AGGREGATED' | 'C4_OPERATIONAL';

/** Operation risk classification. */
export type OperationRisk = 'read' | 'write' | 'admin' | 'export' | 'delete';

/** Regulatory constraint severity. */
export type ConstraintSeverity = 'mandatory' | 'recommended' | 'informational';

/* ------------------------------------------------------------------ */
/* Classification Input                                                 */
/* ------------------------------------------------------------------ */

export interface ClassificationRequest {
  /** The API operation being classified (e.g. "/vista/allergies", "ORWDAL32 SAVE ALLERGY") */
  operation: string;
  /** Type of operation */
  operationRisk: OperationRisk;
  /** Data elements involved (field names) */
  dataElements?: string[];
  /** Target data class tier */
  dataTier?: DataClassTier;
  /** Tenant ID for per-tenant framework resolution */
  tenantId?: string;
  /** Country code (ISO 3166-1 alpha-2) — overrides tenant resolution */
  countryCode?: string;
}

/* ------------------------------------------------------------------ */
/* Classification Output                                                */
/* ------------------------------------------------------------------ */

export interface RegulatoryClassification {
  /** Applicable frameworks (may be multiple — e.g. HIPAA + NIST for US federal) */
  frameworks: RegulatoryFramework[];
  /** Data class tier */
  dataTier: DataClassTier;
  /** PHI fields detected in data elements */
  phiFieldsDetected: string[];
  /** Applicable constraints from all frameworks */
  constraints: RegulatoryConstraint[];
  /** Required consent categories for this operation */
  consentRequired: string[];
  /** Retention requirements */
  retention: RetentionRequirement;
  /** Export restrictions */
  exportRestrictions: ExportRestriction;
  /** Overall risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Classification timestamp */
  classifiedAt: string;
}

export interface RegulatoryConstraint {
  framework: RegulatoryFramework;
  /** Regulation clause reference (e.g. "§164.312(a)(1)") */
  clause: string;
  title: string;
  severity: ConstraintSeverity;
  /** What the constraint requires */
  requirement: string;
  /** Is this constraint satisfied by existing implementation? */
  satisfied: boolean;
  /** Evidence path if satisfied */
  evidenceRef?: string;
}

export interface RetentionRequirement {
  minYears: number;
  maxYears?: number;
  framework: RegulatoryFramework;
  /** If true, data cannot be deleted even upon request (e.g. HIPAA 6-year rule) */
  erasureBlocked: boolean;
}

export interface ExportRestriction {
  /** Is cross-border data transfer restricted? */
  crossBorderRestricted: boolean;
  /** Consent required for export? */
  consentRequiredForExport: boolean;
  /** Allowed destination countries (empty = no restriction) */
  allowedDestinations: string[];
  framework: RegulatoryFramework;
}

/* ------------------------------------------------------------------ */
/* Framework Definition (registry input)                                */
/* ------------------------------------------------------------------ */

export interface FrameworkDefinition {
  id: RegulatoryFramework;
  name: string;
  countryCodes: string[];
  /** PHI element definitions (HIPAA has 18 identifiers) */
  phiElements: string[];
  /** Default retention */
  defaultRetention: RetentionRequirement;
  /** Default export restrictions */
  defaultExportRestriction: ExportRestriction;
  /** Consent model type */
  consentModel: 'category' | 'all-or-nothing' | 'opt-in' | 'opt-out';
  /** Breach notification window (hours, -1 = no requirement) */
  breachNotificationHours: number;
  /** Whether break-glass access is allowed */
  breakGlassAllowed: boolean;
}

/* ------------------------------------------------------------------ */
/* Audit trail for classification decisions                             */
/* ------------------------------------------------------------------ */

export interface RegulatoryAuditEntry {
  id: string;
  timestamp: string;
  operation: string;
  frameworks: RegulatoryFramework[];
  riskLevel: string;
  constraintCount: number;
  satisfied: number;
  unsatisfied: number;
  actor: string;
  /** SHA-256 hash of previous entry for chain integrity */
  prevHash: string;
  /** SHA-256 hash of this entry */
  hash: string;
}
