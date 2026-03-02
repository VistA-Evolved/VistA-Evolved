# Phase 473 — W32-P1: Wave Auto-Numbering + Reservation Bootstrap

## Implementation Steps

1. Compute wave + phase IDs using `scripts/prompts-next-phase.mjs`
2. Derive WAVE number from max existing wave manifest + 1
3. Reserve contiguous block via `scripts/prompts-reserve-range.mjs`
4. Create `prompts/WAVE_32_MANIFEST.md` with all 8 phase slots
5. Create P1 prompt folder with IMPLEMENT.md, VERIFY.md, NOTES.md
6. Create evidence directory at `/evidence/wave-32/473-W32-P1-autowave-bootstrap/`
7. Capture reservation output and computed variables as evidence

## Files Touched

- `prompts/WAVE_32_MANIFEST.md` (created)
- `prompts/473-W32-P1-AUTOWAVE-BOOTSTRAP/IMPLEMENT.md` (created)
- `prompts/473-W32-P1-AUTOWAVE-BOOTSTRAP/VERIFY.md` (created)
- `prompts/473-W32-P1-AUTOWAVE-BOOTSTRAP/NOTES.md` (created)
- `docs/qa/prompt-phase-range-reservations.json` (updated by reservation script)
- `evidence/wave-32/473-W32-P1-autowave-bootstrap/` (evidence output)
