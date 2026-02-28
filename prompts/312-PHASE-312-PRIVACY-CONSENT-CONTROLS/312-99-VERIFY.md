# Phase 312 — VERIFY: Privacy/Consent Controls

## Gates

| # | Gate | Check |
|---|------|-------|
| 1 | Consent engine exists | `services/consent-engine.ts` exists |
| 2 | 8 consent categories | CONSENT_CATEGORIES has 8 entries |
| 3 | 3 regulatory profiles | HIPAA, DPA_PH, DPA_GH profiles defined |
| 4 | Immutable consent | Revocation creates new record |
| 5 | Compliance check | checkConsentCompliance exported |
| 6 | Evidence hash | evidenceHash field in ConsentRecord |
| 7 | Consent routes exist | consent-routes.ts exists |
| 8 | Grant/revoke endpoints | POST grant and POST revoke routes |
| 9 | No PHI in logs | No console.log with dfn in consent files |
| 10 | Prompts complete | IMPLEMENT + VERIFY + NOTES |
| 11 | Evidence exists | evidence file exists |

## Run
```powershell
.\scripts\verify-phase312-privacy-consent-controls.ps1
```
