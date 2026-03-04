# Phase 34 -- Regulated SDLC + Evidence Pack (VERIFY)

## Verification

Run:

```powershell
.\scripts\verify-latest.ps1
```

Or directly:

```powershell
.\scripts\verify-phase1-to-phase34.ps1
```

## Expected Gates (~60)

| Group  | Description                                            | Count |
| ------ | ------------------------------------------------------ | ----- |
| G34-0  | Phase 33 regression chain                              | 1     |
| G34-0b | Prompts + TSC (3 apps + folder checks)                 | 8     |
| G34-1  | CI workflow (quality-gates.yml content)                | 14    |
| G34-2  | Evidence bundle generator content                      | 9     |
| G34-3  | PHI leak scanner content + live run                    | 7     |
| G34-4  | Unit tests existence + live run + count                | 4     |
| G34-5  | Compliance docs existence + content                    | 22    |
| G34-6  | Redaction hardening (console.log + err.message checks) | 2     |
| G34-7  | Runbook existence + content                            | 4     |
| G34-8  | .gitignore contains artifacts/                         | 1     |
| G34-9  | Secret scan still passes                               | 1     |

## Pass Criteria

- 0 FAIL
- All PASS or WARN (regression chain WARN is acceptable)
