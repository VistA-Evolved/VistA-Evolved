# Phase 582 — W42-P11: Verification

> Wave 42: Production Remediation | Phase 582 Verification

---

## Verification Steps

Run the verification gates and commands documented below in order.

## Expected Output

Each gate should pass or produce a truthful blocker with concrete evidence.

## Negative Tests

Check failure paths, blockers, or integration-pending branches where applicable.

## Evidence Captured

Store command output in artifacts or the specified wave evidence location before marking the phase complete.

---

## Gate 1: FHIR Mappers Count

```powershell
$mappers = (Get-ChildItem -Path "apps/api/src/fhir/mappers" -Filter "*.ts" -ErrorAction SilentlyContinue).Count
Write-Output "FHIR mappers: $mappers (expect >= 15)"
```

Expected: At least 15 mapper files.

---

## Gate 2: FHIR Gateway Registration

```powershell
Select-String -Path "apps/api/src/fhir" -Recurse -Pattern "Immunization|Procedure|DiagnosticReport|Practitioner|Medication|Coverage"
```

Expected: Profile types registered in gateway/router.

---

## Gate 3: Drug Interaction Service Exists

```powershell
Test-Path -LiteralPath "apps/api/src/pharmacy/drug-interactions.ts"
```

Expected: `True` or equivalent path exists.

---

## Gate 4: Order Flow Calls Interaction Check

```powershell
Select-String -Path "apps/api/src" -Recurse -Pattern "drug-interaction|checkInteraction|ORWDXC"
```

Expected: Order save path calls interaction check or ORWDXC.

---

## Gate 5: No Proprietary Code Tables

```powershell
Select-String -Path "apps/api/src" -Recurse -Pattern "FDB|Medi-Span|Lexicomp" -CaseSensitive:$false
```

Expected: No matches (no proprietary drug DB references).
