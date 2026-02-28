# Phase 177 -- Durability Audit

## Implementation Steps
1. Inventory all in-memory Map stores across the codebase
2. Classify each as ephemeral-ok vs needs-persistence
3. Document migration paths for stores that need persistence
4. Register all stores in store-policy.ts with correct backend designation

## Files Touched
- apps/api/src/platform/store-policy.ts

## Source
- Derived from wave playbook decomposition (Q213-Q215)
- Original phase specification in wave mega-document
- Enriched by Q219 audit to meet quality floor

## Dependencies
- Requires completion of prior phases in the wave sequence
- See wave playbook for cross-phase dependencies
