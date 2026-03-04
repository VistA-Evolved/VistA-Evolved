# Integration Architecture Overview

**Last updated:** 2026-02-28
**Wave:** 8 (Enterprise Integrations + Customer Ops)

## Canonical Integration Architecture

```
                    ┌─────────────────────────────────────┐
                    │         VistA-Evolved API            │
                    │         (Fastify v5 + Node.js)       │
                    └───────┬──────┬──────┬──────┬────────┘
                            │      │      │      │
              ┌─────────────┤      │      │      ├─────────────┐
              │             │      │      │      │             │
         ┌────▼────┐  ┌────▼───┐ ┌▼─────▼┐ ┌───▼───┐  ┌─────▼─────┐
         │ HL7v2   │  │ FHIR   │ │ RCM   │ │VistA  │  │  Export   │
         │ Engine  │  │ R4 GW  │ │Payer  │ │ RPC   │  │  Engine   │
         └────┬────┘  └────┬───┘ └───┬───┘ └───┬───┘  └─────┬─────┘
              │            │         │         │             │
         ┌────▼────┐  ┌────▼───┐ ┌───▼───┐ ┌───▼───┐  ┌─────▼─────┐
         │ MLLP    │  │ SMART  │ │Connec-│ │ XWB   │  │ C-CDA /   │
         │ TCP     │  │ Auth   │ │ tors  │ │Broker │  │ FHIR Bun  │
         └─────────┘  └────────┘ └───────┘ └───────┘  └───────────┘
```

## Message Envelope (All Integrations)

Every integration message flows through a common envelope:

```typescript
interface IntegrationEnvelope {
  id: string; // UUID
  tenantId: string; // Tenant scope
  direction: 'IN' | 'OUT'; // Inbound or outbound
  protocol: 'hl7v2' | 'fhir' | 'x12' | 'rest' | 'rpc';
  messageType: string; // e.g. "ADT^A01", "Patient", "837P"
  controlId?: string; // HL7 control ID, X12 ISA control#
  correlationId: string; // Trace correlation
  status: 'received' | 'processing' | 'routed' | 'delivered' | 'error';
  receivedAt: string; // ISO timestamp
  metadata: Record<string, string>;
}
```

## Tenant Routing Rules

### Strategy: Shared Engine + Tenant Routing Keys

All tenants share the same HL7/FHIR/RCM engine instances. Tenant isolation
is enforced via:

1. **Tenant context middleware** — Every request carries `tenantId` from session
2. **Per-tenant config** — HL7 endpoints, FHIR scopes, payer credentials
3. **RLS in PostgreSQL** — All DB tables enforce `tenant_id` row-level security
4. **Audit trail** — Every message logged with `tenantId` for traceability

### Routing Resolution

```
Inbound HL7 → MLLP server → parser → tenant resolver (MSH.4 sending facility)
                                    → route matcher (message type + tenant rules)
                                    → dispatcher → handler → ACK/NAK
```

## Storage + Trace + Redaction Rules

### Storage

| Data               | Store                              | Retention                      |
| ------------------ | ---------------------------------- | ------------------------------ |
| HL7 message events | PostgreSQL `hl7_message_events`    | 90 days (configurable)         |
| HL7 raw payloads   | Encrypted blob (PG or S3)          | 30 days then purge             |
| FHIR resources     | VistA (source of truth) + PG cache | VistA = permanent, cache = 24h |
| Claims/Remits      | PG `rcm_claim`, `rcm_remittance`   | Per regulatory requirement     |
| Audit trail        | JSONL + PG + S3 shipping           | Immutable, 7 years             |

### Trace Correlation

Every integration flow gets a correlation ID that propagates:

- HL7 MSH.10 (control ID) → API request ID → VistA RPC call → audit entry
- FHIR request ID → VistA RPC → mapper → response
- X12 ISA13 (interchange control) → claim ID → acknowledgment

### PHI Redaction Rules

| Context          | Rule                                                                                |
| ---------------- | ----------------------------------------------------------------------------------- |
| Application logs | NEVER log raw HL7 payloads. Log only: message type, control ID, segment count, hash |
| Audit trail      | PHI sanitized via `sanitizeAuditDetail()` before storage                            |
| Support console  | Redacted by default. Raw access requires break-glass + audit                        |
| Debug/trace      | OTel spans strip request/response bodies via collector processor                    |
| Exports          | Short-lived signed URLs, encryption at rest                                         |

## Subsystem Reference

### HL7v2 Engine

- **Location:** `apps/api/src/hl7/`
- **Protocol:** MLLP (TCP) via `node-hl7-client`/`node-hl7-server`
- **Message Packs:** ADT, ORM, ORU, SIU
- **Routes:** `routes/hl7-engine.ts`, `routes/hl7-packs.ts`, `routes/hl7-routing.ts`
- **ADR:** `docs/decisions/ADR-hl7-engine-choice.md`

### FHIR R4 Gateway

- **Location:** `apps/api/src/fhir/`
- **Auth:** SMART on FHIR + OIDC bearer tokens
- **Resources:** Patient, Encounter, Observation, MedicationRequest, AllergyIntolerance, Condition
- **Features:** CapabilityStatement, search params, ETag caching, scope enforcement

### RCM / Payer Connectivity

- **Location:** `apps/api/src/rcm/`
- **Connectors:** 13 across 5 markets (US, PH, AU, NZ, SG)
- **EDI:** X12 5010 (837P/I, 835, 270/271, 276/277, 999, TA1)
- **PhilHealth:** CF1-CF4 JSON bundles, eClaims3 XML
- **Features:** 9-state claim FSM, credential vault, denials + appeals, payments + aging

### VistA RPC Broker

- **Location:** `apps/api/src/vista/rpcBrokerClient.ts`
- **Protocol:** XWB over TCP
- **Registry:** 137 RPCs + 59 exceptions in `rpcRegistry.ts`
- **Safety:** Circuit breaker, async mutex, auto-reconnect

### Export Engine

- **Location:** `apps/api/src/exports/`
- **Formats:** JSON, CSV, C-CDA, FHIR Bundle
- **Record Portability:** `routes/record-portability.ts`
- **Audit Shipping:** `audit-shipping/` → S3/MinIO

### Support Console

- **Location:** `apps/api/src/support/`, `routes/support-routes.ts`
- **Features:** Diagnostics, ticket store, WS debug console, break-glass
- **Posture:** 7 domain posture endpoints

## Integration Maturity Matrix

| Integration | Parse | Route | Store   | Trace   | Redact  | Replay  | Prod-Ready |
| ----------- | ----- | ----- | ------- | ------- | ------- | ------- | ---------- |
| HL7v2 ADT   | Yes   | Yes   | Pending | Partial | Pending | Pending | Phase 260  |
| HL7v2 ORU   | Yes   | Yes   | Pending | Partial | Pending | Pending | Phase 260  |
| HL7v2 SIU   | Yes   | Yes   | Pending | Partial | Pending | Pending | Phase 260  |
| FHIR R4     | Yes   | Yes   | Yes     | Yes     | Yes     | N/A     | Yes        |
| X12 837     | Yes   | Yes   | Yes     | Yes     | Yes     | N/A     | Yes        |
| PhilHealth  | Yes   | Yes   | Yes     | Yes     | Yes     | N/A     | Yes        |
| VistA RPC   | Yes   | Yes   | Yes     | Yes     | Yes     | Yes     | Yes        |
