# Interop Inventory — VistA-Evolved

> Generated for Wave 14 planning. Describes all existing interop code in the repo.

## 1. HL7v2 Engine (25 source files)

### Core (`apps/api/src/hl7/`)

| File                      | Purpose                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `index.ts`                | Barrel export + engine lifecycle (singleton MLLP server, opt-in via `HL7_ENGINE_ENABLED=true`) |
| `types.ts`                | MLLP framing constants, message/segment/MSH types, ACK codes                                   |
| `parser.ts`               | Zero-dep HL7v2 message parser (segment splitting, field parsing, MSH extraction)               |
| `ack-generator.ts`        | ACK/NAK generator (AA/AE/AR) per HL7v2 spec                                                    |
| `mllp-server.ts`          | Zero-dep MLLP TCP server (connection lifecycle, MLLP framing, TLS-ready)                       |
| `mllp-client.ts`          | Zero-dep MLLP TCP client (connection pooling, reconnect, response timeout)                     |
| `fhir-bridge.ts`          | HL7v2-to-FHIR R4 deterministic converter (ADT, ORU, ORM, SIU)                                  |
| `outbound-builder.ts`     | Outbound HL7v2 message builder (ADT^A01-A08, ORU^R01, ORM^O01, SIU^S12/S15)                    |
| `domain-mapper.ts`        | HL7v2-to-domain event mapper (patient.admitted, result.received, etc.)                         |
| `message-event-store.ts`  | Append-only in-memory ring buffer, hash-chained, PHI-redacted                                  |
| `dead-letter-enhanced.ts` | Enhanced DLQ with raw message vault, replay/retry mechanism                                    |
| `channel-health.ts`       | Channel health monitor (error rates, throughput, connection state)                             |
| `tenant-endpoints.ts`     | Per-tenant HL7v2 endpoint config (inbound/outbound MLLP)                                       |

### Routing (`apps/api/src/hl7/routing/`)

| File            | Purpose                                                     |
| --------------- | ----------------------------------------------------------- |
| `index.ts`      | Barrel export + routing message handler                     |
| `types.ts`      | Route filter, destination, transform, dispatch result types |
| `registry.ts`   | In-memory route store with CRUD and DLQ (max 1000 entries)  |
| `matcher.ts`    | Inbound HL7 message-to-route matching (priority order)      |
| `transform.ts`  | Transform pipeline (chained transforms on raw HL7 text)     |
| `dispatcher.ts` | Dispatch to MLLP forward, VistA RPC, HTTP, dead-letter      |

### Message Packs (`apps/api/src/hl7/packs/`)

| File          | Purpose                                                |
| ------------- | ------------------------------------------------------ |
| `index.ts`    | Pack registry (lookup by ID or message type)           |
| `types.ts`    | Pack types (validation issues, message pack interface) |
| `adt-pack.ts` | ADT pack (A01-A08 builders + validators)               |
| `orm-pack.ts` | ORM pack (order message builders + validators)         |
| `oru-pack.ts` | ORU pack (result message builders + validators)        |
| `siu-pack.ts` | SIU pack (scheduling message builders + validators)    |

### API Routes (6 route files)

| File                      | Prefix                                                              | Phase   |
| ------------------------- | ------------------------------------------------------------------- | ------- |
| `hl7-engine.ts`           | `/hl7/health`, `/hl7/connections`, `/hl7/fhir/*`, `/hl7/outbound/*` | 239/279 |
| `hl7-routing.ts`          | `/hl7/routes/*`, `/hl7/dead-letter`                                 | 240     |
| `hl7-packs.ts`            | `/hl7/packs/*`                                                      | 241     |
| `hl7-tenant-endpoints.ts` | `/api/platform/integrations/hl7v2/endpoints/*`                      | 258     |
| `hl7-pipeline.ts`         | `/hl7/pipeline/events/*`, `/hl7/dlq/*`                              | 259     |
| `hl7-use-cases.ts`        | `/hl7/ingest`, `/hl7/use-cases`, `/hl7/use-cases/fixtures`          | 260     |

### Test Infrastructure

