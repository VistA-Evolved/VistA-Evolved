# Phase 213 -- Backfill Wave 1 into Real Phases 173-178

## Context
Wave 1 bundled 6 queue items (Q173-Q178) into one mega-phase folder.
This phase decomposes them into individual phase folders with proper
IMPLEMENT + VERIFY files.

## Implementation Steps

1. Move `178-PHASE-173-178-PROD-CONVERGENCE` to `00-PLAYBOOKS/wave1-prod-convergence/`
2. Create individual phase folders for Phases 173-178:
   - Phase 173: API Bootstrap Decomposition
   - Phase 174: Postgres-Only Platform Dataplane
   - Phase 175: Schema + Migration Single Source of Truth
   - Phase 176: Tenant Context + RLS Enforcement
   - Phase 177: Durability Audit + Restart Resilience
   - Phase 178: FHIR R4 Gateway
3. Each gets IMPLEMENT + VERIFY files derived from the mega-document
4. Regenerate phase-index.json

## Files Touched
- prompts/178-PHASE-173-178-PROD-CONVERGENCE/ (moved to playbooks)
- prompts/182-PHASE-173-API-BOOTSTRAP/ (new)
- prompts/183-PHASE-174-PG-ONLY-DATAPLANE/ (new)
- prompts/184-PHASE-175-SCHEMA-MIGRATION-SOT/ (new)
- prompts/185-PHASE-176-TENANT-RLS/ (new)
- prompts/186-PHASE-177-DURABILITY-AUDIT/ (new)
- prompts/187-PHASE-178-FHIR-R4-GATEWAY/ (new)
