# Phase 577 — Notes

> Wave 42: Production Remediation | Phase 577

## Why This Phase Exists

Phase 3B of the remediation plan: migration v60 (Phase 575) creates 17 new tables. This phase implements the PG repos and wires each store to use them instead of in-memory Maps, completing the store migration for these domains.

## Key Decisions

- **HL7 tables**: May be in a separate `hl7/` module; ensure paths exist or create stubs.
- **Plugin registry**: If `plugin-sdk.ts` doesn't exist, create minimal scaffold.
- **Scaffold routes**: Some routes (e.g., discharge-workflow, med-reconciliation) may be stubs; wire the store even if route logic is minimal.

## Deferred Items

- Full HL7 routing logic (routes may be integration-pending).
- Plugin SDK runtime loading — this phase only persists registry metadata.
