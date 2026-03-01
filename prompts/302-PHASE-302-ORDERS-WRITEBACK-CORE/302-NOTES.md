# Phase 302 — NOTES — Orders Writeback Core (W12-P4)

## Design Decisions

1. **LOCK/UNLOCK for write intents only.** PLACE_ORDER, DISCONTINUE_ORDER, and
   SIGN_ORDER all use ORWDX LOCK/UNLOCK to hold a patient lock. VERIFY_ORDER
   and FLAG_ORDER do not modify order state in a way that requires the patient
   lock — they operate on individual order records.

2. **UNLOCK in `finally` block.** Mirrors the TIU executor pattern (BUG-029).
   Even if the write RPC throws, we always attempt UNLOCK to prevent patient
   lock leaks that would block other providers.

3. **esCode hashed for SIGN_ORDER.** Same SHA-256 truncate-to-16 pattern as
   TIU SIGN_NOTE (Phase 154 convention). The raw esCode is never stored in
   audit trails, DB, or logs.

4. **Error classification.** LOCK failures are `transient` (another user might
   have the lock). Missing required fields and invalid IEN returns are
   `permanent` (retrying won't help).

5. **5 intents mapped.** Covers the core CPRS order lifecycle: place → verify →
   sign → flag → discontinue. Additional intents (e.g., order checks via
   ORWDXC SAVECHK) can be added later without changing the bus.

## RPC Mapping

| Intent | RPCs | Lock? |
|--------|------|-------|
| PLACE_ORDER | ORWDX LOCK, ORWDX SAVE, ORWDX UNLOCK | Yes |
| DISCONTINUE_ORDER | ORWDX LOCK, ORWDXA DC, ORWDX UNLOCK | Yes |
| VERIFY_ORDER | ORWDXA VERIFY | No |
| SIGN_ORDER | ORWDX LOCK, ORWOR1 SIG, ORWDX UNLOCK | Yes |
| FLAG_ORDER | ORWDXA FLAG | No |
