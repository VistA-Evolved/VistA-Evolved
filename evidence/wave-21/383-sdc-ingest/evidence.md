# Evidence — Phase 383: W21-P6 IEEE 11073 SDC Ingest

## Artifacts
| File | Purpose |
|------|---------|
| `apps/api/src/devices/sdc-ingest-routes.ts` | 3 SDC ingest routes |
| `services/sdc/docker-compose.yml` | SDC sidecar compose (profile: sdc) |
| `services/sdc/Dockerfile` | Python 3.12 + sdc11073 + deps |
| `services/sdc/consumer.py` | SDC consumer scaffold |
| `services/sdc/healthcheck.py` | Import healthcheck |

## Wiring
- `devices/index.ts` — barrel export `sdcIngestRoutes`
- `register-routes.ts` — import + `server.register(sdcIngestRoutes)`
- `security.ts` — AUTH_RULE `/devices/sdc/ingest$` -> service
- `store-policy.ts` — `sdc-ingest-log` entry

## Gates Verified
- [x] SDC routes export 3 endpoints
- [x] SdcIngestPayload and SdcMetric types defined
- [x] Sidecar compose uses profile: sdc (opt-in)
- [x] Consumer scaffold has discovery + normalization + POST functions
- [x] Service auth wired for ingest endpoint
- [x] No external Node.js dependencies added
