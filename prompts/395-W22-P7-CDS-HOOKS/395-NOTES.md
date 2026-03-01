# Phase 395 — W22-P7: CDS Hooks + SMART Launch — NOTES

## Design Decisions
- HL7 CDS Hooks 1.0 spec followed for service discovery + hook invocation
- Hybrid architecture: native rule engine for simple conditions, CQF Ruler sidecar for CQL
- SMART launch contexts are short-lived (5 min), consumed on use
- CQF Ruler is opt-in (CQF_RULER_ENABLED=true), stub returns integration-pending cards
- CardIndicator follows HL7 spec: info, warning, critical
- 11 condition operators cover most clinical rule patterns
- Auto-registers a CDS service when first rule for a hook is created
- Invocation log and feedback log provide analytics/audit trail

## Environment Variables
- CQF_RULER_URL (default: http://localhost:8080/cqf-ruler-r4)
- CQF_RULER_ENABLED (default: false)
- FHIR_SERVER_URL (default: http://localhost:3001/fhir)

## Future Work
- Wire CQF Ruler HTTP calls to actual CQL evaluation
- Content pack CDS rule import (from Phase 390 CdsRule content type)
- FHIR resource prefetch from VistA FHIR facade
- CDS analytics aggregation
