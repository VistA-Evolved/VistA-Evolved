# Phase 381 — W21-P4 VERIFY: HL7 v2 MLLP Ingest

## Verification Gates

1. `hl7v2-parser.ts` exports parseHl7Message, extractMllpMessage, generateAck
2. Parser correctly extracts MSH fields (messageType, messageId, sendingApp, etc.)
3. OBX extraction yields typed observations with code, value, unit, refRange, abnormalFlag
4. MLLP framing handles VT (0x0b), FS (0x1c), CR (0x0d) envelope bytes
5. ACK generation produces valid MSH+MSA segments with correct ackCode
6. 5 fixture files present: cbc, vitals, abg, glucose-high, orm-order
7. Ingest route POST /devices/hl7v2/ingest accepts JSON envelope
8. Parse route POST /devices/hl7v2/parse returns parsed result without storing
9. Log route GET /devices/hl7v2/ingest-log returns ingest history
10. AUTH_RULE maps /devices/hl7v2/ingest to "service" auth
11. store-policy.ts includes hl7v2-ingest-log entry
12. register-routes.ts imports and registers hl7v2IngestRoutes
13. Barrel index.ts exports hl7v2IngestRoutes
