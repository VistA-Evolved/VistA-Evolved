# Phase 313 — NOTES

## Decisions

1. **Scaffold resolvers** — validate format only, don't embed terminology tables.
   Full mapping tables would require NLM/AMA licenses. The resolver interface
   supports future integration with external terminology servers.
2. **Passthrough is the ultimate fallback** — if no resolver matches, VistA
   code is returned as-is with `urn:vista:file:N` system URI. No data loss.
3. **FHIR system URIs** — all resolvers use standard FHIR system URIs so
   output is directly usable in FHIR resources.
4. **Philippines uses ICD-10-WHO, not ICD-10-CM** — different resolver needed.
5. **Ghana uses passthrough for most domains** — local codes dominate.
