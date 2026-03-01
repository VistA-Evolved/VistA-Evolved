# Phase 439 — Verification

## Checks
1. `prompts-tree-health.mjs` passes (7/7 PASS, 0 FAIL)
2. `classify()` returns valid `RegulatoryClassification` with frameworks, constraints, risk
3. US tenant resolves to [HIPAA, OWASP_ASVS]
4. PH tenant resolves to [DPA_PH, OWASP_ASVS]
5. GH tenant resolves to [DPA_GH, OWASP_ASVS]
6. PHI field detection identifies HIPAA 18 identifier fields
7. Data tier inference: PHI fields → C1_PHI, no PHI read → C4_OPERATIONAL
8. Risk calculation: PHI + write = high, PHI + export + many fields = critical
9. HIPAA breach notification constraint is `satisfied: false`
10. Framework registry has 5 entries
