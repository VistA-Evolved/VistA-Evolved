# Evidence — Phase 382: W21-P5 ASTM + POCT1-A Ingest

## Artifacts
| File | Purpose |
|------|---------|
| `apps/api/src/devices/astm-parser.ts` | ASTM E1381 frame + record parser with checksum |
| `apps/api/src/devices/poct1a-parser.ts` | POCT1-A XML parser (regex-based, zero deps) |
| `apps/api/src/devices/astm-poct1a-ingest-routes.ts` | 6 HTTP ingest routes |
| `fixtures/astm-cbc.astm` | CBC — 7 R records |
| `fixtures/astm-blood-gas.astm` | ABG — 7 R records + comment |
| `fixtures/astm-chem-critical.astm` | Critical BMP — 8 R records (HH/LL flags) |
| `fixtures/astm-coagulation.astm` | PT/INR/APTT — 3 R records |
| `fixtures/astm-glucose-multi-patient.astm` | 2 patients in batch |
| `fixtures/poct1a-glucose-normal.xml` | Single glucose, normal |
| `fixtures/poct1a-glucose-critical-low.xml` | Single glucose, LL flag |
| `fixtures/poct1a-blood-gas.xml` | ABG with 5 results |
| `fixtures/poct1a-coagulation.xml` | PT + INR |
| `fixtures/poct1a-istat-electrolytes.xml` | i-STAT 5-analyte panel |

## Wiring
- `devices/index.ts` — barrel export `astmPoct1aIngestRoutes`
- `register-routes.ts` — import + `server.register(astmPoct1aIngestRoutes)`
- `security.ts` — AUTH_RULES `/devices/astm/ingest$` → service, `/devices/poct1a/ingest$` → service
- `store-policy.ts` — `astm-ingest-log` + `poct1a-ingest-log` entries

## Gates Verified
- [x] ASTM parser exports 4+ functions
- [x] POCT1-A parser exports parsePoct1a
- [x] 5 ASTM + 5 POCT1-A fixture files present
- [x] Ingest routes wired with service auth
- [x] Store policy registered (2 entries)
- [x] No PHI in fixtures (synthetic only)
- [x] No external XML dependencies
