# Phase 174 -- PG-Only Data Plane

## Implementation Steps

1. Enforce PostgreSQL as sole persistence backend in rc/prod mode
2. Block SQLite store resolution when PLATFORM_RUNTIME_MODE=rc|prod
3. Block JSON mutable file stores in rc/prod
4. Ensure PLATFORM_PG_URL is required at startup in rc/prod
5. Add data-plane posture gate to /posture/data-plane endpoint

## Files Touched

- apps/api/src/platform/store-resolver.ts
- apps/api/src/platform/runtime-mode.ts
- apps/api/src/posture/data-plane-posture.ts

## Source

- Derived from wave playbook decomposition (Q213-Q215)
- Original phase specification in wave mega-document
- Enriched by Q219 audit to meet quality floor

## Dependencies

- Requires completion of prior phases in the wave sequence
- See wave playbook for cross-phase dependencies
