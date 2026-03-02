# 489-01 IMPLEMENT -- W33-P9: Hospital Day-in-the-Life Runner + Golden Traces

## Goal
Create a Node.js QA script that simulates a hospital day by calling every
Tier-0 endpoint converted in P3-P7, captures the capability-probe responses,
and emits a golden-trace JSON artifact.

## Deliverables
1. `scripts/tier0-day-in-the-life.mjs` -- runner script
2. `artifacts/tier0-golden-trace.json` -- generated artifact (gitignored)
3. Prompt folder files

## Endpoints Exercised
| Endpoint | Method | Tier-0 RPC | Phase |
|----------|--------|------------|-------|
| /vista/adt/admit | POST | DGPM NEW ADMISSION | P3 |
| /vista/adt/transfer | POST | DGPM NEW TRANSFER | P3 |
| /vista/adt/discharge | POST | DGPM NEW DISCHARGE | P3 |
| /vista/inpatient/admit | POST | DGPM NEW ADMISSION | P3 |
| /vista/inpatient/transfer | POST | DGPM NEW TRANSFER | P3 |
| /vista/inpatient/discharge | POST | DGPM NEW DISCHARGE | P3 |
| /vista/nursing/tasks | GET | PSB MED LOG | P4 |
| /vista/nursing/mar | GET | PSB ALLERGY | P4 |
| /vista/nursing/mar/administer | POST | PSB MED LOG | P4 |
| /vista/nursing/io | GET | GMRIO RESULTS | P4 |
| /vista/nursing/assessments | GET | ZVENAS LIST | P4 |
| /vista/emar/history | GET | PSB MED LOG | P5 |
| /vista/emar/administer | POST | PSB MED LOG | P5 |
| /vista/emar/barcode-scan | POST | PSJBCMA | P5 |

## Verification
- All endpoints return `ok: false`
- All have `status: "unsupported-in-sandbox"` or `"integration-pending"`
- All include `capabilityProbe` or `vistaGrounding` evidence
- No 500/404 errors
- Golden trace captures full response bodies
