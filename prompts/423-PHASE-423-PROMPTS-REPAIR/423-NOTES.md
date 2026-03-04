# Phase 423 — NOTES

- **Wave**: 26, Position 1 (W26 P1)
- **Type**: Infrastructure / Prompt hygiene
- **Risk**: Low — folder renames and linter changes only
- **Dependencies**: None (first phase in W26)

## Key Decisions

1. Wave-level audit folders (263, 290, 326) use `WAVE-N-` naming instead of
   `PHASE-NNN-` to avoid collisions with real phase folders at those numbers.
2. Legacy 283/284 duplicate-phase WARNs left as-is — the 300+ prefix≠PHASE
   architecture is by original design across the entire repo.
3. NOTES.md gate is WARN-only with 328 legacy gaps — progressive adoption.
