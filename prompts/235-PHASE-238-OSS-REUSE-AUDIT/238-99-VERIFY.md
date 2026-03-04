# Phase 238 — OSS Reuse Audit + ADRs — VERIFY

## Verification Steps

### Gate 1: ADR files exist

```powershell
@("ADR-hl7-engine-choice.md","ADR-progressive-delivery-choice.md","ADR-metering-choice.md","ADR-feature-flags-choice.md","ADR-secrets-sync-choice.md","ADR-dr-backup-choice.md") | ForEach-Object { if (Test-Path "docs/decisions/$_") { "PASS: $_" } else { "FAIL: $_ missing" } }
```

### Gate 2: WAVE6-MANIFEST.md exists and references all ADRs

```powershell
$m = Get-Content docs/waves/WAVE6-MANIFEST.md -Raw
if ($m -match "ADR-hl7" -and $m -match "ADR-progressive" -and $m -match "ADR-metering") { "PASS: manifest" } else { "FAIL: manifest missing ADR refs" }
```

### Gate 3: Evidence artifacts exist

```powershell
@("repo-inventory.md","adr-links.txt","decision-matrix.json") | ForEach-Object { if (Test-Path "artifacts/evidence/phase238/wave6/p1-oss-audit/$_") { "PASS: $_" } else { "FAIL: $_ missing" } }
```

### Gate 4: ADRs have required sections

```powershell
Get-ChildItem docs/decisions/ADR-*-choice.md | ForEach-Object { $c = Get-Content $_.FullName -Raw; $name = $_.Name; @("Context","Decision","Alternatives","Consequences") | ForEach-Object { if ($c -match "## $_") { "PASS: $name has $_" } else { "FAIL: $name missing $_" } } }
```

### Gate 5: Typecheck passes

```powershell
pnpm -r typecheck
```

## Acceptance Criteria

- All 6 ADRs exist with required sections
- WAVE6-MANIFEST.md references ADRs
- Evidence artifacts generated
- No code changes introduced
- Typecheck still passes
