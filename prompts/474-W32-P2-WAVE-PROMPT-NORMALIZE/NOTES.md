# Phase 474 — W32-P2: Notes

## Decisions

- Wave folders (matching `^\d+-W\d+-P\d+-`) enforce strict naming
- Legacy `NNN-PHASE-NNN-` folders keep old naming (too many to rename safely)
- Fixer is idempotent — safe to re-run

## Stats

- 96 wave folders had old-style naming before fix
- 106 total wave folders exist
