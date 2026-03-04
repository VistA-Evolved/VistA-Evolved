# Phase 354 — W18-P1: Range Reservation + Manifest + ADRs

## IMPLEMENT

- Reserve phase range 354-361 in prompt-phase-range-reservations.json
- Create /prompts/WAVE_18_MANIFEST.md with resolved IDs
- ADRs:
  - ADR-EVENT-BUS.md (outbox pattern, in-process bus, replay, DLQ)
  - ADR-WEBHOOK-SECURITY.md (HMAC-SHA256, timestamp, nonce, retries)
  - ADR-PLUGIN-MODEL.md (signed manifests, extension points, tenant policies)
- Create prompt folders for all 8 phases

## Files touched

- docs/qa/prompt-phase-range-reservations.json
- prompts/WAVE_18_MANIFEST.md
- docs/decisions/ADR-EVENT-BUS.md
- docs/decisions/ADR-WEBHOOK-SECURITY.md
- docs/decisions/ADR-PLUGIN-MODEL.md
- prompts/354-W18-P1-MANIFEST-ADRS/354-01-IMPLEMENT.md
