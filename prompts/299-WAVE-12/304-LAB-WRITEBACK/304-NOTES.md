# Phase 304 — NOTES — Lab Deep Writeback (W12-P6)

## Design Decisions
1. **Lab orders use the general order pipeline.** PLACE_LAB_ORDER goes through
   ORWDX LOCK/SAVE/UNLOCK just like general and medication orders.
2. **ACK_LAB_RESULT does not need patient LOCK.** Result acknowledgment is a
   per-result operation via ORWLRR ACK. No patient-level locking needed.
3. **2 intents only.** Labs have a simpler lifecycle than orders/pharmacy.
   Additional intents (e.g., order addendums) can be added later.

## RPC Mapping
| Intent | RPCs | Lock? |
|--------|------|-------|
| PLACE_LAB_ORDER | ORWDX LOCK, ORWDX SAVE, ORWDX UNLOCK | Yes |
| ACK_LAB_RESULT | ORWLRR ACK | No |
