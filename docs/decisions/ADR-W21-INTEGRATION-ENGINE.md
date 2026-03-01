# ADR: Integration Engine Strategy

- **Status**: Accepted
- **Date**: 2026-03-01
- **Phase**: 378 (W21-P1)

## Context

The repo already has HL7/HLO interop telemetry (Phase 21, `vista-interop.ts`)
and VistA RPC integration. We need to decide whether to use an external
integration engine (e.g., Mirth Connect, Apache Camel) or extend the
existing in-repo engine for device/lab ingest.

## Decision

**Extend the existing in-repo integration layer** rather than introducing
an external integration engine.

### Rationale

1. **Existing patterns**: The codebase already has HL7 parsing, RPC broker,
   and structured route/service patterns. Adding Mirth Connect would create
   a parallel integration path with its own config, deployment, and monitoring.

2. **Complexity budget**: An external engine adds Java runtime, channel
   configuration UI, deployment artifacts, and operational overhead that
   is disproportionate for our current device ingest scope.

3. **Adapter model fits**: The edge gateway plugin adapter model (ADR-W21-EDGE-GATEWAY)
   already provides the protocol abstraction layer. The cloud-side ingest
   is just Fastify routes receiving normalized messages.

4. **Future migration path**: If scale demands it, the adapter interfaces
   are compatible with migrating to an external engine later. The internal
   message format is the contract — the transport is swappable.

### What we reuse

- `apps/api/src/routes/vista-interop.ts` — HL7/HLO telemetry patterns
- `apps/api/src/vista/rpcBrokerClient.ts` — VistA writeback
- `apps/api/src/middleware/security.ts` — AUTH_RULES patterns
- `apps/api/src/platform/store-policy.ts` — store registration

### What we add

- Protocol-specific parsers (HL7 v2, ASTM, POCT1-A) as service modules
- Gateway uplink receiver routes
- Device observation store with normalization pipeline

## Consequences

- No external Java/integration engine dependency
- Protocol parsers must be well-tested with fixture-based contract tests
- If throughput exceeds single-process capacity, consider worker threads
  or a message broker between gateway uplink and processing
