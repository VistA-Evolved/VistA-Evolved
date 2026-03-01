# ADR: Edge Device Gateway Architecture

- **Status**: Accepted
- **Date**: 2026-03-01
- **Phase**: 378 (W21-P1)

## Context

Hospital devices (monitors, ventilators, pumps, analyzers) live on internal
clinical networks that cannot directly reach cloud services. We need a secure
pattern to bridge device data from on-premises networks to our platform.

## Decision

**Use an edge gateway model** with outbound-only connections.

### Architecture

1. **Edge gateway** runs on-premises (Docker/K8s) in the hospital network
2. **Outbound-only** WebSocket/gRPC tunnel over TLS to the cloud control plane
3. **mTLS** per-gateway certificate for authentication
4. **Local buffer** (SQLite) survives network drops; drains on reconnect
5. **Plugin adapter model** — each protocol (HL7, ASTM, DICOM, etc.) is a
   separate adapter with a standard interface (start/stop/health/metrics)
6. **Config pull** from control plane (tenant→facility→gateway assignments)

### Why not direct cloud listeners?

- Hospital firewalls block inbound connections
- Compliance requires data to originate from the facility
- Network reliability is inconsistent; buffering is essential
- Device protocols (serial, MLLP) require local termination

### Why not a full message broker (Kafka/RabbitMQ)?

- Too heavy for edge deployment in small clinics
- SQLite buffer is sufficient for the ingest rates involved
- Message broker can sit in the cloud tier for fan-out

## Consequences

- Gateway requires on-prem deployment capability (Docker image + optional Helm)
- Certificate rotation must be automated
- Buffer depth monitoring prevents silent data loss
- Each new device protocol is a new adapter plugin, not a gateway change
