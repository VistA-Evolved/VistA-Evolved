# Phase 510 -- Prompt Tree Health Repair (VERIFY)

## Gate

```powershell
node scripts/qa-gates/prompts-tree-health.mjs 2>&1 | Tee-Object evidence/wave-36/510-W36-P1-PROMPT-TREE-REPAIR/prompts-tree-health.txt
```

## Expected

- No FAIL for orphan-flat
- No FAIL for missing-required on new phases
- WARN for notes-present should be 0 (all stubs created)
- Exit code 0
