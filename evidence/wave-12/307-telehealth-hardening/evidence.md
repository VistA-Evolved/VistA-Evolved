# Phase 307 Evidence — Telehealth Provider Hardening (W12-P9)

## Files Created
| File | Purpose | Lines |
|------|---------|-------|
| apps/api/src/telehealth/encounter-link.ts | Room-to-VistA encounter linkage | ~185 |
| apps/api/src/telehealth/consent-posture.ts | Consent state machine + posture evaluation | ~245 |
| apps/api/src/telehealth/session-hardening.ts | Heartbeat, reconnection, auto-end sweeper | ~305 |
| apps/api/src/writeback/__tests__/telehealth-hardening-contract.test.ts | 28 contract tests | ~250 |

## Files Modified
| File | Change |
|------|--------|
| apps/api/src/lib/immutable-audit.ts | +4 telehealth audit actions |
| apps/api/src/platform/store-policy.ts | +3 telehealth store entries |

## Module Design

### Encounter Linkage
- Links telehealth rooms to VistA encounters (PCE Visit File #9000010)
- Probes ORWPCE HASVISIT to check existing encounters
- Status flow: pending -> probed -> linked OR integration_pending
- hashPatientRef() for non-PHI storage (SHA-256 truncated to 16 chars)
- Capacity: 2000 links with FIFO eviction

### Consent Posture
- 3 categories: telehealth_video (required), telehealth_recording (optional/OFF), telehealth_data_sharing (optional)
- 4 decisions: granted, denied, withdrawn, pending
- evaluateConsentPosture() returns videoReady + recordingAllowed + missingConsents
- Recording OFF by default (AGENTS.md #59 compliance)
- Idempotent consent recording (updates existing same-category record)

### Session Hardening
- Per-participant heartbeat tracking
- 3 configurable env vars: TELEHEALTH_HEARTBEAT_INTERVAL_MS, TELEHEALTH_RECONNECTION_WINDOW_MS, TELEHEALTH_AUTO_END_TIMEOUT_MS
- Connection state machine: connected -> reconnecting -> disconnected -> ended
- sweepStaleSessions() auto-ends abandoned rooms
- getSessionMetrics() computes duration, reconnections, network quality
- Sweeper uses unref() to not keep process alive

## VistA Grounding
- ORWPCE HASVISIT: Read RPC, probes encounter existence
- ORWPCE SAVE: Write RPC, integration-pending (PCE data creation unreliable in sandbox)
- SDOE LIST ENCOUNTERS FOR PAT: Read RPC, lists patient encounters
- No new RPCs needed; all already in rpcRegistry.ts

## No PHI
- Patient DFN hashed via hashPatientRef() (SHA-256, 16 chars)
- Participant identity hashed via hashParticipant() (SHA-256, 16 chars)
- Room IDs are opaque hex tokens (from room-store Phase 30)
- No names, SSN, DOB, or raw DFN in any linkage/consent/heartbeat record
