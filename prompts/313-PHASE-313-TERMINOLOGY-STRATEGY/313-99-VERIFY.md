# Phase 313 — VERIFY

## Gates

| # | Gate | Check |
|---|------|-------|
| 1 | Registry exists | `terminology-registry.ts` exists |
| 2 | TerminologyResolver interface | Interface with resolve/validate/search |
| 3 | 6 built-in resolvers | ICD-10-CM, ICD-10-WHO, CPT, LOINC, NDC, Passthrough |
| 4 | resolveCode with fallback | Falls back to passthrough |
| 5 | Per-country defaults | US, PH, GH terminology defaults |
| 6 | Routes exist | `terminology-routes.ts` exists |
| 7 | FHIR system URIs | Standard URIs for each code system |
| 8 | Code validation patterns | Regex patterns for each code system |
| 9 | Prompts complete | IMPLEMENT + VERIFY + NOTES |
| 10 | Evidence exists | evidence file exists |

```powershell
.\scripts\verify-phase313-terminology-strategy.ps1
```
