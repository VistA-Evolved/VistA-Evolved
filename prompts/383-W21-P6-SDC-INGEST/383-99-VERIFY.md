# Phase 383 — W21-P6 VERIFY: IEEE 11073 SDC Ingest

## Verification Gates

1. `sdc-ingest-routes.ts` exports default Fastify plugin with 3 routes
2. SdcIngestPayload type includes mdsHandle, serialNumber, metrics array
3. SdcMetric type includes code, codingSystem, value, unit, category
4. POST /devices/sdc/ingest stores metrics as DeviceObservation
5. GET /devices/sdc/ingest-log returns SDC ingest history
6. GET /devices/sdc/status returns SDC subsystem health
7. AUTH_RULE maps /devices/sdc/ingest to "service" auth
8. store-policy.ts includes sdc-ingest-log entry
9. register-routes.ts imports and registers sdcIngestRoutes
10. Barrel index.ts exports sdcIngestRoutes
11. services/sdc/docker-compose.yml uses profile: sdc
12. services/sdc/Dockerfile installs sdc11073, requests, lxml
13. services/sdc/consumer.py has discover_devices, normalize_metric, post_to_api
14. Container uses network_mode: host for WS-Discovery multicast
15. SDC sidecar is opt-in (won't start without --profile sdc)
