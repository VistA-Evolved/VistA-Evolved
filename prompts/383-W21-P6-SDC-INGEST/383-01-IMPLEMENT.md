# Phase 383 — W21-P6 IMPLEMENT: IEEE 11073 SDC Ingest

## Goal
Optional SDC (Service-oriented Device Connectivity) support via a Python
sidecar using sdc11073 (BSD-3), with API-side ingest endpoint for
BICEPS metrics/alerts/waveforms.

## Files Created
- `apps/api/src/devices/sdc-ingest-routes.ts` — 3 SDC ingest routes (ingest, log, status)
- `services/sdc/docker-compose.yml` — SDC sidecar compose (profile: sdc)
- `services/sdc/Dockerfile` — Python 3.12-slim + sdc11073 + requests + lxml
- `services/sdc/consumer.py` — SDC consumer scaffold (discovery, normalize, POST)
- `services/sdc/healthcheck.py` — Simple import healthcheck

## Key Design
- Per ADR-W21-SDC-POSTURE: optional sidecar behind compose profile
- Sidecar discovers devices via WS-Discovery, subscribes to BICEPS metrics
- Normalizes to SdcIngestPayload JSON, POSTs to /devices/sdc/ingest
- API stores observations in the shared device observation pipeline
- Waveform downsampling configurable via SDC_WAVEFORM_DOWNSAMPLE env var
- Service auth via X-Service-Key (same pattern as gateway uplink)
