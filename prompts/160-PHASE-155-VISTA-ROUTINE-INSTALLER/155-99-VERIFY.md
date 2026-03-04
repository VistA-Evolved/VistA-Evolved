# Phase 155 — VERIFY (VistA Routine Install Automation)

## Gates

### Tier 1: Sanity

- S1: TypeCheck clean
- S2: Unified installer script exists and is syntactically valid
- S3: Provisioning route registered in index.ts
- S4: No hardcoded credentials in installer or provision route

### Tier 2: Feature Integrity

- F1: Installer copies all 8 production .m routines
- F2: Installer runs all 4 INSTALL entry points
- F3: Installer runs context adder (VEMCTX3 + ZVEMSIN context logic)
- F4: Provision status endpoint returns routine/RPC inventory
- F5: Provision status requires admin auth
- F6: Installer is idempotent (safe to re-run)

### Tier 3: Regression

- R1: Existing install-interop-rpcs.ps1 still present (not deleted)
- R2: Existing install-rpc-catalog.ps1 still present
- R3: Existing install-rcm-wrappers.ps1 still present
- R4: No clinical behavior changes
- R5: Build + gauntlet pass

## Execution

```powershell
.\scripts\verify-phase155-provisioning.ps1
```
