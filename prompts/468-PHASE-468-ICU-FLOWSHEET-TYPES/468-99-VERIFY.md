# Phase 468 — ICU Flowsheet Types VERIFY

## Gates

1. types.ts exports IcuAdmission, FlowsheetEntry, VentSettings, IoRecord, SeverityScore
2. icu-store.ts exports in-memory store with CRUD
3. Covers vitals, vent parameters, I/O, APACHE/SOFA scores
4. Flowsheet entries are time-series (timestamp + category + values)
