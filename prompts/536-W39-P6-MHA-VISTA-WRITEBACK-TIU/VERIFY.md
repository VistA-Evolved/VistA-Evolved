# Phase 536 — VERIFY: MHA VistA Writeback (TIU) [W39-P6]

## Gates

| # | Gate | Check |
|---|------|-------|
| G1 | File-note endpoint exists | `index.ts` has `POST .*/file-note` route |
| G2 | Note generator exists | `apps/api/src/routes/mha/note-generator.ts` exists |
| G3 | Note generator has format function | Exports `generateMhaNote` |
| G4 | TIU CREATE RECORD referenced | `index.ts` references TIU CREATE RECORD |
| G5 | TIU SET DOCUMENT TEXT referenced | `index.ts` references TIU SET DOCUMENT TEXT |
| G6 | Draft fallback present | `index.ts` has fallback/draft logic |
| G7 | Store policy entries exist | `store-policy.ts` has mha-administration and mha-patient-index |
| G8 | vistaFiled field updated | `index.ts` sets vistaFiled = true |
| G9 | No PHI in note generator | No SSN/DOB patterns in note-generator.ts |
| G10 | Evidence directory created | evidence/wave-39/536-W39-P6-MHA-WRITEBACK/ exists |
