# Phase 114 -- VERIFY: Durability Wave 1

## Verification Steps

Run from repo root:

```powershell
.\scripts\verify-phase114-durability-wave1.ps1
```

## Gates (placeholder -- user will provide full verify prompt)

### A. Build + Typecheck
1. API typecheck clean
2. Web build clean
3. Portal typecheck clean

### B. Restart Durability
4. restart-durability.mjs passes (sessions survive restart)
5. restart-durability.mjs passes (work items survive restart)
6. restart-durability.mjs passes (capability matrix survives restart)

### C. Schema + Repos
7. auth_session table exists in schema
8. rcm_work_item table exists in schema
9. rcm_work_item_event table exists in schema
10. session-repo.ts exists
11. workqueue-repo.ts exists

### D. Store Policy
12. docs/architecture/store-policy.md exists
13. docs/runbooks/durability-wave1.md exists

### E. CI Integration
14. qa-gauntlet.yml contains restart-durability gate
15. verify-latest.ps1 delegates to Phase 114

### F. No PHI in Logs
16. No raw tokens stored in DB (only hashes)
17. Secret scan passes
