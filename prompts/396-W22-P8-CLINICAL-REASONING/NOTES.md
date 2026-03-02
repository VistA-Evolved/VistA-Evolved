# Phase 396 -- W22-P8: Clinical Reasoning + Quality Measures -- NOTES

## Design Decisions
- CQL library management stores source + compiled ELM JSON for CQF Ruler integration
- Quality measures support 4 scoring types (proportion, ratio, continuous-variable, cohort)
- 5 reporting programs: eCQM, HEDIS, UDS, MIPS, custom
- Measure evaluation is simulated (async 500ms) -- production would use CQF Ruler
- PlanDefinition supports nested actions with CQL condition expressions
- ActivityDefinition supports 5 FHIR activity kinds
- Measure reports tagged with QRDA version for export compatibility
- Patient-level results track population membership as boolean map

## Future Work
- Wire CQF Ruler HTTP calls for real CQL evaluation
- QRDA-I/III XML export generation
- Bulk patient evaluation via FHIR Batch
- Content pack measure import (from Phase 390)
- Clinical pathway execution engine
