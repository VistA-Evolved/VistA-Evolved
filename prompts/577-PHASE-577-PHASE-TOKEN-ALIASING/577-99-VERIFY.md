# Phase 577 — VERIFY: Phase Token Aliasing

## Verification Steps

### Gate 1: Canonical map exists and is valid JSON

```powershell
Test-Path docs/qa/phase-canonical-map.json
node -e "JSON.parse(require('fs').readFileSync('docs/qa/phase-canonical-map.json','utf-8'))"
```

### Gate 2: phase-comment-audit.mjs runs without error

```powershell
node scripts/qa/phase-comment-audit.mjs
```

### Gate 3: Unresolved count dropped

```powershell
# Before: 80 unresolved
# After: should be < 10
node -e "const j=JSON.parse(require('fs').readFileSync('docs/qa/phase-comment-audit.json','utf-8'));console.log('unresolved:',j.summary.unresolved,'resolvedViaBasePhase:',j.summary.resolvedViaBasePhase)"
```

### Gate 4: prompt-ref.mjs subphase fallback works

```powershell
node scripts/prompt-ref.mjs --phase 15B
# Should output "Resolved by base phase: 15 (from 15B)" and show Phase 15 results
```

### Gate 5: prompt-ref.mjs exact match unchanged

```powershell
node scripts/prompt-ref.mjs --phase 37C
# Should still show exact match for 37C, no fallback message
```

### Gate 6: Audit markdown includes resolvedViaBasePhase row

```powershell
Select-String -Path docs/qa/phase-comment-audit.md -Pattern "Resolved via base phase"
```

### Gate 7: NOTES.md documents before/after counts

```powershell
Test-Path prompts/577-PHASE-577-PHASE-TOKEN-ALIASING/NOTES.md
Select-String -Path prompts/577-PHASE-577-PHASE-TOKEN-ALIASING/NOTES.md -Pattern "Before|After"
```
