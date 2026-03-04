# Wave 20 — GA Launch Program + External Validation Readiness + Customer Success Ops

> Engineering tooling for GA readiness: release train governance, customer
> success automation, support ops, external validation harness, data rights
> operations, and a superset GA certification runner with trust center export.
> **Not legal certification — engineering process controls only.**

## Phase Map

| Wave Phase | Resolved ID | Title                                 | Prompt Folder                      |
| ---------- | ----------- | ------------------------------------- | ---------------------------------- |
| W20-P1     | 370         | Reservation + Manifest + GA Checklist | `370-W20-P1-MANIFEST-GA-CHECKLIST` |
| W20-P2     | 371         | Release Train Governance              | `371-W20-P2-RELEASE-TRAIN`         |
| W20-P3     | 372         | Customer Success Tooling              | `372-W20-P3-CUSTOMER-SUCCESS`      |
| W20-P4     | 373         | Support Ops Automation                | `373-W20-P4-SUPPORT-OPS`           |
| W20-P5     | 374         | External Validation Harness           | `374-W20-P5-EXTERNAL-VALIDATION`   |
| W20-P6     | 375         | Data Rights Operations                | `375-W20-P6-DATA-RIGHTS`           |
| W20-P7     | 376         | GA Certification Runner               | `376-W20-P7-GA-CERT-RUNNER`        |
| W20-P8     | 377         | GA Evidence Bundle + Trust Center     | `377-W20-P8-TRUST-CENTER`          |

## ADR Index

| ADR                      | Path                                             |
| ------------------------ | ------------------------------------------------ |
| GA Readiness Model       | `docs/decisions/ADR-GA-READINESS-MODEL.md`       |
| Release Train Governance | `docs/decisions/ADR-RELEASE-TRAIN-GOVERNANCE.md` |
| Data Rights Operations   | `docs/decisions/ADR-DATA-RIGHTS-OPERATIONS.md`   |

## Dependencies & Run Order

```
P1 (manifest) ─── P2 (release train) ─── P3 (customer success)
                                      └── P4 (support ops)
                   P5 (external validation)
                   P6 (data rights)
                              │
                   P7 (GA cert runner) ─── P8 (trust center export)
```

P1 is foundational. P2-P6 are independent. P7 aggregates all certifications. P8 exports.

## Scope

1. GA readiness checklist with evidence-presence verification script
2. Release train governance (change windows, approvals, rollback, comms)
3. Customer success tooling (tenant onboarding, training mode, demo data)
4. Support ops automation (ticket hooks, diagnostics, SLA timers, runbooks)
5. External validation harness (pen-test env, vuln triage workflow)
6. Data rights operations (retention, deletion, legal holds, audit)
7. Superset GA certification runner (security+interop+dept+scale+DR+perf)
8. Trust center export pack (docs + evidence indices, PHI-safe)

## Definition of Done

- [ ] `ga-checklist.ps1` fails on missing evidence, passes when present
- [ ] Release train workflow simulates schedule->notify->deploy->rollback
- [ ] Tenant onboarding automation runs in synthetic mode
- [ ] Support incident lifecycle creates ticket->diagnostics->SLA timestamps
- [ ] External validation harness outputs endpoint inventory (no secrets)
- [ ] Data rights: retention set, purge dry-run, legal hold blocks deletion
- [ ] `verify-ga.ps1` runs superset certification with evidence output
- [ ] Trust center export produces PHI-safe documentation bundle
