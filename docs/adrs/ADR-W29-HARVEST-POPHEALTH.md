# ADR-W29-HARVEST-POPHEALTH: WorldVistA popHealth Evaluation

**Status**: Evaluate (future phase)  
**Phase**: 452 (W29-P6)  
**Decision**: Defer integration, evaluate for quality reporting needs

## Context

WorldVistA/popHealth provides Clinical Quality Measure (CQM) calculation and
population health reporting. It supports NQF/CMS quality measures and can
generate QRDA reports.

## Analysis

### Benefits
- Automated CQM calculation (NQF, CMS measures)
- Population health dashboards
- QRDA Category I and III report generation
- Required for MIPS/QPP compliance reporting

### Concerns
- Ruby on Rails application (different tech stack)
- MongoDB dependency
- May require significant configuration for WorldVistA data
- Overlaps with analytics (Phase 25) for some metrics

### Deployment Complexity
- Requires: Ruby runtime, MongoDB, Nginx
- Separate Docker Compose profile: `pophealth`
- No direct VistA RPC integration (reads from FHIR/C-CDA imports)

## Decision

**Evaluate in a future phase** when quality reporting / CMS compliance
requirements are prioritized. The existing analytics pipeline (Phase 25)
covers operational metrics. popHealth adds clinical quality measures.

### Prerequisites for Integration
1. Business requirement for CQM/MIPS reporting
2. FHIR Data Service integration provides data source
3. MongoDB infrastructure approved for deployment

## Consequences

- No code changes in this phase
- popHealth remains in vendor/ mirror for reference
- Revisit when quality reporting is a system requirement
