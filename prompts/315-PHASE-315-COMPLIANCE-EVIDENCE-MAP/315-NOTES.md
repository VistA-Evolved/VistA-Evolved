# Phase 315 — Notes — Compliance Evidence Mapping

## Design Decisions

1. **Requirement-to-artifact mapping** — Each compliance requirement explicitly
   references the source file(s) that implement it. This is machine-readable
   (served via REST) and human-readable (markdown doc).

2. **Coverage metric** — Coverage % = (implemented + partial) / (total - N/A).
   This excludes requirements that are inherently non-software (e.g. BAAs).

3. **Three audit chains** — HIPAA audit control maps to three separate hash-chained
   trails (general, imaging, RCM). Each serves a different domain but follows
   the same SHA-256 chain pattern.

4. **Planned items are gaps, not failures** — Breach notification is "planned"
   across all three frameworks because it requires organizational procedures
   (legal templates, contact lists) beyond software engineering.

5. **Evidence types** — 6 types: code, config, documentation, test, audit, process.
   Most evidence is code or config. "process" is reserved for organizational
   procedures that don't have a file artifact.

6. **No legal advice** — The matrix maps requirements to technical artifacts.
   It does not constitute legal compliance certification. Each deployment
   must be independently assessed.

## Cross-References

- HIPAA Security Rule: 45 CFR 164.312
- DPA PH: Republic Act No. 10173 (2012)
- DPA GH: Act 843 (2012)
- Consent engine: apps/api/src/services/consent-engine.ts (Phase 312)
- Country packs: country-packs/{US,PH,GH}/values.json (Phase 314)
