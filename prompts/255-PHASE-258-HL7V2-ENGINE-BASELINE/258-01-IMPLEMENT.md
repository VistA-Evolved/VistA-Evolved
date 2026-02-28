# Phase 258 — HL7v2 Integration Engine Baseline (Wave 8 P2)

## Goal
Validate and harden the existing HL7v2 engine infrastructure (MLLP server/client,
parser, ACK generator, 4 message packs, routing layer) and add tenant endpoint
configuration + Docker support for integration testing.

## Pre-Existing Infrastructure (DO NOT REBUILD)
- `apps/api/src/hl7/mllp-server.ts` — MLLP TCP server
- `apps/api/src/hl7/mllp-client.ts` — MLLP TCP client
- `apps/api/src/hl7/parser.ts` — HL7v2 message parser
- `apps/api/src/hl7/ack-generator.ts` — ACK/NAK generation
- `apps/api/src/hl7/types.ts` — Protocol constants + types
- `apps/api/src/hl7/index.ts` — Engine singleton lifecycle
- `apps/api/src/hl7/packs/` — ADT, ORM, ORU, SIU packs
- `apps/api/src/hl7/routing/` — Dispatcher, matcher, registry, transform

## New Deliverables

### 1. Tenant Endpoint Configuration
**File:** `apps/api/src/hl7/tenant-endpoints.ts`
- `Hl7TenantEndpoint` interface with direction, host, port, TLS, PHI settings
- In-memory store (Map) with CRUD
- `resolveInboundEndpoint(sendingFacility, sendingApp, messageType)` — matches
  incoming HL7 to the right tenant endpoint

### 2. Tenant Endpoint REST API
**File:** `apps/api/src/routes/hl7-tenant-endpoints.ts`
- POST /api/platform/integrations/hl7v2/endpoints
- GET  /api/platform/integrations/hl7v2/endpoints
- GET  /api/platform/integrations/hl7v2/endpoints/:id
- PUT  /api/platform/integrations/hl7v2/endpoints/:id
- DELETE /api/platform/integrations/hl7v2/endpoints/:id

### 3. Docker HL7 Test Support
- `services/hl7/docker-compose.yml` — hl7-test-sender container
- `services/hl7/send-test-message.sh` — MLLP framing shell script

### 4. Baseline Test Suite
**File:** `apps/api/tests/hl7-engine-baseline.test.ts`
- 9 describe blocks covering all engine subsystems
- Validates file existence, module exports, PHI safety

## Constraints
- Engine is opt-in via `HL7_ENGINE_ENABLED=true`
- Default MLLP port: 2575 (configurable via `HL7_MLLP_PORT`)
- PHI logging disabled by default (`phiLoggingEnabled: false`)
- Follow ADR-hl7-engine-choice.md (in-process, no sidecar)
