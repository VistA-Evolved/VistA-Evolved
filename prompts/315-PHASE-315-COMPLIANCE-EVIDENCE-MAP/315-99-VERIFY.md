# Phase 315 — Verify — Compliance Evidence Mapping

## Gates (11)

| #   | Gate                      | Check                                                               |
| --- | ------------------------- | ------------------------------------------------------------------- |
| 1   | Matrix exists             | `compliance-matrix.ts` exists                                       |
| 2   | HIPAA requirements        | >= 10 HIPAA requirements defined                                    |
| 3   | DPA_PH requirements       | >= 5 DPA_PH requirements defined                                    |
| 4   | DPA_GH requirements       | >= 4 DPA_GH requirements defined                                    |
| 5   | Evidence artifacts linked | Every implemented requirement has >= 1 evidence                     |
| 6   | Status types              | All 4 statuses used (implemented, partial, planned, not_applicable) |
| 7   | Routes exist              | `compliance-routes.ts` with 7 endpoints                             |
| 8   | Human-readable map        | `docs/compliance/compliance-evidence-map.md` exists                 |
| 9   | Category coverage         | At least 6 unique categories                                        |
| 10  | Prompts complete          | IMPLEMENT + VERIFY + NOTES                                          |
| 11  | Evidence exists           | evidence file exists                                                |
