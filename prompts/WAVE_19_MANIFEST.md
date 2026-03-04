# Wave 19 — Data Platform + Analytics + De-Identification + Reporting

> Engineering controls for tenant-safe analytics extracts, de-identification /
> pseudonymization, operational + clinical + RCM dashboards, quality & safety
> metrics, data access controls, and an analytics certification runner.
> **Not legal or compliance advice.**

## Phase Map

| Wave Phase | Resolved ID | Title                                | Prompt Folder                      |
| ---------- | ----------- | ------------------------------------ | ---------------------------------- |
| W19-P1     | 362         | Reservation + Manifest + ADRs        | `362-W19-P1-MANIFEST-ADRS`         |
| W19-P2     | 363         | Analytics Extract Layer              | `363-W19-P2-ANALYTICS-EXTRACT`     |
| W19-P3     | 364         | De-Identification & Pseudonymization | `364-W19-P3-DEID-SERVICE`          |
| W19-P4     | 365         | Reporting API + UI                   | `365-W19-P4-REPORTING-API`         |
| W19-P5     | 366         | Quality & Safety Metrics v1          | `366-W19-P5-QUALITY-SAFETY`        |
| W19-P6     | 367         | RCM Analytics v1                     | `367-W19-P6-RCM-ANALYTICS`         |
| W19-P7     | 368         | Data Access Controls                 | `368-W19-P7-DATA-ACCESS-CONTROLS`  |
| W19-P8     | 369         | Analytics Certification Runner       | `369-W19-P8-ANALYTICS-CERT-RUNNER` |

## ADR Index

| ADR                       | Path                                             |
| ------------------------- | ------------------------------------------------ |
| Analytics Stack           | `docs/decisions/ADR-ANALYTICS-STACK.md`          |
| De-Identification Posture | `docs/decisions/ADR-DEIDENTIFICATION-POSTURE.md` |
| Reporting Model           | `docs/decisions/ADR-REPORTING-MODEL.md`          |

## Dependencies & Run Order

```
P1 ─── P2 (extract) ──┬── P3 (de-id)
                       ├── P4 (reporting)
                       ├── P5 (quality)
                       └── P6 (RCM analytics)
                              │
                       P7 (access controls) ─── P8 (cert runner)
```

P2–P6 share the extract layer; P7 gates export/access; P8 certifies all.

## Scope

1. Tenant-safe incremental analytics extract from event stream + domain stores
2. Configurable de-identification / pseudonymization service (engineering tool)
3. Operational, clinical, and RCM dashboards with CSV/JSON export
4. Basic quality & safety metrics (synthetic data, not regulatory claims)
5. Dataset RBAC/ABAC, column masking, audited exports
6. Certification runner with ETL correctness + de-id + access control gates

## Definition of Done

- [ ] Analytics extract runs incrementally with tenant isolation
- [ ] De-id/pseudonymization produces PHI-free datasets from synthetic input
- [ ] Dashboards populated with synthetic operational data
- [ ] Quality metrics computed on synthetic fixtures
- [ ] RCM analytics show claim throughput, denial distribution
- [ ] Data access controls block unauthorized dataset access
- [ ] Certification runner passes all gates with evidence
