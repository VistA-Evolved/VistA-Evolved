# ADR: HL7 Engine Choice

**Status:** Accepted
**Date:** 2025-07-22
**Phase:** 238 (Wave 6 P1)

## Context

VistA-Evolved needs an HL7v2 message engine for hospital integration. Current state:

- **ZVEMIOP.m** (273 lines): 6 M-side RPC entry points for read-only HL7 monitoring
  (MSGLIST, MSGDETAIL, STATS, CONNLIST, HLOSTAT, CONNTEST)
- **vista-interop.ts** (1224 lines): 9 API endpoints for HL7/HLO telemetry
- **interop.ts** (409 lines): In-memory integration registry with CRUD operations
- **Admin UI**: Full HL7 message browser in integration console

**What is missing:**

- No MLLP (Minimum Lower Layer Protocol) TCP engine
- No message routing or transformation pipeline
- No ACK generation or error handling
- Integration registry is in-memory only (resets on restart)

## Decision

**Build a lightweight HL7v2 MLLP engine in-process using the `node-hl7-client`
and `node-hl7-server` npm packages** for MLLP framing, combined with a custom
routing layer that integrates with the existing VistA interop infrastructure.

Rationale:

- `node-hl7-client` / `node-hl7-server` handle MLLP framing (0x0B/0x1C/0x0D)
  which is error-prone to implement from scratch
- Both are MIT-licensed, actively maintained, and lightweight
- Keeps the engine in the same Node.js process as the API for simplified ops
- Existing ZVEMIOP.m RPCs continue to provide VistA-side message monitoring
- Future option to extract to a standalone microservice if throughput demands it

## Alternatives Considered

| Option                            | License                                       | Pros                                         | Cons                                                            |
| --------------------------------- | --------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------- |
| **Mirth Connect** (NextGen)       | MPL-2.0 (community), Proprietary (enterprise) | Feature-rich, GUI, widely used in healthcare | Heavy Java process, MPL has patent clause, complex deployment   |
| **Apache Camel + HAPI**           | Apache-2.0                                    | Mature, enterprise patterns                  | Java dependency, large footprint, over-engineered for our needs |
| **Custom MLLP from scratch**      | N/A                                           | Full control                                 | Error-prone, re-inventing solved protocol framing               |
| **OIE (Open Integration Engine)** | MPL-2.0                                       | Community fork of Mirth                      | Same Java dependency issues, unclear maintenance                |
| **node-hl7-client/server**        | MIT                                           | Lightweight, Node-native, MIT license        | Less feature-rich than Mirth, newer project                     |

## Consequences

**Positive:**

- No new runtime dependencies beyond npm packages
- Consistent with existing Node.js/TypeScript stack
- MLLP framing is handled by tested library code
- Routing layer can leverage existing interop registry patterns
- Production pathway: extract to sidecar container if needed

**Negative:**

- Less mature than Mirth for complex transformation scenarios
- Community smaller than Java HL7 ecosystem
- Must build routing/transformation layer ourselves

**Risks:**

- If throughput exceeds single-process capacity, will need process extraction
- node-hl7-server maintenance — mitigated by MLLP being a simple protocol

## Security / PHI Notes

- HL7v2 messages contain PHI (patient demographics, diagnoses, orders)
- MLLP connections must be TLS-wrapped in production (MLLPS on port 2575)
- Message content must NEVER appear in general logs — use structured audit only
- Route configurations must not expose PHI in error responses

## Ops Notes

- MLLP listener port configurable via `HL7_MLLP_PORT` env var (default: 2575)
- Engine enabled via `HL7_ENGINE_ENABLED=true` (opt-in, like telehealth)
- Health check: `/hl7/health` returns listener status
- Integration with existing `/vista/interop/*` telemetry endpoints
