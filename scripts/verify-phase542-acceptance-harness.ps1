<# Phase 542 -- Acceptance Harness Meta-Verifier (6 gates) #>
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0

function Test-Gate([string]$Name, [scriptblock]$Check) {
  try { if (& $Check) { $script:pass++; Write-Host "  PASS  $Name" -ForegroundColor Green }
        else          { $script:fail++; Write-Host "  FAIL  $Name" -ForegroundColor Red } }
  catch               { $script:fail++; Write-Host "  FAIL  $Name ($_)" -ForegroundColor Red }
}

Write-Host "`nPhase 542 -- Acceptance Harness Verifier`n" -ForegroundColor Cyan

# G1: Script exists
Test-Gate "G1 verify-wave39-acceptance.ps1 exists" {
  Test-Path -LiteralPath "scripts/verify-wave39-acceptance.ps1"
}

# G2: Script runs without error
Test-Gate "G2 Acceptance harness runs (fast mode)" {
  & powershell -ExecutionPolicy Bypass -File scripts/verify-wave39-acceptance.ps1 -SkipPhaseVerifiers 2>&1 | Out-Null
  $LASTEXITCODE -eq 0
}

# G3: Evidence directory exists
Test-Gate "G3 Evidence dir exists" {
  Test-Path -LiteralPath "evidence/wave-39/542-W39-P12-ACCEPTANCE-HARNESS"
}

# G4: acceptance-report.json is valid JSON
Test-Gate "G4 acceptance-report.json is valid JSON" {
  $f = "evidence/wave-39/542-W39-P12-ACCEPTANCE-HARNESS/acceptance-report.json"
  if (!(Test-Path -LiteralPath $f)) { return $false }
  $raw = [System.IO.File]::ReadAllText($f)
  if ($raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
  $j = $raw | ConvertFrom-Json
  $null -ne $j.pass -and $null -ne $j.total
}

# G5: All 11 phases pass in report
Test-Gate "G5 All 11 phases pass (phasesPass == phasesTotal)" {
  $f = "evidence/wave-39/542-W39-P12-ACCEPTANCE-HARNESS/acceptance-report.json"
  $raw = [System.IO.File]::ReadAllText($f)
  if ($raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
  $j = $raw | ConvertFrom-Json
  $j.phasesPass -eq $j.phasesTotal -and $j.phasesTotal -eq 11
}

# G6: No PHI in evidence
Test-Gate "G6 No PHI in evidence" {
  $files = Get-ChildItem -Path "evidence/wave-39" -Recurse -File -Filter "*.json"
  $found = $false
  foreach ($f in $files) {
    $c = [System.IO.File]::ReadAllText($f.FullName)
    if ($c -match '(?i)(666-\d{2}-\d{4}|\b\d{3}-\d{2}-\d{4}\b|patient.*name|PROV123|NURSE123|PHARM123)') {
      Write-Host "    PHI in $($f.Name)" -ForegroundColor Red; $found = $true
    }
  }
  -not $found
}

$total = $pass + $fail
Write-Host "`n  Phase 542: $pass/$total PASS`n" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })

$evDir = "evidence/wave-39/542-W39-P12-ACCEPTANCE-HARNESS"
@{ pass = $pass; fail = $fail; total = $total; ts = (Get-Date -Format o) } |
  ConvertTo-Json | Set-Content -LiteralPath "$evDir/verify-result.json" -Encoding UTF8

exit $fail
