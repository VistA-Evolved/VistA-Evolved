# ADR-W29-OSS-HARVEST

## Status

Accepted

## Context

The WorldVistA ecosystem includes several OSS projects beyond the core EHR:

- **VistA FHIR Data Service** (vxVistA FHIR server / nodeVistA)
- **popHealth** (CQM quality measure reporting)
- **Dashboard / Rules Engine** (clinical decision support, quality dashboards)
- **Blue Button** (patient data export)
- **MDWS** (Medical Domain Web Service — .NET SOAP bridge)

We need to decide which (if any) to integrate, and how to do so without
rewriting our core architecture or introducing licensing conflicts.

## Decision

### Evaluation Criteria

For each component:

1. **Active maintenance?** — Last commit date, open issues, contributor count
2. **License compatible?** — Must be Apache-2.0, MIT, BSD, or LGPL-2.1+
3. **Integration complexity?** — Can it run as a sidecar/adapter, or does it
   require deep coupling?
4. **Value-add vs build cost?** — Is it faster to integrate than to build natively?
5. **VistA dependency?** — Does it need direct VistA/MUMPS access, or can it
   consume our API?

### Scope — In Evaluation

| Component              | Status                    | License       | Integration Approach                           |
| ---------------------- | ------------------------- | ------------- | ---------------------------------------------- |
| FHIR Data Service      | Evaluate (Phase 452)      | Apache-2.0    | Sidecar adapter behind `/fhir/*` proxy         |
| popHealth              | Evaluate (Phase 452)      | Apache-2.0    | Standalone CQM engine, event-driven            |
| Dashboard/Rules Engine | **Integrate** (Phase 453) | Apache-2.0    | Event bus adapter, optional deployment         |
| Blue Button            | Skip                      | Apache-2.0    | Already covered by export pipeline (Phase 442) |
| MDWS                   | Skip                      | Public Domain | .NET dependency; our API supersedes this       |

### Integration Pattern: Adapter Boundary

All harvested components MUST:

1. Run as **optional** Docker services (OFF by default, enable per tenant).
2. Communicate via **HTTP API or event bus** — no direct MUMPS global access.
3. Have an **adapter interface** in our platform that can be swapped for a
   native implementation later.
4. Be deployable via existing compose files with a profile flag.

### Dashboard/Rules Engine — Selected for Phase 453

- Receives clinical events (lab critical result, med override) via HTTP webhook.
- Evaluates rules and returns suggestions/alerts.
- Our platform publishes events; the engine is a subscriber.
- If the engine is unavailable, events are logged but not blocked.
- No PHI stored in the rules engine — only anonymized event metadata.

### Rollback Plan

- Each harvested component is behind a feature flag + compose profile.
- Disabling = stop the container + flip the flag.
- No data migration needed since components are stateless consumers.

## Consequences

- We gain CQM reporting and clinical decision support without building from scratch.
- License compliance is maintained via SBOM + license policy gates (Phase 454).
- Integration is reversible and non-breaking.
- Components that become unmaintained upstream can be replaced by native implementations
  behind the same adapter interface.
