# Phase 279 — VERIFY: Interop HL7 Engine Production Convergence

## Gates

1. `apps/api/src/hl7/fhir-bridge.ts` exports FHIR R4 conversion functions
2. `apps/api/src/hl7/channel-health.ts` exports health aggregation
3. `apps/api/src/hl7/outbound-builder.ts` exports message builders
4. `config/hl7-conformance.json` is valid JSON with message type declarations
5. `scripts/qa-gates/hl7-interop-gate.mjs` passes
6. No Mirth Connect references added (per ADR-hl7-engine-choice.md)
