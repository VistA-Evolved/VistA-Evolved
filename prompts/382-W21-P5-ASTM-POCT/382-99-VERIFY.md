# Phase 382 — W21-P5 VERIFY: ASTM + POCT1-A Ingest

## Verification Gates

1. `astm-parser.ts` exports parseAstm, parseAstmFrame, calculateAstmChecksum, extractAstmObservations
2. ASTM parser correctly extracts H/P/O/R/C/L records from fixture files
3. Checksum calculation matches ASTM E1381 algorithm (sum mod 256, 2 hex chars)
4. `poct1a-parser.ts` exports parsePoct1a
5. POCT1-A parser extracts Device, Patient, and Result elements from XML fixtures
6. Multi-result POCT1-A (blood-gas, electrolytes) yields correct observation count
7. 5 ASTM fixture files present and valid (cbc, blood-gas, chem-critical, coagulation, glucose-multi)
8. 5 POCT1-A fixture files present and valid (glucose-normal, glucose-critical, blood-gas, coag, istat)
9. POST /devices/astm/ingest stores observations and returns ACK summary
10. POST /devices/astm/parse returns parsed result without storage
11. GET /devices/astm/ingest-log returns ASTM ingest history
12. POST /devices/poct1a/ingest stores observations and returns summary
13. POST /devices/poct1a/parse returns parsed result without storage
14. GET /devices/poct1a/ingest-log returns POCT1-A ingest history
15. AUTH_RULES map /devices/astm/ingest and /devices/poct1a/ingest to "service"
16. store-policy.ts includes astm-ingest-log and poct1a-ingest-log entries
17. register-routes.ts imports and registers astmPoct1aIngestRoutes
18. Barrel index.ts exports astmPoct1aIngestRoutes
19. No external XML library dependencies added
