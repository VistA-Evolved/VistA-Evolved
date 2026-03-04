# Phase 379 — W21-P2 IMPLEMENT: Edge Device Gateway

## Goal

Create the edge device gateway subsystem: gateway registration, uplink
message ingest, observation store, heartbeat lifecycle, and config pull.

## Files Changed

- `apps/api/src/devices/types.ts` — Gateway, uplink, observation types
- `apps/api/src/devices/gateway-store.ts` — In-memory stores + CRUD + cleanup
- `apps/api/src/devices/gateway-routes.ts` — REST endpoints (18 routes)
- `apps/api/src/devices/index.ts` — Barrel export
- `apps/api/src/server/register-routes.ts` — Wire routes + cleanup job
- `apps/api/src/middleware/security.ts` — AUTH_RULES (admin + service)
- `apps/api/src/platform/store-policy.ts` — 5 store entries
- `services/edge-gateway/docker-compose.yml` — Sidecar compose (profile: gateway)
- `services/edge-gateway/gateway.mjs` — Scaffold sidecar runtime

## Patterns Reused

- In-memory Map store with FIFO eviction (imaging-worklist, room-store)
- Fastify plugin route pattern (imaging-ingest, telehealth)
- Service-to-service auth for uplink/heartbeat (imaging ingest callback)
- Docker compose profiles for optional sidecars (imaging)
- Store policy registration with domain + migration target

## Auth Model

- Gateway management (CRUD, config, health): `admin` auth
- Uplink ingest + heartbeat: `service` auth (X-Service-Key)
- Observations query: `admin` auth (inherits from /edge-gateways/ prefix)

## Key Design Decisions

- Outbound-only: gateway connects to API, not the reverse (ADR-W21-EDGE-GATEWAY)
- Config pull model: gateway GETs its config, no push required
- SQLite buffer in sidecar for offline resilience (scaffolded, not wired)
- Plugin adapter model for protocol support (Phase 381+)