- `services/hl7/docker-compose.yml` — HL7 test sender container
- `services/hl7/fixtures/*.hl7` — 6 test fixtures (ADT_A01/A03/A08, ORU_R01, SIU_S12/S13)
- `apps/api/tests/hl7-engine-baseline.test.ts`
- `apps/api/tests/hl7-message-pipeline.test.ts`
- `apps/api/tests/hl7-use-cases.test.ts`

### VistA Interop

- `services/vista/ZVEMIOP.m` — Production M routine (4 interop RPC entry points)
- `routes/vista-interop.ts` — VistA HL7/HLO telemetry from Files #870/#772/#773

---

## 2. X12 / EDI (7 files)

### EDI Core (`apps/api/src/rcm/edi/`)

| File                       | Purpose                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| `types.ts`                 | X12 transaction set types (837P/I, 835, 270/271, 276/277, 999, TA1)    |
| `pipeline.ts`              | EDI pipeline orchestrator — 10-stage lifecycle                         |
| `x12-serializer.ts`        | X12 5010 scaffold serializer (837P/837I wire format)                   |
| `ph-eclaims-serializer.ts` | PhilHealth eClaims CF1-CF4 JSON bundle (non-X12)                       |
| `remit-processor.ts`       | 835 remittance processor (ERA parsing, CARC/RARC, claim linking)       |
| `ack-status-processor.ts`  | 999/277CA ack + 276/277 status processor                               |
| `batch-processor.ts`       | Batch claim processor (group by payer/connector, resilient submission) |

---

## 3. RCM Adapters (5 files)

| File                    | Purpose                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `payer-adapter.ts`      | PayerAdapter interface (eligibility, claim status, submit, denial) |
| `x12-adapter.ts`        | X12 Clearinghouse skeleton                                         |
| `philhealth-adapter.ts` | PhilHealth adapter skeleton                                        |
| `sandbox-adapter.ts`    | Sandbox simulated responses                                        |
| `adapter-sdk.ts`        | Base class with rate limiting, idempotency, metrics                |

---

## 4. RCM Connectors / Transports (14 files)

| File                         | Protocol                 | Status                     |
| ---------------------------- | ------------------------ | -------------------------- |
| `clearinghouse-connector.ts` | SFTP/API (US EDI)        | Scaffold/simulation        |
| `sandbox-connector.ts`       | In-memory                | Working                    |
| `portal-batch-connector.ts`  | CSV/XML upload           | Scaffold                   |
| `philhealth-connector.ts`    | REST API + TLS certs     | Integration-pending        |
| `availity-connector.ts`      | OAuth2 REST + SFTP       | Scaffold                   |
| `stedi-connector.ts`         | REST API                 | Feature-flagged            |
| `officeally-connector.ts`    | SFTP + HTTPS             | Scaffold                   |
| `eclipse-au-connector.ts`    | PRODA + PKI certs (AU)   | Scaffold                   |
| `acc-nz-connector.ts`        | REST/JSON + OAuth2 (NZ)  | Scaffold                   |
| `nphc-sg-connector.ts`       | CorpPass + MOH REST (SG) | Scaffold                   |
| `connector-resilience.ts`    | —                        | Circuit breaker wrapper    |
| `connector-state.ts`         | —                        | Health state normalization |
| `health-monitor.ts`          | —                        | Background health probes   |

### Gaps

- **No actual SFTP client/server implementation** — referenced but all connectors simulate
- **No AS2 implementation** — not present anywhere
- **No integration-packs/ directory** — packs concept only in hl7/packs/ as code, not distributable packages

---

## 5. Admin UI (2 pages)

| File                                 | Purpose                                             |
| ------------------------------------ | --------------------------------------------------- |
| `apps/web/.../integrations/page.tsx` | Integration console (registry, health, HL7 browser) |
| `apps/web/.../rcm/page.tsx`          | RCM dashboard (claims, payers, connectors, audit)   |

---

## 6. Config

- `config/capabilities.json` — 10+ interop/HL7/RCM capabilities
- `config/modules.json` — `interop` and `rcm` module definitions
