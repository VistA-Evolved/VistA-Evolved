/**
 * Regulatory module barrel export — Phase 439 + 440.
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
