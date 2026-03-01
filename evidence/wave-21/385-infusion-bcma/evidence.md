# Evidence: Phase 385 — W21-P8 Infusion/BCMA Safety Bridge

## Phase ID
385

## Wave
21 — Device + Modality Integration Platform

## Title
Infusion Pump Integration + Barcode Medication Administration Safety Bridge

## Artifacts Created
| File | Lines | Purpose |
|------|-------|---------|
| `apps/api/src/devices/infusion-bcma-types.ts` | ~165 | Types: pump events, BCMA sessions, right-6 checks, scans |
| `apps/api/src/devices/infusion-bcma-store.ts` | ~300 | In-memory stores + right-6 verification engine |
| `apps/api/src/devices/infusion-bcma-routes.ts` | ~210 | 13 REST endpoints |

## Wiring Changes
| File | Change |
|------|--------|
| `devices/index.ts` | Added `infusionBcmaRoutes` export |
| `register-routes.ts` | Import + `server.register(infusionBcmaRoutes)` |
| `security.ts` | AUTH_RULE: `/devices/infusion/pump-events` → service |
| `store-policy.ts` | 3 entries: pump-events, bcma-sessions, audit-log |

## Endpoint Inventory (13 endpoints)
| Method | Path | Auth |
|--------|------|------|
| POST | `/devices/infusion/pump-events` | service |
| GET | `/devices/infusion/pump-events` | admin |
| GET | `/devices/infusion/pump-events/:id` | admin |
| PATCH | `/devices/infusion/pump-events/:id/verify` | admin |
| POST | `/devices/bcma/sessions` | admin |
| GET | `/devices/bcma/sessions` | admin |
| GET | `/devices/bcma/sessions/:id` | admin |
| POST | `/devices/bcma/sessions/:id/patient-scan` | admin |
| POST | `/devices/bcma/sessions/:id/medication-scan` | admin |
| POST | `/devices/bcma/sessions/:id/right6-check` | admin |
| POST | `/devices/bcma/sessions/:id/complete` | admin |
| GET | `/devices/infusion/stats` | admin |
| GET | `/devices/infusion/audit` | admin |

## Right-6 Check Matrix
| Check | Method | Status Levels |
|-------|--------|---------------|
| Right Patient | Barcode DFN match | pass/fail/pending |
| Right Drug | NDC match | pass/fail/pending |
| Right Dose | Scaffold (present check) | pass/pending |
| Right Route | Scaffold (present check) | pass/pending |
| Right Time | 1hr/2hr window | pass/warning/fail/pending |
| Right Documentation | Order IEN present | pass/fail |

## Store Policy Entries
- `infusion-pump-events` — 20K max, FIFO
- `bcma-sessions` — 10K max, FIFO
- `infusion-bcma-audit-log` — 20K max, FIFO

## Commit
Pending — `phase(385): W21-P8 Infusion/BCMA Safety Bridge`
