# 319 — W14-P3: HL7v2 Message Pack Standard + Template Library

## Request

Extend the existing HL7v2 message pack system (Phase 241) with a versioned
template library featuring conformance profiles, segment/field constraints,
and template validation.

## Implementation Steps

1. **Template types** (`apps/api/src/hl7/templates/types.ts`)
   - ConformanceProfile with IHE/HL7/custom sources
   - 8 well-known profiles (IHE-PAM, IHE-SWF, IHE-LAB, HL7-251-*)
   - FieldConstraint with optionality (R/RE/O/C/X), data types, fixed values
   - SegmentTemplate with usage, cardinality, field constraints
   - MessageTemplate: versioned, scoped (system/tenant), status FSM, profiles
   - TemplateValidationResult and TemplateValidationIssue types

2. **Template store** (`apps/api/src/hl7/templates/template-store.ts`)
   - In-memory Map store (same pattern as all other stores)
   - CRUD: create, get, list (with filters), updateStatus, updateSegments,
     updateProfiles, clone, delete (draft only)
   - Status FSM: draft -> active -> deprecated -> archived
   - Tenant scoping with system template visibility

3. **Template validator** (`apps/api/src/hl7/templates/template-validator.ts`)
   - validateAgainstTemplate(): segment presence/cardinality, field optionality,
     field length, fixed values, conformance profile coverage
   - getConformanceSummary(): template summary for reporting
   - Uses existing parser.ts getField/getSegments with proper Hl7Segment types

4. **Routes** (`apps/api/src/routes/hl7-templates.ts`)
   - 12 REST endpoints under /hl7/templates/*
   - CRUD + validate + clone + conformance + profiles listing + stats

5. **Wiring**: register-routes.ts, security.ts AUTH_RULES, store-policy.ts

## Files Touched

- `apps/api/src/hl7/templates/types.ts` (new)
- `apps/api/src/hl7/templates/template-store.ts` (new)
- `apps/api/src/hl7/templates/template-validator.ts` (new)
- `apps/api/src/hl7/templates/index.ts` (new)
- `apps/api/src/routes/hl7-templates.ts` (new)
- `apps/api/src/server/register-routes.ts` (import + register)
- `apps/api/src/middleware/security.ts` (AUTH_RULES)
- `apps/api/src/platform/store-policy.ts` (1 store entry)
