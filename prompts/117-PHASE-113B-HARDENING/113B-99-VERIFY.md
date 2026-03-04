# Phase 113B -- VERIFY: Hardening (RCM Audit Persistence + CI Evidence Gate + Prompts Tree)

## Verification Steps

Run from repo root:

```powershell
.\scripts\verify-phase113b-hardening.ps1
```

## Gates (~35 checks)

### A. RCM Audit JSONL File Sink

1. `rcm-audit.ts` exists and compiles
2. Uses `appendFileSync` for JSONL writes
3. Has `ensureAuditDir` directory guard
4. `recoverLastHash` recovers hash chain on startup
5. `RCM_AUDIT_FILE` env var support
6. `appendToFile(entry)` called in `appendRcmAudit`

### B. Evidence Gate CI Wiring

7. `ci-verify.yml` runs `evidence-gate.mjs`
8. `qa-gauntlet.yml` runs `evidence-gate.mjs` (standard)
9. `qa-gauntlet.yml` runs `evidence-gate.mjs --strict` (nightly)
10. `quality-gates.yml` runs `evidence-gate.mjs`

### C. Evidence Staleness Check

11. `evidence-gate.mjs` exists
12. Has `checkStaleness` function
13. Has `STALENESS_THRESHOLD_DAYS` constant
14. Strict mode fails on staleness

### D. Prompts Tree Repair

15. `115-PHASE-111-CLAIM-LIFECYCLE-SCRUBBER/` folder exists
16. `111-01-IMPLEMENT.md` in folder
17. `111-99-VERIFY.md` in folder
18. `116-PHASE-112-EVIDENCE-GATING/` folder exists
19. `112-01-IMPLEMENT.md` in folder
20. `112-99-VERIFY.md` in folder
21. `110-99-VERIFY.md` canonical in `114-PHASE-110-*` folder
    22-24. No flat files at prompts/ root (110, 111, 112)

### E. Prompts Tree Health Gate

25. `prompts-tree-health.mjs` exists
26. Duplicate-flat check
27. IMPLEMENT/VERIFY pair check
28. Phase mismatch check
    29-31. Wired into all 3 CI workflows

### F. verify-latest.ps1

32. Delegates to Phase 113B verifier

### G. Phase 113B Prompt

33. Prompt folder exists
34. IMPLEMENT file exists
