# Evidence — Phase 381: W21-P4 HL7 v2 MLLP Ingest

## Artifacts
| File | Purpose |
|------|---------|
| `apps/api/src/devices/hl7v2-parser.ts` | MLLP framing + HL7 v2 parser + ACK gen |
| `apps/api/src/devices/hl7v2-ingest-routes.ts` | 3 HTTP ingest endpoints |
| `apps/api/src/devices/fixtures/hl7v2-oru-cbc.hl7` | CBC fixture (5 OBX) |
| `apps/api/src/devices/fixtures/hl7v2-oru-vitals.hl7` | Vitals fixture (6 OBX, LOINC) |
| `apps/api/src/devices/fixtures/hl7v2-oru-abg.hl7` | ABG fixture (5 OBX) |
| `apps/api/src/devices/fixtures/hl7v2-oru-glucose-high.hl7` | Critical glucose (HH flag) |
| `apps/api/src/devices/fixtures/hl7v2-orm-order.hl7` | ORM order message |

## Wiring
- `register-routes.ts` — imports + registers `hl7v2IngestRoutes`
- `security.ts` — AUTH_RULE `/devices/hl7v2/ingest$` → service
- `store-policy.ts` — `hl7v2-ingest-log` entry
- `devices/index.ts` — barrel export

## Gates Verified
- [x] Parser exports 3 functions
- [x] 5 fixture files present
- [x] Ingest route wired with service auth
- [x] Store policy registered
- [x] No PHI in fixtures (synthetic patients only)
