# Phase 525 — C4: ICU Durability v1

## Goal
PG tables and repo for ICU admissions, beds, flowsheet, vents, I/O, scores.

## Implementation
- PG schema: pgIcuAdmission, pgIcuBed, pgIcuFlowsheetEntry, pgIcuVentRecord, pgIcuIoRecord, pgIcuScore
- PG migration v55
- PG repo: pg-icu-repo.ts
- RLS + store-policy updates
