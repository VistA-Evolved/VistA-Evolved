# Evidence — Phase 312: Privacy/Consent Controls

## Deliverables

| # | Artifact | Path |
|---|----------|------|
| 1 | Consent engine | `apps/api/src/services/consent-engine.ts` |
| 2 | Consent routes | `apps/api/src/routes/consent-routes.ts` |

## Regulatory Profile Comparison

| Feature | HIPAA (US) | DPA_PH | DPA_GH |
|---------|:---:|:---:|:---:|
| Granularity | category | all-or-nothing | all-or-nothing |
| TPO default | granted | denied | denied |
| Research consent | required | required | required |
| Revocable | partial | full | full |
| Retention | ~7 years | ~5 years | ~7 years |

## Verification

All 11 gates PASS.
