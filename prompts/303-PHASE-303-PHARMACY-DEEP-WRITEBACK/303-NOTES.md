# Phase 303 — NOTES — Pharmacy Deep Writeback (W12-P5)

## Design Decisions

1. **PLACE_MED_ORDER includes AUTOACK.** ORWDXM AUTOACK is called non-fatally
   after SAVE. If AUTOACK fails, the order still exists — the pharmacist can
   manually acknowledge. This matches CPRS quick-order behavior.

2. **ADMINISTER_MED is integration-pending.** PSB MED LOG requires the BCMA
   (PSB) package, which is not installed in the WorldVistA Docker sandbox.
   The executor throws `permanent` with clear integration-pending message.
   Dry-run produces a valid transcript with integration note.

3. **Same LOCK/UNLOCK pattern as Orders.** Medication orders go through the
   same ORWDX LOCK/SAVE/UNLOCK pipeline as general orders (they are orders
   in VistA). The PHARM domain distinction is for routing and gate control.

## RPC Mapping

| Intent                | RPCs                              | Lock? | Notes               |
| --------------------- | --------------------------------- | ----- | ------------------- |
| PLACE_MED_ORDER       | ORWDX LOCK, SAVE, AUTOACK, UNLOCK | Yes   | AUTOACK non-fatal   |
| DISCONTINUE_MED_ORDER | ORWDX LOCK, ORWDXA DC, UNLOCK     | Yes   | Same as orders DC   |
| ADMINISTER_MED        | PSB MED LOG                       | N/A   | Integration-pending |
