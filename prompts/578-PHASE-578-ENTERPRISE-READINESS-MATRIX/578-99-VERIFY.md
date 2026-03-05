# Phase 578 -- VERIFY: Enterprise Readiness Matrix

## Gates

### Gate 1: Generator runs without error

```powershell
node scripts/qa/generate-enterprise-readiness-matrix.mjs
# Exit code 0
```

### Gate 2: Matrix file generated

```powershell
Test-Path docs/ENTERPRISE_READINESS_MATRIX.md
# True
```

### Gate 3: Matrix has all required sections

```powershell
Select-String -Path docs/ENTERPRISE_READINESS_MATRIX.md -Pattern "SDLC Alignment|Readiness Matrix|PROVEN|PARTIAL|PENDING|How to Regenerate"
```

### Gate 4: Matrix has correct row count (>= 13)

```powershell
(Select-String -Path docs/ENTERPRISE_READINESS_MATRIX.md -Pattern "^\| .+ \| (PROVEN|PARTIAL|PENDING)").Count -ge 13
# True
```

### Gate 5: Evidence links are present (not empty)

```powershell
Select-String -Path docs/ENTERPRISE_READINESS_MATRIX.md -Pattern "docs/|scripts/|\.github/"
# Multiple matches
```

### Gate 6: Generator exits non-zero on missing doc

```powershell
# Rename one required doc, run generator, expect failure
$orig = "docs/KNOWN_ISSUES.md"
Rename-Item $orig "$orig.bak"
node scripts/qa/generate-enterprise-readiness-matrix.mjs 2>&1
# Should exit non-zero with clear error
Rename-Item "$orig.bak" $orig
```
