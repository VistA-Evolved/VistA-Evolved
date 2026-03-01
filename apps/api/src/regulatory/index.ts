/**
 * Regulatory module barrel export — Phase 439 + 440 + 441 + 442.
 */

export type {
  RegulatoryFramework,
  DataClassTier,
  OperationRisk,
  ConstraintSeverity,
  ClassificationRequest,
  RegulatoryClassification,
  RegulatoryConstraint,
  RetentionRequirement,
  ExportRestriction,
  FrameworkDefinition,
  RegulatoryAuditEntry,
} from "./types.js";

export type {
  AttestationStatus,
  ComplianceAttestation,
  AttestationEvidence,
  AttestationSummary,
} from "./attestation-store.js";

export type {
  TenantCountryAssignment,
  TenantRegulatoryConfig,
  CountryAssignmentAudit,
} from "./country-config.js";

export type {
  ExportFormat,
  ExportStatus,
  ExportRequest,
  ExportConstraintCheck,
  ExportManifest,
  ExportPackage,
  ExportAuditEntry,
} from "./export-pipeline.js";

export { classify, setTenantCountry, getTenantCountry } from "./classification-engine.js";
export { getFramework, getAllFrameworks, resolveFrameworksByCountry, registerFramework } from "./framework-registry.js";

export {
  createAttestation,
  getAttestation,
  listAttestations,
  revokeAttestation,
  checkExpiredAttestations,
  getAttestationSummary,
  verifyAttestationChain,
} from "./attestation-store.js";

export {
  assignCountryToTenant,
  getTenantCountryAssignment,
  listTenantCountryAssignments,
  getTenantAssignmentHistory,
  clearTenantCountry,
  resolveTenantRegulatoryConfig,
  getSupportedCountries,
  addSupportedCountry,
  getCountryAssignmentAudit,
  verifyCountryAuditChain,
} from "./country-config.js";

export {
  createExportPackage,
  getExportPackage,
  listExportPackages,
  getExportAudit,
  verifyExportAuditChain,
} from "./export-pipeline.js";
