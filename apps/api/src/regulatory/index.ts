/**
 * Regulatory module barrel export — Phase 439.
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

export { classify, setTenantCountry, getTenantCountry } from "./classification-engine.js";
export { getFramework, getAllFrameworks, resolveFrameworksByCountry, registerFramework } from "./framework-registry.js";
