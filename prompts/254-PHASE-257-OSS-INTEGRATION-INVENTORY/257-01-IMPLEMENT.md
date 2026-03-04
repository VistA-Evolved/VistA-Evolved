# Phase 257 — OSS Integration Inventory + ADRs (IMPLEMENT)

## Objective

Lock "make vs buy" decisions for all integration subsystems before
Wave 8 extension work begins.

## Implementation Steps

### 1. ADR: OSS Integration Strategy (`docs/decisions/ADR-OSS-Integrations.md`)

- 6 decisions covering HL7v2, FHIR, payer, K8s/DR, support, export
- References existing infrastructure and prior ADRs
- Documents alternatives not chosen with rationale

### 2. Integration Overview (`docs/integrations/INTEGRATIONS_OVERVIEW.md`)

- Canonical integration architecture diagram
- Message envelope specification
- Tenant routing strategy (shared engine + routing keys)
- Storage + trace + redaction rules
- Subsystem reference for all 6 integration areas
- Integration maturity matrix

### 3. Wave 8 Manifest (`docs/waves/WAVE8-MANIFEST.md`)

- 9-phase tracker with dependencies
- Existing foundations table
- Conventions

### 4. Repo Inventory (evidence)

- ripgrep scan for HL7, FHIR, RCM, export, support patterns
- Decision matrix documenting each option evaluated

## Files Created

- `docs/decisions/ADR-OSS-Integrations.md`
- `docs/integrations/INTEGRATIONS_OVERVIEW.md`
- `docs/waves/WAVE8-MANIFEST.md`
- `scripts/verify-phase257-integration-inventory.ps1`

## Files Inspected (not modified)

- `docs/decisions/ADR-hl7-engine-choice.md` — existing HL7 ADR
- `apps/api/src/hl7/` — existing HL7 engine (18 files)
- `apps/api/src/fhir/` — existing FHIR gateway (10 files)
- `apps/api/src/rcm/` — existing RCM subsystem (100+ files)
- `apps/api/src/exports/` — existing export engine
- `apps/api/src/support/` — existing support tooling
- `apps/api/src/pilot/` — existing pilot infrastructure
