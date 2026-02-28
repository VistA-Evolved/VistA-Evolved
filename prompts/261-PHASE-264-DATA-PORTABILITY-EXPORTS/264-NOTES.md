# Phase 264 -- Notes

## Architecture
- FHIR Bulk Data Access IG pattern: kickoff (202 + Content-Location) -> poll status -> download
- Each output file has SHA-256 content hash for end-to-end manifest verification
- Patient chart creates FHIR R4 Document Bundle with 7 sections (demographics, allergies, problems, vitals, meds, notes, encounters)
- Tenant export covers all 7 data scopes for complete portability
- All processing simulated via setTimeout -- ready for Graphile Worker integration

## Relationship to Existing Infrastructure
- Phase 245 export-engine.ts handles CSV/JSON/JSONL/NDJSON format conversion
- Phase 80 record-portability handles AES-256-GCM encrypted artifacts
- Phase 178 FHIR R4 gateway handles individual resource reads
- This phase adds the missing bulk/batch export layer that ties them together

## Future Work
- Wire async processing to Graphile Worker job queue
- Add streaming NDJSON for large exports
- Integrate with audit shipping (Phase 157) for compliance exports
- Add FHIR $export group-level filtering
