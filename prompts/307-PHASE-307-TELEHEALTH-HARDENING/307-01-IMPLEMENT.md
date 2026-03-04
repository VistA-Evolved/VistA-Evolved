# Phase 307 -- W12-P9 IMPLEMENT

## Telehealth Provider Hardening

### Goal

Harden telehealth infrastructure with encounter linkage (VistA PCE grounding),
consent posture tracking, and session resilience (heartbeat/reconnection/auto-end).

### Steps

1. Inventory existing telehealth infrastructure (room-store, providers, routes)
2. Check VistA PCE RPCs: ORWPCE SAVE (write), ORWPCE HASVISIT (read), SDOE LIST ENCOUNTERS
3. Create `telehealth/encounter-link.ts` — room-to-VistA encounter linkage module
4. Create `telehealth/consent-posture.ts` — consent state machine with audit
5. Create `telehealth/session-hardening.ts` — heartbeat, reconnection, auto-end sweeper
6. Create contract tests for all three modules
7. Update immutable-audit.ts with telehealth audit actions
8. Update store-policy.ts with new telehealth stores
9. Create evidence + verifier

### Files Touched

- apps/api/src/telehealth/encounter-link.ts (NEW)
- apps/api/src/telehealth/consent-posture.ts (NEW)
- apps/api/src/telehealth/session-hardening.ts (NEW)
- apps/api/src/writeback/**tests**/telehealth-hardening-contract.test.ts (NEW)
- apps/api/src/lib/immutable-audit.ts (MODIFIED — +4 audit actions)
- apps/api/src/platform/store-policy.ts (MODIFIED — +3 store entries)
- prompts/307-PHASE-307-TELEHEALTH-HARDENING/307-01-IMPLEMENT.md
- prompts/307-PHASE-307-TELEHEALTH-HARDENING/307-99-VERIFY.md
- prompts/307-PHASE-307-TELEHEALTH-HARDENING/307-NOTES.md
- evidence/wave-12/307-telehealth-hardening/evidence.md
- scripts/verify-phase307-telehealth-hardening.ps1

### VistA Grounding

- ORWPCE HASVISIT: Check if visit exists for patient + date (registered, read)
- ORWPCE GET VISIT: Get detailed visit data (registered, read)
- ORWPCE SAVE: Save PCE encounter (registered, write — integration-pending in sandbox)
- SDOE LIST ENCOUNTERS FOR PAT: List encounters for patient (registered, read)
