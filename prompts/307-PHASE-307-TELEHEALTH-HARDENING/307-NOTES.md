# Phase 307 -- W12-P9 NOTES
## Telehealth Provider Hardening

### Architecture Decisions

1. **Encounter linkage is in-memory** — Same pattern as imaging worklist (Phase 23)
   and room-store (Phase 30). Resets on API restart. Migration path to PG documented.

2. **ORWPCE SAVE is integration-pending** — The RPC is registered in rpcRegistry but
   PCE data creation is not reliable in the WorldVistA sandbox. The encounter-link
   module can probe ORWPCE HASVISIT (read) but defers encounter creation to future
   phases when VistA PCE subsystem is verified.

3. **Consent state machine** — Three categories: video (required), recording (optional,
   OFF by default per AGENTS.md #59), data sharing (optional). Patient consent is
   explicit (UI click or verbal confirmation). Provider consent is implicit.

4. **Heartbeat/reconnection/auto-end** — Session hardening adds participant heartbeat
   tracking with configurable reconnection window (2 min default) and auto-end timeout
   (5 min default). The sweeper runs every 60s and invokes autoEndCallback for
   abandoned rooms.

5. **No new writeback domain** — Telehealth is not a writeback domain (no VistA write
   RPCs in the command bus). The encounter linkage module is a read-probe + local-state
   module that may later use the command bus for ORWPCE SAVE writes.

### VistA RPCs Referenced
- ORWPCE HASVISIT (read, registered) — Check if encounter exists
- ORWPCE GET VISIT (read, registered) — Get visit detail
- ORWPCE SAVE (write, registered) — Create/update encounter (integration-pending)
- SDOE LIST ENCOUNTERS FOR PAT (read, exception) — List encounters

### Store Registrations (store-policy.ts)
- telehealth-encounter-links: operational, in_memory_only, max 2K
- telehealth-consent-records: operational, in_memory_only, max 2K
- telehealth-heartbeats: ephemeral, in_memory_only, max 2K
