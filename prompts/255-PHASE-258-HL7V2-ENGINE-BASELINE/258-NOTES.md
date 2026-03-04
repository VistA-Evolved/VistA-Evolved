# Phase 258 — NOTES — HL7v2 Integration Engine Baseline

## Inventory (Pre-Existing)

| File                                 | Status   | Notes                                    |
| ------------------------------------ | -------- | ---------------------------------------- |
| `apps/api/src/hl7/mllp-server.ts`    | existing | MLLP TCP server                          |
| `apps/api/src/hl7/mllp-client.ts`    | existing | MLLP TCP client                          |
| `apps/api/src/hl7/parser.ts`         | existing | parseMessage, getField, getSegments      |
| `apps/api/src/hl7/ack-generator.ts`  | existing | generateAck, ackAccept, ackError         |
| `apps/api/src/hl7/types.ts`          | existing | 248 lines, all protocol types            |
| `apps/api/src/hl7/index.ts`          | existing | 128 lines, engine lifecycle              |
| `apps/api/src/hl7/packs/*`           | existing | 4 packs + barrel                         |
| `apps/api/src/hl7/routing/*`         | existing | dispatcher, matcher, registry, transform |
| `apps/api/src/routes/hl7-engine.ts`  | existing | health/connections/status                |
| `apps/api/src/routes/hl7-routing.ts` | existing | route CRUD + dead-letter                 |
| `apps/api/src/routes/hl7-packs.ts`   | existing | pack management                          |

## New Files (Phase 258)

| File                                          | Purpose                        |
| --------------------------------------------- | ------------------------------ |
| `apps/api/src/hl7/tenant-endpoints.ts`        | Per-tenant HL7 endpoint config |
| `apps/api/src/routes/hl7-tenant-endpoints.ts` | REST API for above             |
| `services/hl7/docker-compose.yml`             | HL7 test sender container      |
| `services/hl7/send-test-message.sh`           | MLLP framing script            |
| `apps/api/tests/hl7-engine-baseline.test.ts`  | 9-block baseline test          |

## Decisions

- Tenant endpoints use in-memory store (same pattern as imaging worklist, telehealth rooms)
- PHI logging disabled by default on all new endpoints
- Docker test sender on profile `hl7-test` (opt-in)
- Route convention: `/api/platform/integrations/hl7v2/*`
