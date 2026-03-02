# Phase 317 — W14-P1: Manifest + Interop Inventory + ADRs

## IMPLEMENT

### What was built
1. Computed BASE_PHASE dynamically: max prompts prefix = 316, so BASE_PHASE = 317
2. Created `/prompts/WAVE_14_MANIFEST.md` — maps W14-P1..P9 to phases 317-325
3. Created `/docs/integrations/interop-inventory.md` — comprehensive inventory of all existing interop code
4. Created 3 ADRs:
   - `/docs/adrs/ADR-HL7-ENGINE.md` — Keep custom engine (25+ files), harden for ops maturity
   - `/docs/adrs/ADR-X12-LIBRARY.md` — Extend custom serializer, evaluate node-x12 for parse-side
   - `/docs/adrs/ADR-CLEARINGHOUSE-TRANSPORT.md` — SFTP (ssh2) + HTTPS adapters, stub AS2

### Files changed
- `prompts/WAVE_14_MANIFEST.md` (new)
- `docs/integrations/interop-inventory.md` (new)
- `docs/adrs/ADR-HL7-ENGINE.md` (new)
- `docs/adrs/ADR-X12-LIBRARY.md` (new)
- `docs/adrs/ADR-CLEARINGHOUSE-TRANSPORT.md` (new)
- `prompts/317-W14-P1-MANIFEST-INTEROP-INVENTORY/317-01-IMPLEMENT.md` (new)
- `prompts/317-W14-P1-MANIFEST-INTEROP-INVENTORY/317-99-VERIFY.md` (new)
- `prompts/317-W14-P1-MANIFEST-INTEROP-INVENTORY/317-NOTES.md` (new)

### Decisions
- Existing custom HL7 engine (25+ files) is sufficient — no external engine needed
- Existing custom X12 serializer extended — node-x12 as optional parse-side adoption
- SFTP via ssh2 (MIT) is primary clearinghouse transport; AS2 stubbed
- Phase numbering: 317-325 (9 phases, no gaps)

### Key Inventory Findings
- HL7v2: 25 source files, 6 route files, MLLP server/client, routing, DLQ, packs, FHIR bridge
- X12: 7 EDI files, 5 adapter files, 14 connector files (all scaffold/simulation)
- Gaps: No actual SFTP impl, no AS2, no integration-packs/ directory, no certification pipeline
