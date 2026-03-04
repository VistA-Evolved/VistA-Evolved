# Phase 439 — Regulatory Classification Engine (W28 P1)

## Goal

Unify existing regulatory/compliance infrastructure into a single classification engine that can classify API operations and data elements against applicable regulatory frameworks at runtime.

## What Changed

1. Created `apps/api/src/regulatory/types.ts` — Core types: RegulatoryFramework (5), DataClassTier (C1-C4), OperationRisk, ClassificationRequest, RegulatoryClassification, RegulatoryConstraint, RetentionRequirement, ExportRestriction, FrameworkDefinition, RegulatoryAuditEntry
2. Created `apps/api/src/regulatory/framework-registry.ts` — 5 framework definitions (HIPAA, DPA_PH, DPA_GH, NIST_800_53, OWASP_ASVS) with country→framework resolution
3. Created `apps/api/src/regulatory/classification-engine.ts` — `classify()` function: tenant→country→frameworks→constraints→PHI detection→risk calculation pipeline
4. Created `apps/api/src/regulatory/index.ts` — Barrel export

## Design Decisions

- Reuses PHI field patterns from `phi-redaction.ts` (Phase 48/151)
- Reuses consent model types from `consent-engine.ts` (Phase 312)
- Reuses regulatory profiles from country-packs (Phase 314)
- Extends existing `RegulatoryFramework` type from `compliance-matrix.ts` (Phase 315)
- HIPAA 18 PHI identifiers enumerated per Safe Harbor method
- Breach notification flagged as `satisfied: false` (not yet implemented)
- OWASP always included as supplementary standard
- In-memory tenant→country map (consistent with other store patterns)

## Files Created

- `apps/api/src/regulatory/types.ts`
- `apps/api/src/regulatory/framework-registry.ts`
- `apps/api/src/regulatory/classification-engine.ts`
- `apps/api/src/regulatory/index.ts`
