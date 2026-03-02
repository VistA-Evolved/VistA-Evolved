# Phase 457 — C-CDA Ingest VERIFY

## Gates
1. `ccda-ingest.ts` exists and exports `ingestCcda()`
2. `/migration/ccda/import` endpoint registered
3. C-CDA section extraction handles Problems, Medications, Allergies OIDs
4. Batch tracked with format "ccda" in unified batch store
