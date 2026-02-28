# Wave 13 — Regulatory/Compliance + Multi-Country Packaging

> **Computed BASE_PHASE = 309** (highest existing = 308)

## Phase Queue

| Phase | ID  | Slug                        | Title                                           | Depends |
|-------|-----|-----------------------------|------------------------------------------------|---------|
| W13-P1 | 309 | manifest-country-pack-adrs  | Manifest + Country-Pack Model ADRs + Market Matrix | —       |
| W13-P2 | 310 | localization-completion     | Localization Completion (i18n, RTL, locale fmt) | 309     |
| W13-P3 | 311 | data-residency-region       | Data Residency & Region Routing                 | 309     |
| W13-P4 | 312 | privacy-consent-controls    | Privacy/Consent Controls                        | 309     |
| W13-P5 | 313 | terminology-strategy        | Terminology Strategy (pluggable service)        | 309     |
| W13-P6 | 314 | country-packs               | Country Packs (US/PH/GH baseline)               | 309–313 |
| W13-P7 | 315 | compliance-evidence-mapping  | Compliance Evidence Mapping (control matrix)    | 314     |
| W13-P8 | 316 | trust-center-pack           | Procurement/Trust Center Pack                   | 315     |

## Definition of Done

- Multi-country packaging exists as verifiable country packs.
- Localization complete and linted.
- Data residency and consent controls are real and auditable.
- Compliance evidence mapping is automated and exportable.

## Meta-Rules

- All phase IDs computed from BASE_PHASE = 309.
- Each phase folder: `<ID>-PHASE-<ID>-<SLUG>/` with IMPLEMENT, VERIFY, NOTES.
- Evidence under `/evidence/wave-13/<id>-<slug>/`.
- No PHI in any artifact.
- All compliance claims backed by evidence outputs — no legal advice.
