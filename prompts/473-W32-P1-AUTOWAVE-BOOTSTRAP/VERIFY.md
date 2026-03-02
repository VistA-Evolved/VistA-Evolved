# Phase 473 — W32-P1: Verify — Wave Auto-Numbering + Reservation Bootstrap

## Verification Steps

1. Confirm `docs/qa/prompt-phase-range-reservations.json` contains Wave 32 entry
2. Confirm no overlapping ranges in the reservation file
3. Confirm `prompts/WAVE_32_MANIFEST.md` exists with 8 phase slots
4. Confirm P1 prompt folder has exactly IMPLEMENT.md, VERIFY.md, NOTES.md
5. Confirm evidence directory has reserve-output.txt and wave-vars.txt

## Acceptance Criteria

- [ ] Reservation file updated with Wave 32: phases 473-480
- [ ] No phase range overlaps detected
- [ ] Wave manifest created with all 8 phases listed
- [ ] P1 prompt folder follows wave naming convention
- [ ] Evidence captured under `/evidence/wave-32/473-W32-P1-autowave-bootstrap/`
