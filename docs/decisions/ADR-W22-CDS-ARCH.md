# ADR: CDS Architecture — Native Engine + CQF Ruler Integration

- **Status**: Accepted
- **Date**: 2026-03-01
- **Phase**: 389 (W22-P1)

## Context

Clinical Decision Support (CDS) is needed at multiple workflow points:
- `patient-view` — alerts when opening a patient chart (e.g., overdue screening)
- `order-sign` — checks when signing an order (e.g., drug interaction, duplicate)
- `medication-prescribe` — pharmacy-specific checks (e.g., renal dosing)
- `encounter-start` — admission/triage screening (e.g., sepsis risk)

The HL7 CDS Hooks specification (https://cds-hooks.hl7.org/) defines a standard
REST-based protocol for invoking CDS services. CQF Ruler is a FHIR-based
reference implementation that evaluates CQL (Clinical Quality Language) logic
against patient data.

We need to decide between:
1. **Native-only** — implement CDS logic in TypeScript within the platform
2. **CQF Ruler only** — delegate all CDS to an external CQF Ruler sidecar
3. **Hybrid** — native engine for simple rules + CQF Ruler for complex logic

## Decision

**Hybrid approach**: native CDS engine for real-time simple rules + CQF Ruler
sidecar for complex clinical reasoning and quality measures.

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│  CDS Service Adapter (provider-agnostic)                 │
│  callCds(hook, context) → CdsCard[]                      │
├──────────────────┬──────────────────┬────────────────────┤
│  Native Engine   │  CQF Ruler       │  External Service  │
│  (TypeScript)    │  (FHIR sidecar)  │  (3rd party CDS)   │
│  - simple rules  │  - CQL/ELM eval  │  - subscribed APIs │
│  - fast (<10ms)  │  - measures       │  - per-vendor      │
│  - in-process    │  - Docker sidecar │  - webhook/REST    │
└──────────────────┴──────────────────┴────────────────────┘
```

### Native Engine (Wave 22 P7)

- TypeScript rule evaluator inside the API process
- Rules are JSON-defined, pack-installable (from ContentPackV2 `cdsRules`)
- Evaluates at CDS hook trigger points in the UI/API workflow
- Produces `CdsCard[]` per CDS Hooks spec (summary, indicator, suggestions)
- No external dependencies — suitable for single-server deployments
- Latency: <10ms per evaluation

### CQF Ruler Integration (Wave 22 P8)

- Docker sidecar running `cqframework/cqf-ruler` FHIR R4 server
- Evaluates CQL/ELM knowledge artifacts against a FHIR-projected patient bundle
- Used for:
  - Quality measures (`$evaluate-measure`)
  - Complex clinical logic (PlanDefinition `$apply`)
  - Guideline-based recommendations
- Not required for basic platform operation — opt-in via `CDS_CQF_ENABLED=true`

### CDS Hooks Endpoint Posture

We implement CDS Hooks server-side as an internal adapter, NOT as a standalone
CDS Hooks service. The platform acts as both the EHR and the CDS subscriber:

1. UI triggers a hook (e.g., user signs an order)
2. API composes the CDS context (FHIR-lite patient/encounter/meds)
3. CDS adapter dispatches to native engine + CQF Ruler (if enabled)
4. Responses merged, deduplicated by `uuid`, returned as `CdsCard[]`
5. UI renders cards (info/warning/critical indicators)

### Why not CQF Ruler only?

- Requires a running FHIR server with patient data projection
- Adds ~500MB Docker footprint + JVM overhead
- Simple rules (drug allergy, duplicate order) don't need CQL
- CQF Ruler doesn't support all CDS Hooks natively

### Why not native only?

- CQL is the industry standard for clinical logic
- Quality measures (HEDIS, CQMs) are distributed as CQL libraries
- Reimplementing measure logic in TypeScript would be error-prone
- CQF Ruler already evaluates CQL correctly

## Consequences

- Native engine handles real-time, latency-sensitive CDS at hook points
- CQF Ruler handles batch measure evaluation and complex clinical reasoning
- Pack authors can include `cdsRules` (native) or reference CQL libraries (CQF)
- Platform runs fine without CQF Ruler — native engine is always available
- FHIR patient bundle projection is needed for CQF Ruler (future work)
- All CDS invocations are audited (no PHI in audit logs)
- External 3rd-party CDS services can be registered via the adapter interface
