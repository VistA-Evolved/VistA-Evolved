# Phase 62 -- VERIFY -- Go-Live Hardening Pack v1

## Verification Gates

### G62-1: Evidence pack generated under artifacts/evidence/phase62/
### G62-2: Backup/restore drill script exists and runs
### G62-3: Tenant isolation tests prove no cross-tenant leakage
### G62-4: Audit chain verifier detects tampering
### G62-5: Load tests run with budgets
### G62-6: SBOM generated in CycloneDX format
### G62-7: verify-latest updated and passes
### G62-8: No policy violations (no reports folder, no artifacts committed)

## Script
```powershell
.\scripts\verify-phase62-hardening.ps1
```
