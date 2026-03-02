# Phase 484 Notes

- All 5 nursing endpoints already had audit actions from Phase 138 — no new types needed
- GMR I/O RPCs (GMRIO RESULTS, GMRIO ADD) not in OR CPRS GUI CHART context
- GN Assessment RPCs (ZVENAS LIST, ZVENAS SAVE) are custom/future — never existed
- PSB/BCMA RPCs (PSB MED LOG, PSB ALLERGY) confirmed absent from WorldVistA sandbox
- The `pendingFallback()` helper becomes unused in these 5 handlers but is kept
  for the remaining non-Tier-0 fallback paths in vitals/notes/ward-patients
