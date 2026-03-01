# Phase 412 — W24-P4 Notes

- Cert runner uses same Gate() pattern as all Wave verifiers
- Live gates (Section 6) skippable with `-SkipLive` for CI/offline use
- Evidence output uses ASCII encoding to avoid BOM issues (BUG-064)
- Archetype-specific checks branch on clinic vs hospital required modules
