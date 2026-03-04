# Phase 379 — W21-P2 NOTES

## Decisions

- Gateway sidecar is a scaffold — actual protocol adapters come in P4-P6
- Uplink uses HTTP POST (not WebSocket) for the scaffold — WebSocket upgrade
  is a future enhancement when real-time streaming is needed
- Config pull model chosen over push to avoid requiring inbound ports on-prem
- Service auth (X-Service-Key) for gateway-to-server communication matches
  the existing imaging ingest callback pattern

## Dependencies

- W21-P1 (378) — manifest + ADRs ✓
- No VistA Docker dependency — gateway is API-side only

## Follow-ups

- Wire gateway store to PG (migration v60)
- Implement WebSocket tunnel for real-time uplink
- Add mTLS certificate validation (per ADR-W21-EDGE-GATEWAY)
- Protocol adapter plugin interface (W21-P4+)
