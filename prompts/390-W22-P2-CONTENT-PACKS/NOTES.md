# Phase 390 — W22-P2 NOTES

## Key Decisions

- Extended existing Phase 158 template system rather than replacing it.
- Templates from packs still go through the existing template engine.
- New content types (order sets, flowsheets, etc.) live in a parallel module.
- User-modified (forked) items survive pack rollback.
- Pack install requires admin; reads are session-level.
