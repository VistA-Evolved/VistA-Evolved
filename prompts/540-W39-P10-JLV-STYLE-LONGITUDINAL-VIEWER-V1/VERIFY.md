# Phase 540 — JLV-style Longitudinal Viewer v1 (VERIFY)

## Gates (12)

| #   | Gate                     | Check                                                                |
| --- | ------------------------ | -------------------------------------------------------------------- |
| 1   | Route file exists        | `apps/api/src/routes/longitudinal/index.ts` present                  |
| 2   | Timeline endpoint        | `GET /vista/longitudinal/timeline` defined                           |
| 3   | Summary endpoint         | `GET /vista/longitudinal/summary` defined                            |
| 4   | Meds summary endpoint    | `GET /vista/longitudinal/meds-summary` defined                       |
| 5   | Multi-domain aggregation | Route references allergies + labs + meds + notes + vitals + problems |
| 6   | LongitudinalPanel        | Panel component exists with timeline display                         |
| 7   | Panel exported           | panels/index.ts exports LongitudinalPanel                            |
| 8   | Capabilities             | 3 clinical.longitudinal.\* entries in capabilities.json              |
| 9   | Route registered         | register-routes.ts imports + registers longitudinalRoutes            |
| 10  | Store policy             | timeline-cache + summary-cache in store-policy.ts                    |
| 11  | Gap report updated       | jlv-timeline coveragePct > 0                                         |
| 12  | No PHI                   | No SSN / DOB / real patient names in evidence                        |

## Evidence

`evidence/wave-39/540-W39-P10-JLV-LONGITUDINAL/verify-result.json`
