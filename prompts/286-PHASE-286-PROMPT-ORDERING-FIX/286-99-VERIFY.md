# Phase 286 — Prompt Ordering Collision Fix + Index Regeneration (VERIFY)

## Verification Gates

### Gate 1: Audit tool runs clean

```powershell
node scripts/prompts-audit.mjs
# Expected: exit 0, "0 collisions"
```

### Gate 2: All 7 collisions resolved

```powershell
# Before: 7 collisions in 4 groups
# After: 0 collisions
# Verify no folders share a numeric prefix
```

### Gate 3: Index generated

```powershell
Test-Path prompts/PROMPTS_INDEX.md
# Expected: True
```

### Gate 4: Evidence pack

```powershell
Test-Path evidence/wave-11/286/before.json
Test-Path evidence/wave-11/286/after.json
Test-Path evidence/wave-11/286/rename-map.json
# All expected: True
```

### Gate 5: Rename map complete

```powershell
# 7 entries in rename-map.json
# Each old folder name resolves to a renamed new folder
```

## Results

- Gate 1: PASS — 0 collisions
- Gate 2: PASS — 7 collisions → 0 collisions
- Gate 3: PASS — PROMPTS_INDEX.md exists (302 lines)
- Gate 4: PASS — All evidence files present
- Gate 5: PASS — 7 rename entries verified
